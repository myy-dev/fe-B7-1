# 프론트엔드 개발 안내

## 로컬 실행

Node.js 24 LTS와 npm을 사용합니다.

```sh
git clone https://github.com/myy-dev/fe-B7-1.git
cd fe-B7-1
nvm use
npm ci
cp .env.example .env.local
npm run dev
```

개발 주소는 `http://localhost:5173`이며, `.env.local`의 `VITE_API_BASE_URL`에 백엔드 주소를 설정합니다.

## 환경 변수

| 변수                | 용도                           | 기본값                  |
| ------------------- | ------------------------------ | ----------------------- |
| `VITE_API_BASE_URL` | 백엔드 Origin (`/api/v1` 제외) | `http://localhost:8000` |
| `VITE_ENABLE_MSW`   | `true`이면 MSW 활성화          | `false`                 |

Railway 개발 백엔드 연결 예시:

```dotenv
VITE_API_BASE_URL=https://be-b7-1-development.up.railway.app
VITE_ENABLE_MSW=false
```

`VITE_` 값은 브라우저 코드에 공개되므로 비밀값은 제외합니다. 개인 설정은 Git에서 제외된 `.env.local`, 공유 예시는 `.env.example`에 작성합니다.

환경 변수를 변경하면 로컬 서버를 재시작하거나 배포를 다시 빌드합니다.

실제 API 연결에는 백엔드 CORS 허용 목록에 프론트 Origin을 등록해야 합니다.

- 로컬: `http://localhost:5173`, `http://127.0.0.1:5173`
- 배포: 실제 서비스 및 API를 연결할 Preview의 Origin

## 명령어와 검사

| 명령어                 | 용도                              |
| ---------------------- | --------------------------------- |
| `npm run dev`          | 개발 서버                         |
| `npm run dev:mock`     | MSW 개발 서버                     |
| `npm run build`        | 타입 검사·배포용 빌드             |
| `npm run build:mock`   | MSW 미리보기 빌드                 |
| `npm run preview`      | 빌드 결과 로컬 확인               |
| `npm run typecheck`    | TypeScript 검사                   |
| `npm run lint`         | ESLint 검사                       |
| `npm run format`       | Prettier 형식 정리                |
| `npm run format:check` | 형식 검사                         |
| `npm test`             | 테스트 1회 실행                   |
| `npm run test:watch`   | 변경 시 테스트 재실행             |
| `npm run check`        | 형식·ESLint·테스트·타입 검사·빌드 |

변경 후 `npm run check`로 검사합니다.

## Vercel 배포

1. 프론트엔드 GitHub 저장소를 연결합니다.
2. Production Branch는 `main`으로 설정합니다.
3. Framework Preset은 `Vite`, Build Command는 `npm run build`, Output Directory는 `dist`로 설정합니다.
4. 백엔드 주소와 아래 MSW 설정을 환경 변수에 등록합니다.
5. 백엔드 CORS 허용 목록에 배포 Origin을 등록하고 배포합니다.

| 배포 용도          | Vercel 환경 | MSW 설정                |
| ------------------ | ----------- | ----------------------- |
| 실제 서비스        | Production  | `VITE_ENABLE_MSW=false` |
| 실제 API 연동 확인 | Preview     | `VITE_ENABLE_MSW=false` |
| 기본 모킹 미리보기 | Preview     | `VITE_ENABLE_MSW=true`  |

모킹 Preview도 Build Command는 `npm run build`를 사용합니다. 환경 변수 변경 후에는 다시 배포합니다.

`vercel.json`은 모든 경로를 `index.html`로 연결해 주소 직접 접근과 새로고침을 지원합니다.

서비스 주소가 바뀌면 `index.html`의 `og:url`, `og:image`, `twitter:image`를 수정합니다. 파비콘과 공유 이미지는 `public/`에 있습니다.

## 화면 경로

| 경로                      | 화면 및 이동                                                      |
| ------------------------- | ----------------------------------------------------------------- |
| `/`                       | 비로그인은 로그인, 일반 회원은 대화 홈, 관리자는 회원 관리로 이동 |
| `/signup`                 | 회원가입                                                          |
| `/login`                  | 로그인                                                            |
| `/chats`                  | 대화 목록·새 대화 시작                                            |
| `/chats/:chatId`          | 대화 기록·질문 입력                                               |
| `/admin/users`            | 회원 목록                                                         |
| `/admin/users/:userId`    | 회원 상세·권한 변경·회원별 대화                                   |
| `/admin/sessions/:chatId` | 관리자 대화 상세                                                  |
| `/admin/logs`             | 회원·기간별 대화 기록                                             |
| `/admin/system-logs`      | 시스템 로그                                                       |
| 그 외 경로                | 404                                                               |

## 회원 입력 안내

| 항목          | 입력 규칙                                                              |
| ------------- | ---------------------------------------------------------------------- |
| 이름          | 앞뒤 공백을 제외한 1~50자                                              |
| 아이디        | 영문·숫자·밑줄(_)로 4~20자, 공백 불가                                  |
| 가입 비밀번호 | 영문·숫자·특수문자를 각각 포함한 8~128자, ASCII 문자만 허용, 공백 불가 |
| 비밀번호 확인 | 가입 비밀번호와 일치, 서버 요청에서 제외                               |

가입 규칙 위반과 중복 아이디는 해당 입력란에 오류를 표시합니다. 로그인은 아이디 규칙과 비밀번호 길이를 확인하고, 비밀번호를 그대로 전송합니다.

비로그인 사용자는 로그인 화면으로, 관리자 주소에 접근한 일반 회원은 대화 홈으로 이동합니다. 관리자 메뉴는 관리자에게만 표시하며, 새로고침 시 내정보 조회 후 보호 화면을 표시합니다.

