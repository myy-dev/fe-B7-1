import { afterEach, describe, expect, it, vi } from 'vitest';

afterEach(() => sessionStorage.clear());

describe('새로고침 시 인증 상태 복원', () => {
  it('유효한 저장 토큰과 만료 시각을 복원한다', async () => {
    sessionStorage.setItem(
      'quackquack.auth',
      JSON.stringify({ accessToken: 'saved-token', expiresAt: Date.now() + 60000 }),
    );
    vi.resetModules();
    const { getAuthSession } = await import('./auth');
    expect(getAuthSession()).toEqual({ accessToken: 'saved-token', expiresAt: expect.any(Number) });
  });

  it.each([
    '{invalid-json',
    JSON.stringify({ accessToken: '', expiresAt: Date.now() + 60000 }),
    JSON.stringify({ accessToken: 'expired-token', expiresAt: 1 }),
    JSON.stringify({ accessToken: 'missing-expiration' }),
  ])('손상되거나 만료된 저장 상태로 로그인하지 않는다 (%s)', async (saved) => {
    sessionStorage.setItem('quackquack.auth', saved);
    vi.resetModules();
    const { getAuthSession } = await import('./auth');
    expect(getAuthSession()).toBeNull();
    expect(sessionStorage.getItem('quackquack.auth')).toBeNull();
  });
});
