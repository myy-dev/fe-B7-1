import { useEffect, useRef, useState } from 'react';
import ConfirmDialog from './ConfirmDialog';
import { ApiError, apiRequest } from '../lib/api';
import { formatChatTime, type ChatSession } from '../lib/chats';

interface DeleteChatDialogProps {
  session: ChatSession;
  onDeleted: (chatId: string) => void;
  onClose: () => void;
}

export default function DeleteChatDialog({ session, onDeleted, onClose }: DeleteChatDialogProps) {
  const request = useRef<AbortController | null>(null);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => () => request.current?.abort(), []);

  async function deleteChat() {
    if (request.current) return;
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
      onClose();
    } catch (cause) {
      if (!controller.signal.aborted) {
        if (cause instanceof ApiError && cause.status === 404) {
          // 이미 없는 대화도 목록에서 제거해 서버 상태에 맞춘다.
          onDeleted(session.chat_id);
          onClose();
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
    <ConfirmDialog
      title="대화를 삭제할까요?"
      description={`${formatChatTime(session.created_at)} 대화`}
      pending={pending}
      confirmLabel="삭제"
      pendingLabel="삭제 중…"
      closeLabel="삭제 확인 닫기"
      onConfirm={deleteChat}
      onClose={onClose}
      error={error}
      danger
    />
  );
}
