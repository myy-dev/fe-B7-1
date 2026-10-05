import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { delay, http, HttpResponse } from 'msw';
import { StrictMode } from 'react';
import { MemoryRouter, useLocation } from 'react-router';
import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import App from '../App';
import { API_BASE_URL, apiRequest } from '../lib/api';
import type { ChatDetail, ChatSession } from '../lib/chats';
import { resetChatMocks } from '../mocks/handlers';
import { server } from '../mocks/server';

const firstId = 'e6100748-b7f0-48e6-a264-7c20a748cf93';
const emptyId = '7b9e0398-6b3e-4b88-87db-358748803b75';
const firstDelete = '10월 5일 오후 12:00 대화 삭제';
const emptyDelete = '10월 3일 오전 10:30 대화 삭제';

// jsdom은 네이티브 dialog의 열기·닫기를 구현하지 않는다.
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
afterEach(() => {
  vi.unstubAllEnvs();
  resetChatMocks();
});

function CurrentPath() {
  return <output aria-label="현재 경로">{useLocation().pathname}</output>;
}

function renderPage(path = '/chats', strict = false) {
  const page = (
    <MemoryRouter initialEntries={[path]}>
      <App />
      <CurrentPath />
    </MemoryRouter>
  );
  render(strict ? <StrictMode>{page}</StrictMode> : page);
  return userEvent.setup();
}

async function openDelete(user: ReturnType<typeof userEvent.setup>, name = firstDelete) {
  await user.click(await screen.findByRole('button', { name }));
  return screen.getByRole('dialog', { name: '대화를 삭제할까요?' });
}

