import { http, HttpResponse } from 'msw';
import { describe, expect, it } from 'vitest';
import { getAuthSession, signIn, signOut } from './auth';
import { createMockLoginResponse } from '../mocks/handlers';
import { server } from '../mocks/server';
import { API_BASE_URL, apiRequest } from './api';

describe('API 요청과 MSW 연동', () => {
  it.each([
    ['GET', '/api/v1/chats'],
    ['POST', '/api/v1/chats'],
    ['GET', '/api/v1/chats/7b9e0398-6b3e-4b88-87db-358748803b75'],
    ['POST', '/api/v1/chats/7b9e0398-6b3e-4b88-87db-358748803b75/messages'],
  ])('%s %s 요청에 토큰과 기존 헤더를 전달한다', async (method, path) => {
    const response = createMockLoginResponse();
    signIn(response);
    let called = false;
    server.use(
      http.all(`${API_BASE_URL}${path}`, ({ request }) => {
        called = true;
        expect(request.headers.get('Authorization')).toBe(`Bearer ${response.access_token}`);
        expect(request.headers.get('Content-Type')).toBe('application/json');
        return HttpResponse.json({ ok: true });
      }),
    );
    await expect(
      apiRequest(path, { method, headers: { 'Content-Type': 'application/json' } }),
    ).resolves.toEqual({ ok: true });
    expect(called).toBe(true);
  });

  it('토큰 없이 채팅 요청을 보내지 않는다', async () => {
    let calls = 0;
    server.use(
      http.get(`${API_BASE_URL}/api/v1/chats`, () => {
        calls++;
        return HttpResponse.json({ items: [] });
      }),
    );
    await expect(apiRequest('/api/v1/chats')).rejects.toMatchObject({
      status: 401,
      code: 'UNAUTHORIZED',
    });
    expect(calls).toBe(0);
  });

  it('로그인 실패의 401로 기존 인증 상태를 삭제하지 않는다', async () => {
    const response = createMockLoginResponse();
    signIn(response);
    server.use(
      http.post(`${API_BASE_URL}/api/v1/auth/login`, ({ request }) => {
        expect(request.headers.has('Authorization')).toBe(false);
        return HttpResponse.json(
          {
            error: {
              code: 'INVALID_CREDENTIALS',
              message: '아이디 또는 비밀번호가 올바르지 않습니다.',
            },
          },
          { status: 401 },
        );
      }),
    );
    await expect(apiRequest('/api/v1/auth/login', { method: 'POST' })).rejects.toMatchObject({
      status: 401,
      code: 'INVALID_CREDENTIALS',
    });
    expect(getAuthSession()?.accessToken).toBe(response.access_token);
  });

  it('이전 인증 요청의 늦은 401이 새 로그인 상태를 삭제하지 않는다', async () => {
    signIn(createMockLoginResponse());
    let release!: () => void;
    let entered!: () => void;
    const gate = new Promise<void>((resolve) => {
      release = resolve;
    });
    const started = new Promise<void>((resolve) => {
      entered = resolve;
    });
    server.use(
      http.get(`${API_BASE_URL}/api/v1/chats`, async () => {
        entered();
        await gate;
        return HttpResponse.json(
          { error: { code: 'UNAUTHORIZED', message: '로그인이 필요합니다.' } },
          { status: 401 },
        );
      }),
    );
    const pending = apiRequest('/api/v1/chats');
    const rejection = expect(pending).rejects.toMatchObject({ name: 'AbortError' });
    await started;
    signOut();
    const next = createMockLoginResponse();
    signIn(next);
    release();
    await rejection;
    expect(getAuthSession()?.accessToken).toBe(next.access_token);
  });

  it('JSON 응답을 반환한다', async () => {
    const result = await apiRequest<{ message: string }>('/api/example');
    expect(result.message).toBe('MSW가 API 응답을 제공합니다.');
  });

  it('서버 오류의 상태 코드와 메시지를 전달한다', async () => {
    server.use(
      http.get(`${API_BASE_URL}/api/example`, () =>
        HttpResponse.json({ detail: '접근 권한이 없습니다.' }, { status: 401 }),
      ),
    );
    await expect(apiRequest('/api/example')).rejects.toMatchObject({
      name: 'ApiError',
      status: 401,
      message: '접근 권한이 없습니다.',
    });
  });

  it('JSON이 아닌 서버 오류에도 기본 오류 메시지를 제공한다', async () => {
    server.use(
      http.get(`${API_BASE_URL}/api/example`, () =>
        HttpResponse.text('Bad Gateway', { status: 502 }),
      ),
    );
    await expect(apiRequest('/api/example')).rejects.toMatchObject({
      status: 502,
      message: '요청에 실패했습니다. (502)',
    });
  });

  it('채팅 API 공통 오류 응답의 메시지를 전달한다', async () => {
    server.use(
      http.get(`${API_BASE_URL}/api/example`, () =>
        HttpResponse.json(
          {
            error: {
              code: 'DB_ERROR',
              message: '대화 목록을 불러오지 못했어요.',
              request_id: 'request-id',
            },
          },
          { status: 500 },
        ),
      ),
    );
    await expect(apiRequest('/api/example')).rejects.toMatchObject({
      status: 500,
      message: '대화 목록을 불러오지 못했어요.',
      code: 'DB_ERROR',
      requestId: 'request-id',
    });
  });

  it('회원가입 중복 오류의 식별 코드와 요청 ID를 유지한다', async () => {
    server.use(
      http.post(`${API_BASE_URL}/api/v1/auth/signup`, () =>
        HttpResponse.json(
          {
            error: {
              code: 'USERNAME_TAKEN',
              message: '이미 사용 중인 아이디입니다.',
              request_id: 'duplicate-request',
            },
          },
          { status: 409 },
        ),
      ),
    );
    await expect(apiRequest('/api/v1/auth/signup', { method: 'POST' })).rejects.toMatchObject({
      status: 409,
      code: 'USERNAME_TAKEN',
      message: '이미 사용 중인 아이디입니다.',
      requestId: 'duplicate-request',
    });
  });

  it('응답 본문이 없는 삭제 요청도 처리한다', async () => {
    server.use(
      http.delete(`${API_BASE_URL}/api/example`, () => new HttpResponse(null, { status: 204 })),
    );
    await expect(apiRequest<void>('/api/example', { method: 'DELETE' })).resolves.toBeUndefined();
  });

  it('회원가입 mock이 서버와 같은 응답과 대소문자 중복 검사를 제공한다', async () => {
    const options = { method: 'POST', headers: { 'Content-Type': 'application/json' } };
    const user = await apiRequest('/api/v1/auth/signup', {
      ...options,
      body: JSON.stringify({ name: ' 오리 친구 ', username: 'New_User', password: ' password ' }),
    });
    expect(user).toEqual({
      id: expect.any(Number),
      username: 'new_user',
      name: '오리 친구',
      created_at: expect.any(String),
    });
    await expect(
      apiRequest('/api/v1/auth/signup', {
        ...options,
        body: JSON.stringify({ name: '친구', username: 'NEW_USER', password: 'password' }),
      }),
    ).rejects.toMatchObject({ status: 409, code: 'USERNAME_TAKEN' });
  });

  it('회원가입 mock이 권한 등 추가 필드를 거절한다', async () => {
    await expect(
      apiRequest('/api/v1/auth/signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: '친구',
          username: 'new_user',
          password: 'password',
          role: 'admin',
        }),
      }),
    ).rejects.toMatchObject({ status: 422, code: 'INVALID_INPUT' });
  });
});
