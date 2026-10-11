import DuckAvatar from './DuckAvatar';
import { formatChatTime, type ChatMessage } from '../lib/chats';

export default function ChatMessages({
  messages,
  questionAuthor,
}: {
  messages: ChatMessage[];
  questionAuthor?: string;
}) {
  return (
    <ol aria-label="대화 기록" className="space-y-6">
      {messages.map((message) => (
        <li key={message.request_id}>
          <div className="chat-end chat">
            <div className="chat-header mb-1 text-xs text-base-content/70">
              {questionAuthor && `${questionAuthor} `}
              <time dateTime={message.created_at}>{formatChatTime(message.created_at)}</time>
            </div>
            <div className="chat-bubble max-w-[85%] chat-bubble-primary text-sm leading-relaxed wrap-anywhere whitespace-pre-wrap sm:text-base">
              {message.question}
            </div>
          </div>
          <div className="chat-start chat">
            <div className="avatar chat-image">
              <div className="size-9 rounded-full bg-secondary">
                <DuckAvatar className="size-9" />
              </div>
            </div>
            <div className="chat-header mb-1 text-xs text-base-content/70">꽥꽥이</div>
            <div className="chat-bubble max-w-[85%] bg-base-200 text-sm leading-relaxed wrap-anywhere whitespace-pre-wrap text-base-content sm:text-base">
              {message.status === 'completed' && (message.answer ?? '답변이 없어요.')}
              {message.status === 'pending' && (
                <p role="status" className="flex items-center gap-2">
                  <span aria-hidden="true" className="loading loading-sm loading-dots" />
                  답변 생성 중
                </p>
              )}
              {message.status === 'failed' && (
                <p role="alert" className="text-error">
                  {message.error_code === 'AI_TIMEOUT'
                    ? '응답 시간이 초과되었어요.'
                    : '답변을 받지 못했어요.'}
                </p>
              )}
            </div>
            {message.status === 'failed' && (
              <div className="chat-footer mt-1">
                <span className="badge badge-soft badge-sm badge-error">실패</span>
              </div>
            )}
          </div>
        </li>
      ))}
    </ol>
  );
}
