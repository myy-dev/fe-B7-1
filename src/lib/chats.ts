export interface ChatSession {
  chat_id: string;
  created_at: string;
}

export interface ChatMessage {
  request_id: string;
  chat_id: string;
  question: string;
  answer: string | null;
  status: 'pending' | 'completed' | 'failed';
  error_code: string | null;
  created_at: string;
  finished_at: string | null;
}

export interface ChatDetail extends ChatSession {
  messages: ChatMessage[];
}

export function sortSessions<T extends ChatSession>(items: T[]): T[] {
  return [...items].sort(
    (a, b) =>
      Date.parse(b.created_at) - Date.parse(a.created_at) || b.chat_id.localeCompare(a.chat_id),
  );
}

const chatTimeFormatter = new Intl.DateTimeFormat('ko-KR', {
  timeZone: 'Asia/Seoul',
  month: 'long',
  day: 'numeric',
  hour: 'numeric',
  minute: '2-digit',
});

export function formatChatTime(value: string): string {
  return chatTimeFormatter.format(new Date(value));
}
