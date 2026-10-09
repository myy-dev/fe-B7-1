import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { http, HttpResponse } from 'msw';
import { MemoryRouter, useLocation, useNavigate } from 'react-router';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import App from '../App';
import { API_BASE_URL, apiRequest } from '../lib/api';
import type {
  AdminPage,
  AdminSession,
  AdminSessionDetail,
  AdminUserDetail,
  SystemLog,
} from '../lib/admin';
import type { ChatMessage, ChatSession } from '../lib/chats';
import { server } from '../mocks/server';
import { createMockLoginResponse } from '../mocks/handlers';
import { signIn } from '../lib/auth';

beforeEach(() => signIn(createMockLoginResponse(1800, 'admin')));

const firstId = 'e6100748-b7f0-48e6-a264-7c20a748cf93';
const secondId = '6eb321dc-235c-4e3d-a95e-43f2a601fcd8';
const emptyId = '7b9e0398-6b3e-4b88-87db-358748803b75';

function HistoryControls() {
  const location = useLocation();
  const navigate = useNavigate();
  return (
    <>
      <output aria-label="현재 경로">
        {location.pathname}
        {location.search}
      </output>
      <button onClick={() => navigate(-1)}>검증용 뒤로</button>
      <button onClick={() => navigate(1)}>검증용 앞으로</button>
    </>
  );
}

function renderPage(path = '/admin/users') {
  render(
    <MemoryRouter initialEntries={[path]}>
      <App />
      <HistoryControls />
    </MemoryRouter>,
  );
  return userEvent.setup();
}

afterEach(() => vi.unstubAllEnvs());

