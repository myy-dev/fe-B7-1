import { http, HttpResponse } from 'msw';
import { describe, expect, it } from 'vitest';
import { server } from '../mocks/server';
import { API_BASE_URL, apiRequest } from './api';

describe('API 요청과 MSW 연동', () => {
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