describe('대화 삭제', () => {
  it('개발 모드의 반복 effect 실행에서도 확인창을 유지한다', async () => {
    const user = renderPage('/chats', true);
    const dialog = await openDelete(user);
    expect(dialog).toHaveAttribute('open');
    await user.click(within(dialog).getByRole('button', { name: '취소' }));
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });
  it('취소·Escape·배경 닫기는 요청 없이 선택과 입력을 유지한다', async () => {
    let calls = 0;
    server.use(
      http.delete(`${API_BASE_URL}/api/v1/chats/:chatId`, () => {
        calls++;
        return new HttpResponse(null, { status: 204 });
      }),
    );
    const user = renderPage(`/chats/${firstId}`);
    const input = await screen.findByRole('textbox', { name: '메시지' });
    await user.type(input, '작성하던 질문');
    let dialog = await openDelete(user);
    expect(within(dialog).getByText('10월 5일 오후 12:00 대화')).toBeInTheDocument();
    await user.click(within(dialog).getByRole('button', { name: '취소' }));
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    dialog = await openDelete(user);
    expect(fireEvent(dialog, new Event('cancel', { cancelable: true }))).toBe(true);
    fireEvent(dialog, new Event('close'));
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    dialog = await openDelete(user);
    await user.click(within(dialog).getByRole('button', { name: '삭제 확인 닫기' }));
    expect(input).toHaveValue('작성하던 질문');
    expect(screen.getByText('오늘 하루가 조금 지쳤어.')).toBeInTheDocument();
    expect(screen.getByLabelText('현재 경로')).toHaveTextContent(`/chats/${firstId}`);
    expect(calls).toBe(0);
  });

  it('다른 대화를 삭제해도 현재 선택·기록·입력을 유지한다', async () => {
    const user = renderPage(`/chats/${firstId}`);
    const input = await screen.findByRole('textbox', { name: '메시지' });
    await user.type(input, '계속 쓸 질문');
    const dialog = await openDelete(user, emptyDelete);
    await user.click(within(dialog).getByRole('button', { name: '삭제' }));
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
    expect(screen.queryByRole('button', { name: emptyDelete })).not.toBeInTheDocument();
    expect(screen.getByRole('link', { current: 'page' })).toHaveAttribute(
      'href',
      `/chats/${firstId}`,
    );
    expect(input).toHaveValue('계속 쓸 질문');
    expect(screen.getByText('오늘 하루가 조금 지쳤어.')).toBeInTheDocument();
    expect(
      within(screen.getByRole('navigation', { name: '대화 목록' })).getAllByRole('link'),
    ).toHaveLength(2);
  });

  it('현재 대화를 삭제하면 홈으로 돌아가고 기록과 선택을 정리한다', async () => {
    const user = renderPage(`/chats/${firstId}`);
    await screen.findByText('오늘 하루가 조금 지쳤어.');
    const dialog = await openDelete(user);
    await user.click(within(dialog).getByRole('button', { name: '삭제' }));
    await screen.findByRole('button', { name: '새 대화 시작' });
    expect(screen.getByLabelText('현재 경로')).toHaveTextContent('/chats');
    expect(screen.queryByRole('button', { name: firstDelete })).not.toBeInTheDocument();
    expect(screen.queryByText('오늘 하루가 조금 지쳤어.')).not.toBeInTheDocument();
    expect(screen.queryByRole('link', { current: 'page' })).not.toBeInTheDocument();
  });

  it('홈에서도 마지막 대화 삭제 후 빈 목록과 새 대화 시작을 제공한다', async () => {
    vi.stubEnv('VITE_CHAT_MOCK_SCENARIO', 'empty');
    resetChatMocks();
    const user = renderPage();
    await user.click(screen.getByRole('button', { name: '새 대화 시작' }));
    await screen.findByRole('textbox', { name: '메시지' });
    await user.click(screen.getByRole('link', { name: '처음 화면' }));
    const button = screen.getByRole('button', { name: /대화 삭제$/ });
    await user.click(button);
    await user.click(within(screen.getByRole('dialog')).getByRole('button', { name: '삭제' }));
    await screen.findByText('아직 대화가 없어요.');
    expect(screen.queryByRole('navigation', { name: '대화 목록' })).not.toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: '새 대화 시작' }));
    await screen.findByRole('textbox', { name: '메시지' });
    expect(screen.getByRole('button', { name: /대화 삭제$/ })).toBeInTheDocument();
  });

  it('삭제 실패 시 확인창·목록·선택을 유지하고 재시도한다', async () => {
    vi.stubEnv('VITE_CHAT_MOCK_SCENARIO', 'delete-error');
    const user = renderPage(`/chats/${firstId}`);
    await screen.findByText('오늘 하루가 조금 지쳤어.');
    const dialog = await openDelete(user);
    await user.click(within(dialog).getByRole('button', { name: '삭제' }));
    await within(dialog).findByRole('alert');
    expect(screen.getByRole('button', { name: firstDelete })).toBeInTheDocument();
    expect(screen.getByText('오늘 하루가 조금 지쳤어.')).toBeInTheDocument();
    expect(screen.getByLabelText('현재 경로')).toHaveTextContent(`/chats/${firstId}`);
    await user.click(within(dialog).getByRole('button', { name: '삭제' }));
    await screen.findByRole('button', { name: '새 대화 시작' });
  });

  it('삭제 중에는 중복 요청·취소·Escape·배경 닫기를 막는다', async () => {
    let calls = 0;
    let release: (() => void) | undefined;
    server.use(
      http.delete(`${API_BASE_URL}/api/v1/chats/${firstId}`, async ({ request }) => {
        calls++;
        expect(await request.text()).toBe('');
        await new Promise<void>((resolve) => {
          release = resolve;
        });
        return new HttpResponse(null, { status: 204 });
      }),
    );
    const user = renderPage(`/chats/${firstId}`);
    const dialog = await openDelete(user);
    try {
      await user.dblClick(within(dialog).getByRole('button', { name: '삭제' }));
      await waitFor(() => expect(release).toBeDefined());
      expect(within(dialog).getByRole('button', { name: '삭제 중…' })).toBeDisabled();
      expect(within(dialog).getByRole('button', { name: '취소' })).toBeDisabled();
      expect(within(dialog).getByRole('button', { name: '삭제 확인 닫기' })).toBeDisabled();
      expect(fireEvent(dialog, new Event('cancel', { cancelable: true }))).toBe(false);
      expect(calls).toBe(1);
      release?.();
      await screen.findByRole('button', { name: '새 대화 시작' });
    } finally {
      release?.();
    }
  });

  it('네트워크 오류가 나도 기존 목록을 유지하고 확인창에서 취소할 수 있다', async () => {
    server.use(http.delete(`${API_BASE_URL}/api/v1/chats/:chatId`, () => HttpResponse.error()));
    const user = renderPage();
    const dialog = await openDelete(user);
    await user.click(within(dialog).getByRole('button', { name: '삭제' }));
    await within(dialog).findByText('대화를 삭제하지 못했어요. 다시 시도해 주세요.');
    await user.click(within(dialog).getByRole('button', { name: '취소' }));
    expect(screen.getByRole('button', { name: firstDelete })).toBeInTheDocument();
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('이미 없는 대화의 404 응답도 목록과 현재 선택에서 제거한다', async () => {
    server.use(
      http.delete(`${API_BASE_URL}/api/v1/chats/${firstId}`, () =>
        HttpResponse.json(
          { error: { code: 'CHAT_NOT_FOUND', message: '이미 없는 대화', request_id: 'gone' } },
          { status: 404 },
        ),
      ),
    );
    const user = renderPage(`/chats/${firstId}`);
    const dialog = await openDelete(user);
    await user.click(within(dialog).getByRole('button', { name: '삭제' }));
    await screen.findByRole('button', { name: '새 대화 시작' });
    expect(screen.queryByRole('button', { name: firstDelete })).not.toBeInTheDocument();
  });

  it('늦은 목록 응답이 삭제한 새 세션을 다시 표시하지 않는다', async () => {
    vi.stubEnv('VITE_CHAT_MOCK_SCENARIO', 'empty');
    resetChatMocks();
    let release: (() => void) | undefined;
    let stale: ChatSession | undefined;
    server.use(
      http.get(`${API_BASE_URL}/api/v1/chats`, async () => {
        await new Promise<void>((resolve) => {
          release = resolve;
        });
        return HttpResponse.json({ items: [stale] });
      }),
    );
    const user = renderPage();
    try {
      await waitFor(() => expect(release).toBeDefined());
      await user.click(screen.getByRole('button', { name: '새 대화 시작' }));
      await screen.findByRole('textbox', { name: '메시지' });
      const id = screen.getByLabelText('현재 경로').textContent!.split('/').pop()!;
      const detail = await apiRequest<ChatDetail>(`/api/v1/chats/${id}`);
      stale = { chat_id: id, created_at: detail.created_at };
      await user.click(screen.getByRole('button', { name: /대화 삭제$/ }));
      await user.click(within(screen.getByRole('dialog')).getByRole('button', { name: '삭제' }));
      await screen.findByRole('button', { name: '새 대화 시작' });
      await act(async () => {
        release?.();
        await delay(50);
      });
      expect(screen.queryByRole('navigation', { name: '대화 목록' })).not.toBeInTheDocument();
      expect(screen.getByText('아직 대화가 없어요.')).toBeInTheDocument();
    } finally {
      release?.();
    }
  });

  it('전송 중 현재 대화를 삭제하면 이전 답변 요청도 화면에서 중단한다', async () => {
    let release: (() => void) | undefined;
    let signal: AbortSignal | undefined;
    server.use(
      http.post(`${API_BASE_URL}/api/v1/chats/${emptyId}/messages`, async ({ request }) => {
        signal = request.signal;
        await new Promise<void>((resolve) => {
          release = resolve;
        });
        return HttpResponse.json({ answer: '삭제 뒤 늦은 답변' }, { status: 201 });
      }),
    );
    const user = renderPage(`/chats/${emptyId}`);
    const input = await screen.findByRole('textbox', { name: '메시지' });
    try {
      await user.type(input, '대기 중 질문');
      await user.click(screen.getByRole('button', { name: '보내기' }));
      await waitFor(() => expect(release).toBeDefined());
      const dialog = await openDelete(user, emptyDelete);
      await user.click(within(dialog).getByRole('button', { name: '삭제' }));
      await screen.findByRole('button', { name: '새 대화 시작' });
      await waitFor(() => expect(signal?.aborted).toBe(true));
      await act(async () => {
        release?.();
        await delay(50);
      });
      expect(screen.queryByText('삭제 뒤 늦은 답변')).not.toBeInTheDocument();
      expect(screen.queryByText('대기 중 질문')).not.toBeInTheDocument();
    } finally {
      release?.();
    }
  });
});