describe('관리자 회원·세션 조회', () => {
  it('관리자 시작 주소에서 회원 목록으로 이동하고 서비스로 돌아간다', async () => {
    const user = renderPage('/admin');
    await screen.findByRole('link', { name: '사용자A 회원 상세' });
    expect(screen.getByLabelText('현재 경로')).toHaveTextContent('/admin/users');
    expect(screen.getByText('총 24건 · 1 / 2 페이지')).toBeInTheDocument();
    await user.click(screen.getByRole('link', { name: '서비스로 이동' }));
    expect(screen.getByRole('heading', { name: '반가워요, 저는 꽥꽥이예요.' })).toBeInTheDocument();
  });

  it('목록의 페이지·크기를 URL에서 읽고 변경과 뒤로 가기를 복원한다', async () => {
    const user = renderPage('/admin/users?page=2&size=10');
    await screen.findByRole('link', { name: '사용자 11 회원 상세' });
    expect(screen.queryByRole('link', { name: '사용자A 회원 상세' })).not.toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: '다음' }));
    await screen.findByRole('link', { name: '사용자 21 회원 상세' });
    expect(screen.getByLabelText('현재 경로')).toHaveTextContent('page=3&size=10');
    await user.selectOptions(screen.getByRole('combobox', { name: '페이지당' }), '20');
    await screen.findByRole('link', { name: '사용자A 회원 상세' });
    expect(screen.getByLabelText('현재 경로')).toHaveTextContent('page=1&size=20');
    await user.click(screen.getByRole('button', { name: '검증용 뒤로' }));
    await screen.findByRole('link', { name: '사용자 21 회원 상세' });
    expect(screen.getByRole('combobox', { name: '페이지당' })).toHaveValue('10');
  });

  it('회원 상세에서 회원별 세션과 해당 대화만 조회한다', async () => {
    const user = renderPage();
    await user.click(await screen.findByRole('link', { name: '사용자A 회원 상세' }));
    const sessions = await screen.findByRole('region', { name: '회원 대화 세션 표' });
    expect(within(sessions).getByText(firstId)).toBeInTheDocument();
    expect(within(sessions).queryByText(secondId)).not.toBeInTheDocument();
    await user.click(screen.getByRole('link', { name: '오늘 하루가 조금 지쳤어. 대화 보기' }));
    const chat = await screen.findByRole('list', { name: '대화 기록' });
    expect(within(chat).getByText('기분 전환할 만한 작은 일이 있을까?')).toBeInTheDocument();
    expect(screen.queryByRole('textbox', { name: '메시지' })).not.toBeInTheDocument();
    await user.click(screen.getByRole('link', { name: '회원 번호(PK) 1' }));
    await user.click(await screen.findByRole('link', { name: '회원 대화 기록' }));
    const logs = await screen.findByRole('region', { name: '대화 기록 표' });
    expect(within(logs).getByText('오늘 하루가 조금 지쳤어.')).toBeInTheDocument();
    expect(screen.queryByText('주말 계획을 같이 세워 줄래?')).not.toBeInTheDocument();
    expect(screen.getByLabelText('현재 경로')).toHaveTextContent('user_id=1');
  });

  it('로그인 기록이 없는 회원과 세션이 없는 회원을 표시한다', async () => {
    const user = renderPage('/admin/users/2');
    const info = await screen.findByRole('region', { name: '회원 정보' });
    expect(within(info).getByText('—')).toBeInTheDocument();
    await user.click(screen.getByRole('link', { name: '회원 목록' }));
    await user.click(await screen.findByRole('link', { name: '사용자 3 회원 상세' }));
    await screen.findByText('대화 세션이 없어요.');
  });

  it('빈 세션과 실패·처리 중 기록을 구분한다', async () => {
    const user = renderPage(`/admin/sessions/${emptyId}`);
    await screen.findByText('아직 대화가 없어요.');
    await user.click(screen.getByRole('link', { name: '회원 목록' }));
    await user.click(await screen.findByRole('link', { name: '사용자B 회원 상세' }));
    await user.click(
      await screen.findByRole('link', { name: /이 긴 주소도 읽어 줄래.*대화 보기/ }),
    );
    await screen.findByText('응답 시간이 초과되었어요.');
    expect(screen.getByText('답변 생성 중')).toBeInTheDocument();
  });

  it.each(['/admin/users/999', '/admin/sessions/00000000-0000-4000-8000-000000000000'])(
    '없는 대상 %s에서 오류와 복귀 링크를 표시한다',
    async (path) => {
      const user = renderPage(path);
      expect(await screen.findByRole('alert')).toHaveTextContent(/찾을 수 없어요/);
      expect(screen.queryByRole('button', { name: '다시 불러오기' })).not.toBeInTheDocument();
      await user.click(screen.getByRole('link', { name: '회원 목록' }));
      await screen.findByRole('link', { name: '사용자A 회원 상세' });
    },
  );

  it.each(['/admin/users/abc', '/admin/sessions/abc'])(
    '잘못된 대상 주소 %s를 요청 전에 표시한다',
    async (path) => {
      renderPage(path);
      expect(await screen.findByRole('alert')).toHaveTextContent('주소를 확인해 주세요.');
      expect(screen.queryByText('불러오는 중')).not.toBeInTheDocument();
    },
  );

  it('조회 실패 후 같은 페이지를 재시도한다', async () => {
    let calls = 0;
    server.use(
      http.get(`${API_BASE_URL}/api/v1/admin/users`, () => {
        calls++;
        if (calls === 1)
          return HttpResponse.json({ error: { message: '회원 조회 실패' } }, { status: 500 });
        return HttpResponse.json({
          items: [
            {
              id: 99,
              name: '재시도 회원',
              username: 'retry',
              role: 'user',
              created_at: '2026-10-05T03:00:00Z',
            },
          ],
          total: 1,
          page: 1,
          size: 20,
        });
      }),
    );
    const user = renderPage();
    await screen.findByText('회원 조회 실패');
    await user.click(screen.getByRole('button', { name: '다시 불러오기' }));
    await screen.findByRole('link', { name: '재시도 회원 회원 상세' });
    expect(calls).toBe(2);
  });

  it('이전 회원 응답이 늦게 와도 현재 회원을 바꾸지 않는다', async () => {
    let release!: () => void;
    const deferred = new Promise<void>((resolve) => {
      release = resolve;
    });
    let signal: AbortSignal | undefined;
    server.use(
      http.get(`${API_BASE_URL}/api/v1/admin/users/1`, async ({ request }) => {
        signal = request.signal;
        await deferred;
        return HttpResponse.json({
          id: 1,
          name: '이전 회원',
          username: 'old',
          role: 'user',
          created_at: '2026-10-05T03:00:00Z',
          last_login_at: null,
        });
      }),
    );
    const user = renderPage('/admin/users/1');
    try {
      await waitFor(() => expect(signal).toBeDefined());
      await user.click(screen.getByRole('link', { name: '회원 목록' }));
      await user.click(await screen.findByRole('link', { name: '사용자B 회원 상세' }));
      await screen.findByRole('heading', { name: '사용자B' });
      await waitFor(() => expect(signal?.aborted).toBe(true));
      await act(async () => release());
      expect(screen.queryByText('이전 회원')).not.toBeInTheDocument();
    } finally {
      release();
    }
  });
});

