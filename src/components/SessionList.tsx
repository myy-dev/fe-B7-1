import { NavLink } from 'react-router';
import { formatChatTime, type ChatSession } from '../lib/chats';
import type { SessionListState } from '../lib/useChatSessions';

export default function SessionList({
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
