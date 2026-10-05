import { useEffect, useRef, useState } from 'react';
import { Link, NavLink, useNavigate, useParams } from 'react-router';
import ChatMessages from '../components/ChatMessages';
import DeleteChatDialog from '../components/DeleteChatDialog';
import DuckAvatar from '../components/DuckAvatar';
import NewChatButton from '../components/NewChatButton';
import { ApiError, apiRequest } from '../lib/api';
import {
  formatChatTime,
  sortSessions,
  type ChatDetail,
  type ChatMessage,
  type ChatSession,
} from '../lib/chats';
import HomePage from './HomePage';

type SessionListState = {
  status: 'loading' | 'success' | 'error';
  items: ChatSession[];
  error: string;
};

export default function ChatPage() {
  const { chatId } = useParams();
  const navigate = useNavigate();
  const currentChatId = useRef(chatId);
  const [list, setList] = useState<SessionListState>({ status: 'loading', items: [], error: '' });
  const [listAttempt, setListAttempt] = useState(0);
  const [deleteTarget, setDeleteTarget] = useState<ChatSession | null>(null);
  const createdSessions = useRef<ChatSession[]>([]);
  const deletedSessions = useRef(new Set<string>());

  useEffect(() => {
    currentChatId.current = chatId;
  }, [chatId]);

  useEffect(() => {
    const controller = new AbortController();
    async function loadSessions() {
      try {
        const result = await apiRequest<{ items: ChatSession[] }>('/api/v1/chats', {
          signal: controller.signal,
        });
        if (controller.signal.aborted) return;
        // 목록 요청보다 생성 응답이 먼저 도착해도 새 세션을 유지한다.
        const items = [
          ...new Map(
            [...result.items, ...createdSessions.current].map((item) => [item.chat_id, item]),
          ).values(),
        ].filter((item) => !deletedSessions.current.has(item.chat_id));
        setList({ status: 'success', items: sortSessions(items), error: '' });
      } catch (cause) {
        if (!controller.signal.aborted) {
          setList((current) => ({
            ...current,
            status: 'error',
            error: cause instanceof ApiError ? cause.message : '대화 목록을 불러오지 못했어요.',
          }));
        }
      }
    }
    void loadSessions();
    return () => controller.abort();
  }, [listAttempt]);

  function retryList() {
    setList((current) => ({ ...current, status: 'loading', error: '' }));
    setListAttempt((current) => current + 1);
  }

  function addSession(session: ChatSession) {
    createdSessions.current.push(session);
    setList((current) => ({
      status: current.status === 'error' ? 'error' : 'success',
      items: sortSessions([session, ...current.items]),
      error: current.error,
    }));
  }

  function removeSession(id: string) {
    deletedSessions.current.add(id);
    createdSessions.current = createdSessions.current.filter((session) => session.chat_id !== id);
    setList((current) => ({
      ...current,
      items: current.items.filter((session) => session.chat_id !== id),
    }));
    if (currentChatId.current === id) navigate('/chats', { replace: true });
  }

  const deleteDialog = deleteTarget && (
    <DeleteChatDialog
      key={`delete-${deleteTarget.chat_id}`}
      session={deleteTarget}
      onDeleted={removeSession}
      onClose={() => setDeleteTarget(null)}
    />
  );

  if (!chatId) {
    return (
      <HomePage>
        <div className="mx-auto mt-8 max-w-xs">
          <NewChatButton label="새 대화 시작" onCreated={addSession} />
        </div>
        <section aria-labelledby="recent-chats-title" className="mx-auto mt-10 max-w-md text-left">
          <h2 id="recent-chats-title" className="mb-3 text-sm font-semibold">
            대화 목록
          </h2>
          <SessionList list={list} onRetry={retryList} onDelete={setDeleteTarget} />
        </section>
        {deleteDialog}
      </HomePage>
    );
  }

  return (
    <div className="grid w-full min-w-0 items-start gap-5 lg:grid-cols-[17rem_minmax(0,1fr)]">
      <aside aria-label="대화 선택" className="card min-w-0 border border-base-300 bg-base-100">
        <div className="card-body gap-4 p-4">
          <h2 className="text-lg font-bold">대화 목록</h2>
          <NewChatButton key={chatId} onCreated={addSession} />
          <div className="max-h-40 overflow-y-auto lg:max-h-[28rem]">
            <SessionList list={list} onRetry={retryList} onDelete={setDeleteTarget} />
          </div>
          <Link to="/chats" className="link text-center text-sm text-base-content/70">
            처음 화면
          </Link>
        </div>
      </aside>
      <ChatDetailView key={chatId} chatId={chatId} />
      {deleteDialog}
    </div>
  );
}

