import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { http, HttpResponse } from 'msw';
import { MemoryRouter } from 'react-router';
import { afterEach, describe, expect, it, vi } from 'vitest';
import App from '../App';
import { API_BASE_URL } from '../lib/api';
import { getAuthSession, signIn } from '../lib/auth';
import { createMockLoginResponse } from '../mocks/handlers';
import { server } from '../mocks/server';

const firstId = 'e6100748-b7f0-48e6-a264-7c20a748cf93';
const emptyId = '7b9e0398-6b3e-4b88-87db-358748803b75';

function renderPage(path = '/login') {
  render(
    <MemoryRouter initialEntries={[path]}>
      <App />
    </MemoryRouter>,
  );
  return userEvent.setup();
}

async function login(
  user: ReturnType<typeof userEvent.setup>,
  username = 'friend',
  password = 'example-password',
) {
  await user.type(screen.getByLabelText('아이디'), username);
  await user.type(screen.getByLabelText('비밀번호'), password);
  await user.click(screen.getByRole('button', { name: '로그인' }));
}

afterEach(() => vi.useRealTimers());

describe('로그인 세션과 채팅 인증', () => {
  it('비로그인 상태의 홈 접근은 목록 API를 호출하지 않고 로그인으로 이동한다', async () => {
    let calls = 0;
    server.use(
      http.get(`${API_BASE_URL}/api/v1/chats`, () => {
        calls++;
        return HttpResponse.json({ items: [] });
      }),
    );
    renderPage('/chats');
    expect(screen.queryByRole('navigation', { name: '대화 목록' })).not.toBeInTheDocument();
    expect(await screen.findByRole('heading', { name: '로그인' })).toBeInTheDocument();
    expect(calls).toBe(0);
  });

  it.each([`/chats/${firstId}`, '/admin/users'])(
    '비로그인 상태의 %s 접근은 로그인으로 이동한다',
    async (path) => {
      renderPage(path);
      expect(await screen.findByRole('heading', { name: '로그인' })).toBeInTheDocument();
      expect(getAuthSession()).toBeNull();
    },
  );

  it('실제 API 모드에서 비밀번호 공백을 보존하고 토큰 저장 후 인증된 대화를 조회한다', async () => {
    vi.stubEnv('VITE_ENABLE_MSW', 'false');
    const response = createMockLoginResponse();
    let calls = 0;
    server.use(
      http.post(`${API_BASE_URL}/api/v1/auth/login`, async ({ request }) => {
        expect(request.headers.has('Authorization')).toBe(false);
        expect(await request.json()).toEqual({ username: 'Test_User', password: ' password ' });
        return HttpResponse.json(response);
      }),
      http.get(`${API_BASE_URL}/api/v1/chats`, ({ request }) => {
        calls++;
        expect(request.headers.get('Authorization')).toBe(`Bearer ${response.access_token}`);
        return HttpResponse.json({ items: [] });
      }),
    );
    const user = renderPage();
    await login(user, 'Test_User', ' password ');
    expect(await screen.findByText('아직 대화가 없어요.')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '로그아웃' })).toBeInTheDocument();
    expect(JSON.parse(sessionStorage.getItem('quackquack.auth')!)).toEqual({
      accessToken: response.access_token,
      expiresAt: expect.any(Number),
    });
    expect(calls).toBe(1);
  });

  it('로그인 후 대화를 생성하고 질문을 전송한다', async () => {
    const user = renderPage();
    await login(user);
    await screen.findByRole('navigation', { name: '대화 목록' });
    await user.click(screen.getByRole('button', { name: '새 대화 시작' }));
    await screen.findByRole('heading', { name: '새 대화' });
    await user.type(screen.getByRole('textbox', { name: '메시지' }), '로그인한 친구의 이야기');
    await user.click(screen.getByRole('button', { name: '보내기' }));
    expect(await screen.findByText(/이야기해 줘서 고마워요/)).toBeInTheDocument();
  });

  it('로그아웃하면 토큰과 기존 대화 화면을 제거하고 재로그인 시 새 목록을 조회한다', async () => {
    signIn(createMockLoginResponse());
    const user = renderPage(`/chats/${firstId}`);
    await screen.findByText('오늘 하루가 조금 지쳤어.');
    await user.click(screen.getByRole('button', { name: '로그아웃' }));
    expect(await screen.findByRole('heading', { name: '로그인' })).toBeInTheDocument();
    expect(screen.queryByText('오늘 하루가 조금 지쳤어.')).not.toBeInTheDocument();
    expect(getAuthSession()).toBeNull();
    expect(sessionStorage.getItem('quackquack.auth')).toBeNull();
    server.use(http.get(`${API_BASE_URL}/api/v1/chats`, () => HttpResponse.json({ items: [] })));
    await login(user);
    expect(await screen.findByText('아직 대화가 없어요.')).toBeInTheDocument();
    expect(screen.queryByRole('navigation', { name: '대화 목록' })).not.toBeInTheDocument();
  });

  it('보호 API의 401은 토큰을 제거하고 로그인 화면으로 이동한다', async () => {
    signIn(createMockLoginResponse());
    server.use(
      http.get(`${API_BASE_URL}/api/v1/chats`, () =>
        HttpResponse.json(
          {
            error: {
              code: 'UNAUTHORIZED',
              message: '로그인이 필요합니다.',
              request_id: 'expired-session',
            },
          },
          { status: 401 },
        ),
      ),
    );
    renderPage('/chats');
    expect(await screen.findByRole('heading', { name: '로그인' })).toBeInTheDocument();
    expect(sessionStorage.getItem('quackquack.auth')).toBeNull();
    expect(screen.queryByRole('button', { name: '로그아웃' })).not.toBeInTheDocument();
  });

  it('로그인 실패의 401은 입력 오류로 표시하며 재시도할 수 있다', async () => {
    const user = renderPage();
    await login(user, 'wrong');
    expect(await screen.findByRole('alert')).toHaveTextContent(
      '아이디 또는 비밀번호가 올바르지 않습니다.',
    );
    expect(screen.getByLabelText('비밀번호')).toHaveValue('example-password');
    expect(getAuthSession()).toBeNull();
    expect(screen.getByRole('button', { name: '로그인' })).toBeEnabled();
  });

  it('활성 화면에서 토큰이 만료되면 요청 없이 로그인으로 이동한다', async () => {
    vi.useFakeTimers();
    signIn(createMockLoginResponse(1));
    renderPage('/chats');
    await act(() => vi.advanceTimersByTimeAsync(1001));
    expect(screen.getByRole('heading', { name: '로그인' })).toBeInTheDocument();
    expect(getAuthSession()).toBeNull();
    expect(sessionStorage.getItem('quackquack.auth')).toBeNull();
  });

  it('백그라운드에서 만료된 세션은 화면 복귀 시 정리한다', async () => {
    vi.useFakeTimers();
    signIn(createMockLoginResponse(10));
    renderPage('/chats');
    vi.setSystemTime(Date.now() + 11000);
    fireEvent.focus(window);
    expect(screen.getByRole('heading', { name: '로그인' })).toBeInTheDocument();
    expect(getAuthSession()).toBeNull();
  });

  it('로그아웃한 뒤 도착한 대화 응답으로 이전 기록을 다시 표시하지 않는다', async () => {
    signIn(createMockLoginResponse());
    let release!: () => void;
    let started = false;
    const gate = new Promise<void>((resolve) => {
      release = resolve;
    });
    server.use(
      http.get(`${API_BASE_URL}/api/v1/chats/${emptyId}`, async () => {
        started = true;
        await gate;
        return HttpResponse.json({
          chat_id: emptyId,
          created_at: '2026-10-03T01:30:00Z',
          messages: [],
        });
      }),
    );
    const user = renderPage(`/chats/${emptyId}`);
    await waitFor(() => expect(started).toBe(true));
    await user.click(screen.getByRole('button', { name: '로그아웃' }));
    await act(async () => {
      release();
      await gate;
    });
    expect(await screen.findByRole('heading', { name: '로그인' })).toBeInTheDocument();
    expect(screen.queryByRole('textbox', { name: '메시지' })).not.toBeInTheDocument();
  });

  it('로그인 응답에 유효한 토큰이 없으면 로그인 상태를 만들지 않는다', async () => {
    server.use(
      http.post(`${API_BASE_URL}/api/v1/auth/login`, () => HttpResponse.json({ message: '완료' })),
    );
    const user = renderPage();
    await login(user);
    expect(await screen.findByRole('alert')).toHaveTextContent(
      '로그인 응답을 확인하지 못했습니다.',
    );
    expect(getAuthSession()).toBeNull();
  });

  it.each([
    ['abc', 'example-password', '아이디는 영문·숫자·밑줄로 4~20자 입력해 주세요.'],
    [' friend ', 'example-password', '아이디는 영문·숫자·밑줄로 4~20자 입력해 주세요.'],
    ['friend', 'short', '비밀번호는 8~128자로 입력해 주세요.'],
  ])('로그인 입력 규칙 위반을 요청 전에 막는다 (%s)', async (username, password, message) => {
    let calls = 0;
    server.use(
      http.post(`${API_BASE_URL}/api/v1/auth/login`, () => {
        calls++;
        return HttpResponse.json({});
      }),
    );
    const user = renderPage();
    await login(user, username, password);
    expect(screen.getByRole('alert')).toHaveTextContent(message);
    expect(calls).toBe(0);
  });

  it('로그인 요청 중 화면을 이동하면 늦은 응답으로 로그인하지 않는다', async () => {
    let release!: () => void;
    const gate = new Promise<void>((resolve) => {
      release = resolve;
    });
    server.use(
      http.post(`${API_BASE_URL}/api/v1/auth/login`, async () => {
        await gate;
        return HttpResponse.json(createMockLoginResponse());
      }),
    );
    const user = renderPage();
    await login(user);
    await user.click(screen.getByRole('link', { name: '회원가입' }));
    await act(async () => {
      release();
      await gate;
    });
    expect(screen.getByRole('heading', { name: '회원가입' })).toBeInTheDocument();
    expect(getAuthSession()).toBeNull();
  });
});