describe('관리자 조회 조건과 시스템 로그', () => {
  it('회원·KST 기간 조건을 UTC 요청에 적용하고 페이지를 초기화한다', async () => {
    let query: URLSearchParams | undefined;
    server.use(
      http.get(`${API_BASE_URL}/api/v1/admin/logs`, ({ request }) => {
        query = new URL(request.url).searchParams;
        return HttpResponse.json({
          items: [],
          total: 0,
          page: Number(query.get('page')),
          size: Number(query.get('size')),
        });
      }),
    );
    const user = renderPage('/admin/logs?page=2&size=10');
    await screen.findByText('조건에 맞는 대화 기록이 없어요.');
    await user.type(screen.getByRole('textbox', { name: '회원 번호(PK)' }), '2');
    fireEvent.change(screen.getByLabelText('조회 시작 시각 (KST)'), {
      target: { value: '2026-10-04T14:20:00' },
    });
    fireEvent.change(screen.getByLabelText('조회 종료 시각 (KST)'), {
      target: { value: '2026-10-04T14:23:00' },
    });
    await user.click(screen.getByRole('button', { name: '조회' }));
    await waitFor(() => expect(query?.get('start')).toBe('2026-10-04T05:20:00.000Z'));
    expect(query?.get('end')).toBe('2026-10-04T05:23:00.000Z');
    expect(query?.get('page')).toBe('1');
    expect(query?.get('size')).toBe('10');
    expect(query?.get('user_id')).toBe('2');
  });

  it('잘못된 기간은 요청하지 않고 입력을 유지한다', async () => {
    let calls = 0;
    server.use(
      http.get(`${API_BASE_URL}/api/v1/admin/system-logs`, () => {
        calls++;
        return HttpResponse.json({ items: [], total: 0, page: 1, size: 20 });
      }),
    );
    const user = renderPage('/admin/system-logs');
    await screen.findByText('조건에 맞는 시스템 로그가 없어요.');
    fireEvent.change(screen.getByLabelText('조회 시작 시각 (KST)'), {
      target: { value: '2026-10-05T10:00:00' },
    });
    fireEvent.change(screen.getByLabelText('조회 종료 시각 (KST)'), {
      target: { value: '2026-10-04T10:00:00' },
    });
    await user.click(screen.getByRole('button', { name: '조회' }));
    expect(screen.getByRole('alert')).toHaveTextContent('조회 종료 시각은 조회 시작 시각 이후');
    expect(calls).toBe(1);
    expect(screen.getByLabelText('조회 시작 시각 (KST)')).toHaveValue('2026-10-05T10:00');
  });

  it('레벨·이벤트 필터와 페이지 상태를 뒤로·앞으로 복원한다', async () => {
    const user = renderPage('/admin/system-logs?page=2&size=10');
    await screen.findByRole('region', { name: '시스템 로그 표' });
    await user.selectOptions(screen.getByRole('combobox', { name: '레벨' }), 'ERROR');
    await user.type(screen.getByRole('textbox', { name: '이벤트' }), 'ai_call_failed');
    await user.click(screen.getByRole('button', { name: '조회' }));
    const table = await screen.findByRole('region', { name: '시스템 로그 표' });
    expect(within(table).getAllByText('ERROR')).toHaveLength(7);
    expect(within(table).queryByText('INFO')).not.toBeInTheDocument();
    expect(screen.getByLabelText('현재 경로')).toHaveTextContent(
      'page=1&size=10&level=ERROR&event=ai_call_failed',
    );
    await user.click(screen.getByRole('button', { name: '검증용 뒤로' }));
    await screen.findByRole('region', { name: '시스템 로그 표' });
    expect(screen.getByRole('combobox', { name: '레벨' })).toHaveValue('');
    expect(screen.getByLabelText('현재 경로')).toHaveTextContent('page=2&size=10');
    await user.click(screen.getByRole('button', { name: '검증용 앞으로' }));
    await screen.findByRole('region', { name: '시스템 로그 표' });
    expect(screen.getByRole('combobox', { name: '레벨' })).toHaveValue('ERROR');
    expect(screen.getByRole('textbox', { name: '이벤트' })).toHaveValue('ai_call_failed');
  });

  it('직접 접근한 UTC 기간을 KST 입력으로 복원하고 동일 로그 두 건을 표시한다', async () => {
    renderPage('/admin/system-logs?start=2026-10-05T07:00:00Z&end=2026-10-05T07:00:00Z');
    const table = await screen.findByRole('region', { name: '시스템 로그 표' });
    expect(within(table).getAllByText('request_received')).toHaveLength(2);
    expect(within(table).getAllByText('—')).toHaveLength(4);
    expect(screen.getByLabelText('조회 시작 시각 (KST)')).toHaveValue('2026-10-05T16:00');
    expect(screen.getByText('총 2건 · 1 / 1 페이지')).toBeInTheDocument();
  });

  it('조건에 맞는 결과가 없으면 초기화로 전체 조회를 복원한다', async () => {
    const user = renderPage('/admin/system-logs?event=no_such_event');
    await screen.findByText('조건에 맞는 시스템 로그가 없어요.');
    await user.click(screen.getByRole('button', { name: '초기화' }));
    await screen.findByRole('region', { name: '시스템 로그 표' });
    expect(screen.getByRole('textbox', { name: '이벤트' })).toHaveValue('');
    expect(screen.getByText('총 31건 · 1 / 2 페이지')).toBeInTheDocument();
  });

  it('잘못된 URL의 기간·회원 조건을 표시하고 초기화할 수 있다', async () => {
    const user = renderPage('/admin/logs?user_id=wrong&start=invalid');
    expect(await screen.findByRole('alert')).toHaveTextContent('회원 번호(PK)는 양의 정수');
    await user.click(screen.getByRole('button', { name: '초기화' }));
    await screen.findByRole('region', { name: '대화 기록 표' });
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });

  it('시스템 로그 네트워크 오류에서 재시도한다', async () => {
    let calls = 0;
    server.use(
      http.get(`${API_BASE_URL}/api/v1/admin/system-logs`, () =>
        ++calls === 1
          ? HttpResponse.error()
          : HttpResponse.json({ items: [], total: 0, page: 1, size: 20 }),
      ),
    );
    const user = renderPage('/admin/system-logs');
    await screen.findByText('목록을 불러오지 못했어요.');
    await user.click(screen.getByRole('button', { name: '다시 불러오기' }));
    await screen.findByText('조건에 맞는 시스템 로그가 없어요.');
  });

  it('빈 목록 시나리오를 회원 목록에 적용한다', async () => {
    vi.stubEnv('VITE_ADMIN_MOCK_SCENARIO', 'empty');
    renderPage();
    await screen.findByText('회원이 없어요.');
    expect(screen.getByRole('button', { name: '다음' })).toBeDisabled();
  });
});

