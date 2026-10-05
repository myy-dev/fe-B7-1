import { delay, http, HttpResponse } from 'msw';
import { API_BASE_URL } from '../lib/api';

// 세팅 확인용 예제이며 실제 백엔드 API 계약이 아니다.
export const handlers = [
  http.get(`${API_BASE_URL}/api/example`, () =>
    HttpResponse.json({ message: 'MSW가 API 응답을 제공합니다.' }),
  ),
  // 회원 API 확정 전의 퍼블리싱용 임시 계약.
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
];
