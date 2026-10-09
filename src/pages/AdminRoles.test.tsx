import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { http, HttpResponse } from 'msw';
import { MemoryRouter, useNavigate } from 'react-router';
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import App from '../App';
import { API_BASE_URL, apiRequest } from '../lib/api';
import { getAccessToken, signIn } from '../lib/auth';
import { createMockLoginResponse } from '../mocks/handlers';
import { server } from '../mocks/server';

const dialogMethods = ['showModal', 'close'] as const;
const originalMethods = dialogMethods.map((name) =>
  Object.getOwnPropertyDescriptor(HTMLDialogElement.prototype, name),
);
beforeAll(() => {
  Object.defineProperty(HTMLDialogElement.prototype, 'showModal', {
    configurable: true,
    value(this: HTMLDialogElement) {
      this.setAttribute('open', '');
    },
  });
  Object.defineProperty(HTMLDialogElement.prototype, 'close', {
    configurable: true,
    value(this: HTMLDialogElement) {
      this.removeAttribute('open');
      this.dispatchEvent(new Event('close'));
    },
  });
});
afterAll(() => {
  dialogMethods.forEach((name, index) => {
    const original = originalMethods[index];
    if (original) Object.defineProperty(HTMLDialogElement.prototype, name, original);
    else delete HTMLDialogElement.prototype[name];
  });
});
beforeEach(() => {
  vi.stubEnv('VITE_ENABLE_MSW', 'false');
  signIn(createMockLoginResponse(1800, 'admin'));
});
afterEach(() => server.events.removeAllListeners());

function Navigation() {
  const navigate = useNavigate();
  return <button onClick={() => navigate('/admin/users/3')}>검증용 다른 회원</button>;
}

function renderPage(path = '/admin/users/2') {
  render(
    <MemoryRouter initialEntries={[path]}>
      <App />
      <Navigation />
    </MemoryRouter>,
  );
  return userEvent.setup();
}

async function openDialog(user: ReturnType<typeof userEvent.setup>, label = '관리자로 변경') {
  await user.click(await screen.findByRole('button', { name: label }));
  return screen.getByRole('dialog', { name: '회원 권한을 변경할까요?' });
}

