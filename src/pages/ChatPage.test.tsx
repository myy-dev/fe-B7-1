import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { delay, http, HttpResponse } from 'msw';
import { MemoryRouter, useLocation } from 'react-router';
import { afterEach, describe, expect, it, vi } from 'vitest';
import App from '../App';
import { API_BASE_URL, apiRequest } from '../lib/api';
import type { ChatDetail, ChatSession } from '../lib/chats';
import { resetChatMocks } from '../mocks/handlers';
import { server } from '../mocks/server';

const firstId = 'e6100748-b7f0-48e6-a264-7c20a748cf93';
const secondId = '6eb321dc-235c-4e3d-a95e-43f2a601fcd8';
const emptyId = '7b9e0398-6b3e-4b88-87db-358748803b75';

function renderPage(path = '/chats') {
  render(
    <MemoryRouter initialEntries={[path]}>
      <App />
      <CurrentPath />
    </MemoryRouter>,
  );
  return userEvent.setup();
}

function CurrentPath() {
  return <output aria-label="현재 경로">{useLocation().pathname}</output>;
}

afterEach(() => {
  vi.unstubAllEnvs();
  resetChatMocks();
});

describe('채팅 세션 화면', () => {
  it('홈에서 목록을 조회하고 기존 대화로 이동한다', async () => {
    const user = renderPage();
    expect(screen.getByRole('button', { name: '새 대화 시작' })).toBeInTheDocument();
    expect(screen.getByText('대화 목록 불러오는 중')).toBeInTheDocument();
    const nav = await screen.findByRole('navigation', { name: '대화 목록' });
    const links = within(nav).getAllByRole('link');
    expect(links.map((link) => link.getAttribute('href'))).toEqual([
      `/chats/${firstId}`,
      `/chats/${secondId}`,
      `/chats/${emptyId}`,
    ]);
    await user.click(links[0]);
    await screen.findByText('오늘 하루가 조금 지쳤어.');
    expect(screen.getByText(/그런 날도 있죠/)).toBeInTheDocument();
    expect(screen.getByRole('link', { current: 'page' })).toHaveAttribute(
      'href',
      `/chats/${firstId}`,
    );
  });

  it('새 대화를 한 번 생성하고 목록 추가와 빈 대화 이동을 처리한다', async () => {
    let calls = 0;
    const session = {
      chat_id: 'e51a28a8-1142-48bc-bb93-337d7e0c7234',
      created_at: '2026-10-06T03:00:00Z',
    };
    server.use(
      http.post(`${API_BASE_URL}/api/v1/chats`, async ({ request }) => {
        calls++;
        expect(await request.text()).toBe('');
        await delay(150);
        return HttpResponse.json(session, { status: 201 });
      }),
      http.get(`${API_BASE_URL}/api/v1/chats/${session.chat_id}`, () =>
        HttpResponse.json({ ...session, messages: [] }),
      ),
    );
    const user = renderPage();
    await screen.findByRole('navigation', { name: '대화 목록' });
    await user.dblClick(screen.getByRole('button', { name: '새 대화 시작' }));
    expect(screen.getByRole('button', { name: '대화 만드는 중…' })).toBeDisabled();
    await screen.findByRole('heading', { name: '새 대화' });
    expect(screen.getByLabelText('현재 경로')).toHaveTextContent(`/chats/${session.chat_id}`);
    expect(screen.getByRole('link', { current: 'page' })).toHaveAttribute(
      'href',
      `/chats/${session.chat_id}`,
    );
    expect(screen.getByText('아직 대화가 없어요.')).toBeInTheDocument();
    expect(calls).toBe(1);
  });

  it('완료·실패·처리 중 기록과 긴 내용을 직접 접근으로 표시한다', async () => {
    renderPage(`/chats/${secondId}`);
    await screen.findByText(/긴 이야기도 천천히 읽을 수 있어요/);
    expect(screen.getByText('응답 시간이 초과되었어요.')).toBeInTheDocument();
    expect(screen.getByText('답변 생성 중')).toBeInTheDocument();
    expect(screen.getByText(/https:\/\/example.com/)).toBeInTheDocument();
  });

  it('빈 목록에서도 새 대화를 만들 수 있다', async () => {
    vi.stubEnv('VITE_CHAT_MOCK_SCENARIO', 'empty');
    resetChatMocks();
    const user = renderPage();
    await screen.findByText('아직 대화가 없어요.');
    await user.click(screen.getByRole('button', { name: '새 대화 시작' }));
    await screen.findByRole('heading', { name: '새 대화' });
    expect(screen.getByRole('link', { current: 'page' })).toBeInTheDocument();
  });

  it('목록 오류 후 재시도한다', async () => {
    server.use(
      http.get(
        `${API_BASE_URL}/api/v1/chats`,
        () =>
          HttpResponse.json(
            { error: { code: 'DB_ERROR', message: '목록 조회 실패', request_id: 'request-id' } },
            { status: 500 },
          ),
        { once: true },
      ),
    );
    const user = renderPage();
    await screen.findByText('목록 조회 실패');
    await user.click(screen.getByRole('button', { name: '목록 다시 불러오기' }));
    await screen.findByRole('navigation', { name: '대화 목록' });
  });

  it('목록 조회 실패 중 생성해도 오류 안내와 새 세션을 함께 유지한다', async () => {
    server.use(
      http.get(`${API_BASE_URL}/api/v1/chats`, () =>
        HttpResponse.json(
          { error: { code: 'DB_ERROR', message: '목록 조회 실패', request_id: 'request-id' } },
          { status: 500 },
        ),
      ),
    );
    const user = renderPage();
    await screen.findByText('목록 조회 실패');
    await user.click(screen.getByRole('button', { name: '새 대화 시작' }));
    await screen.findByRole('heading', { name: '새 대화' });
    expect(screen.getByText('목록 조회 실패')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '목록 다시 불러오기' })).toBeInTheDocument();
    expect(screen.getByRole('link', { current: 'page' })).toBeInTheDocument();
  });

  it('생성 실패 시 기존 대화와 선택을 유지하고 다시 생성한다', async () => {
    server.use(
      http.post(
        `${API_BASE_URL}/api/v1/chats`,
        () =>
          HttpResponse.json(
            { error: { code: 'DB_ERROR', message: '생성 실패', request_id: 'request-id' } },
            { status: 500 },
          ),
        { once: true },
      ),
    );
    const user = renderPage(`/chats/${firstId}`);
    await screen.findByText('오늘 하루가 조금 지쳤어.');
    await user.click(screen.getByRole('button', { name: '새 대화' }));
    await screen.findByText('생성 실패');
    expect(screen.getByLabelText('현재 경로')).toHaveTextContent(`/chats/${firstId}`);
    expect(screen.getByText('오늘 하루가 조금 지쳤어.')).toBeInTheDocument();
    expect(screen.getByRole('link', { current: 'page' })).toHaveAttribute(
      'href',
      `/chats/${firstId}`,
    );
    await user.click(screen.getByRole('button', { name: '새 대화' }));
    await screen.findByRole('heading', { name: '새 대화' });
  });

  it('대화 조회 오류 후 재시도한다', async () => {
    server.use(
      http.get(
        `${API_BASE_URL}/api/v1/chats/${firstId}`,
        () =>
          HttpResponse.json(
            { error: { code: 'DB_ERROR', message: '상세 조회 실패', request_id: 'request-id' } },
            { status: 500 },
          ),
        { once: true },
      ),
    );
    const user = renderPage(`/chats/${firstId}`);
    await screen.findByText('상세 조회 실패');
    await user.click(screen.getByRole('button', { name: '대화 다시 불러오기' }));
    await screen.findByText('오늘 하루가 조금 지쳤어.');
  });

  it.each(['invalid-id', 'aaaaaaaa-aaaa-4aaa-aaaa-aaaaaaaaaaaa'])(
    '잘못되었거나 없는 세션 %s에서 홈으로 돌아간다',
    async (id) => {
      const user = renderPage(`/chats/${id}`);
      await screen.findByRole('heading', { name: '대화를 찾을 수 없어요.' });
      await user.click(screen.getByRole('link', { name: '처음 화면으로 이동' }));
      expect(screen.getByRole('button', { name: '새 대화 시작' })).toBeInTheDocument();
    },
  );

  it('세션 전환 후 이전의 늦은 응답을 표시하지 않는다', async () => {
    let release: (() => void) | undefined;
    let started = false;
    server.use(
      http.get(`${API_BASE_URL}/api/v1/chats/${firstId}`, async () => {
        await new Promise<void>((resolve) => {
          release = resolve;
          started = true;
        });
        return HttpResponse.json({
          chat_id: firstId,
          created_at: '2026-10-05T03:00:00Z',
          messages: [
            {
              request_id: 'old',
              chat_id: firstId,
              question: '이전 세션의 늦은 질문',
              answer: '이전 답변',
              status: 'completed',
              error_code: null,
              created_at: '2026-10-05T03:00:05Z',
              finished_at: '2026-10-05T03:00:07Z',
            },
          ],
        });
      }),
    );
    const user = renderPage(`/chats/${firstId}`);
    await waitFor(() => expect(started).toBe(true));
    const nav = await screen.findByRole('navigation', { name: '대화 목록' });
    await user.click(within(nav).getAllByRole('link')[1]);
    await screen.findByText('주말 계획을 같이 세워 줄래?');
    release?.();
    await user.tab();
    expect(screen.queryByText('이전 세션의 늦은 질문')).not.toBeInTheDocument();
    expect(screen.getByRole('link', { current: 'page' })).toHaveAttribute(
      'href',
      `/chats/${secondId}`,
    );
  });

  it('생성 중 다른 세션으로 이동하면 이전 생성 요청이 선택을 바꾸지 않는다', async () => {
    let release: (() => void) | undefined;
    let signal: AbortSignal | undefined;
    server.use(
      http.post(`${API_BASE_URL}/api/v1/chats`, async ({ request }) => {
        signal = request.signal;
        await new Promise<void>((resolve) => {
          release = resolve;
        });
        return HttpResponse.json(
          { chat_id: 'e51a28a8-1142-48bc-bb93-337d7e0c7234', created_at: '2026-10-06T03:00:00Z' },
          { status: 201 },
        );
      }),
    );
    const user = renderPage(`/chats/${firstId}`);
    await screen.findByText('오늘 하루가 조금 지쳤어.');
    try {
      await user.click(screen.getByRole('button', { name: '새 대화' }));
      await waitFor(() => expect(release).toBeDefined());
      const nav = screen.getByRole('navigation', { name: '대화 목록' });
      await user.click(within(nav).getAllByRole('link')[1]);
      await screen.findByText('주말 계획을 같이 세워 줄래?');
      expect(signal?.aborted).toBe(true);
      release?.();
      await user.tab();
      expect(screen.getByLabelText('현재 경로')).toHaveTextContent(`/chats/${secondId}`);
      expect(screen.getByRole('button', { name: '새 대화' })).toBeEnabled();
    } finally {
      release?.();
    }
  });

  it('늦은 목록 응답이 먼저 생성된 세션을 지우지 않는다', async () => {
    let release: (() => void) | undefined;
    server.use(
      http.get(`${API_BASE_URL}/api/v1/chats`, async () => {
        await new Promise<void>((resolve) => {
          release = resolve;
        });
        return HttpResponse.json({ items: [] });
      }),
    );
    const user = renderPage();
    await waitFor(() => expect(release).toBeDefined());
    await user.click(screen.getByRole('button', { name: '새 대화 시작' }));
    await screen.findByRole('heading', { name: '새 대화' });
    release?.();
    await user.tab();
    expect(screen.getByRole('link', { current: 'page' })).toBeInTheDocument();
  });
});

describe('채팅 MSW 계약', () => {
  it('생성한 세션을 목록과 상세에서 조회하고 새로 초기화하면 제거한다', async () => {
    const session = await apiRequest<ChatSession>('/api/v1/chats', { method: 'POST' });
    const list = await apiRequest<{ items: ChatSession[] }>('/api/v1/chats');
    expect(list.items).toContainEqual(session);
    const detail = await apiRequest<ChatDetail>(`/api/v1/chats/${session.chat_id}`);
    expect(detail).toEqual({ ...session, messages: [] });
    resetChatMocks();
    await expect(apiRequest(`/api/v1/chats/${session.chat_id}`)).rejects.toMatchObject({
      status: 404,
      message: '대화를 찾을 수 없어요.',
    });
  });
});
