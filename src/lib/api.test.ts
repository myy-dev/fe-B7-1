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

  it('응답 본문이 없는 삭제 요청도 처리한다', async () => {
    server.use(
      http.delete(`${API_BASE_URL}/api/example`, () => new HttpResponse(null, { status: 204 })),
    );
    await expect(apiRequest<void>('/api/example', { method: 'DELETE' })).resolves.toBeUndefined();
  });
});
