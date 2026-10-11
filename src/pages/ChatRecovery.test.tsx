import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { http, HttpResponse } from 'msw';
import { MemoryRouter } from 'react-router';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import App from '../App';
import { API_BASE_URL, apiRequest } from '../lib/api';
import { signIn } from '../lib/auth';
import type { ChatDetail, ChatMessage, ChatSession } from '../lib/chats';
import { createMockLoginResponse } from '../mocks/handlers';
import { server } from '../mocks/server';

const emptyId = '7b9e0398-6b3e-4b88-87db-358748803b75';
const firstId = 'e6100748-b7f0-48e6-a264-7c20a748cf93';
const path = `${API_BASE_URL}/api/v1/chats/${emptyId}`;
function message(status: ChatMessage['status'] = 'pending'): ChatMessage {
  return {
    request_id: 'saved-request',
    chat_id: emptyId,
    question: '복구할 질문',
    answer: status === 'completed' ? '저장된 답변' : null,
    status,
    error_code: null,
    created_at: '2026-10-10T03:00:00Z',
    finished_at: status === 'pending' ? null : '2026-10-10T03:00:02Z',
  };
}
function detail(messages: ChatMessage[]): ChatDetail {
  return { chat_id: emptyId, created_at: '2026-10-03T01:30:00Z', messages };
}
function renderPage() {
  render(
    <MemoryRouter initialEntries={[`/chats/${emptyId}`]}>
      <App />
    </MemoryRouter>,
  );
  return userEvent.setup();
}
beforeEach(() => signIn(createMockLoginResponse()));

