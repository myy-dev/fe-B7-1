import { useEffect, useRef, useSyncExternalStore, type ReactNode } from 'react';
import { useNavigate } from 'react-router';
import { AuthContext, getAuthSession, signIn, signOut, subscribeAuthSession } from '../lib/auth';

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

  return <AuthContext value={{ session, signIn, signOut }}>{children}</AuthContext>;
}
