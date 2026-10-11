import { useEffect, useRef, useState } from 'react';
import FeedbackToast from './FeedbackToast';
import { ApiError, apiRequest } from '../lib/api';
import { getAuthSession, signOut, useAuth } from '../lib/auth';

export default function LogoutButton() {
  const { session } = useAuth();
  const request = useRef<AbortController | null>(null);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => () => request.current?.abort(), []);
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
        <FeedbackToast
          message={error}
          error
          closeLabel="로그아웃 오류 알림 닫기"
          onClose={() => setError('')}
        />
      )}
    </>
  );
}