describe('대화 결과 복구', () => {
  it('저장된 pending 상태에서 추가 전송을 막고 폴링으로 완료 결과를 표시한다', async () => {
    let completed = false;
    server.use(
      http.get(path, () =>
        HttpResponse.json(detail([message(completed ? 'completed' : 'pending')])),
      ),
    );
    renderPage();
    const input = await screen.findByRole('textbox', { name: '메시지' });
    expect(input).toBeDisabled();
    expect(screen.getByRole('button', { name: '보내기' })).toBeDisabled();
    completed = true;
    await screen.findByText('저장된 답변', {}, { timeout: 3000 });
    expect(input).toBeEnabled();
    expect(screen.queryByText('답변 생성 중')).not.toBeInTheDocument();
  });

  it('전송 중 나갔다 돌아온 대화도 서버 완료 결과를 자동으로 갱신한다', async () => {
    const saved = detail([]);
    let release: (() => void) | undefined;
    server.use(
      http.get(path, () => HttpResponse.json(saved)),
      http.post(`${path}/messages`, async () => {
        saved.messages.push(message());
        await new Promise<void>((resolve) => {
          release = resolve;
        });
        saved.messages[0] = message('completed');
        return HttpResponse.json(saved.messages[0], { status: 201 });
      }),
    );
    const user = renderPage();
    try {
      await user.type(await screen.findByRole('textbox', { name: '메시지' }), '복구할 질문');
      await user.click(screen.getByRole('button', { name: '보내기' }));
      await waitFor(() => expect(release).toBeDefined());
      const nav = await screen.findByRole('navigation', { name: '대화 목록' });
      await user.click(within(nav).getByRole('link', { name: /10월 5일/ }));
      await screen.findByText('오늘 하루가 조금 지쳤어.');
      await user.click(within(nav).getByRole('link', { name: /10월 3일/ }));
      expect(await screen.findByRole('textbox', { name: '메시지' })).toBeDisabled();
      release?.();
      await screen.findByText('저장된 답변', {}, { timeout: 3000 });
      expect(screen.getByRole('textbox', { name: '메시지' })).toBeEnabled();
    } finally {
      release?.();
    }
  });

  it('저장 이후 응답이 유실되어도 새 기록을 확인하고 입력을 비워 중복 재전송을 막는다', async () => {
    // 같은 내용의 이전 질문은 이번 요청의 성공으로 판단하지 않는다.
    const saved = detail([{ ...message('completed'), request_id: 'old-request' }]);
    let calls = 0;
    server.use(
      http.get(path, () => HttpResponse.json(saved)),
      http.post(`${path}/messages`, () => {
        calls++;
        saved.messages.push(message('completed'));
        return HttpResponse.error();
      }),
    );
    const user = renderPage();
    await user.type(await screen.findByRole('textbox', { name: '메시지' }), '복구할 질문');
    await user.click(screen.getByRole('button', { name: '보내기' }));
    await waitFor(() => expect(screen.getAllByText('저장된 답변')).toHaveLength(2));
    expect(screen.getByRole('textbox', { name: '메시지' })).toHaveValue('');
    expect(screen.getByRole('button', { name: '보내기' })).toBeDisabled();
    expect(calls).toBe(1);
  });

  it('동일한 과거 질문만 있으면 응답 유실된 이번 질문의 입력을 지우지 않는다', async () => {
    const saved = detail([{ ...message('completed'), request_id: 'old-request' }]);
    server.use(
      http.get(path, () => HttpResponse.json(saved)),
      http.post(`${path}/messages`, () => HttpResponse.error()),
    );
    const user = renderPage();
    await user.type(await screen.findByRole('textbox', { name: '메시지' }), '복구할 질문');
    await user.click(screen.getByRole('button', { name: '보내기' }));
    await screen.findByText('전송 결과를 확인하고 있어요. 확인 전에는 다시 보내지 마세요.');
    expect(await screen.findByRole('button', { name: '보내기' })).toBeDisabled();
    expect(screen.getByRole('textbox', { name: '메시지' })).toHaveValue('복구할 질문');
    expect(screen.getAllByText('저장된 답변')).toHaveLength(1);
  });

  it('첫 조회에 기록이 없어도 잠금을 유지하고 뒤늦게 저장된 결과를 복구한다', async () => {
    const saved = detail([]);
    let calls = 0;
    server.use(
      http.get(path, () => HttpResponse.json(saved)),
      http.post(`${path}/messages`, () => {
        calls++;
        return HttpResponse.error();
      }),
    );
    const user = renderPage();
    await user.type(await screen.findByRole('textbox', { name: '메시지' }), '복구할 질문');
    await user.click(screen.getByRole('button', { name: '보내기' }));
    await screen.findByText('전송 결과를 확인하고 있어요. 확인 전에는 다시 보내지 마세요.');
    await screen.findByRole('button', { name: '보내기' });
    expect(screen.getByRole('textbox', { name: '메시지' })).toBeDisabled();
    await user.click(screen.getByRole('button', { name: '보내기' }));
    expect(calls).toBe(1);
    saved.messages.push(message('completed'));
    await screen.findByText('저장된 답변', {}, { timeout: 3000 });
    expect(screen.getByRole('textbox', { name: '메시지' })).toHaveValue('');
    expect(calls).toBe(1);
  });

  it.each(['completed', 'failed'] as const)(
    '응답 유실 후 pending 질문의 초안을 보존하고 %s 결과에 맞게 처리한다',
    async (result) => {
      const saved = detail([]);
      server.use(
        http.get(path, () => HttpResponse.json(saved)),
        http.post(`${path}/messages`, () => {
          saved.messages.push(message());
          return HttpResponse.error();
        }),
      );
      const user = renderPage();
      await user.type(await screen.findByRole('textbox', { name: '메시지' }), '복구할 질문');
      await user.click(screen.getByRole('button', { name: '보내기' }));
      await screen.findByText('답변 생성 중');
      await screen.findByRole('button', { name: '보내기' });
      expect(screen.getByRole('textbox', { name: '메시지' })).toHaveValue('복구할 질문');
      expect(screen.getByRole('textbox', { name: '메시지' })).toBeDisabled();
      saved.messages[0] = message(result);
      await user.click(screen.getByRole('button', { name: '기록 다시 확인' }));
      await waitFor(() => expect(screen.getByRole('textbox', { name: '메시지' })).toBeEnabled());
      expect(screen.getByRole('textbox', { name: '메시지' })).toHaveValue(
        result === 'completed' ? '' : '복구할 질문',
      );
      if (result === 'failed') {
        server.use(
          http.post(`${path}/messages`, () =>
            HttpResponse.json(message('completed'), { status: 201 }),
          ),
        );
        await user.click(screen.getByRole('button', { name: '보내기' }));
        await screen.findByText('저장된 답변');
        expect(screen.getByRole('textbox', { name: '메시지' })).toHaveValue('');
      }
    },
  );

  it.each([false, true])(
    '장시간 결과 미확인 시 명시적으로 재전송을 준비하며 마지막 조회도 확인한다 (뒤늦은 저장: %s)',
    async (savedLate) => {
      const saved = detail([]);
      let calls = 0;
      server.use(
        http.get(path, () => HttpResponse.json(saved)),
        http.post(`${path}/messages`, () => {
          calls++;
          return HttpResponse.error();
        }),
      );
      const user = renderPage();
      await user.type(await screen.findByRole('textbox', { name: '메시지' }), '복구할 질문');
      await user.click(screen.getByRole('button', { name: '보내기' }));
      await screen.findByText('전송 결과를 확인하고 있어요. 확인 전에는 다시 보내지 마세요.');
      await screen.findByRole('button', { name: '보내기' });
      const now = vi.spyOn(Date, 'now').mockReturnValue(Date.now() + 70_000);
      try {
        await user.click(
          await screen.findByRole('button', { name: '다시 보내기 준비' }, { timeout: 3000 }),
        );
        const dialog = screen.getByRole('dialog');
        expect(dialog).toHaveTextContent('중복 저장될 수 있습니다');
        expect(screen.getByRole('textbox', { name: '메시지' })).toBeDisabled();
        if (savedLate) saved.messages.push(message());
        await user.click(within(dialog).getByRole('button', { name: '입력 잠금 해제' }));
        await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
        expect(screen.getByRole('textbox', { name: '메시지' })).toHaveValue('복구할 질문');
        if (savedLate) expect(screen.getByRole('textbox', { name: '메시지' })).toBeDisabled();
        else expect(screen.getByRole('textbox', { name: '메시지' })).toBeEnabled();
        expect(calls).toBe(1);
      } finally {
        now.mockRestore();
      }
    },
  );

  it('재조회와 새 답변이 이전 기록을 읽는 사용자의 스크롤을 옮기지 않는다', async () => {
    const saved = detail([message()]);
    let reads = 0;
    server.use(
      http.get(path, () => {
        reads++;
        return HttpResponse.json(saved);
      }),
    );
    renderPage();
    const history = await screen.findByRole('region', { name: '대화 내용' });
    Object.defineProperties(history, {
      scrollHeight: { configurable: true, value: 1000 },
      clientHeight: { configurable: true, value: 200 },
    });
    history.scrollTop = 100;
    fireEvent.scroll(history);
    fireEvent(window, new Event('focus'));
    await waitFor(() => expect(reads).toBe(2));
    await screen.findByText('답변 생성 중');
    expect(history.scrollTop).toBe(100);
    saved.messages[0] = message('completed');
    fireEvent(window, new Event('focus'));
    await screen.findByText('저장된 답변');
    expect(history.scrollTop).toBe(100);
    history.scrollTop = 800;
    fireEvent.scroll(history);
    saved.messages.push({
      ...message('completed'),
      request_id: 'next-request',
      answer: '다음 답변',
    });
    fireEvent(window, new Event('focus'));
    await screen.findByText('다음 답변');
    expect(history.scrollTop).toBe(1000);
  });

  it('늦은 최초 조회가 포커스 복귀 후 받은 최신 기록을 덮어쓰지 않는다', async () => {
    let release!: () => void;
    let reads = 0;
    const deferred = new Promise<void>((resolve) => {
      release = resolve;
    });
    server.use(
      http.get(path, async () => {
        if (++reads === 1) {
          await deferred;
          return HttpResponse.json(detail([]));
        }
        return HttpResponse.json(detail([message('completed')]));
      }),
    );
    const user = renderPage();
    try {
      await waitFor(() => expect(reads).toBe(1));
      fireEvent(window, new Event('focus'));
      await screen.findByText('저장된 답변');
      await act(async () => {
        release();
        await deferred;
      });
      await user.tab();
      expect(screen.getByText('저장된 답변')).toBeInTheDocument();
    } finally {
      release();
    }
  });

  it('결과 재조회도 실패하면 입력과 기록을 보존하고 확인 전까지 전송을 막는다', async () => {
    let loseResponse = false;
    const saved = detail([]);
    server.use(
      http.get(path, () => (loseResponse ? HttpResponse.error() : HttpResponse.json(saved))),
      http.post(`${path}/messages`, () => {
        saved.messages.push(message('completed'));
        loseResponse = true;
        return HttpResponse.error();
      }),
    );
    const user = renderPage();
    await user.type(await screen.findByRole('textbox', { name: '메시지' }), '복구할 질문');
    await user.click(screen.getByRole('button', { name: '보내기' }));
    await screen.findByText('기록을 확인하지 못했어요. 다시 확인해 주세요.');
    expect(screen.getByRole('textbox', { name: '메시지' })).toHaveValue('복구할 질문');
    expect(screen.getByRole('textbox', { name: '메시지' })).toBeDisabled();
    loseResponse = false;
    await user.click(screen.getByRole('button', { name: '기록 다시 확인' }));
    await screen.findByText('저장된 답변');
    expect(screen.getByRole('textbox', { name: '메시지' })).toHaveValue('');
    expect(screen.getByRole('textbox', { name: '메시지' })).toBeEnabled();
  });

  it('포커스를 되찾으면 완료된 대화에도 새 서버 기록을 반영한다', async () => {
    const saved = detail([]);
    server.use(http.get(path, () => HttpResponse.json(saved)));
    renderPage();
    await screen.findByRole('textbox', { name: '메시지' });
    saved.messages.push(message('completed'));
    fireEvent(window, new Event('focus'));
    await screen.findByText('저장된 답변');
  });

  it('장시간 pending은 자동 조회를 멈추고 수동 확인을 제공한다', async () => {
    let reads = 0;
    const started = Date.now();
    server.use(
      http.get(path, () => {
        reads++;
        return HttpResponse.json(detail([message()]));
      }),
    );
    const user = renderPage();
    await screen.findByRole('textbox', { name: '메시지' });
    const now = vi.spyOn(Date, 'now').mockReturnValue(started + 70_000);
    try {
      await screen.findByText(
        '처리가 오래 걸리고 있어요. 기록을 다시 확인해 주세요.',
        {},
        { timeout: 3000 },
      );
      const count = reads;
      await act(() => new Promise((resolve) => setTimeout(resolve, 1700)));
      expect(reads).toBe(count);
      server.use(http.get(path, () => HttpResponse.json(detail([message('completed')]))));
      await user.click(screen.getByRole('button', { name: '기록 다시 확인' }));
      await screen.findByText('저장된 답변');
    } finally {
      now.mockRestore();
    }
  });
});

describe('모킹의 대화 소유권', () => {
  it('다른 계정의 목록·상세·전송·삭제에서 대화를 노출하지 않는다', async () => {
    const owned = await apiRequest<ChatSession>('/api/v1/chats', { method: 'POST' });
    signIn(createMockLoginResponse(1800, 'user', 3));
    const list = await apiRequest<{ items: ChatSession[] }>('/api/v1/chats');
    expect(list.items).toEqual([]);
    for (const id of [owned.chat_id, firstId]) {
      for (const [suffix, options] of [
        ['', {}],
        ['', { method: 'DELETE' }],
        [
          '/messages',
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ question: '다른 사람의 대화' }),
          },
        ],
      ] as const) {
        await expect(apiRequest(`/api/v1/chats/${id}${suffix}`, options)).rejects.toMatchObject({
          status: 404,
        });
      }
    }
  });
});
