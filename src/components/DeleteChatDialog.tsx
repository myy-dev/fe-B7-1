import { useEffect, useRef, useState } from 'react';
import { ApiError, apiRequest, isMockEnabled } from '../lib/api';
import { formatChatTime, type ChatSession } from '../lib/chats';

interface DeleteChatDialogProps {
  session: ChatSession;
  onDeleted: (chatId: string) => void;
  onClose: () => void;
}

export default function DeleteChatDialog({ session, onDeleted, onClose }: DeleteChatDialogProps) {
  const dialog = useRef<HTMLDialogElement>(null);
  const request = useRef<AbortController | null>(null);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    const element = dialog.current;
    if (element && !element.open) element.showModal();
    return () => request.current?.abort();
  }, []);

  function closeDialog() {
    dialog.current?.close();
    onClose();
  }

  async function deleteChat() {
    if (request.current || !isMockEnabled()) return;
    const controller = new AbortController();
    request.current = controller;
    setPending(true);
    setError('');
    try {
      await apiRequest<void>(`/api/v1/chats/${encodeURIComponent(session.chat_id)}`, {
        method: 'DELETE',
        signal: controller.signal,
      });
      if (controller.signal.aborted) return;
      onDeleted(session.chat_id);
      closeDialog();
    } catch (cause) {
      if (!controller.signal.aborted) {
        if (cause instanceof ApiError && cause.status === 404) {
          // 이미 없는 대화도 목록에서 제거해 서버 상태에 맞춘다.
          onDeleted(session.chat_id);
          closeDialog();
        } else {
          setError(
            cause instanceof ApiError
              ? cause.message
              : '대화를 삭제하지 못했어요. 다시 시도해 주세요.',
          );
        }
      }
    } finally {
      if (!controller.signal.aborted) {
        request.current = null;
        setPending(false);
      }
    }
  }

  return (
    <dialog
      ref={dialog}
      className="modal modal-middle"
      aria-labelledby="delete-chat-title"
      aria-describedby="delete-chat-target"
      onCancel={(event) => {
        if (request.current) event.preventDefault();
      }}
      onClose={onClose}
    >
      <div className="modal-box space-y-4 border border-base-300 bg-base-100">
        <h2 id="delete-chat-title" className="text-lg font-bold">
          대화를 삭제할까요?
        </h2>
        <p id="delete-chat-target" className="text-sm text-base-content/70">
          {formatChatTime(session.created_at)} 대화
        </p>
        {error && (
          <p role="alert" className="alert text-sm alert-error">
            {error}
          </p>
        )}
        <div className="modal-action">
          <button
            type="button"
            className="btn btn-ghost"
            disabled={pending}
            onClick={closeDialog}
            autoFocus
          >
            취소
          </button>
          <button
            type="button"
            className="btn btn-error"
            disabled={pending || !isMockEnabled()}
            onClick={() => void deleteChat()}
          >
            {pending && <span aria-hidden="true" className="loading loading-sm loading-spinner" />}
            {pending ? '삭제 중…' : '삭제'}
          </button>
        </div>
      </div>
      <button
        type="button"
        className="modal-backdrop"
        aria-label="삭제 확인 닫기"
        disabled={pending}
        onClick={closeDialog}
      />
    </dialog>
  );
}