describe('회원 권한 표시·변경', () => {
  it('목록에 권한만 표시하고 변경 버튼은 상세에서만 제공한다', async () => {
    const user = renderPage('/admin/users');
    const table = await screen.findByRole('region', { name: '회원 목록 표' });
    const adminRow = within(table).getByRole('link', { name: '사용자A 회원 상세' }).closest('tr')!;
    const userRow = within(table).getByRole('link', { name: '사용자B 회원 상세' }).closest('tr')!;
    expect(within(adminRow).getByText('관리자')).toBeInTheDocument();
    expect(within(userRow).getByText('사용자')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /로 변경/ })).not.toBeInTheDocument();
    await user.click(within(userRow).getByRole('link'));
    await screen.findByRole('button', { name: '관리자로 변경' });
  });

  it.each([
    [2, '관리자', 'admin'],
    [4, '사용자', 'user'],
  ] as const)('회원 %i을 %s로 변경하고 상세·목록을 갱신한다', async (id, label, role) => {
    let body: unknown;
    let authorization: string | null = null;
    let calls = 0;
    server.events.on('request:start', ({ request }) => {
      if (request.method === 'PATCH') {
        calls++;
        authorization = request.headers.get('Authorization');
      }
    });
    const token = getAccessToken();
    const user = renderPage(`/admin/users/${id}`);
    const dialog = await openDialog(user, `${label}로 변경`);
    expect(dialog).toHaveAttribute('open');
    expect(within(dialog).getByText(new RegExp(`→ ${label}`))).toBeInTheDocument();
    expect(calls).toBe(0);
    server.events.on('request:start', ({ request }) => {
      if (request.method === 'PATCH')
        void request
          .clone()
          .json()
          .then((value) => {
            body = value;
          });
    });
    await user.click(within(dialog).getByRole('button', { name: '변경' }));
    await screen.findByText(`${label}로 변경했어요.`);
    expect(calls).toBe(1);
    expect(body).toEqual({ role });
    expect(authorization).toBe(`Bearer ${token}`);
    expect(
      within(screen.getByRole('group', { name: '회원 권한' })).getByText(label),
    ).toBeInTheDocument();
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: `${role === 'admin' ? '사용자' : '관리자'}로 변경` }),
    ).toBeEnabled();
    await user.click(screen.getByRole('link', { name: '회원 목록' }));
    const link = await screen.findByRole('link', {
      name: id === 2 ? '사용자B 회원 상세' : '사용자 4 회원 상세',
    });
    expect(within(link.closest('tr')!).getByText(label)).toBeInTheDocument();
    await user.click(link);
    expect(
      within(await screen.findByRole('group', { name: '회원 권한' })).getByText(label),
    ).toBeInTheDocument();
  });

  it('본인 상세에서는 권한 변경 버튼을 숨긴다', async () => {
    renderPage('/admin/users/1');
    const group = await screen.findByRole('group', { name: '회원 권한' });
    expect(within(group).getByText('관리자')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /로 변경/ })).not.toBeInTheDocument();
  });

  it('확인 모달 취소·배경·Escape는 변경 요청을 보내지 않는다', async () => {
    let calls = 0;
    server.use(
      http.patch(`${API_BASE_URL}/api/v1/admin/users/:id/role`, () => {
        calls++;
        return HttpResponse.error();
      }),
    );
    const user = renderPage();
    let dialog = await openDialog(user);
    await user.click(within(dialog).getByRole('button', { name: '취소' }));
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    dialog = await openDialog(user);
    await user.click(within(dialog).getByRole('button', { name: '권한 변경 확인 닫기' }));
    dialog = await openDialog(user);
    expect(fireEvent(dialog, new Event('cancel', { cancelable: true }))).toBe(true);
    fireEvent(dialog, new Event('close'));
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(calls).toBe(0);
  });

  it.each([403, 404, 422, 500, 'network'] as const)(
    '변경 실패 %s에서 기존 권한을 유지하고 재시도한다',
    async (status) => {
      let calls = 0;
      server.use(
        http.patch(`${API_BASE_URL}/api/v1/admin/users/2/role`, () => {
          calls++;
          return calls === 1
            ? status === 'network'
              ? HttpResponse.error()
              : HttpResponse.json({ error: { message: '권한 변경 실패' } }, { status })
            : HttpResponse.json({ id: 2, username: 'user_b', role: 'admin' });
        }),
      );
      const user = renderPage();
      let dialog = await openDialog(user);
      await user.click(within(dialog).getByRole('button', { name: '변경' }));
      expect(await screen.findByRole('alert')).toHaveTextContent(
        status === 'network' ? '권한을 변경하지 못했어요.' : '권한 변경 실패',
      );
      expect(
        within(screen.getByRole('group', { name: '회원 권한' })).getByText('사용자'),
      ).toBeInTheDocument();
      expect(getAccessToken()).not.toBeNull();
      dialog = await openDialog(user);
      await user.click(within(dialog).getByRole('button', { name: '변경' }));
      await screen.findByText('관리자로 변경했어요.');
      expect(calls).toBe(2);
    },
  );

  it('401이면 로그인으로 이동하고 인증 상태를 정리한다', async () => {
    server.use(
      http.patch(`${API_BASE_URL}/api/v1/admin/users/2/role`, () =>
        HttpResponse.json({ error: { message: '로그인이 필요합니다.' } }, { status: 401 }),
      ),
    );
    const user = renderPage();
    const dialog = await openDialog(user);
    await user.click(within(dialog).getByRole('button', { name: '변경' }));
    await screen.findByRole('heading', { name: '로그인' });
    expect(getAccessToken()).toBeNull();
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('지연 중 중복 클릭·모달 닫기를 막고 다른 회원으로 이동하면 요청을 취소한다', async () => {
    let release!: () => void;
    const deferred = new Promise<void>((resolve) => {
      release = resolve;
    });
    let signal: AbortSignal | undefined;
    let calls = 0;
    server.use(
      http.patch(`${API_BASE_URL}/api/v1/admin/users/2/role`, async ({ request }) => {
        calls++;
        signal = request.signal;
        await deferred;
        return HttpResponse.json({ id: 2, username: 'user_b', role: 'admin' });
      }),
    );
    const user = renderPage();
    const dialog = await openDialog(user);
    try {
      await user.dblClick(within(dialog).getByRole('button', { name: '변경' }));
      await waitFor(() => expect(calls).toBe(1));
      expect(within(dialog).getByRole('button', { name: '변경 중…' })).toBeDisabled();
      expect(within(dialog).getByRole('button', { name: '취소' })).toBeDisabled();
      expect(within(dialog).getByRole('button', { name: '권한 변경 확인 닫기' })).toBeDisabled();
      expect(fireEvent(dialog, new Event('cancel', { cancelable: true }))).toBe(false);
      fireEvent.click(screen.getByRole('button', { name: '검증용 다른 회원' }));
      await screen.findByRole('heading', { name: '사용자 3' });
      await waitFor(() => expect(signal?.aborted).toBe(true));
      await act(async () => release());
      expect(screen.queryByText('관리자로 변경했어요.')).not.toBeInTheDocument();
      expect(
        within(screen.getByRole('group', { name: '회원 권한' })).getByText('사용자'),
      ).toBeInTheDocument();
    } finally {
      release();
    }
  });

  it('다른 회원의 변경 응답이면 성공으로 표시하지 않는다', async () => {
    server.use(
      http.patch(`${API_BASE_URL}/api/v1/admin/users/2/role`, () =>
        HttpResponse.json({ id: 3, username: 'user_b', role: 'admin' }),
      ),
    );
    const user = renderPage();
    const dialog = await openDialog(user);
    await user.click(within(dialog).getByRole('button', { name: '변경' }));
    await screen.findByText('권한 변경 결과를 확인하지 못했어요. 다시 조회해 주세요.');
    expect(
      within(screen.getByRole('group', { name: '회원 권한' })).getByText('사용자'),
    ).toBeInTheDocument();
  });

  it('결과 토스트를 직접 닫을 수 있다', async () => {
    const user = renderPage();
    const dialog = await openDialog(user);
    await user.click(within(dialog).getByRole('button', { name: '변경' }));
    await screen.findByText('관리자로 변경했어요.');
    await user.click(screen.getByRole('button', { name: '권한 변경 알림 닫기' }));
    expect(screen.queryByText('관리자로 변경했어요.')).not.toBeInTheDocument();
  });
  it('결과 토스트는 5초 후 사라진다', async () => {
    const user = renderPage();
    const dialog = await openDialog(user);
    await user.click(within(dialog).getByRole('button', { name: '변경' }));
    await screen.findByText('관리자로 변경했어요.');
    await new Promise((resolve) => setTimeout(resolve, 4000));
    expect(screen.getByText('관리자로 변경했어요.')).toBeInTheDocument();
    await waitFor(
      () => expect(screen.queryByText('관리자로 변경했어요.')).not.toBeInTheDocument(),
      { timeout: 2000 },
    );
  }, 10000);
});

