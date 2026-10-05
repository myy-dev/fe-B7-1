# B7-1 Frontend

React + TypeScript + Vite 기반 프론트엔드 프로젝트입니다. 기술 선택과 작업 규칙은 [AGENTS.md](./AGENTS.md)를 따릅니다.

## 실행

Node.js 24 LTS와 npm을 사용합니다. `.nvmrc`에 Node 버전을 지정했습니다.

```sh
nvm use
npm ci
cp .env.example .env.local
npm run dev
```

개발 서버는 기본적으로 `http://localhost:5173`에서 실행됩니다. `.env.local`의 `VITE_API_BASE_URL`을 백엔드 주소에 맞게 변경합니다. 백엔드에서도 프론트엔드 Origin을 CORS 허용 목록에 등록해야 합니다.

## 기술 스택

| 영역              | 기술                                        |
| ----------------- | ------------------------------------------- |
| 화면 개발         | React, TypeScript, Vite                     |
| UI                | Tailwind CSS 4, daisyUI 5                   |
| 라우팅            | React Router                                |
| API               | fetch                                       |
| 상태 관리         | useState, Context (필요한 공유 상태에 적용) |
| 코드 검사 및 정리 | ESLint, Prettier                            |
| API 모킹          | MSW                                         |
| 테스트            | Vitest, React Testing Library               |
| 배포              | Vercel                                      |

## 명령어

| 명령어                 | 용도                                    |
| ---------------------- | --------------------------------------- |
| `npm run dev`          | 일반 개발 서버                          |
| `npm run dev:mock`     | MSW를 켠 개발 서버                      |
| `npm run build`        | 타입 검사 및 배포용 빌드                |
| `npm run preview`      | 빌드한 화면을 로컬에서 확인             |
| `npm run typecheck`    | TypeScript 검사                         |
| `npm run lint`         | ESLint 검사                             |
| `npm run format`       | Prettier로 형식 정리                    |
| `npm run format:check` | 형식 검사                               |
| `npm test`             | 테스트 1회 실행                         |
| `npm run test:watch`   | 파일 변경 시 테스트 재실행              |
| `npm run check`        | 형식, 코드 검사, 테스트, 빌드 전체 실행 |

## 환경 변수

| 변수                | 설명                                        | 기본값                  |
| ------------------- | ------------------------------------------- | ----------------------- |
| `VITE_API_BASE_URL` | 백엔드 주소. 경로 접두사가 있다면 함께 지정 | `http://localhost:8000` |
| `VITE_ENABLE_MSW`   | 개발용 API 모킹 활성화 여부                 | `false`                 |

`VITE_`로 시작하는 값은 브라우저에 공개됩니다. 비밀 키나 서버 인증 정보를 넣지 않습니다.

## API 요청

`src/lib/api.ts`의 `apiRequest`를 사용합니다. JSON 응답을 반환하며, HTTP 오류는 상태 코드와 메시지를 가진 `ApiError`로 전달합니다. 네트워크 오류는 fetch의 오류를 그대로 전달합니다. 인증 방식은 백엔드 계약이 정해진 뒤 연결합니다.

```ts
import { apiRequest } from './lib/api';

const response = await apiRequest<{ message: string }>('/api/example');

// JSON 본문은 명시적으로 직렬화하고 Content-Type을 지정합니다.
await apiRequest('/api/example', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ message: 'hello' }),
});
```

위 경로는 세팅 설명용 예제이며 실제 백엔드 계약이 아닙니다. 타입 매개변수는 응답 타입 선언으로, 런타임 검증을 수행하지 않습니다. 실제 계약에 맞춰 기능별 요청 함수를 추가합니다.

## MSW

```sh
npm run dev:mock
```

`.env.mock`으로 모킹을 활성화하며, worker가 준비된 뒤 앱을 표시합니다. 모드별 설정인 `.env.mock`은 `.env.local`보다 우선 적용됩니다. 개인 모킹 설정이 필요하면 Git에서 제외되는 `.env.mock.local`에 지정합니다.

- `src/mocks/handlers.ts`: 모킹 응답 정의. 현재 `GET /api/example`만 제공하며, 실제 API 계약에 맞춰 교체합니다.
- `src/mocks/browser.ts`: 브라우저 개발용 worker. 처리하지 않는 요청은 실제 네트워크로 전달합니다.
- `src/mocks/server.ts`: 테스트용 모킹 서버.
- `public/mockServiceWorker.js`: MSW가 생성하는 파일. 직접 수정하지 않습니다.

MSW 패키지 업데이트 후에는 `npx msw init public --save`로 worker를 갱신합니다. 프로덕션에서는 개발용 worker를 시작하지 않습니다.

## 테스트와 로컬 검사

`src/test/setup.ts`에서 React Testing Library와 MSW를 초기화합니다. 각 테스트 후 화면과 임시 handler를 정리하며, 테스트 중 처리하지 않은 네트워크 요청은 오류로 처리합니다.

초기 테스트는 홈·404 라우팅과 API 성공·HTTP 오류·빈 응답을 검증합니다. 실제 기능 구현 후 로그인, 핵심 기능, API 오류 처리부터 테스트를 추가합니다.

`npm run check`로 형식 검사, 코드 검사, 테스트, 빌드를 로컬에서 실행합니다.

## Vercel

1. Vercel에서 이 GitHub 저장소를 연결합니다.
2. Framework는 Vite, Build Command는 `npm run build`, Output Directory는 `dist`로 설정합니다. `vercel.json`에도 지정되어 있습니다.
3. `VITE_API_BASE_URL`에 실제 HTTPS 백엔드 주소를 설정합니다.
4. 백엔드 CORS 설정에 배포된 프론트엔드 Origin을 추가합니다.

`vercel.json`의 rewrite는 React Router 경로를 직접 열거나 새로고침할 때도 앱을 표시하도록 설정합니다. 초기 화면과 404 화면은 프로젝트 시작용이며, 실제 서비스 화면은 추후 구현합니다.

## 폴더 구조

```text
src/
  pages/       # 페이지 컴포넌트
  lib/         # 공통 API 요청 등
  mocks/       # 브라우저·테스트용 MSW 설정
  test/        # 테스트 공통 설정
  App.tsx      # 공통 레이아웃과 라우트
  main.tsx     # 앱 진입점
  index.css    # Tailwind·daisyUI 설정
```
