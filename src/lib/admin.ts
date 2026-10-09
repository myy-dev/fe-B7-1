import type { ChatMessage } from './chats';
import type { CurrentUser } from './auth';

export interface AdminPage<T> {
  items: T[];
  total: number;
  page: number;
  size: number;
}

export interface AdminUser {
  id: number;
  username: string;
  name: string;
  role: CurrentUser['role'];
  created_at: string;
}

export interface AdminUserDetail extends AdminUser {
  last_login_at: string | null;
}

export interface AdminSession {
  chat_id: string;
  user_id: number;
  title: string;
  created_at: string;
  message_count: number;
}

export interface AdminSessionDetail extends AdminSession {
  messages: ChatMessage[];
}

export interface SystemLog {
  timestamp: string;
  level: string;
  event: string;
  request_id: string | null;
  user_id: number | null;
}

export function positiveInteger(value: string | null | undefined): number | null {
  if (!value || !/^\d+$/.test(value)) return null;
  const number = Number(value);
  return Number.isSafeInteger(number) && number > 0 ? number : null;
}

export function pageParams(search: URLSearchParams) {
  return {
    page: positiveInteger(search.get('page')) ?? 1,
    size: Math.min(positiveInteger(search.get('size')) ?? 20, 100),
  };
}

export function formatAdminTime(value: string | null): string {
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '—';
  return new Intl.DateTimeFormat('ko-KR', {
    timeZone: 'Asia/Seoul',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  }).format(date);
}

export function toKstInput(value: string | null): string {
  if (!value || !Number.isFinite(Date.parse(value))) return '';
  return new Date(Date.parse(value) + 9 * 60 * 60 * 1000).toISOString().slice(0, 19);
}

export function toUtc(value: string): string {
  return new Date(`${value}+09:00`).toISOString();
}

export function dateRangeError(start: string | null, end: string | null): string {
  if ((start && !Number.isFinite(Date.parse(start))) || (end && !Number.isFinite(Date.parse(end))))
    return '조회 기간을 확인해 주세요.';
  if (start && end && Date.parse(start) > Date.parse(end))
    return '조회 종료 시각은 조회 시작 시각 이후로 선택해 주세요.';
  return '';
}

export function adminQuery(search: URLSearchParams, keys: string[]): URLSearchParams {
  const { page, size } = pageParams(search);
  const query = new URLSearchParams({ page: String(page), size: String(size) });
  for (const key of keys) {
    const value = search.get(key)?.trim();
    if (value) query.set(key, value);
  }
  return query;
}

export function memberFilterError(search: URLSearchParams): string {
  const id = search.get('user_id');
  return id && !positiveInteger(id) ? '회원 번호(PK)는 양의 정수로 입력해 주세요.' : '';
}
