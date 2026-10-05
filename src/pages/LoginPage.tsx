import { useEffect, useRef, useState, type FormEvent } from 'react';
import { useNavigate } from 'react-router';
import { ApiError, apiRequest } from '../lib/api';

export default function LoginPage() {
  const navigate = useNavigate();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [pending, setPending] = useState(false);
  const [error, setError] = useState('');
  const [errors, setErrors] = useState({ username: '', password: '' });
  const request = useRef<AbortController | null>(null);

  useEffect(() => () => request.current?.abort(), []);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (request.current) return;
    const nextErrors = {
      username: username.trim() ? '' : '아이디를 입력해 주세요.',
      password: password.trim() ? '' : '비밀번호를 입력해 주세요.',
    };
    setErrors(nextErrors);
    setError('');
    if (nextErrors.username || nextErrors.password) return;

    const controller = new AbortController();
    request.current = controller;
    setPending(true);
    try {
      // 회원 API 확정 전의 퍼블리싱용 임시 계약. 인증 상태는 저장하지 않는다.
      await apiRequest('/api/v1/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: username.trim(), password }),
        signal: controller.signal,
      });
      if (!controller.signal.aborted) navigate('/chats');
    } catch (cause) {
      if (!controller.signal.aborted) {
        setError(
          cause instanceof ApiError ? cause.message : '연결하지 못했어요. 다시 시도해 주세요.',
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
            className="input w-full"
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
            className="input w-full"
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
    </section>
  );
}