describe('관리자 MSW API 계약', () => {
  it('회원별 기록과 세션·상세의 식별자와 수량이 일치한다', async () => {
    const user = await apiRequest<AdminUserDetail>('/api/v1/admin/users/2');
    const sessions = await apiRequest<AdminPage<AdminSession>>('/api/v1/admin/sessions?user_id=2');
    const detail = await apiRequest<AdminSessionDetail>(`/api/v1/admin/sessions/${secondId}`);
    const logs = await apiRequest<AdminPage<ChatMessage>>('/api/v1/admin/logs?user_id=2');
    expect(user.last_login_at).toBeNull();
    expect(sessions.items.map((session) => session.chat_id)).toEqual([secondId]);
    expect(detail.message_count).toBe(detail.messages.length);
    expect(logs.items.map((log) => log.request_id).sort()).toEqual(
      detail.messages.map((message) => message.request_id).sort(),
    );
    expect(logs.items.every((log) => log.chat_id === secondId)).toBe(true);
  });

  it('기간·레벨·이벤트로 필터한 뒤 전체 수량과 페이지를 계산한다', async () => {
    const result = await apiRequest<AdminPage<SystemLog>>(
      '/api/v1/admin/system-logs?level=ERROR&event=ai_call_failed&start=2026-10-04T12:00:00Z&end=2026-10-05T07:00:00Z&page=2&size=2',
    );
    expect(result.total).toBe(5);
    expect(result.items).toHaveLength(2);
    expect(
      result.items.every((log) => log.level === 'ERROR' && log.event === 'ai_call_failed'),
    ).toBe(true);
    const records = await apiRequest<AdminPage<ChatMessage>>(
      '/api/v1/admin/logs?user_id=1&start=2026-10-05T03:01:00Z&end=2026-10-05T03:02:00Z',
    );
    expect(records.total).toBe(1);
    expect(records.items[0].question).toBe('기분 전환할 만한 작은 일이 있을까?');
  });

  it('사용자 대화 생성·전송·삭제를 관리자 조회에도 반영한다', async () => {
    const session = await apiRequest<ChatSession>('/api/v1/chats', { method: 'POST' });
    await apiRequest(`/api/v1/chats/${session.chat_id}/messages`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ question: '관리자에서도 조회할 질문' }),
    });
    const detail = await apiRequest<AdminSessionDetail>(
      `/api/v1/admin/sessions/${session.chat_id}`,
    );
    expect(detail.user_id).toBe(1);
    expect(detail.message_count).toBe(1);
    expect(detail.messages[0].question).toBe('관리자에서도 조회할 질문');
    await apiRequest(`/api/v1/chats/${session.chat_id}`, { method: 'DELETE' });
    await expect(apiRequest(`/api/v1/admin/sessions/${session.chat_id}`)).rejects.toMatchObject({
      status: 404,
    });
    const logs = await apiRequest<AdminPage<ChatMessage>>('/api/v1/admin/logs?user_id=1');
    expect(logs.items.some((message) => message.chat_id === session.chat_id)).toBe(false);
  });

  it('필수 회원 번호(PK)·페이지 범위가 잘못되면 422를 반환한다', async () => {
    for (const path of [
      '/sessions',
      '/users?size=101',
      '/system-logs?page=0',
      '/logs?user_id=wrong',
    ]) {
      await expect(apiRequest(`/api/v1/admin${path}`)).rejects.toMatchObject({ status: 422 });
    }
  });
});
