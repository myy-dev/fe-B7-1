import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { delay, http, HttpResponse } from 'msw';
import { MemoryRouter } from 'react-router';
import { describe, expect, it, vi } from 'vitest';
import App from '../App';
import { API_BASE_URL, apiRequest } from '../lib/api';
import { server } from '../mocks/server';
import { createMockLoginResponse } from '../mocks/handlers';

function renderPage(path: string) {
  render(
    <MemoryRouter initialEntries={[path]}>
      <App />
    </MemoryRouter>,
  );
  return userEvent.setup();
}

async function fillSignup(user: ReturnType<typeof userEvent.setup>, username = 'new_friend') {
  await user.type(screen.getByLabelText('이름'), '오리 친구');
  await user.type(screen.getByLabelText('아이디'), username);
  await user.type(screen.getByLabelText('비밀번호'), 'Example-password1');
  await user.type(screen.getByLabelText('비밀번호 확인'), 'Example-password1');
}

describe('로그인 API 연결', () => {
  it('필수 입력 안내 후 회원가입 화면으로 이동한다', async () => {
    const user = renderPage('/login');
    await user.click(screen.getByRole('button', { name: '로그인' }));
    expect(screen.getByText('아이디를 입력해 주세요.')).toBeInTheDocument();
    expect(screen.getByText('비밀번호를 입력해 주세요.')).toBeInTheDocument();
    await user.click(screen.getByRole('link', { name: '회원가입' }));
    expect(screen.getByRole('heading', { name: '회원가입' })).toBeInTheDocument();
  });

  it('중복 제출을 막고 성공 시 채팅 시작 화면으로 이동한다', async () => {
    let calls = 0;
    server.use(
      http.post(`${API_BASE_URL}/api/v1/auth/login`, async ({ request }) => {
        calls++;
        expect(await request.json()).toEqual({ username: 'friend', password: 'example-password' });
        await delay(150);
        return HttpResponse.json(createMockLoginResponse());
      }),
    );
    const user = renderPage('/login');
    await user.type(screen.getByLabelText('아이디'), 'friend');
    await user.type(screen.getByLabelText('비밀번호'), 'example-password');
    await user.dblClick(screen.getByRole('button', { name: '로그인' }));
    expect(screen.getByRole('button', { name: '로그인 중…' })).toBeDisabled();
    expect(screen.getByLabelText('아이디')).toBeDisabled();
    await screen.findByRole('heading', { name: '반가워요, 저는 꽥꽥이예요.' });
    expect(calls).toBe(1);
  });

  it('로그인 실패 시 입력을 보존하고 수정 후 다시 시도한다', async () => {
    const user = renderPage('/login');
    await user.type(screen.getByLabelText('아이디'), 'wrong');
    await user.type(screen.getByLabelText('비밀번호'), 'example-password');
    await user.click(screen.getByRole('button', { name: '로그인' }));
    expect(await screen.findByRole('alert')).toHaveTextContent(
      '아이디 또는 비밀번호가 올바르지 않습니다.',
    );
    expect(screen.getByLabelText('비밀번호')).toHaveValue('example-password');
    await user.clear(screen.getByLabelText('아이디'));
    await user.type(screen.getByLabelText('아이디'), 'friend');
    await user.click(screen.getByRole('button', { name: '로그인' }));
    await screen.findByRole('heading', { name: '반가워요, 저는 꽥꽥이예요.' });
  });

  it.each([
    [
      '서버 오류',
      () => HttpResponse.json({ message: '잠시 연결이 어려워요.' }, { status: 503 }),
      '잠시 연결이 어려워요.',
    ],
    ['네트워크 오류', () => HttpResponse.error(), '연결하지 못했어요. 다시 시도해 주세요.'],
  ])('%s를 안내하고 제출 버튼을 복원한다', async (_label, response, message) => {
    server.use(http.post(`${API_BASE_URL}/api/v1/auth/login`, response));
    const user = renderPage('/login');
    await user.type(screen.getByLabelText('아이디'), 'friend');
    await user.type(screen.getByLabelText('비밀번호'), 'example-password');
    await user.click(screen.getByRole('button', { name: '로그인' }));
    expect(await screen.findByRole('alert')).toHaveTextContent(message);
    expect(screen.getByRole('button', { name: '로그인' })).toBeEnabled();
  });
});