function SessionList({
  list,
  onRetry,
  onDelete,
}: {
  list: SessionListState;
  onRetry: () => void;
  onDelete: (session: ChatSession) => void;
}) {
  return (
    <div className="space-y-3">
      {list.status === 'loading' && (
        <p role="status" className="flex items-center gap-2 py-4 text-sm text-base-content/70">
          <span aria-hidden="true" className="loading loading-sm loading-spinner" />
          대화 목록 불러오는 중
        </p>
      )}
      {list.status === 'error' && (
        <>
          <div role="alert" className="alert text-sm alert-error">
            {list.error}
          </div>
          <button type="button" className="btn btn-outline btn-sm" onClick={onRetry}>
            목록 다시 불러오기
          </button>
        </>
      )}
      {list.status === 'success' && !list.items.length && (
        <p role="status" className="py-4 text-sm text-base-content/70">
          아직 대화가 없어요.
        </p>
      )}
      {list.items.length > 0 && (
        <nav aria-label="대화 목록">
          <ul className="menu w-full gap-1 p-0">
            {list.items.map((session) => (
              <li key={session.chat_id} className="flex-row items-center gap-1">
                <NavLink
                  to={`/chats/${encodeURIComponent(session.chat_id)}`}
                  className={({ isActive }) => `min-w-0 flex-1 ${isActive ? 'menu-active' : ''}`}
                >
                  <time
                    dateTime={session.created_at}
                    className="min-w-0 wrap-anywhere whitespace-normal"
                  >
                    {formatChatTime(session.created_at)} 대화
                  </time>
                </NavLink>
                <button
                  type="button"
                  className="btn btn-square shrink-0 btn-ghost text-base-content/60 btn-sm hover:text-error"
                  aria-label={`${formatChatTime(session.created_at)} 대화 삭제`}
                  onClick={() => onDelete(session)}
                >
                  <svg
                    aria-hidden="true"
                    viewBox="0 0 24 24"
                    className="size-4"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.8"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <path d="M3 6h18M9 6V4h6v2M5 6l1 14h12l1-14M10 10v6M14 10v6" />
                  </svg>
                </button>
              </li>
            ))}
          </ul>
        </nav>
      )}
    </div>
  );
}

