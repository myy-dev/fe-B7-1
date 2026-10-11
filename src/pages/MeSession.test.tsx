import { act, cleanup, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { http, HttpResponse } from 'msw';
import { MemoryRouter, useLocation } from 'react-router';
import { describe, expect, it, vi } from 'vitest';
import App from '../App';
import { API_BASE_URL, apiRequest } from '../lib/api';
import { getAuthSession, signIn, type CurrentUser } from '../lib/auth';
import { createMockLoginResponse } from '../mocks/handlers';
import { server } from '../mocks/server';

const userInfo: CurrentUser = {
  id: 2,
  username: 'friend',
  name: '오리 친구',
  role: 'user',
  created_at: '2026-10-09T00:00:00Z',
  last_login_at: null,
};
const adminInfo: CurrentUser = { ...userInfo, id: 1, username: 'admin', role: 'admin' };

function CurrentPath() {
  return <output aria-label="현재 경로">{useLocation().pathname}</output>;
}

function renderPage(path = '/chats') {
  render(
    <MemoryRouter initialEntries={[path]}>
      <App />
      <CurrentPath />
    </MemoryRouter>,
  );
  return userEvent.setup();
}

describe('내정보 조회와 권한별 화면', () => {
  it.each(['friend', 'admin'])(
    '실제 API 모드에서 %s 로그인 후 내정보에 따라 이동한다',
    async (username) => {
      vi.stubEnv('VITE_ENABLE_MSW', 'false');
      const user = renderPage('/login');
      await user.type(screen.getByLabelText('아이디'), username);
      await user.type(screen.getByLabelText('비밀번호'), 'example-password');
      await user.click(screen.getByRole('button', { name: '로그인' }));
      const path = username === 'admin' ? '/admin/users' : '/chats';
      await waitFor(() => expect(screen.getByLabelText('현재 경로')).toHaveTextContent(path));
      if (username === 'admin') {
        await user.click(await screen.findByRole('link', { name: '서비스로 이동' }));
        expect(screen.getByRole('link', { name: '관리자' })).toHaveAttribute(
          'href',
          '/admin/users',
        );
      } else {
        expect(screen.queryByRole('link', { name: '관리자' })).not.toBeInTheDocument();
      }
      expect(JSON.parse(sessionStorage.getItem('quackquack.auth')!)).toEqual({
        accessToken: expect.any(String),
        expiresAt: expect.any(Number),
      });
    },
  );

  it.each([
    ['/', 'user', '/chats'],
    ['/login', 'user', '/chats'],
    ['/signup', 'user', '/chats'],
    ['/', 'admin', '/admin/users'],
    ['/login', 'admin', '/admin/users'],
    ['/signup', 'admin', '/admin/users'],
  ] as const)('%s 접근 시 복원된 %s 회원을 %s로 이동한다', async (path, role, home) => {
    signIn(createMockLoginResponse(1800, role));
    renderPage(path);
    await waitFor(() => expect(screen.getByLabelText('현재 경로')).toHaveTextContent(home));
  });

  it.each(['/admin/users', '/admin/users/1', '/admin/sessions/any', '/admin/system-logs'])(
    '일반 회원의 %s 직접 접근은 관리자 API 호출 없이 대화로 이동한다',
    async (path) => {
      signIn(createMockLoginResponse());
      let calls = 0;
      server.use(
        http.get(`${API_BASE_URL}/api/v1/admin/*`, () => {
          calls++;
          return HttpResponse.json({});
        }),
      );
      renderPage(path);
      await screen.findByRole('navigation', { name: '대화 목록' });
      expect(screen.getByLabelText('현재 경로')).toHaveTextContent('/chats');
      expect(screen.queryByRole('navigation', { name: '관리자 메뉴' })).not.toBeInTheDocument();
      expect(screen.queryByRole('link', { name: '관리자' })).not.toBeInTheDocument();
      expect(calls).toBe(0);
    },
  );

  it.each(['/chats', '/admin/users'])(
    '내정보 조회 중 %s 화면과 후속 API 호출을 대기한다',
    async (path) => {
      const response = createMockLoginResponse(1800, 'admin');
      signIn(response);
      let started = false;
      let calls = 0;
      let release!: () => void;
      const gate = new Promise<void>((resolve) => {
        release = resolve;
      });
      server.use(
        http.get(`${API_BASE_URL}/api/v1/auth/me`, async ({ request }) => {
          expect(request.headers.get('Authorization')).toBe(`Bearer ${response.access_token}`);
          started = true;
          await gate;
          return HttpResponse.json(adminInfo);
        }),
        http.get(
          `${API_BASE_URL}${path === '/chats' ? '/api/v1/chats' : '/api/v1/admin/users'}`,
          () => {
            calls++;
            return HttpResponse.json({ items: [], total: 0, page: 1, size: 20 });
          },
        ),
      );
      renderPage(path);
      await waitFor(() => expect(started).toBe(true));
      expect(screen.getByText('로그인 확인 중')).toBeInTheDocument();
      expect(screen.queryByRole('navigation', { name: '관리자 메뉴' })).not.toBeInTheDocument();
      expect(screen.queryByRole('button', { name: '새 대화 시작' })).not.toBeInTheDocument();
      expect(screen.queryByRole('link', { name: '관리자' })).not.toBeInTheDocument();
      expect(calls).toBe(0);
      release();
      await waitFor(() => expect(calls).toBe(1));
    },
  );

  it.each(['server', 'network'])('내정보 %s 오류에서 세션을 유지하고 재시도한다', async (kind) => {
    const response = createMockLoginResponse();
    signIn(response);
    let calls = 0;
    let chats = 0;
    server.use(
      http.get(`${API_BASE_URL}/api/v1/auth/me`, () => {
        calls++;
        if (calls > 1) return HttpResponse.json(userInfo);
        return kind === 'network'
          ? HttpResponse.error()
          : HttpResponse.json({ detail: '조회 실패' }, { status: 500 });
      }),
      http.get(`${API_BASE_URL}/api/v1/chats`, () => {
        chats++;
        return HttpResponse.json({ items: [] });
      }),
    );
    const user = renderPage();
    expect(await screen.findByRole('alert')).toHaveTextContent(
      kind === 'network' ? '내 정보를 불러오지 못했어요.' : '조회 실패',
    );
    expect(getAuthSession()?.accessToken).toBe(response.access_token);
    expect(chats).toBe(0);
    await user.click(screen.getByRole('button', { name: '다시 불러오기' }));
    await screen.findByText('아직 대화가 없어요.');
    expect(calls).toBe(2);
    expect(chats).toBe(1);
  });

  it('내정보의 401은 토큰을 정리하고 보호 API 호출 없이 로그인으로 이동한다', async () => {
    signIn(createMockLoginResponse());
    let chats = 0;
    server.use(
      http.get(`${API_BASE_URL}/api/v1/auth/me`, () =>
        HttpResponse.json({ detail: '로그인이 필요합니다.' }, { status: 401 }),
      ),
      http.get(`${API_BASE_URL}/api/v1/chats`, () => {
        chats++;
        return HttpResponse.json({ items: [] });
      }),
    );
    renderPage();
    await screen.findByRole('heading', { name: '로그인' });
    expect(getAuthSession()).toBeNull();
    expect(sessionStorage.getItem('quackquack.auth')).toBeNull();
    expect(chats).toBe(0);
  });

  it.each([{}, { ...adminInfo, role: 'owner' }, { ...adminInfo, id: null }])(
    '잘못된 내정보 응답으로 관리자 권한을 부여하지 않는다',
    async (body) => {
      signIn(createMockLoginResponse(1800, 'admin'));
      server.use(http.get(`${API_BASE_URL}/api/v1/auth/me`, () => HttpResponse.json(body)));
      renderPage('/admin/users');
      expect(await screen.findByRole('alert')).toHaveTextContent('내 정보를 불러오지 못했어요.');
      expect(screen.queryByRole('navigation', { name: '관리자 메뉴' })).not.toBeInTheDocument();
      expect(screen.getByRole('button', { name: '로그아웃' })).toBeEnabled();
    },
  );

  it('새로고침 시 내정보를 다시 조회하고 변경된 권한을 반영한다', async () => {
    signIn(createMockLoginResponse(1800, 'admin'));
    let calls = 0;
    server.use(
      http.get(`${API_BASE_URL}/api/v1/auth/me`, () =>
        HttpResponse.json(++calls === 1 ? adminInfo : { ...adminInfo, role: 'user' }),
      ),
    );
    renderPage('/admin/users');
    await screen.findByRole('navigation', { name: '관리자 메뉴' });
    cleanup();
    renderPage('/admin/users');
    await screen.findByText('아직 대화가 없어요.');
    expect(calls).toBe(2);
    expect(screen.getByLabelText('현재 경로')).toHaveTextContent('/chats');
    expect(screen.queryByRole('link', { name: '관리자' })).not.toBeInTheDocument();
  });

  it('로그아웃 후 늦게 도착한 내정보로 관리자 권한을 복원하지 않는다', async () => {
    signIn(createMockLoginResponse(1800, 'admin'));
    let started = false;
    let release!: () => void;
    const gate = new Promise<void>((resolve) => {
      release = resolve;
    });
    server.use(
      http.get(`${API_BASE_URL}/api/v1/auth/me`, async () => {
        started = true;
        await gate;
        return HttpResponse.json(adminInfo);
      }),
    );
    const user = renderPage();
    await waitFor(() => expect(started).toBe(true));
    await user.click(screen.getByRole('button', { name: '로그아웃' }));
    await screen.findByRole('heading', { name: '로그인' });
    server.resetHandlers();
    act(() => signIn(createMockLoginResponse()));
    await screen.findByRole('navigation', { name: '대화 목록' });
    await act(async () => {
      release();
      await gate;
    });
    expect(screen.queryByRole('link', { name: '관리자' })).not.toBeInTheDocument();
    expect(screen.getByLabelText('현재 경로')).toHaveTextContent('/chats');
  });

  it('일반 회원의 관리자 API 요청은 MSW에서도 403으로 거절한다', async () => {
    signIn(createMockLoginResponse());
    await expect(apiRequest('/api/v1/admin/users')).rejects.toMatchObject({ status: 403 });
    expect(getAuthSession()).not.toBeNull();
  });

  it('관리자 API의 실제 403을 표시하고 로그인 세션은 유지한다', async () => {
    signIn(createMockLoginResponse(1800, 'admin'));
    server.use(
      http.get(`${API_BASE_URL}/api/v1/admin/users`, () =>
        HttpResponse.json({ detail: '관리자 권한이 필요합니다.' }, { status: 403 }),
      ),
    );
    renderPage('/admin/users');
    expect(await screen.findByRole('alert')).toHaveTextContent('관리자 권한이 필요합니다.');
    expect(getAuthSession()).not.toBeNull();
  });
});