describe('회원가입 API 연결', () => {
  it('필수 입력을 검증하고 중복 확인 요청 없이 가입할 수 있다', async () => {
    const user = renderPage('/signup');
    expect(screen.queryByRole('button', { name: '중복 확인' })).not.toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: '회원가입' }));
    expect(screen.getByText('이름을 입력해 주세요.')).toBeInTheDocument();
    expect(screen.getByText('아이디를 입력해 주세요.')).toBeInTheDocument();
    expect(screen.getByText('비밀번호를 입력해 주세요.')).toBeInTheDocument();
    expect(screen.getByText('비밀번호 확인을 입력해 주세요.')).toBeInTheDocument();
    await fillSignup(user);
    await user.click(screen.getByRole('button', { name: '회원가입' }));
    expect(await screen.findByRole('heading', { name: '로그인' })).toBeInTheDocument();
    expect(screen.getByRole('status')).toHaveTextContent('회원가입 완료');
  });

  it('실제 API 모드에서 이름만 정리하고 비밀번호 원문을 전송한 뒤 로그인 화면으로 이동한다', async () => {
    vi.stubEnv('VITE_ENABLE_MSW', 'false');
    let calls = 0;
    server.use(
      http.post(`${API_BASE_URL}/api/v1/auth/signup`, async ({ request }) => {
        calls++;
        expect(await request.json()).toEqual({
          name: '오리 친구',
          username: 'Test_User',
          password: 'Password123!',
        });
        return HttpResponse.json(
          { id: 1, username: 'test_user', name: '오리 친구', created_at: '2026-10-08T00:00:00Z' },
          { status: 201 },
        );
      }),
    );
    const user = renderPage('/signup');
    await user.type(screen.getByLabelText('이름'), ' 오리 친구 ');
    await user.type(screen.getByLabelText('아이디'), 'Test_User');
    await user.type(screen.getByLabelText('비밀번호'), 'Password123!');
    await user.type(screen.getByLabelText('비밀번호 확인'), 'Password123!');
    await user.click(screen.getByRole('button', { name: '회원가입' }));
    await screen.findByRole('heading', { name: '로그인' });
    expect(screen.getByRole('status')).toHaveTextContent('회원가입 완료');
    expect(screen.getByRole('button', { name: '로그인' })).toBeEnabled();
    expect(calls).toBe(1);
  });

  it.each([
    ['아이디', 'abc', '아이디는 영문·숫자·밑줄로 4~20자 입력해 주세요.'],
    ['아이디', 'new-friend', '아이디는 영문·숫자·밑줄로 4~20자 입력해 주세요.'],
    ['아이디', ' test_user ', '아이디는 영문·숫자·밑줄로 4~20자 입력해 주세요.'],
    ['아이디', 'a'.repeat(21), '아이디는 영문·숫자·밑줄로 4~20자 입력해 주세요.'],
    [
      '비밀번호',
      'a'.repeat(7),
      '비밀번호는 영문·숫자·특수문자를 포함한 8~128자로, 공백 없이 입력해 주세요.',
    ],
    [
      '비밀번호',
      'a'.repeat(129),
      '비밀번호는 영문·숫자·특수문자를 포함한 8~128자로, 공백 없이 입력해 주세요.',
    ],
    ['이름', '가'.repeat(51), '이름은 50자 이내로 입력해 주세요.'],
  ])('%s의 서버 입력 규칙 위반을 요청 전에 막는다 (%s)', async (field, value, message) => {
    let calls = 0;
    server.use(
      http.post(`${API_BASE_URL}/api/v1/auth/signup`, () => {
        calls++;
        return HttpResponse.json({});
      }),
    );
    const user = renderPage('/signup');
    await fillSignup(user);
    await user.clear(screen.getByLabelText(field));
    await user.type(screen.getByLabelText(field), value);
    await user.click(screen.getByRole('button', { name: '회원가입' }));
    expect(screen.getByText(message)).toBeInTheDocument();
    expect(calls).toBe(0);
  });

  it('비밀번호 변경 후 확인 값이 다르면 요청하지 않는다', async () => {
    const user = renderPage('/signup');
    await fillSignup(user);
    await user.clear(screen.getByLabelText('비밀번호'));
    await user.type(screen.getByLabelText('비밀번호'), 'Changed-password2');
    await user.click(screen.getByRole('button', { name: '회원가입' }));
    expect(screen.getByText('비밀번호가 일치하지 않아요.')).toBeInTheDocument();
    expect(screen.getByLabelText('비밀번호 확인')).toHaveAttribute('aria-invalid', 'true');
    await user.clear(screen.getByLabelText('비밀번호 확인'));
    await user.type(screen.getByLabelText('비밀번호 확인'), 'Changed-password2');
    await user.click(screen.getByRole('button', { name: '회원가입' }));
    await screen.findByRole('heading', { name: '로그인' });
  });

  it('대소문자를 구분하지 않는 중복 오류를 아이디에 표시하고 변경 후 가입한다', async () => {
    const user = renderPage('/signup');
    await fillSignup(user, 'TaKeN');
    await user.click(screen.getByRole('button', { name: '회원가입' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('이미 사용 중인 아이디입니다.');
    expect(screen.getByLabelText('아이디')).toHaveAttribute('aria-invalid', 'true');
    expect(screen.getByLabelText('비밀번호')).toHaveValue('Example-password1');
    await user.clear(screen.getByLabelText('아이디'));
    await user.type(screen.getByLabelText('아이디'), 'new_friend');
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: '회원가입' }));
    await screen.findByRole('heading', { name: '로그인' });
  });

  it('가입 요청 중 중복 제출과 입력 변경을 막는다', async () => {
    let calls = 0;
    server.use(
      http.post(`${API_BASE_URL}/api/v1/auth/signup`, async () => {
        calls++;
        await delay(150);
        return HttpResponse.json(
          {
            id: 1,
            username: 'new_friend',
            name: '오리 친구',
            created_at: new Date().toISOString(),
          },
          { status: 201 },
        );
      }),
    );
    const user = renderPage('/signup');
    await fillSignup(user);
    await user.dblClick(screen.getByRole('button', { name: '회원가입' }));
    expect(screen.getByRole('button', { name: '가입 중…' })).toBeDisabled();
    expect(screen.getByLabelText('아이디')).toBeDisabled();
    await screen.findByRole('heading', { name: '로그인' });
    expect(calls).toBe(1);
  });

  it.each([
    [
      '서버 오류',
      () =>
        HttpResponse.json(
          {
            error: {
              code: 'DB_ERROR',
              message: '가입을 처리하지 못했습니다.',
              request_id: 'signup-request',
            },
          },
          { status: 500 },
        ),
      '가입을 처리하지 못했습니다.',
    ],
    ['네트워크 오류', () => HttpResponse.error(), '가입 요청을 보내지 못했어요.'],
  ])('%s에서 입력을 보존하고 재시도한다', async (_label, failure, message) => {
    let calls = 0;
    server.use(
      http.post(`${API_BASE_URL}/api/v1/auth/signup`, () =>
        ++calls === 1
          ? failure()
          : HttpResponse.json(
              {
                id: 1,
                username: 'new_friend',
                name: '오리 친구',
                created_at: new Date().toISOString(),
              },
              { status: 201 },
            ),
      ),
    );
    const user = renderPage('/signup');
    await fillSignup(user);
    await user.click(screen.getByRole('button', { name: '회원가입' }));
    expect(await screen.findByRole('alert')).toHaveTextContent(message);
    expect(screen.getByLabelText('이름')).toHaveValue('오리 친구');
    expect(screen.getByLabelText('비밀번호')).toHaveValue('Example-password1');
    await user.click(screen.getByRole('button', { name: '회원가입' }));
    await screen.findByRole('heading', { name: '로그인' });
  });

  it('입력 전에 아이디와 비밀번호 규칙을 안내하고 입력 필드와 연결한다', () => {
    renderPage('/signup');
    expect(screen.getByLabelText('아이디')).toHaveAccessibleDescription(
      '영문·숫자·밑줄(_)만 사용, 4~20자(공백 불가)',
    );
    expect(screen.getByLabelText('비밀번호')).toHaveAccessibleDescription(
      '영문·숫자·특수문자 포함 8자 이상(공백 불가)',
    );
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });

  it.each([
    'Password!',
    'Password123',
    '1234567!',
    ' Password123!',
    'Password123! ',
    ' '.repeat(8),
    'Password123!한글',
    'Password123!😀',
  ])('문자 조합이나 허용 문자를 위반한 비밀번호는 전송하지 않는다 (%s)', async (password) => {
    let calls = 0;
    server.use(
      http.post(`${API_BASE_URL}/api/v1/auth/signup`, () => {
        calls++;
        return HttpResponse.json({});
      }),
    );
    const user = renderPage('/signup');
    await fillSignup(user);
    await user.clear(screen.getByLabelText('비밀번호'));
    await user.type(screen.getByLabelText('비밀번호'), password);
    await user.clear(screen.getByLabelText('비밀번호 확인'));
    await user.type(screen.getByLabelText('비밀번호 확인'), password);
    await user.click(screen.getByRole('button', { name: '회원가입' }));
    expect(screen.getByRole('alert')).toHaveTextContent(
      '비밀번호는 영문·숫자·특수문자를 포함한 8~128자로, 공백 없이 입력해 주세요.',
    );
    expect(calls).toBe(0);
  });

  it.each(['Abc123!@', `Aa1!${'a'.repeat(124)}`])(
    '허용 길이의 경계값으로 가입할 수 있다 (%s)',
    async (password) => {
      const user = renderPage('/signup');
      await fillSignup(user);
      await user.clear(screen.getByLabelText('비밀번호'));
      await user.type(screen.getByLabelText('비밀번호'), password);
      await user.clear(screen.getByLabelText('비밀번호 확인'));
      await user.type(screen.getByLabelText('비밀번호 확인'), password);
      await user.click(screen.getByRole('button', { name: '회원가입' }));
      await screen.findByRole('heading', { name: '로그인' });
    },
  );

  it.each([
    'Password!',
    'Password123',
    '1234567!',
    'Password123! ',
    'Password123!한글',
    'Password123!😀',
    'Password123!\n',
    'Aa1!aaa',
    `Aa1!${'a'.repeat(125)}`,
  ])('MSW도 잘못된 가입 비밀번호에 422를 반환한다 (%s)', async (password) => {
    await expect(
      apiRequest('/api/v1/auth/signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: '오리 친구', username: 'new_friend', password }),
      }),
    ).rejects.toMatchObject({ status: 422 });
  });
});
