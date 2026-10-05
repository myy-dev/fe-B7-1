import { delay, http, HttpResponse } from 'msw';
import { API_BASE_URL } from '../lib/api';
import { sortSessions, type ChatDetail, type ChatMessage } from '../lib/chats';

const exampleChats: ChatDetail[] = [
  {
    chat_id: 'e6100748-b7f0-48e6-a264-7c20a748cf93',
    created_at: '2026-10-05T03:00:00Z',
    messages: [
      {
        request_id: '16fd2706-8baf-433b-82eb-8c7fada847da',
        chat_id: 'e6100748-b7f0-48e6-a264-7c20a748cf93',
        question: '오늘 하루가 조금 지쳤어.',
        answer:
          '그런 날도 있죠. 오늘 하루를 버틴 것만으로도 충분해요. 잠깐 쉬면서 이야기해 볼까요?',
        status: 'completed',
        error_code: null,
        created_at: '2026-10-05T03:00:05Z',
        finished_at: '2026-10-05T03:00:07Z',
      },
      {
        request_id: '26fd2706-8baf-433b-82eb-8c7fada847da',
        chat_id: 'e6100748-b7f0-48e6-a264-7c20a748cf93',
        question: '기분 전환할 만한 작은 일이 있을까?',
        answer:
          '좋아하는 음악 한 곡을 듣거나, 창밖을 보며 물 한 잔을 마셔 보세요. 거창하지 않아도 괜찮아요. 꽥꽥이가 함께할게요!',
        status: 'completed',
        error_code: null,
        created_at: '2026-10-05T03:01:05Z',
        finished_at: '2026-10-05T03:01:07Z',
      },
    ],
  },
  {
    chat_id: '6eb321dc-235c-4e3d-a95e-43f2a601fcd8',
    created_at: '2026-10-04T05:20:00Z',
    messages: [
      {
        request_id: '36fd2706-8baf-433b-82eb-8c7fada847da',
        chat_id: '6eb321dc-235c-4e3d-a95e-43f2a601fcd8',
        question: `이 긴 주소도 읽어 줄래? https://example.com/${'very-long-link-'.repeat(15)}`,
        answer:
          '긴 이야기도 천천히 읽을 수 있어요.\n\n한 번에 다 설명하지 않아도 괜찮으니, 궁금한 부분부터 알려 주세요.',
        status: 'completed',
        error_code: null,
        created_at: '2026-10-04T05:20:05Z',
        finished_at: '2026-10-04T05:20:07Z',
      },
      {
        request_id: '46fd2706-8baf-433b-82eb-8c7fada847da',
        chat_id: '6eb321dc-235c-4e3d-a95e-43f2a601fcd8',
        question: '주말 계획을 같이 세워 줄래?',
        answer: null,
        status: 'failed',
        error_code: 'AI_TIMEOUT',
        created_at: '2026-10-04T05:21:05Z',
        finished_at: '2026-10-04T05:21:35Z',
      },
      {
        request_id: '56fd2706-8baf-433b-82eb-8c7fada847da',
        chat_id: '6eb321dc-235c-4e3d-a95e-43f2a601fcd8',
        question: '그럼 가까운 산책부터 해 볼까?',
        answer: null,
        status: 'pending',
        error_code: null,
        created_at: '2026-10-04T05:22:05Z',
        finished_at: null,
      },
    ],
  },
  {
    chat_id: '7b9e0398-6b3e-4b88-87db-358748803b75',
    created_at: '2026-10-03T01:30:00Z',
    messages: [],
  },
];

let chatStore = makeChatStore();
let sendFailures = new Set<string>();

function makeChatStore() {
  const items =
    import.meta.env.VITE_CHAT_MOCK_SCENARIO === 'empty' ? [] : structuredClone(exampleChats);
  return new Map(items.map((chat) => [chat.chat_id, chat]));
}

export function resetChatMocks() {
  chatStore = makeChatStore();
  sendFailures = new Set();
}

