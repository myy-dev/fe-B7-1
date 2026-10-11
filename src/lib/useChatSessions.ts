import { useEffect, useRef, useState } from 'react';
import { ApiError, apiRequest } from './api';
import { sortSessions, type ChatSession } from './chats';

export type SessionListState = {
  status: 'loading' | 'success' | 'error';
  items: ChatSession[];
  error: string;
};

export default function useChatSessions() {
  const [list, setList] = useState<SessionListState>({ status: 'loading', items: [], error: '' });
  const [listAttempt, setListAttempt] = useState(0);
  const createdSessions = useRef<ChatSession[]>([]);
  const deletedSessions = useRef(new Set<string>());

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
  }

  return { list, retryList, addSession, removeSession };
}
