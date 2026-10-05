# 꽥꽥이 Frontend

대화하는 오리 친구 꽥꽥이의 React + TypeScript + Vite 기반 프론트엔드입니다. 기술 선택과 작업 규칙은 [AGENTS.md](./AGENTS.md)를 따릅니다.

## 실행

Node.js 24 LTS와 npm을 사용합니다. `.nvmrc`에 Node 버전을 지정했습니다.

```sh
nvm use
npm ci
cp .env.example .env.local
npm run dev
```

개발 서버는 기본적으로 `http://localhost:5173`에서 실행됩니다. `.env.local`의 `VITE_API_BASE_URL`을 백엔드 주소에 맞게 변경합니다. 백엔드에서도 프론트엔드 Origin을 CORS 허용 목록에 등록해야 합니다.

`/`는 `/chats`로 이동하며 꽥꽥이 환영 화면을 표시합니다. `/login`과 `/signup`에서 로그인·회원가입 화면을 확인할 수 있습니다. 그 외 주소는 404 안내와 처음 화면으로 돌아가는 링크를 제공합니다. 회원 화면의 요청·중복 확인·오류 안내는 아래 MSW 실행 방식으로 백엔드 없이 확인할 수 있습니다. 현재는 퍼블리싱 단계이며 실제 계정 생성·인증 상태 저장·접근 제어는 백엔드 연동 시 적용합니다. 채팅과 관리자 화면은 후속 작업에서 추가합니다.

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
| `npm run build:mock`   | MSW를 켠 퍼블리싱 미리보기 빌드         |
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
| `VITE_ENABLE_MSW`   | 로컬·Preview API 모킹 활성화 여부           | `false`                 |

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

- `src/mocks/handlers.ts`: 모킹 응답과 성공·지연·실패 시나리오 정의. 회원 API는 아래 임시 계약을 사용합니다.
- `src/mocks/browser.ts`: 브라우저용 worker. 모킹 중 처리하지 않은 API 요청은 오류로 차단하고, 화면 리소스 요청은 통과시킵니다.
- `src/mocks/server.ts`: 테스트용 모킹 서버.
- `public/mockServiceWorker.js`: MSW가 생성하는 파일. 직접 수정하지 않습니다.

MSW 패키지 업데이트 후에는 `npx msw init public --save`로 worker를 갱신합니다. worker는 `VITE_ENABLE_MSW=true`가 명시된 빌드에서만 시작합니다. 기본 배포용 빌드에서는 비활성화됩니다.

### 회원 화면 미리보기

화면은 `apiRequest`로 요청하고 MSW가 응답합니다. 아래 경로·응답은 백엔드 회원 API 확정 전의 임시 계약이며, 실제 연동 때 맞춥니다. JWT나 갱신 요청은 구현하지 않습니다.

| 동작             | 임시 요청                                         | 예시 응답                |
| ---------------- | ------------------------------------------------- | ------------------------ |
| 아이디 중복 확인 | `GET /api/v1/users/check-username?username=...`   | `{ available: boolean }` |
| 로그인           | `POST /api/v1/auth/login` — 아이디·비밀번호       | 미리보기 완료 메시지     |
| 회원가입         | `POST /api/v1/auth/signup` — 이름·아이디·비밀번호 | 미리보기 완료 메시지     |

임의의 예시 이름·아이디·비밀번호로 정상 흐름을 확인할 수 있습니다. 응답은 약 600ms 지연되어 진행 중 상태를 볼 수 있습니다. 실제 계정을 만들거나 로그인 상태를 저장하지 않으며, 가입 후 새로고침해도 데이터가 저장되지 않습니다.

| 입력 아이디                          | 확인할 시나리오                             |
| ------------------------------------ | ------------------------------------------- |
| `friend` 등 아래 예약 값 외의 아이디 | 사용 가능·가입 성공·로그인 후 `/chats` 이동 |
| `duck`, `taken`                      | 중복 확인에서 사용 중 안내                  |
| `wrong`                              | 로그인 실패 안내                            |
| `error`                              | 중복 확인·로그인 서버 오류                  |
| `signup-error`                       | 중복 확인 성공 후 가입 서버 오류            |

아이디를 변경하면 중복 확인 결과가 초기화됩니다. 요청 중 변경한 경우 이전 응답은 적용되지 않습니다. 실패 시 입력을 유지하고 다시 요청할 수 있습니다. 비밀번호는 필수값과 확인 입력의 일치 여부를 검증하며 상세 규칙은 백엔드 계약 확정 후 적용합니다.

배포 빌드에서도 모킹이 동작하는지 로컬에서 확인하려면 다음과 같이 실행합니다.

```sh
npm run build:mock
npm run preview
```

## 테스트와 로컬 검사

`src/test/setup.ts`에서 React Testing Library와 MSW를 초기화합니다. 각 테스트 후 화면과 임시 handler를 정리하며, 테스트 중 처리하지 않은 네트워크 요청은 오류로 처리합니다.

현재 테스트는 기본 라우팅·404 복귀·공통 API 요청과 회원 화면의 입력 검증·중복 제출 방지·오류 후 재시도·중복 확인 무효화·늦은 응답 처리·가입 완료 및 화면 이동을 검증합니다.

`npm run check`로 형식 검사, 코드 검사, 테스트, 빌드를 로컬에서 실행합니다.

## Vercel

1. Vercel에서 이 GitHub 저장소를 연결합니다.
2. Framework는 Vite, Build Command는 `npm run build`, Output Directory는 `dist`로 설정합니다. `vercel.json`에도 지정되어 있습니다.
3. `VITE_API_BASE_URL`에 실제 HTTPS 백엔드 주소를 설정합니다.
4. 백엔드 CORS 설정에 배포된 프론트엔드 Origin을 추가합니다.

퍼블리싱 리뷰용 Preview에서는 `VITE_ENABLE_MSW=true`를 **Preview 환경에만** 설정하고 새로 배포합니다. Build Command는 기존 `npm run build`를 유지해도 됩니다. Production은 `false` 또는 미설정으로 유지합니다. 환경 변수 변경은 이미 만들어진 배포에 적용되지 않습니다. 활성화된 모킹은 API 기본 주소가 로컬 기본값이어도 회원 요청을 모두 가로채며, 등록되지 않은 API 요청도 백엔드로 전달하지 않습니다. 실제 Vercel 환경 변수 설정과 배포 확인은 별도로 진행합니다.

`vercel.json`의 rewrite는 React Router 경로를 직접 열거나 새로고침할 때도 앱을 표시하도록 설정합니다.

## 폴더 구조

```text
src/
  components/  # 공통 UI와 오리 캐릭터
  layouts/     # 공통 화면 레이아웃
  pages/       # 페이지 컴포넌트
  lib/         # 공통 API 요청 등
  mocks/       # 브라우저·테스트용 MSW 설정
  test/        # 테스트 공통 설정
  App.tsx      # 라우트 구성
  main.tsx     # 앱 진입점
  index.css    # Tailwind·daisyUI 테마와 기본 스타일
```
