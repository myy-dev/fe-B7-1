import { useEffect, useRef, useState, useSyncExternalStore, type ReactNode } from 'react';
import { useNavigate } from 'react-router';
import {
  AuthContext,
  getAuthSession,
  parseCurrentUser,
  signIn,
  signOut,
  subscribeAuthSession,
  type CurrentUser,
} from '../lib/auth';
import { ApiError, apiRequest } from '../lib/api';

export default function AuthProvider({ children }: { children: ReactNode }) {
  const session = useSyncExternalStore(subscribeAuthSession, getAuthSession);
  const navigate = useNavigate();
  const previousSession = useRef(session);
  useEffect(() => {
    if (!session) return;
    let timer: ReturnType<typeof setTimeout>;
    function checkExpiration() {
      const remaining = session!.expiresAt - Date.now();
      if (remaining <= 0) {
        signOut(session!.accessToken);
        return;
      }
      clearTimeout(timer);
      timer = setTimeout(checkExpiration, Math.min(remaining, 2 ** 31 - 1));
    }
    checkExpiration();
    window.addEventListener('focus', checkExpiration);
    document.addEventListener('visibilitychange', checkExpiration);
    return () => {
      clearTimeout(timer);
      window.removeEventListener('focus', checkExpiration);
      document.removeEventListener('visibilitychange', checkExpiration);
    };
  }, [session]);

  useEffect(() => {
    const lostSession = previousSession.current !== null && session === null;
    previousSession.current = session;
    if (lostSession) navigate('/login', { replace: true });
  }, [session, navigate]);

  return (
    <SessionContextProvider key={session?.accessToken ?? 'guest'} session={session}>
      {children}
    </SessionContextProvider>
  );
}

function SessionContextProvider({
  session,
  children,
}: {
  session: ReturnType<typeof getAuthSession>;
  children: ReactNode;
}) {
  const [profile, setProfile] = useState<{
    user: CurrentUser | null;
    error: string;
  } | null>(null);
  const [attempt, setAttempt] = useState(0);
  const user = profile?.user ?? null;
  const error = profile?.error ?? '';

  useEffect(() => {
    if (!session) return;
    const token = session.accessToken;
    const controller = new AbortController();
    async function loadUser() {
      try {
        const result = await apiRequest('/api/v1/auth/me', { signal: controller.signal });
        const user = parseCurrentUser(result);
        if (!controller.signal.aborted) setProfile({ user, error: '' });
      } catch (cause) {
        if (!controller.signal.aborted && getAuthSession()?.accessToken === token) {
          setProfile({
            user: null,
            error: cause instanceof ApiError ? cause.message : '내 정보를 불러오지 못했어요.',
          });
        }
      }
    }
    void loadUser();
    return () => controller.abort();
  }, [session, attempt]);

  function retryUser() {
    setProfile(null);
    setAttempt((current) => current + 1);
  }

  return (
    <AuthContext value={{ session, user, error, retryUser, signIn, signOut }}>
      {children}
    </AuthContext>
  );
}
