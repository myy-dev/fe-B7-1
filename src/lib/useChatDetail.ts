import { useCallback, useEffect, useRef, useState } from 'react';
import { ApiError, apiRequest } from './api';
import type { ChatDetail, ChatMessage } from './chats';

type DetailState = {
  status: 'loading' | 'success' | 'error';
  detail: ChatDetail | null;
  error: string;
  missing: boolean;
};
type Recovery = { question: string; knownIds: Set<string>; requestId?: string };
const pollInterval = 1500;
const pollDuration = 60_000;

export default function useChatDetail(chatId: string) {
  const [state, setState] = useState<DetailState>({
    status: 'loading',
    detail: null,
    error: '',
    missing: false,
  });
  const [attempt, setAttempt] = useState(0);
  const [sending, setSending] = useState(false);
  const [outgoing, setOutgoing] = useState<ChatMessage | null>(null);
  const [sendError, setSendError] = useState('');
  const [uncertain, setUncertain] = useState(false);
  const [canRetry, setCanRetry] = useState(false);
  const [delayed, setDelayed] = useState(false);
  const [refreshError, setRefreshError] = useState('');
  const [clearVersion, setClearVersion] = useState(0);
  const sendRequest = useRef<AbortController | null>(null);
  const refreshRequest = useRef<AbortController | null>(null);
  const recovery = useRef<Recovery | null>(null);
  const readVersion = useRef(0);
  const pending = state.detail?.messages.some((message) => message.status === 'pending') ?? false;
  const path = `/api/v1/chats/${encodeURIComponent(chatId)}`;

  const loadDetail = useCallback(
    (controller: AbortController) => {
      const version = ++readVersion.current;
      return apiRequest<ChatDetail>(path, { signal: controller.signal })
        .then((detail) => {
          if (controller.signal.aborted || version !== readVersion.current) return;
          setState({ status: 'success', detail, error: '', missing: false });
          setRefreshError('');
          const hasPending = detail.messages.some((message) => message.status === 'pending');
          if (!hasPending && !recovery.current) setDelayed(false);
          if (recovery.current) {
            // 기존 기록과 구분되는 이번 질문의 저장 여부만 확인한다.
            const { question, knownIds, requestId } = recovery.current;
            const saved = detail.messages.filter((message) =>
              requestId
                ? message.request_id === requestId
                : !knownIds.has(message.request_id) && message.question === question,
            );
            setCanRetry(!requestId && saved.length === 0 && !hasPending);
            if (saved.length === 1) {
              const message = saved[0];
              recovery.current.requestId = message.request_id;
              if (message.status !== 'pending') {
                if (message.status === 'completed') {
                  setClearVersion((version) => version + 1);
                  setSendError('');
                }
                recovery.current = null;
                setUncertain(false);
                setDelayed(false);
                setCanRetry(false);
              }
            }
          }
          return detail;
        })
        .catch((cause: unknown) => {
          if (controller.signal.aborted || version !== readVersion.current) return;
          const error = cause instanceof ApiError ? cause.message : '대화를 불러오지 못했어요.';
          const missing = cause instanceof ApiError && [404, 422].includes(cause.status);
          if (missing) {
            recovery.current = null;
            setUncertain(false);
          }
          setCanRetry(false);
          setState((current) =>
            current.detail && !missing
              ? current
              : {
                  status: 'error',
                  detail: null,
                  error,
                  missing,
                },
          );
          setRefreshError('기록을 확인하지 못했어요. 다시 확인해 주세요.');
        });
    },
    [path],
  );

  useEffect(() => () => sendRequest.current?.abort(), []);

  useEffect(() => {
    const controller = new AbortController();
    void loadDetail(controller);
    return () => controller.abort();
  }, [loadDetail, attempt]);

  useEffect(() => {
    let timer: ReturnType<typeof setTimeout> | undefined;
    let disposed = false;
    const deadline = Date.now() + pollDuration;
    async function refresh() {
      if (disposed || sendRequest.current || refreshRequest.current) return;
      const controller = new AbortController();
      refreshRequest.current = controller;
      try {
        await loadDetail(controller);
      } finally {
        if (refreshRequest.current === controller) refreshRequest.current = null;
      }
    }
    async function poll() {
      await refresh();
      if (disposed) return;
      if (Date.now() >= deadline) {
        setDelayed(true);
        return;
      }
      timer = setTimeout(() => void poll(), pollInterval);
    }
    const onFocus = () => {
      if (document.visibilityState === 'visible') void refresh();
    };
    window.addEventListener('focus', onFocus);
    document.addEventListener('visibilitychange', onFocus);
    if ((pending || uncertain) && !sending) timer = setTimeout(() => void poll(), pollInterval);
    return () => {
      disposed = true;
      clearTimeout(timer);
      refreshRequest.current?.abort();
      refreshRequest.current = null;
      window.removeEventListener('focus', onFocus);
      document.removeEventListener('visibilitychange', onFocus);
    };
  }, [loadDetail, pending, uncertain, sending, attempt]);

  function refresh() {
    if (sendRequest.current) return;
    setDelayed(false);
    setAttempt((current) => current + 1);
  }
  function retry() {
    setState({ status: 'loading', detail: null, error: '', missing: false });
    refresh();
  }

  async function allowRetry() {
    if (!delayed || !canRetry || sendRequest.current) return;
    refreshRequest.current?.abort();
    const controller = new AbortController();
    refreshRequest.current = controller;
    try {
      const detail = await loadDetail(controller);
      const current = recovery.current;
      // 사용자가 중복 가능성을 확인한 뒤에도 저장 여부를 한 번 더 확인한다.
      if (!detail || !current || current.requestId) return;
      if (
        detail.messages.some(
          (message) =>
            message.status === 'pending' ||
            (!current.knownIds.has(message.request_id) && message.question === current.question),
        )
      )
        return;
      recovery.current = null;
      setUncertain(false);
      setCanRetry(false);
      setDelayed(false);
      setSendError('');
    } finally {
      if (refreshRequest.current === controller) refreshRequest.current = null;
    }
  }

  async function sendQuestion(question: string): Promise<boolean> {
    if (!question || sendRequest.current || !state.detail || pending || uncertain) return false;
    const controller = new AbortController();
    sendRequest.current = controller;
    setSending(true);
    setDelayed(false);
    setSendError('');
    setRefreshError('');
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
      const message = await apiRequest<ChatMessage>(`${path}/messages`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ question }),
        signal: controller.signal,
      });
      if (controller.signal.aborted) return false;
      setState((current) => ({
        ...current,
        detail: current.detail
          ? {
              ...current.detail,
              messages: [...current.detail.messages, message],
            }
          : null,
      }));
      return true;
    } catch (cause) {
      if (controller.signal.aborted) return false;
      setSendError(
        cause instanceof ApiError ? cause.message : '메시지를 보내지 못했어요. 다시 시도해 주세요.',
      );
      setOutgoing(null);
      // 네트워크 오류도 서버 저장 이후 발생할 수 있다. 자동 재전송하지 않는다.
      if (!(cause instanceof ApiError) || cause.status >= 500 || cause.status === 409) {
        recovery.current = {
          question,
          knownIds: new Set(state.detail.messages.map((message) => message.request_id)),
        };
        setUncertain(true);
        await loadDetail(controller);
      }
      return false;
    } finally {
      if (!controller.signal.aborted) {
        sendRequest.current = null;
        setSending(false);
        setOutgoing(null);
      }
    }
  }
  return {
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
    clearSendError: () => setSendError(''),
  };
}