function chatError(
  code: string,
  message: string,
  status: number,
  requestId: string = crypto.randomUUID(),
) {
  return HttpResponse.json({ error: { code, message, request_id: requestId } }, { status });
}

// 세팅 확인용 예제이며 실제 백엔드 API 계약이 아니다.
export const handlers = [
  http.get(`${API_BASE_URL}/api/example`, () =>
    HttpResponse.json({ message: 'MSW가 API 응답을 제공합니다.' }),
  ),
  http.get(`${API_BASE_URL}/api/v1/chats`, async () => {
    const store = chatStore;
    await delay(import.meta.env.VITE_CHAT_MOCK_SCENARIO === 'slow' ? 1500 : 350);
    if (import.meta.env.VITE_CHAT_MOCK_SCENARIO === 'list-error')
      return chatError('DB_ERROR', '대화 목록을 불러오지 못했어요.', 500);
    const items = sortSessions([...store.values()]).map(({ chat_id, created_at }) => ({
      chat_id,
      created_at,
    }));
    return HttpResponse.json({ items });
  }),
  http.post(`${API_BASE_URL}/api/v1/chats`, async () => {
    const store = chatStore;
    await delay(import.meta.env.VITE_CHAT_MOCK_SCENARIO === 'slow' ? 1500 : 600);
    if (import.meta.env.VITE_CHAT_MOCK_SCENARIO === 'create-error')
      return chatError('DB_ERROR', '대화를 만들지 못했어요. 다시 시도해 주세요.', 500);
    const session = { chat_id: crypto.randomUUID(), created_at: new Date().toISOString() };
    store.set(session.chat_id, { ...session, messages: [] });
    return HttpResponse.json(session, { status: 201 });
  }),
  http.get(`${API_BASE_URL}/api/v1/chats/:chatId`, async ({ params }) => {
    const store = chatStore;
    await delay(import.meta.env.VITE_CHAT_MOCK_SCENARIO === 'slow' ? 1500 : 350);
    if (!/^[\da-f]{8}-[\da-f]{4}-[\da-f]{4}-[\da-f]{4}-[\da-f]{12}$/i.test(String(params.chatId)))
      return chatError('INVALID_INPUT', '대화 주소를 확인해 주세요.', 422);
    if (import.meta.env.VITE_CHAT_MOCK_SCENARIO === 'detail-error')
      return chatError('DB_ERROR', '대화를 불러오지 못했어요.', 500);
    const chat = store.get(String(params.chatId));
    return chat
      ? HttpResponse.json(chat)
      : chatError('CHAT_NOT_FOUND', '대화를 찾을 수 없어요.', 404);
  }),
  http.post(`${API_BASE_URL}/api/v1/chats/:chatId/messages`, async ({ params, request }) => {
    const store = chatStore;
    const failures = sendFailures;
    const scenario = import.meta.env.VITE_CHAT_MOCK_SCENARIO;
    const chatId = String(params.chatId);
    if (!/^[\da-f]{8}-[\da-f]{4}-[\da-f]{4}-[\da-f]{4}-[\da-f]{12}$/i.test(chatId))
      return chatError('INVALID_INPUT', '대화 주소를 확인해 주세요.', 422);
    const chat = store.get(chatId);
    if (!chat) return chatError('CHAT_NOT_FOUND', '대화를 찾을 수 없어요.', 404);
    const body: unknown = await request.json().catch(() => null);
    const question =
      body && typeof body === 'object' && 'question' in body && typeof body.question === 'string'
        ? body.question.trim()
        : '';
    if (!question) return chatError('INVALID_INPUT', '메시지를 입력해 주세요.', 422);
    if (chat.messages.some((message) => message.status === 'pending'))
      return chatError('CHAT_BUSY', '이전 답변을 기다린 뒤 다시 보내 주세요.', 409);

    const message: ChatMessage = {
      request_id: crypto.randomUUID(),
      chat_id: chatId,
      question,
      answer: null,
      status: 'pending',
      error_code: null,
      created_at: new Date().toISOString(),
      finished_at: null,
    };
    chat.messages.push(message);
    const fail = ['send-error', 'timeout'].includes(scenario ?? '') && !failures.has(chatId);
    if (fail) failures.add(chatId);
    // 중단된 브라우저 요청도 서버 처리와 마찬가지로 기록의 완료까지 진행한다.
    await delay(scenario === 'slow' ? 3500 : 800);
    message.finished_at = new Date().toISOString();
    if (fail) {
      message.status = 'failed';
      message.error_code = scenario === 'timeout' ? 'AI_TIMEOUT' : 'AI_UNAVAILABLE';
      return chatError(
        message.error_code,
        scenario === 'timeout'
          ? '응답 시간이 초과되었어요. 다시 보내 주세요.'
          : '답변을 받지 못했어요. 다시 보내 주세요.',
        scenario === 'timeout' ? 504 : 502,
        message.request_id,
      );
    }
    message.status = 'completed';
    message.answer =
      question.includes('\n') || question.length > 200
        ? '긴 이야기도 잘 읽었어요. 꽥!\n\n한 가지씩 천천히 이야기해 봐요. 오늘 가장 마음에 남은 일은 무엇인가요?\n\n' +
          '작은 이야기부터 시작해도 괜찮아요. 꽥꽥이가 함께할게요. '.repeat(12)
        : '이야기해 줘서 고마워요. 꽥! 오늘은 어떤 기분인가요? 꽥꽥이가 함께 이야기할게요.';
    return HttpResponse.json(message, { status: 201 });
  }),
  // 회원 API 상세 명세가 확정되기 전의 임시 계약. 실제 계정·토큰은 생성하지 않는다.
  http.get(`${API_BASE_URL}/api/v1/users/check-username`, async ({ request }) => {
    const username = new URL(request.url).searchParams.get('username')?.trim();
    await delay(600);
    if (!username)
      return HttpResponse.json({ message: '아이디를 입력해 주세요.' }, { status: 422 });
    if (username === 'error') {
      return HttpResponse.json(
        { message: '확인하지 못했어요. 다시 시도해 주세요.' },
        { status: 503 },
      );
    }
    return HttpResponse.json({ available: !['duck', 'taken'].includes(username) });
  }),
  http.post(`${API_BASE_URL}/api/v1/auth/login`, async ({ request }) => {
    const { username, password } = (await request.json()) as {
      username?: string;
      password?: string;
    };
    await delay(600);
    if (!username?.trim() || !password?.trim()) {
      return HttpResponse.json({ message: '아이디와 비밀번호를 입력해 주세요.' }, { status: 422 });
    }
    if (username === 'wrong') {
      return HttpResponse.json(
        { message: '아이디 또는 비밀번호를 확인해 주세요.' },
        { status: 401 },
      );
    }
    if (username === 'error') {
      return HttpResponse.json(
        { message: '잠시 연결이 어려워요. 다시 시도해 주세요.' },
        { status: 503 },
      );
    }
    return HttpResponse.json({ message: '로그인 미리보기 완료' });
  }),
  http.post(`${API_BASE_URL}/api/v1/auth/signup`, async ({ request }) => {
    const { name, username, password } = (await request.json()) as {
      name?: string;
      username?: string;
      password?: string;
    };
    await delay(600);
    if (!name?.trim() || !username?.trim() || !password?.trim()) {
      return HttpResponse.json({ message: '필수 정보를 입력해 주세요.' }, { status: 422 });
    }
    if (['duck', 'taken'].includes(username)) {
      return HttpResponse.json({ message: '이미 사용 중인 아이디예요.' }, { status: 409 });
    }
    if (username === 'signup-error') {
      return HttpResponse.json(
        { message: '가입 요청을 처리하지 못했어요. 다시 시도해 주세요.' },
        { status: 503 },
      );
    }
    return HttpResponse.json({ message: '가입 미리보기 완료' }, { status: 201 });
  }),
];
