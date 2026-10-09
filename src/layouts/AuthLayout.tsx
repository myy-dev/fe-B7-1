import { Navigate, Outlet } from 'react-router';
import DuckAvatar from '../components/DuckAvatar';
import { getHomePath, useAuth } from '../lib/auth';
import AuthGate from '../components/AuthGate';

export default function AuthLayout() {
  const { session, user } = useAuth();
  if (session)
    return (
      <AuthGate>
        <Navigate to={getHomePath(user)} replace />
      </AuthGate>
    );
  return (
    <div className="grid w-full max-w-4xl items-center gap-8 lg:grid-cols-2 lg:gap-16">
      <div className="text-center lg:text-left">
        <div className="mx-auto mb-5 grid size-28 place-items-center rounded-full bg-secondary lg:mx-0 lg:size-44">
          <DuckAvatar className="size-24 lg:size-40" />
        </div>
        <p className="text-2xl leading-snug font-extrabold tracking-tight lg:text-4xl">
          오늘도 반가워요.
          <br />
          꽥꽥이가 기다렸어요!
        </p>
      </div>
      <div className="card w-full min-w-0 border border-base-300 bg-base-100 shadow-sm">
        <div className="card-body gap-6 p-6 sm:p-8">
          <Outlet />
        </div>
      </div>
    </div>
  );
}
