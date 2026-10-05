export const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000').replace(
  /\/+$/,
  '',
);

export class ApiError extends Error {
  readonly status: number;

  constructor(status: number, message: string) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
  }
}

function getErrorMessage(body: unknown, status: number): string {
  if (typeof body === 'object' && body !== null) {
    if ('message' in body && typeof body.message === 'string') return body.message;
    if ('detail' in body && typeof body.detail === 'string') return body.detail;
  }
  return `요청에 실패했습니다. (${status})`;
}

// T는 응답 타입 선언이며 런타임 데이터 검증을 수행하지 않는다.
export async function apiRequest<T = unknown>(path: string, options: RequestInit = {}): Promise<T> {
  const response = await fetch(`${API_BASE_URL}/${path.replace(/^\/+/, '')}`, options);

  if (!response.ok) {
    const body: unknown = await response.json().catch(() => null);
    throw new ApiError(response.status, getErrorMessage(body, response.status));
  }

  if (response.status === 204) return undefined as T;
  return response.json() as Promise<T>;
}
