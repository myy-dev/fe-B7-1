import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { delay, http, HttpResponse } from 'msw';
import { MemoryRouter } from 'react-router';
import { describe, expect, it } from 'vitest';
import App from '../App';
import { API_BASE_URL } from '../lib/api';
import { server } from '../mocks/server';

function renderPage(path: string) {
  render(
    <MemoryRouter initialEntries={[path]}>
      <App />
    </MemoryRouter>,
  );
  return userEvent.setup();
}

async function fillSignup(user: ReturnType<typeof userEvent.setup>, username = 'new-friend') {
  await user.type(screen.getByLabelText('이름'), '오리 친구');
  await user.type(screen.getByLabelText('아이디'), username);
  await user.type(screen.getByLabelText('비밀번호'), 'example-password');
  await user.type(screen.getByLabelText('비밀번호 확인'), 'example-password');
}

describe('로그인 미리보기', () => {
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
        return HttpResponse.json({ message: '완료' });
      }),
    );
    const user = renderPage('/login');
    await user.type(screen.getByLabelText('아이디'), ' friend ');
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
      '아이디 또는 비밀번호를 확인해 주세요.',
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

describe('회원가입 미리보기', () => {
  it('공백 입력과 중복 확인 전 가입을 막는다', async () => {
    let calls = 0;
    server.use(
      http.post(`${API_BASE_URL}/api/v1/auth/signup`, () => {
        calls++;
        return HttpResponse.json({});
      }),
    );
    const user = renderPage('/signup');
    await user.type(screen.getByLabelText('이름'), '   ');
    await user.click(screen.getByRole('button', { name: '회원가입' }));
    expect(screen.getByText('이름을 입력해 주세요.')).toBeInTheDocument();
    expect(screen.getByText('아이디를 입력해 주세요.')).toBeInTheDocument();
    expect(screen.getByText('비밀번호를 입력해 주세요.')).toBeInTheDocument();
    expect(screen.getByText('비밀번호 확인을 입력해 주세요.')).toBeInTheDocument();
    await fillSignup(user);
    await user.click(screen.getByRole('button', { name: '회원가입' }));
    expect(screen.getByText('아이디 중복 확인을 완료해 주세요.')).toBeInTheDocument();
    expect(calls).toBe(0);
  });

  it('비밀번호가 다르거나 변경되면 가입을 막고 일치할 때 요청한다', async () => {
    let calls = 0;
    server.use(
      http.post(`${API_BASE_URL}/api/v1/auth/signup`, async ({ request }) => {
        calls++;
        expect(await request.json()).toEqual({
          name: '오리 친구',
          username: 'new-friend',
          password: 'changed-password',
        });
        return HttpResponse.json({ message: '완료' }, { status: 201 });
      }),
    );
    const user = renderPage('/signup');
    await fillSignup(user);
    await user.click(screen.getByRole('button', { name: '중복 확인' }));
    await screen.findByText('사용할 수 있는 아이디예요.');
    await user.clear(screen.getByLabelText('비밀번호 확인'));
    await user.type(screen.getByLabelText('비밀번호 확인'), 'different-password');
    await user.click(screen.getByRole('button', { name: '회원가입' }));
    expect(screen.getByText('비밀번호가 일치하지 않아요.')).toBeInTheDocument();
    expect(screen.getByLabelText('비밀번호 확인')).toHaveAttribute('aria-invalid', 'true');
    expect(calls).toBe(0);
    await user.clear(screen.getByLabelText('비밀번호 확인'));
    await user.type(screen.getByLabelText('비밀번호 확인'), 'example-password');
    await user.clear(screen.getByLabelText('비밀번호'));
    await user.type(screen.getByLabelText('비밀번호'), 'changed-password');
    await user.click(screen.getByRole('button', { name: '회원가입' }));
    expect(screen.getByText('비밀번호가 일치하지 않아요.')).toBeInTheDocument();
    expect(calls).toBe(0);
    await user.clear(screen.getByLabelText('비밀번호 확인'));
    await user.type(screen.getByLabelText('비밀번호 확인'), 'changed-password');
    await user.click(screen.getByRole('button', { name: '회원가입' }));
    await screen.findByRole('heading', { name: '회원가입 완료' });
    expect(calls).toBe(1);
  });

  it('중복·확인 실패를 표시하고 다른 아이디로 다시 확인한다', async () => {
    const user = renderPage('/signup');
    await user.type(screen.getByLabelText('아이디'), 'taken');
    await user.click(screen.getByRole('button', { name: '중복 확인' }));
    expect(screen.getByRole('button', { name: '확인 중…' })).toBeDisabled();
    await screen.findByText('이미 사용 중인 아이디예요.');
    expect(screen.getByLabelText('아이디')).toHaveAttribute('aria-invalid', 'true');
    await user.clear(screen.getByLabelText('아이디'));
    await user.type(screen.getByLabelText('아이디'), 'error');
    await user.click(screen.getByRole('button', { name: '중복 확인' }));
    await screen.findByText('확인하지 못했어요. 다시 시도해 주세요.');
    await user.clear(screen.getByLabelText('아이디'));
    await user.type(screen.getByLabelText('아이디'), 'new-friend');
    await user.click(screen.getByRole('button', { name: '중복 확인' }));
    await screen.findByText('사용할 수 있는 아이디예요.');
  });

  it('확인한 아이디를 변경하면 재확인 전 가입을 막는다', async () => {
    const user = renderPage('/signup');
    await fillSignup(user);
    await user.click(screen.getByRole('button', { name: '중복 확인' }));
    await screen.findByText('사용할 수 있는 아이디예요.');
    await user.type(screen.getByLabelText('아이디'), '-changed');
    expect(screen.queryByText('사용할 수 있는 아이디예요.')).not.toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: '회원가입' }));
    expect(screen.getByText('아이디 중복 확인을 완료해 주세요.')).toBeInTheDocument();
  });

  it('아이디 변경 후 이전 요청의 늦은 응답을 무시한다', async () => {
    let releaseOld: (() => void) | undefined;
    let oldStarted = false;
    server.use(
      http.get(`${API_BASE_URL}/api/v1/users/check-username`, async ({ request }) => {
        if (new URL(request.url).searchParams.get('username') === 'old') {
          await new Promise<void>((resolve) => {
            releaseOld = resolve;
            oldStarted = true;
          });
          return HttpResponse.json({ available: false });
        }
        return HttpResponse.json({ available: true });
      }),
    );
    const user = renderPage('/signup');
    await user.type(screen.getByLabelText('아이디'), 'old');
    await user.click(screen.getByRole('button', { name: '중복 확인' }));
    await waitFor(() => expect(oldStarted).toBe(true));
    await user.clear(screen.getByLabelText('아이디'));
    await user.type(screen.getByLabelText('아이디'), 'new');
    await user.click(screen.getByRole('button', { name: '중복 확인' }));
    await screen.findByText('사용할 수 있는 아이디예요.');
    releaseOld?.();
    // 이전 handler가 응답한 뒤에도 새 아이디의 확인 결과가 유지되는지 확인한다.
    await user.type(screen.getByLabelText('이름'), '오리 친구');
    await user.type(screen.getByLabelText('비밀번호'), 'example-password');
    expect(screen.queryByText('이미 사용 중인 아이디예요.')).not.toBeInTheDocument();
    expect(screen.getByLabelText('아이디')).toHaveValue('new');
  });

  it('가입 요청 중 중복 제출을 막고 완료 후 로그인 화면으로 이동한다', async () => {
    let calls = 0;
    server.use(
      http.post(`${API_BASE_URL}/api/v1/auth/signup`, async ({ request }) => {
        calls++;
        expect(await request.json()).toEqual({
          name: '오리 친구',
          username: 'new-friend',
          password: 'example-password',
        });
        await delay(150);
        return HttpResponse.json({ message: '완료' }, { status: 201 });
      }),
    );
    const user = renderPage('/signup');
    await fillSignup(user);
    await user.click(screen.getByRole('button', { name: '중복 확인' }));
    await screen.findByText('사용할 수 있는 아이디예요.');
    await user.dblClick(screen.getByRole('button', { name: '회원가입' }));
    expect(screen.getByRole('button', { name: '가입 중…' })).toBeDisabled();
    await screen.findByRole('heading', { name: '회원가입 완료' });
    expect(calls).toBe(1);
    await user.click(screen.getByRole('link', { name: '로그인 화면으로 이동' }));
    expect(screen.getByRole('heading', { name: '로그인' })).toBeInTheDocument();
  });

  it('가입 실패 시 입력과 확인 결과를 보존해 다시 제출한다', async () => {
    let calls = 0;
    server.use(
      http.post(`${API_BASE_URL}/api/v1/auth/signup`, () =>
        ++calls === 1
          ? HttpResponse.error()
          : HttpResponse.json({ message: '완료' }, { status: 201 }),
      ),
    );
    const user = renderPage('/signup');
    await fillSignup(user);
    await user.click(screen.getByRole('button', { name: '중복 확인' }));
    await screen.findByText('사용할 수 있는 아이디예요.');
    await user.click(screen.getByRole('button', { name: '회원가입' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('가입 요청을 보내지 못했어요.');
    expect(screen.getByLabelText('이름')).toHaveValue('오리 친구');
    expect(screen.getByLabelText('비밀번호')).toHaveValue('example-password');
    await user.click(screen.getByRole('button', { name: '회원가입' }));
    await screen.findByRole('heading', { name: '회원가입 완료' });
  });

  it('가입 단계의 중복 오류에서 확인 결과를 무효화한다', async () => {
    server.use(
      http.post(`${API_BASE_URL}/api/v1/auth/signup`, () =>
        HttpResponse.json({ message: '이미 사용 중인 아이디예요.' }, { status: 409 }),
      ),
    );
    const user = renderPage('/signup');
    await fillSignup(user);
    await user.click(screen.getByRole('button', { name: '중복 확인' }));
    await screen.findByText('사용할 수 있는 아이디예요.');
    await user.click(screen.getByRole('button', { name: '회원가입' }));
    await screen.findByText('이미 사용 중인 아이디예요. 다른 아이디로 확인해 주세요.');
    expect(screen.queryByText('사용할 수 있는 아이디예요.')).not.toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: '회원가입' }));
    expect(screen.getByText('아이디 중복 확인을 완료해 주세요.')).toBeInTheDocument();
  });
});
