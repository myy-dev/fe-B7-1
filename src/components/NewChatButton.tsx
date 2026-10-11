import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router';
import { ApiError, apiRequest } from '../lib/api';
import type { ChatSession } from '../lib/chats';

interface NewChatButtonProps {
  label?: string;
  selection?: string;
  onCreated: (session: ChatSession) => void;
}

export default function NewChatButton({
  label = '새 대화',
  onCreated,
  selection,
}: NewChatButtonProps) {
  const navigate = useNavigate();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState('');
  const request = useRef<AbortController | null>(null);

  const selectionVersion = useRef(0);
  useEffect(() => {
    selectionVersion.current += 1;
  }, [selection]);
  useEffect(() => () => request.current?.abort(), []);

  async function createChat() {
    if (request.current) return;
    const startingSelection = selectionVersion.current;
    const controller = new AbortController();
    request.current = controller;
    setPending(true);
    setError('');
    try {
      const session = await apiRequest<ChatSession>('/api/v1/chats', {
        method: 'POST',
        signal: controller.signal,
      });
      if (controller.signal.aborted) return;
      onCreated(session);
      if (selectionVersion.current === startingSelection)
        navigate(`/chats/${encodeURIComponent(session.chat_id)}`);
    } catch (cause) {
      if (!controller.signal.aborted) {
        setError(
          cause instanceof ApiError ? cause.message : '대화를 만들지 못했어요. 다시 시도해 주세요.',
        );
      }
    } finally {
      if (!controller.signal.aborted) {
        request.current = null;
        setPending(false);
      }
    }
  }

  return (
    <div className="space-y-3">
      <button
        type="button"
        className="btn w-full btn-primary"
        disabled={pending}
        onClick={() => void createChat()}
      >
        {pending ? (
          <span aria-hidden="true" className="loading loading-sm loading-spinner" />
        ) : (
          <span aria-hidden="true" className="text-xl">
            +
          </span>
        )}
        {pending ? '대화 만드는 중…' : label}
      </button>
      {error && (
        <div role="alert" className="alert text-left text-sm alert-error">
          {error}
        </div>
      )}
    </div>
  );
}