## MSW로 실행

백엔드 없이 화면을 확인할 때 사용합니다.

```sh
npm run dev:mock
```

`.env.mock` 설정은 `.env.local`보다 우선하며, worker 준비 후 앱을 표시합니다.

빌드 결과 확인:

```sh
npm run build:mock
npm run preview
```

MSW는 앱의 API 요청을 처리하고 미등록 API 요청은 차단합니다. 실제 API 연결에는 `VITE_ENABLE_MSW=false`를 사용합니다.

### 로그인 예시

모킹 계정에 비밀번호 `Password123!`을 입력합니다.

| 아이디   | 확인할 상태                      |
| -------- | -------------------------------- |
| `friend` | 일반 회원 로그인·내정보·대화     |
| `admin`  | 관리자 로그인·내정보·관리자 화면 |
| `wrong`  | 로그인 실패, 401                 |
| `error`  | 인증 서비스 설정 오류, 503       |

실제 서버 계정과는 별개이며, 모킹 로그인은 비밀번호 길이만 검증합니다. 보호 API는 모킹 토큰과 권한을 검사하며 로그아웃한 토큰은 거절합니다.

### 회원가입과 내정보

[회원 입력 규칙](#회원-입력-안내)을 적용합니다.

| 가입 아이디                       | 확인할 상태                          |
| --------------------------------- | ------------------------------------ |
| `new_friend` 등 예약 값 외 아이디 | 가입 성공·로그인 화면 이동·완료 알림 |
| `duck`, `taken` 및 대소문자 변형  | 중복 아이디 오류                     |
| `signup_error`                    | 가입 서버 오류                       |

가입 아이디는 소문자로 저장해 중복을 확인하며, 새로고침하면 초기화됩니다. 내정보는 로그인한 모킹 계정의 정보와 권한을 반환합니다.

### 대화 예시

`friend`로 로그인하면 완료·실패·처리 중 기록과 긴 내용·빈 대화를 확인할 수 있습니다.

질문에는 예시 답변을, 긴 질문이나 줄바꿈에는 긴 답변을 반환합니다. 처리 중 기록이 있는 대화에 전송하면 `409 CHAT_BUSY`를 반환하며, 브라우저 요청이 중단돼도 모킹 처리는 완료됩니다.

생성·전송 결과는 메모리에 저장되며, 새로고침하면 초기화됩니다.

### 관리자 예시

`admin`으로 로그인하면 회원 24명과 시스템 로그 31건을 조회합니다. 기본 대화는 회원 2(`friend`)의 기록이며, 생성한 대화는 로그인 계정에 귀속됩니다.

사용자가 삭제한 대화는 관리자 조회에 보존됩니다. 다른 회원의 대화는 일반 대화 API로 조회·전송·삭제할 수 없으며, 새로고침하면 예시 데이터로 초기화됩니다.

권한 변경은 목록·상세·내정보에 반영되며, 없는 회원·대화는 404를 반환합니다.

### 오류·지연 검증

각 테스트의 `server.use()`로 빈 목록·오류·시간 초과·느린 응답을 설정합니다. 상태코드와 응답은 `HttpResponse.json()`, 지연은 `delay()` 또는 완료 시점을 제어하는 Promise로 설정합니다.

공통 테스트 설정이 종료 후 `server.resetHandlers()`로 기본 응답을 복원합니다.

## 프론트 검사

Vitest·React Testing Library·MSW로 다음 흐름을 검증합니다.

- 라우팅·404·API 요청과 오류 처리.
- 회원가입 입력·비밀번호 확인·로그인·로그아웃·내정보·인증 만료·권한별 접근.
- 대화 생성·조회·삭제·재시도·질문 전송·1,000자 제한·한글 조합·지연 응답.
- 관리자 조회 조건·페이지 이동·권한 변경.

`src/test/setup.ts`는 테스트마다 화면·인증·모킹 데이터를 초기화하고, 미등록 요청을 오류로 처리합니다.

실제 배포의 회원가입·로그인·AI 응답·DB 저장·사용자별 기록 조회는 별도로 확인합니다.

## 구현 위치

| 위치                    | 역할                                        |
| ----------------------- | ------------------------------------------- |
| `src/pages/`            | 회원·대화·관리자 페이지                     |
| `src/components/`       | 공통 UI·오리 캐릭터·인증 처리               |
| `src/layouts/`          | 사용자·회원·관리자 레이아웃                 |
| `src/lib/`              | API 요청·인증·대화 상태·공통 타입·표시 함수 |
| `src/mocks/handlers.ts` | 기본 API 응답·모킹 데이터                   |
| `src/mocks/browser.ts`  | 브라우저 MSW worker                         |
| `src/mocks/server.ts`   | 테스트 MSW 서버                             |
| `src/test/`             | 테스트 공통 설정                            |
| `src/App.tsx`           | 사용자 화면 경로·관리자 지연 로딩           |
| `src/AdminRoutes.tsx`   | 관리자 화면 경로                            |
| `src/main.tsx`          | worker 준비·앱 시작                         |
| `src/index.css`         | Tailwind·daisyUI 테마·기본 스타일           |
| `public/`               | 파비콘·공유 이미지·MSW worker               |

API 요청은 `src/lib/api.ts`의 `apiRequest`를 사용하며, 보호 요청에는 인증 토큰을 첨부합니다.

토큰·만료 시각은 `sessionStorage`의 `quackquack.auth`, 사용자 정보·권한은 Context에 저장합니다. 새로고침하면 내정보를 조회하고, 인증 만료 시 재로그인합니다.

MSW 업데이트 후 worker를 갱신합니다.

```sh
npx msw init public --save
```
