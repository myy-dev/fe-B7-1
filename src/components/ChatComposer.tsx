import { useEffect, useLayoutEffect, useRef, useState } from 'react';
const maxQuestionLength = 1000;
function resizeQuestionInput(element: HTMLTextAreaElement | null) {
  if (!element) return;
  element.style.height = 'auto';
  const borderHeight = element.offsetHeight - element.clientHeight;
  element.style.height = `${element.scrollHeight + borderHeight}px`;
}
export default function ChatComposer({
  disabled,
  sending,
  onSend,
  onChange,
}: {
  disabled: boolean;
  sending: boolean;
  onSend: (question: string) => Promise<boolean>;
  onChange: () => void;
}) {
  const [draft, setDraft] = useState('');
  const composing = useRef(false);
  const input = useRef<HTMLTextAreaElement>(null);
  const submitting = useRef(false);
  useLayoutEffect(() => {
    resizeQuestionInput(input.current);
  }, [draft]);
  useEffect(() => {
    const resize = () => resizeQuestionInput(input.current);
    window.addEventListener('resize', resize);
    return () => window.removeEventListener('resize', resize);
  }, []);
  useEffect(() => {
    if (!disabled) input.current?.focus();
  }, [disabled]);
  async function submit() {
    const question = draft.trim();
    if (!question || disabled || submitting.current) return;
    submitting.current = true;
    try {
      if (await onSend(question)) setDraft('');
    } finally {
      submitting.current = false;
    }
  }
  return (
    <form
      aria-label="메시지 전송"
      className="mt-auto flex min-w-0 shrink-0 flex-col gap-2 border-t border-base-300 pt-4"
      onSubmit={(event) => {
        event.preventDefault();
        void submit();
      }}
    >
      <div className="flex min-w-0 items-end gap-2">
        <label htmlFor="chat-question" className="sr-only">
          메시지
        </label>
        <textarea
          ref={input}
          id="chat-question"
          className="textarea max-h-[min(25dvh,14rem)] min-h-12 min-w-0 flex-1 resize-none overflow-y-auto bg-base-100"
          rows={1}
          maxLength={maxQuestionLength}
          aria-describedby="chat-question-count"
          placeholder="꽥꽥이에게 이야기해 보세요"
          value={draft}
          disabled={disabled}
          onChange={(event) => {
            setDraft(event.target.value.slice(0, maxQuestionLength));
            onChange();
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
            if (!event.repeat) void submit();
          }}
        />
        <button
          type="submit"
          className="btn shrink-0 btn-primary"
          disabled={!draft.trim() || disabled}
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
      </div>
      <p id="chat-question-count" className="text-right text-xs text-base-content/60">
        {draft.length.toLocaleString('ko-KR')} / 1,000
      </p>
    </form>
  );
}