describe('역할 변경 MSW 계약', () => {
  it('일반 회원의 역할 변경 요청은 403으로 거절한다', async () => {
    signIn(createMockLoginResponse());
    await expect(
      apiRequest('/api/v1/admin/users/4/role', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ role: 'user' }),
      }),
    ).rejects.toMatchObject({ status: 403 });
  });
  it('권한 변경 오류 시나리오는 현재 권한을 유지한다', async () => {
    vi.stubEnv('VITE_ADMIN_MOCK_SCENARIO', 'role-error');
    await expect(
      apiRequest('/api/v1/admin/users/2/role', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ role: 'admin' }),
      }),
    ).rejects.toMatchObject({ status: 500 });
    await expect(apiRequest('/api/v1/admin/users/2')).resolves.toMatchObject({ role: 'user' });
  });
  it.each([
    [1, 'user', 403],
    [999, 'admin', 404],
    [2, 'unknown', 422],
  ] as const)('대상 %i·권한 %s를 %i로 거절한다', async (id, role, status) => {
    await expect(
      apiRequest(`/api/v1/admin/users/${id}/role`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ role }),
      }),
    ).rejects.toMatchObject({ status });
  });

  it('승격은 내정보와 기존 토큰의 관리자 API 접근에도 반영한다', async () => {
    const memberSession = createMockLoginResponse();
    await apiRequest('/api/v1/admin/users/2/role', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ role: 'admin' }),
    });
    signIn(memberSession);
    await expect(apiRequest('/api/v1/auth/me')).resolves.toMatchObject({ id: 2, role: 'admin' });
    await expect(apiRequest('/api/v1/admin/users/2')).resolves.toMatchObject({
      id: 2,
      role: 'admin',
    });
  });
});