function ChatDetailView({ chatId }: { chatId: string }) {
  const [state, setState] = useState<{
    status: 'loading' | 'success' | 'error';
    detail: ChatDetail | null;
    error: string;
    missing: boolean;
  }>({ status: 'loading', detail: null, error: '', missing: false });
  const [attempt, setAttempt] = useState(0);
  const [draft, setDraft] = useState('');
  const [sending, setSending] = useState(false);
  const [outgoing, setOutgoing] = useState<ChatMessage | null>(null);
  const [sendError, setSendError] = useState('');
  const [delayed, setDelayed] = useState(false);
  const sendRequest = useRef<AbortController | null>(null);
  const composing = useRef(false);
  const input = useRef<HTMLTextAreaElement>(null);
  const history = useRef<HTMLDivElement>(null);

  useEffect(() => () => sendRequest.current?.abort(), []);

  useEffect(() => {
    if (!outgoing) return;
    const timer = window.setTimeout(() => setDelayed(true), 2000);
    return () => window.clearTimeout(timer);
  }, [outgoing]);

  useEffect(() => {
    if (history.current) history.current.scrollTop = history.current.scrollHeight;
  }, [state.detail?.messages, outgoing, delayed]);

  useEffect(() => {
    const controller = new AbortController();
    async function loadDetail() {
      try {
        const detail = await apiRequest<ChatDetail>(`/api/v1/chats/${encodeURIComponent(chatId)}`, {
          signal: controller.signal,
        });
        if (!controller.signal.aborted)
          setState({ status: 'success', detail, error: '', missing: false });
      } catch (cause) {
        if (!controller.signal.aborted)
          setState({
            status: 'error',
            detail: null,
            error: cause instanceof ApiError ? cause.message : '대화를 불러오지 못했어요.',
            missing: cause instanceof ApiError && [404, 422].includes(cause.status),
          });
      }
    }
    void loadDetail();
    return () => controller.abort();
  }, [chatId, attempt]);

  function retry() {
    setState({ status: 'loading', detail: null, error: '', missing: false });
    setAttempt((current) => current + 1);
  }

  async function sendQuestion() {
    const question = draft.trim();
    if (!question || sendRequest.current || !state.detail) return;
    const controller = new AbortController();
    sendRequest.current = controller;
    setSending(true);
    setSendError('');
    setDelayed(false);
    // 전송 중 화면 표시용 상태이며, 저장된 기록은 API 응답만 반영한다.
    setOutgoing({
      request_id: crypto.randomUUID(),
      chat_id: chatId,
      question,
      answer: null,
      status: 'pending',
      error_code: null,
      created_at: new Date().toISOString(),
      finished_at: null,
    });
    try {
      const message = await apiRequest<ChatMessage>(
        `/api/v1/chats/${encodeURIComponent(chatId)}/messages`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ question }),
          signal: controller.signal,
        },
      );
      if (controller.signal.aborted) return;
      setState((current) => ({
        ...current,
        detail: current.detail
          ? { ...current.detail, messages: [...current.detail.messages, message] }
          : null,
      }));
      setDraft('');
    } catch (cause) {
      if (controller.signal.aborted) return;
      setSendError(
        cause instanceof ApiError ? cause.message : '메시지를 보내지 못했어요. 다시 시도해 주세요.',
      );
      setOutgoing(null);
      // 실패·처리 중 기록의 저장 여부는 서버가 결정하므로 다시 조회한다.
      if (cause instanceof ApiError && (cause.status >= 500 || cause.status === 409)) {
        try {
          const detail = await apiRequest<ChatDetail>(
            `/api/v1/chats/${encodeURIComponent(chatId)}`,
            { signal: controller.signal },
          );
          if (!controller.signal.aborted)
            setState({ status: 'success', detail, error: '', missing: false });
        } catch {
          // 기록 조회가 실패해도 기존 기록과 전송 오류·입력은 유지한다.
        }
      }
    } finally {
      if (!controller.signal.aborted) {
        sendRequest.current = null;
        setSending(false);
        setOutgoing(null);
        setDelayed(false);
        // 비활성 입력이 다시 렌더링된 뒤 포커스를 돌려준다.
        window.requestAnimationFrame(() => input.current?.focus());
      }
    }
  }

  return (
    <section aria-label="선택한 대화" className="card min-w-0 border border-base-300 bg-base-100">
      <div className="card-body min-h-96 gap-6 p-5 sm:p-8">
        {state.status === 'loading' && (
          <p role="status" className="m-auto flex items-center gap-2 text-sm text-base-content/70">
            <span aria-hidden="true" className="loading loading-sm loading-spinner" />
            대화 불러오는 중
          </p>
        )}
        {state.status === 'error' && (
          <div className="m-auto space-y-4 text-center">
            <h1 className="text-xl font-bold">
              {state.missing ? '대화를 찾을 수 없어요.' : '대화를 불러오지 못했어요.'}
            </h1>
            <p role="alert" className="text-sm text-error">
              {state.error}
            </p>
            {state.missing ? (
              <Link to="/chats" className="btn btn-primary">
                처음 화면으로 이동
              </Link>
            ) : (
              <button type="button" className="btn btn-outline" onClick={retry}>
                대화 다시 불러오기
              </button>
            )}
          </div>
        )}
        {state.status === 'success' && state.detail && (
          <>
            <header className="border-b border-base-300 pb-4">
              <h1 className="text-xl font-bold">
                {state.detail.messages.length ? '꽥꽥이와의 대화' : '새 대화'}
              </h1>
              <time
                dateTime={state.detail.created_at}
                className="mt-1 block text-xs text-base-content/65"
              >
                {formatChatTime(state.detail.created_at)}
              </time>
            </header>
            <div
              ref={history}
              role="region"
              aria-label="대화 내용"
              tabIndex={0}
              className="max-h-[min(50dvh,32rem)] min-h-48 overflow-y-auto rounded-field p-1"
            >
              {state.detail.messages.length || outgoing ? (
                <ChatMessages
                  messages={[...state.detail.messages, ...(outgoing ? [outgoing] : [])]}
                />
              ) : (
                <div className="grid min-h-48 content-center text-center">
                  <DuckAvatar className="mx-auto mb-4 size-24" />
                  <p role="status" className="text-base-content/70">
                    아직 대화가 없어요.
                  </p>
                </div>
              )}
            </div>
            {delayed && outgoing && (
              <p role="status" className="text-sm text-base-content/70">
                답변을 기다리고 있어요.
              </p>
            )}
            {sendError && (
              <p role="alert" className="alert text-sm alert-error">
                {sendError}
              </p>
            )}
            <form
              aria-label="메시지 전송"
              className="mt-auto flex min-w-0 items-end gap-2 border-t border-base-300 pt-4"
              onSubmit={(event) => {
                event.preventDefault();
                void sendQuestion();
              }}
            >
              <label htmlFor="chat-question" className="sr-only">
                메시지
              </label>
              <textarea
                ref={input}
                id="chat-question"
                className="textarea min-h-12 min-w-0 flex-1 resize-y bg-base-100"
                rows={2}
                placeholder="꽥꽥이에게 이야기해 보세요"
                value={draft}
                disabled={sending}
                onChange={(event) => {
                  setDraft(event.target.value);
                  setSendError('');
                }}
                onCompositionStart={() => {
                  composing.current = true;
                }}
                onCompositionEnd={() => {
                  composing.current = false;
                }}
                onKeyDown={(event) => {
                  if (
                    event.key !== 'Enter' ||
                    event.shiftKey ||
                    composing.current ||
                    event.nativeEvent.isComposing ||
                    event.keyCode === 229
                  )
                    return;
                  event.preventDefault();
                  if (!event.repeat) void sendQuestion();
                }}
              />
              <button
                type="submit"
                className="btn shrink-0 btn-primary"
                disabled={!draft.trim() || sending}
              >
                {sending ? (
                  <>
                    <span aria-hidden="true" className="loading loading-sm loading-spinner" />
                    전송 중…
                  </>
                ) : (
                  '보내기'
                )}
              </button>
            </form>
          </>
        )}
      </div>
    </section>
  );
}
