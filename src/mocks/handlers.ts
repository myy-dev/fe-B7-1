import { http, HttpResponse } from 'msw';
import { API_BASE_URL } from '../lib/api';

// 세팅 확인용 예제이며 실제 백엔드 API 계약이 아니다.
export const handlers = [
  http.get(`${API_BASE_URL}/api/example`, () =>
    HttpResponse.json({ message: 'MSW가 API 응답을 제공합니다.' }),
  ),
];
