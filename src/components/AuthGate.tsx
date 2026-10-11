import type { ReactNode } from 'react';
import { Navigate } from 'react-router';
import { useAuth } from '../lib/auth';
import LogoutButton from './LogoutButton';

export default function AuthGate({
  children,
  admin = false,
}: {
  children: ReactNode;
  admin?: boolean;
}) {
  const { session, user, error, retryUser } = useAuth();
  if (!session) return <Navigate to="/login" replace />;
  if (!user) {
    return (
      <section aria-label="로그인 상태 확인" className="mx-auto w-full max-w-md space-y-4 p-6">
        {error ? (
          <>
            <p role="alert" className="alert alert-error">
              {error}
            </p>
            <button type="button" className="btn btn-outline" onClick={retryUser}>
              다시 불러오기
            </button>
            {admin && <LogoutButton />}
          </>
        ) : (
          <p role="status" className="flex items-center justify-center gap-2 text-sm">
            <span aria-hidden="true" className="loading loading-sm loading-spinner" />
            로그인 확인 중
          </p>
        )}
      </section>
    );
  }
  if (admin && user.role !== 'admin') return <Navigate to="/chats" replace />;
  return children;
}
