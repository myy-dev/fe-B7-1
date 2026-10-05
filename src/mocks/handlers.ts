import { delay, http, HttpResponse } from 'msw';
import { API_BASE_URL } from '../lib/api';

// 세팅 확인용 예제이며 실제 백엔드 API 계약이 아니다.
export const handlers = [
  http.get(`${API_BASE_URL}/api/example`, () =>
    HttpResponse.json({ message: 'MSW가 API 응답을 제공합니다.' }),
  ),
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
