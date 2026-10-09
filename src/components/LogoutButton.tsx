import { useEffect, useRef, useState } from 'react';
import { ApiError, apiRequest } from '../lib/api';
import { getAuthSession, signOut, useAuth } from '../lib/auth';

export default function LogoutButton() {
  const { session } = useAuth();
  const request = useRef<AbortController | null>(null);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => () => request.current?.abort(), []);
  useEffect(() => {
    if (!error) return;
    const timer = setTimeout(() => setError(''), 5000);
    return () => clearTimeout(timer);
  }, [error]);

  async function logout() {
    if (!session || request.current) return;
    const token = session.accessToken;
    const controller = new AbortController();
    request.current = controller;
    setPending(true);
    setError('');
    try {
      await apiRequest<void>('/api/v1/auth/logout', {
        method: 'POST',
        signal: controller.signal,
      });
      if (!controller.signal.aborted) signOut(token);
    } catch (cause) {
      if (!controller.signal.aborted && getAuthSession()?.accessToken === token) {
        setError(
          cause instanceof ApiError ? cause.message : '로그아웃하지 못했어요. 다시 시도해 주세요.',
        );
      }
    } finally {
      if (!controller.signal.aborted) {
        request.current = null;
        setPending(false);
      }
    }
  }

  return (
    <>
      <button
        type="button"
        className="btn btn-ghost btn-sm"
        disabled={pending}
        onClick={() => void logout()}
      >
        {pending && <span aria-hidden="true" className="loading loading-xs loading-spinner" />}
        {pending ? '로그아웃 중…' : '로그아웃'}
      </button>
      {error && (
        <div className="toast toast-center toast-top z-50 w-max max-w-full px-4">
          <div role="alert" className="alert text-sm alert-error shadow-lg">
            <span>{error}</span>
            <button
              type="button"
              aria-label="로그아웃 오류 알림 닫기"
              className="btn btn-circle btn-ghost btn-xs"
              onClick={() => setError('')}
            >
              <span aria-hidden="true">×</span>
            </button>
          </div>
        </div>
      )}
    </>
  );
}
