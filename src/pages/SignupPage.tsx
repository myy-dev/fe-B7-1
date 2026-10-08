import { useEffect, useRef, useState, type FormEvent } from 'react';
import { Link, useNavigate } from 'react-router';
import { ApiError, apiRequest } from '../lib/api';

export default function SignupPage() {
  const navigate = useNavigate();
  const [name, setName] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [passwordConfirm, setPasswordConfirm] = useState('');
  const [errors, setErrors] = useState({
    name: '',
    username: '',
    password: '',
    passwordConfirm: '',
  });
  const [pending, setPending] = useState(false);
  const [error, setError] = useState('');
  const signupRequest = useRef<AbortController | null>(null);

  useEffect(() => () => signupRequest.current?.abort(), []);

  function changeUsername(value: string) {
    setUsername(value);
    setErrors((current) => ({ ...current, username: '' }));
    setError('');
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (signupRequest.current) return;
    const nextErrors = {
      name: !name.trim()
        ? '이름을 입력해 주세요.'
        : [...name.trim()].length > 50
          ? '이름은 50자 이내로 입력해 주세요.'
          : '',
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
      passwordConfirm: !passwordConfirm
        ? '비밀번호 확인을 입력해 주세요.'
        : passwordConfirm !== password
          ? '비밀번호가 일치하지 않아요.'
          : '',
    };
    setErrors(nextErrors);
    setError('');
    if (Object.values(nextErrors).some(Boolean)) return;
    const controller = new AbortController();
    signupRequest.current = controller;
    setPending(true);
    try {
      await apiRequest('/api/v1/auth/signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: name.trim(), username, password }),
        signal: controller.signal,
      });
      if (!controller.signal.aborted)
        navigate('/login', { replace: true, state: { signupComplete: true } });
    } catch (cause) {
      if (!controller.signal.aborted) {
        const message =
          cause instanceof ApiError
            ? cause.message
            : '가입 요청을 보내지 못했어요. 다시 시도해 주세요.';
        if (cause instanceof ApiError && cause.code === 'USERNAME_TAKEN')
          setErrors((current) => ({ ...current, username: message }));
        else setError(message);
      }
    } finally {
      if (!controller.signal.aborted) {
        signupRequest.current = null;
        setPending(false);
      }
    }
  }

  return (
    <section aria-labelledby="signup-title">
      <h1 id="signup-title" className="text-2xl font-bold">
        회원가입
      </h1>
      <form noValidate onSubmit={handleSubmit} aria-busy={pending} className="mt-6 space-y-5">
        <div className="fieldset p-0">
          <label htmlFor="signup-name" className="fieldset-label text-base-content">
            이름
          </label>
          <input
            id="signup-name"
            name="name"
            autoComplete="name"
            required
            className="input w-full"
            value={name}
            placeholder="이름을 입력해 주세요"
            disabled={pending}
            aria-invalid={Boolean(errors.name)}
            aria-describedby={errors.name ? 'signup-name-error' : undefined}
            onChange={(event) => {
              setName(event.target.value);
              setErrors((current) => ({ ...current, name: '' }));
              setError('');
            }}
          />
          {errors.name && (
            <p id="signup-name-error" role="alert" className="text-error">
              {errors.name}
            </p>
          )}
        </div>
        <div className="fieldset p-0">
          <label htmlFor="signup-username" className="fieldset-label text-base-content">
            아이디
          </label>
          <div className="flex min-w-0 gap-2">
            <input
              id="signup-username"
              name="username"
              autoComplete="username"
              required
              className="input w-full min-w-0 flex-1"
              value={username}
              placeholder="아이디를 입력해 주세요"
              disabled={pending}
              aria-invalid={Boolean(errors.username)}
              aria-describedby={errors.username ? 'signup-username-error' : undefined}
              onChange={(event) => changeUsername(event.target.value)}
            />
          </div>
          <p
            id="signup-username-error"
            role={errors.username ? 'alert' : undefined}
            className="text-error"
          >
            {errors.username}
          </p>
        </div>
        <div className="fieldset p-0">
          <label htmlFor="signup-password" className="fieldset-label text-base-content">
            비밀번호
          </label>
          <input
            id="signup-password"
            name="password"
            type="password"
            autoComplete="new-password"
            required
            className="input w-full"
            value={password}
            placeholder="비밀번호를 입력해 주세요"
            disabled={pending}
            aria-invalid={Boolean(errors.password)}
            aria-describedby={errors.password ? 'signup-password-error' : undefined}
            onChange={(event) => {
              setPassword(event.target.value);
              setErrors((current) => ({ ...current, password: '', passwordConfirm: '' }));
              setError('');
            }}
          />
          {errors.password && (
            <p id="signup-password-error" role="alert" className="text-error">
              {errors.password}
            </p>
          )}
        </div>
        <div className="fieldset p-0">
          <label htmlFor="signup-password-confirm" className="fieldset-label text-base-content">
            비밀번호 확인
          </label>
          <input
            id="signup-password-confirm"
            name="passwordConfirm"
            type="password"
            autoComplete="new-password"
            required
            className="input w-full"
            value={passwordConfirm}
            placeholder="비밀번호를 다시 입력해 주세요"
            disabled={pending}
            aria-invalid={Boolean(errors.passwordConfirm)}
            aria-describedby={errors.passwordConfirm ? 'signup-password-confirm-error' : undefined}
            onChange={(event) => {
              setPasswordConfirm(event.target.value);
              setErrors((current) => ({ ...current, passwordConfirm: '' }));
              setError('');
            }}
          />
          {errors.passwordConfirm && (
            <p id="signup-password-confirm-error" role="alert" className="text-error">
              {errors.passwordConfirm}
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
          {pending ? '가입 중…' : '회원가입'}
        </button>
      </form>
      <p className="mt-6 text-center text-sm text-base-content/70">
        <Link to="/login" className="link font-semibold text-base-content">
          로그인
        </Link>
      </p>
    </section>
  );
}
