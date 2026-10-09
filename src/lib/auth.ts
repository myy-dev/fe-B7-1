import { createContext, useContext } from 'react';

export interface LoginResponse {
  access_token: string;
  token_type: string;
  expires_in: number;
}

export interface AuthSession {
  accessToken: string;
  expiresAt: number;
}

export interface CurrentUser {
  id: number;
  username: string;
  name: string;
  role: 'user' | 'admin';
  created_at: string;
  last_login_at: string | null;
}

export function parseCurrentUser(value: unknown): CurrentUser {
  if (
    !value ||
    typeof value !== 'object' ||
    !('id' in value) ||
    typeof value.id !== 'number' ||
    !Number.isSafeInteger(value.id) ||
    value.id <= 0 ||
    !('username' in value) ||
    typeof value.username !== 'string' ||
    !value.username ||
    !('name' in value) ||
    typeof value.name !== 'string' ||
    !('role' in value) ||
    (value.role !== 'user' && value.role !== 'admin') ||
    !('created_at' in value) ||
    typeof value.created_at !== 'string' ||
    !Number.isFinite(Date.parse(value.created_at)) ||
    !('last_login_at' in value) ||
    (value.last_login_at !== null &&
      (typeof value.last_login_at !== 'string' ||
        !Number.isFinite(Date.parse(value.last_login_at))))
  )
    throw new Error('내 정보 응답을 확인하지 못했습니다.');
  return value as CurrentUser;
}

export function getHomePath(user: CurrentUser | null) {
  return user?.role === 'admin' ? '/admin/users' : '/chats';
}

const storageKey = 'quackquack.auth';
let session: AuthSession | null = null;
let initialized = false;
const listeners = new Set<() => void>();

function saveSession(value: AuthSession | null) {
  try {
    if (value) sessionStorage.setItem(storageKey, JSON.stringify(value));
    else sessionStorage.removeItem(storageKey);
  } catch {
    // 저장소 접근 실패 시에도 메모리의 인증 상태는 유지한다.
  }
}

export function getAuthSession(): AuthSession | null {
  if (!initialized) {
    initialized = true;
    try {
      const saved: unknown = JSON.parse(sessionStorage.getItem(storageKey) ?? 'null');
      if (
        saved &&
        typeof saved === 'object' &&
        'accessToken' in saved &&
        typeof saved.accessToken === 'string' &&
        saved.accessToken.trim() &&
        'expiresAt' in saved &&
        typeof saved.expiresAt === 'number' &&
        Number.isFinite(saved.expiresAt) &&
        saved.expiresAt > Date.now()
      )
        session = { accessToken: saved.accessToken, expiresAt: saved.expiresAt };
      if (!session) saveSession(null);
    } catch {
      saveSession(null);
    }
  }
  return session;
}

export function subscribeAuthSession(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function signIn(response: LoginResponse) {
  if (
    !response ||
    typeof response.access_token !== 'string' ||
    !response.access_token.trim() ||
    response.token_type !== 'bearer' ||
    !Number.isFinite(response.expires_in) ||
    response.expires_in <= 0 ||
    !Number.isFinite(Date.now() + response.expires_in * 1000)
  )
    throw new Error('로그인 응답을 확인하지 못했습니다. 다시 시도해 주세요.');
  session = {
    accessToken: response.access_token,
    expiresAt: Date.now() + response.expires_in * 1000,
  };
  initialized = true;
  saveSession(session);
  listeners.forEach((listener) => listener());
}

export function signOut(expectedToken?: string) {
  if (expectedToken && getAuthSession()?.accessToken !== expectedToken) return;
  session = null;
  initialized = true;
  saveSession(null);
  listeners.forEach((listener) => listener());
}

export function getAccessToken(): string | null {
  const current = getAuthSession();
  if (!current) return null;
  if (current.expiresAt <= Date.now()) {
    signOut(current.accessToken);
    return null;
  }
  return current.accessToken;
}

export const AuthContext = createContext<{
  session: AuthSession | null;
  user: CurrentUser | null;
  error: string;
  retryUser: () => void;
  signIn: typeof signIn;
  signOut: () => void;
} | null>(null);

export function useAuth() {
  const value = useContext(AuthContext);
  if (!value) throw new Error('인증 상태는 AuthProvider 안에서 사용해야 합니다.');
  return value;
}
