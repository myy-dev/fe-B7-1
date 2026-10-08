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

export function isMockEnabled(): boolean {
  return import.meta.env.VITE_ENABLE_MSW === 'true';
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
  const response = await fetch(`${API_BASE_URL}/${path.replace(/^\/+/, '')}`, options);

  if (!response.ok) {
    const body: unknown = await response.json().catch(() => null);
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
    throw new ApiError(response.status, getErrorMessage(body, response.status), code, requestId);
  }

  if (response.status === 204) return undefined as T;
  return response.json() as Promise<T>;
}
