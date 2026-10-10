import { useEffect, useRef, useState, type FormEvent } from 'react';
import { Link, useLocation, useNavigate } from 'react-router';
import FeedbackToast from '../components/FeedbackToast';
import { ApiError, apiRequest } from '../lib/api';
import { useAuth, type LoginResponse } from '../lib/auth';

export default function LoginPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { signIn } = useAuth();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [pending, setPending] = useState(false);
  const [error, setError] = useState('');
  const [errors, setErrors] = useState({ username: '', password: '' });
  const [signupComplete, setSignupComplete] = useState(location.state?.signupComplete === true);
  const request = useRef<AbortController | null>(null);

  useEffect(() => () => request.current?.abort(), []);

  useEffect(() => {
    if (location.state?.signupComplete !== true) return;
    const state = { ...location.state };
    delete state.signupComplete;
    navigate(`${location.pathname}${location.search}${location.hash}`, { replace: true, state });
  }, [location, navigate]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (request.current) return;
    const nextErrors = {
      username: !username
        ? '아이디를 입력해 주세요.'
        : username.length < 4 || username.length > 20 || /[^a-zA-Z0-9_]/.test(username)
          ? '아이디는 영문·숫자·밑줄로 4~20자 입력해 주세요.'
          : '',
      password: !password
        ? '비밀번호를 입력해 주세요.'
        : [...password].length < 8 || [...password].length > 128
          ? '비밀번호는 8~128자로 입력해 주세요.'
          : '',
    };
    setErrors(nextErrors);
    setError('');
    if (nextErrors.username || nextErrors.password) return;

    const controller = new AbortController();
    request.current = controller;
    setPending(true);
    try {
      const response = await apiRequest<LoginResponse>('/api/v1/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password }),
        signal: controller.signal,
      });
      if (!controller.signal.aborted) {
        signIn(response);
      }
    } catch (cause) {
      if (!controller.signal.aborted) {
        setError(
          cause instanceof ApiError
            ? cause.message
            : cause instanceof Error && cause.message.startsWith('로그인 응답')
              ? cause.message
              : '연결하지 못했어요. 다시 시도해 주세요.',
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
    <section aria-labelledby="login-title">
      <h1 id="login-title" className="text-2xl font-bold">
        로그인
      </h1>
      {signupComplete && (
        <FeedbackToast
          message="회원가입 완료"
          closeLabel="회원가입 완료 알림 닫기"
          onClose={() => setSignupComplete(false)}
        />
      )}
      <form noValidate onSubmit={handleSubmit} aria-busy={pending} className="mt-6 space-y-5">
        <div className="fieldset p-0">
          <label htmlFor="login-username" className="fieldset-label text-base-content">
            아이디
          </label>
          <input
            id="login-username"
            name="username"
            autoComplete="username"
            required
            className={`input w-full ${errors.username ? 'input-error' : ''}`}
            placeholder="아이디를 입력해 주세요"
            value={username}
            disabled={pending}
            aria-invalid={Boolean(errors.username)}
            aria-describedby={errors.username ? 'login-username-error' : undefined}
            onChange={(event) => {
              setUsername(event.target.value);
              setError('');
              setErrors((current) => ({ ...current, username: '' }));
            }}
          />
          {errors.username && (
            <p id="login-username-error" className="text-error" role="alert">
              {errors.username}
            </p>
          )}
        </div>
        <div className="fieldset p-0">
          <label htmlFor="login-password" className="fieldset-label text-base-content">
            비밀번호
          </label>
          <input
            id="login-password"
            name="password"
            type="password"
            autoComplete="current-password"
            required
            className={`input w-full ${errors.password ? 'input-error' : ''}`}
            placeholder="비밀번호를 입력해 주세요"
            value={password}
            disabled={pending}
            aria-invalid={Boolean(errors.password)}
            aria-describedby={errors.password ? 'login-password-error' : undefined}
            onChange={(event) => {
              setPassword(event.target.value);
              setError('');
              setErrors((current) => ({ ...current, password: '' }));
            }}
          />
          {errors.password && (
            <p id="login-password-error" className="text-error" role="alert">
              {errors.password}
            </p>
          )}
        </div>
        {error && (
          <div role="alert" className="alert text-sm alert-error">
            {error}
          </div>
        )}
        <button type="submit" className="btn w-full btn-primary" disabled={pending}>
          {pending && <span aria-hidden="true" className="loading loading-sm loading-spinner" />}
          {pending ? '로그인 중…' : '로그인'}
        </button>
      </form>
      <p className="mt-6 text-center text-sm text-base-content/70">
        <Link to="/signup" className="link font-semibold text-base-content">
          회원가입
        </Link>
      </p>
    </section>
  );
}
