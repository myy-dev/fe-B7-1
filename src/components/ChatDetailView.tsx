import { useLayoutEffect, useRef, useState } from 'react';
import { Link } from 'react-router';
import ChatMessages from './ChatMessages';
import DuckAvatar from './DuckAvatar';
import ChatComposer from './ChatComposer';
import ConfirmDialog from './ConfirmDialog';
import { formatChatTime } from '../lib/chats';
import useChatDetail from '../lib/useChatDetail';

export default function ChatDetailView({ chatId }: { chatId: string }) {
  const {
    state,
    sending,
    outgoing,
    sendError,
    pending,
    uncertain,
    canRetry,
    delayed,
    refreshError,
    clearVersion,
    retry,
    refresh,
    allowRetry,
    sendQuestion,
    clearSendError,
  } = useChatDetail(chatId);
  const history = useRef<HTMLDivElement>(null);
  const followLatest = useRef(true);
  const [confirmRetry, setConfirmRetry] = useState(false);
  const [checkingRetry, setCheckingRetry] = useState(false);
  // 저장된 메시지 본문은 완료 이후 바뀌지 않는다. 재조회로 생긴 새 배열은 무시한다.
  const historyVersion = state.detail?.messages
    .map((message) => `${message.request_id}:${message.status}:${message.finished_at}`)
    .join('|');
  const outgoingId = outgoing?.request_id;
  useLayoutEffect(() => {
    if (history.current && (followLatest.current || outgoingId)) {
      history.current.scrollTop = history.current.scrollHeight;
      followLatest.current = true;
    }
  }, [historyVersion, outgoingId, state.status]);
  return (
    <section
      aria-label="선택한 대화"
      className="card min-w-0 border border-base-300 bg-base-100 lg:min-h-0"
    >
      <div className="card-body min-h-96 gap-6 p-5 sm:p-8 lg:min-h-0">
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
            <header className="shrink-0 border-b border-base-300 pb-4">
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
              onScroll={(event) => {
                const element = event.currentTarget;
                followLatest.current =
                  element.scrollHeight - element.clientHeight - element.scrollTop <= 32;
              }}
              role="region"
              aria-label="대화 내용"
              tabIndex={0}
              className="max-h-[min(50dvh,32rem)] min-h-48 overflow-y-auto rounded-field p-1 lg:max-h-none lg:min-h-0 lg:flex-1"
            >
              {state.detail.messages.length || outgoing ? (
                <ChatMessages
                  messages={[...state.detail.messages, ...(outgoing ? [outgoing] : [])]}
                />
              ) : (
                <div className="grid min-h-48 content-center text-center lg:h-full lg:min-h-0">
                  <DuckAvatar className="mx-auto mb-4 size-24" />
                  <p role="status" className="text-base-content/70">
                    아직 대화가 없어요.
                  </p>
                </div>
              )}
            </div>
            {sendError && (
              <p role="alert" className="alert shrink-0 text-sm alert-error">
                {sendError}
              </p>
            )}
            {(pending || uncertain || refreshError) && (
              <div className="space-y-2 text-sm text-base-content/70">
                <p role="status">
                  {refreshError ||
                    (delayed
                      ? '처리가 오래 걸리고 있어요. 기록을 다시 확인해 주세요.'
                      : uncertain
                        ? '전송 결과를 확인하고 있어요. 확인 전에는 다시 보내지 마세요.'
                        : '이전 답변을 기다리고 있어요.')}
                </p>
                <button type="button" className="btn btn-outline btn-sm" onClick={refresh}>
                  기록 다시 확인
                </button>
                {delayed && canRetry && !refreshError && (
                  <button
                    type="button"
                    className="btn btn-ghost btn-sm"
                    onClick={() => setConfirmRetry(true)}
                  >
                    다시 보내기 준비
                  </button>
                )}
              </div>
            )}
            <ChatComposer
              key={clearVersion}
              disabled={sending || pending || uncertain}
              sending={sending}
              onSend={sendQuestion}
              onChange={clearSendError}
            />
            {confirmRetry && (
              <ConfirmDialog
                title="전송 결과를 확인하지 못했어요"
                description="아직 저장된 질문이 없지만 서버에서 나중에 처리될 수 있어요. 다시 보내면 같은 질문이 중복 저장될 수 있습니다. 입력 잠금을 해제할까요?"
                pending={checkingRetry}
                confirmLabel="입력 잠금 해제"
                pendingLabel="기록 확인 중…"
                closeLabel="재전송 확인 닫기"
                onClose={() => setConfirmRetry(false)}
                onConfirm={async () => {
                  setCheckingRetry(true);
                  try {
                    await allowRetry();
                    setConfirmRetry(false);
                  } finally {
                    setCheckingRetry(false);
                  }
                }}
              />
            )}
          </>
        )}
      </div>
    </section>
  );
}
