import { useEffect, useRef, useState } from 'react';
import { Link, NavLink, useParams } from 'react-router';
import ChatMessages from '../components/ChatMessages';
import DuckAvatar from '../components/DuckAvatar';
import NewChatButton from '../components/NewChatButton';
import { ApiError, apiRequest } from '../lib/api';
import { formatChatTime, sortSessions, type ChatDetail, type ChatSession } from '../lib/chats';
import HomePage from './HomePage';

type SessionListState = {
  status: 'loading' | 'success' | 'error';
  items: ChatSession[];
  error: string;
};

export default function ChatPage() {
  const { chatId } = useParams();
  const [list, setList] = useState<SessionListState>({ status: 'loading', items: [], error: '' });
  const [listAttempt, setListAttempt] = useState(0);
  const createdSessions = useRef<ChatSession[]>([]);

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
        ];
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
          <SessionList list={list} onRetry={retryList} />
        </section>
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
            <SessionList list={list} onRetry={retryList} />
          </div>
          <Link to="/chats" className="link text-center text-sm text-base-content/70">
            처음 화면
          </Link>
        </div>
      </aside>
      <ChatDetailView key={chatId} chatId={chatId} />
    </div>
  );
}

function SessionList({ list, onRetry }: { list: SessionListState; onRetry: () => void }) {
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
              <li key={session.chat_id}>
                <NavLink
                  to={`/chats/${encodeURIComponent(session.chat_id)}`}
                  className={({ isActive }) => (isActive ? 'menu-active' : '')}
                >
                  <time
                    dateTime={session.created_at}
                    className="min-w-0 wrap-anywhere whitespace-normal"
                  >
                    {formatChatTime(session.created_at)} 대화
                  </time>
                </NavLink>
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
            {state.detail.messages.length ? (
              <ChatMessages messages={state.detail.messages} />
            ) : (
              <div className="m-auto text-center">
                <DuckAvatar className="mx-auto mb-4 size-24" />
                <p role="status" className="text-base-content/70">
                  아직 대화가 없어요.
                </p>
              </div>
            )}
          </>
        )}
      </div>
    </section>
  );
}