describe('삭제 MSW 임시 계약', () => {
  it('204로 삭제 후 목록·상세·전송에서도 제거되고 재삭제는 404다', async () => {
    await expect(
      apiRequest(`/api/v1/chats/${firstId}`, { method: 'DELETE' }),
    ).resolves.toBeUndefined();
    const list = await apiRequest<{ items: ChatSession[] }>('/api/v1/chats');
    expect(list.items.some((session) => session.chat_id === firstId)).toBe(false);
    await expect(apiRequest(`/api/v1/chats/${firstId}`)).rejects.toMatchObject({ status: 404 });
    await expect(
      apiRequest(`/api/v1/chats/${firstId}/messages`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ question: '질문' }),
      }),
    ).rejects.toMatchObject({ status: 404 });
    await expect(
      apiRequest(`/api/v1/chats/${firstId}`, { method: 'DELETE' }),
    ).rejects.toMatchObject({ status: 404 });
  });

  it('잘못된 UUID는 422이며 다른 세션을 삭제하지 않는다', async () => {
    await expect(apiRequest('/api/v1/chats/invalid', { method: 'DELETE' })).rejects.toMatchObject({
      status: 422,
    });
    const list = await apiRequest<{ items: ChatSession[] }>('/api/v1/chats');
    expect(list.items).toHaveLength(3);
  });
});
