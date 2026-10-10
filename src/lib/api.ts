import { getAccessToken, signOut } from './auth';

export const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000').replace(
  /\/+$/,
  '',
);

export class ApiError extends Error {
  readonly status: number;
  readonly code: string | null;
  readonly requestId: string | null;

  constructor(
    status: number,
    message: string,
    code: string | null = null,
    requestId: string | null = null,
  ) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.code = code;
    this.requestId = requestId;
  }
}

function getErrorMessage(body: unknown, status: number): string {
  if (typeof body === 'object' && body !== null) {
    if ('message' in body && typeof body.message === 'string') return body.message;
    if ('detail' in body && typeof body.detail === 'string') return body.detail;
    if (
      'error' in body &&
      typeof body.error === 'object' &&
      body.error !== null &&
      'message' in body.error &&
      typeof body.error.message === 'string'
    )
      return body.error.message;
  }
  return `요청에 실패했습니다. (${status})`;
}

// T는 응답 타입 선언이며 런타임 데이터 검증을 수행하지 않는다.
export async function apiRequest<T = unknown>(path: string, options: RequestInit = {}): Promise<T> {
  const requestPath = `/${path.replace(/^\/+/, '')}`;
  const authenticated = /^\/api\/v1\/(chats|admin|auth\/(me|logout))(\/|\?|$)/.test(requestPath);
  const token = authenticated ? getAccessToken() : null;
  if (authenticated && !token) throw new ApiError(401, '로그인이 필요합니다.', 'UNAUTHORIZED');
  const headers = new Headers(options.headers);
  if (token) headers.set('Authorization', `Bearer ${token}`);
  const response = await fetch(`${API_BASE_URL}${requestPath}`, { ...options, headers });
  function assertCurrentSession() {
    if (token && getAccessToken() !== token)
      throw new DOMException('인증 상태가 변경된 요청입니다.', 'AbortError');
  }
  assertCurrentSession();

  if (!response.ok) {
    const body: unknown = await response.json().catch(() => null);
    assertCurrentSession();
    const error = typeof body === 'object' && body !== null && 'error' in body ? body.error : null;
    const code =
      typeof error === 'object' &&
      error !== null &&
      'code' in error &&
      typeof error.code === 'string'
        ? error.code
        : null;
    const requestId =
      typeof error === 'object' &&
      error !== null &&
      'request_id' in error &&
      typeof error.request_id === 'string'
        ? error.request_id
        : null;
    if (response.status === 401 && token) signOut(token);
    throw new ApiError(response.status, getErrorMessage(body, response.status), code, requestId);
  }

  if (response.status === 204) return undefined as T;
  const body = (await response.json()) as T;
  assertCurrentSession();
  return body;
}
