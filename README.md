# 불침번 (Bulchimbeon) — 프론트엔드

> [!IMPORTANT]
> **이 저장소는 2026-08-27 에 아카이브되었습니다.** 더 이상 개발되지 않으며 읽기 전용입니다.
> 마지막 동작 커밋은 2026-08-20 이고, 그 시점의 화면과 도메인 규칙이 그대로 보존되어 있습니다.
> 클론해서 `npm install && npm run dev` 로 띄우는 것은 지금도 됩니다 (백엔드가 함께 떠 있어야 합니다).

시차가 큰 글로벌 팀을 위한 비동기 Q&A 협업 서비스 **불침번**의 React 웹 화면입니다.

질문자는 한국어로 묻고, AI 답변을 **매칭률(%)과 근거 인용**과 함께 받습니다.
담당자는 확인 카드 큐에서 🔴 보류 건부터 30초 안에 승인·수정·반려를 판단합니다.

제품 전체 이야기는 [`bulchimbeon-infra`](https://github.com/LetsMakeTrouble/bulchimbeon-infra) 의 README 에 있습니다.

---

## 스택

Vite 8 + React 19 + TypeScript + Tailwind CSS v4 + React Router 7 + axios + oxlint.

API 계약은 [`bulchimbeon-backend`](https://github.com/LetsMakeTrouble/bulchimbeon-backend) 저장소의
`bulchimbeon-api/docs/05-api-contract.md` 가 정본입니다. `src/types/` 는 그 계약과 1:1 로 대응합니다.

## 파이프라인

```bash
npm install
npm run dev      # vite — http://localhost:5173 (/api → localhost:8000 프록시)
npm run build    # tsc -b && vite build — 타입체크 후 프로덕션 번들
npm run lint     # oxlint
```

`npm run dev` 는 `/api` 를 `localhost:8000` 으로 프록시합니다. 백엔드를 먼저 띄워 두세요.

## 디렉터리

```
src/
├── domain/                # 순수 업무 규칙 — React·axios 의존 0. 폴더마다 selfCheck.ts (node 로 직접 실행)
│   ├── review/             #   §7.1 액션 매트릭스, 처리 명령 VO, 저장소 포트
│   ├── document/           #   §4 버전 활성화 규칙, 저장소 포트
│   ├── feedback/           #   §6 크로스체크 허용 상태, 피드백 VO
│   ├── conversation/       #   대화 타임라인 구성 규칙
│   └── errors.ts           #   도메인 예외
├── application/           # 유즈케이스 조율 — 업무 규칙 없음, 화면 문구 없음
│   ├── review/             #   useReviewQueue: 조회·지연로딩·처리·에러 매핑
│   └── document/           #   useDocumentLibrary: 목록·버전 전환
├── infrastructure/
│   └── http/               # axios 어댑터 — 도메인 포트 구현체, HTTP 에러 → 도메인 예외 번역
├── components/
│   ├── auth/                # 로그인·가입 껍데기
│   ├── chat/                 # 질문자 대화 말풍선
│   ├── common/               # 근거 원문 열람 등 화면 공용
│   ├── inbox/                 # 담당자 확인 카드 큐 (도메인에서 액션을 파생)
│   ├── layout/                # Sidebar · TopBar · Layout
│   ├── modals/
│   └── ui/                    # Badge · Button · Avatar · Tag 프리미티브
├── context/                # AuthContext · SseContext
├── lib/                    # cn · 날짜 포맷 등 순수 헬퍼
├── pages/                  # 라우트 단위 화면 — 렌더링만. DashboardPage 가 진입점(`/`)
└── types/                  # API 계약과 1:1 대응하는 타입 (공유 커널)
```

전체 약 8,000 줄입니다.

### 왜 계층을 나눴나요

**업무 규칙이 화면 안에 흩어지면, 같은 규칙이 화면 수만큼 복사됩니다.**
확인 카드에서 어떤 액션이 열리는지(승인·수정·반려·미루기·선택지 응답)는 카드의 사유에 따라
달라지는데, 이 판단이 `InboxPage` 안에 있으면 카드가 다른 화면에 등장하는 순간 규칙이 갈라집니다.

그래서 `domain/` 은 React 도 axios 도 모릅니다. 대신 저장소 **포트**를 선언하고,
`infrastructure/http/` 가 그 포트를 axios 로 구현합니다. `application/` 은 둘을 잇는 훅이고,
`components/`·`pages/` 는 렌더링만 합니다.

### 테스트 러너 대신 selfCheck.ts

`domain/` 각 폴더에는 `selfCheck.ts` 가 있고, **Node 로 직접 실행**합니다.

```bash
node src/domain/review/selfCheck.ts
```

이 계층은 의존성이 0이라 Node 가 TypeScript 를 그대로 돌릴 수 있고, `node:assert` 만으로 충분합니다.
러너·설정·픽스처를 얹는 시점은 표현 계층까지 테스트할 때이고, 거기까지는 가지 않았습니다.

## 화면

| 라우트 | 화면 | 하는 일 |
|---|---|---|
| `/login` · `/signup` | `LoginPage` · `SignupPage` | 로그인 · 가입 |
| `/` | `DashboardPage` | 진입점 — 프로젝트 선택과 오늘의 상태 요약 (자체 사이드바를 가져 `Layout` 밖에 있습니다) |
| `/chat` | `ChatPage` | 질문자 대화 — 질문, AI 답변, 매칭률 뱃지, ✅/❌ 크로스체크 |
| `/inbox` | `InboxPage` | **담당자 확인 카드 큐** — 🔴 우선·오래된 순, 승인/수정/반려/미루기. 교훈·지표는 이 화면의 탭입니다 |
| `/questions` | `QuestionsListPage` | 질문 목록 — 상태·긴급·기간 검색 |
| `/documents` | `DocumentsPage` | 문서함 — 업로드, 버전 활성화·대체 |
| `/official-qas` | `OfficialQAsPage` | 확정되어 편입된 공식 Q&A |
| `/notifications` | `NotificationsPage` | 확정·정정·반려 알림 |
| `/members` | `MembersPage` | 멤버 초대와 역할 관리 |
| `/settings` | `SettingsPage` | 응답 지침 · 임계값 · 방해금지 시간 |

`/lessons` · `/metrics` 는 `/inbox?tab=…` 으로 리다이렉트합니다 — 화면이 탭으로 합쳐진 뒤에도
기존 링크가 죽지 않도록 남겨 둔 경로입니다.

실시간 갱신은 SSE 입니다 (`context/SseContext`).

## 배포 이미지

빌드 산출물이 정적 파일이라 런타임에 node 를 띄우지 않습니다.
빌더에서 번들만 뽑고 런타임에는 `nginx-unprivileged` + `dist` 만 남깁니다 (컨테이너 안 포트 8080).

```bash
docker build -t bulchimbeon-frontend .
```

빌드 시각에 API 주소를 박으려면:

```bash
docker build --build-arg VITE_API_BASE_URL=https://api.example.com/api/v1 -t bulchimbeon-frontend .
```

> ⚠️ Vite 의 `import.meta.env.VITE_*` 는 **빌드 시각에 문자열로 박히는** 값입니다.
> 컨테이너 런타임 환경변수로는 바뀌지 않으므로 `ARG` 로 받습니다.

`docker/nginx.conf` 에 `/api` 프록시 블록이 **없는 것은 의도**입니다 —
앞단(Cloudflare Tunnel)이 `/api/*` 를 백엔드로 보내는 구조라, nginx 가 한 번 더 프록시하면
홉만 늘고 타임아웃·버퍼링 설정이 두 군데로 갈립니다.

오케스트레이션(compose · 터널 설정)은 이 저장소가 아니라
[`bulchimbeon-infra`](https://github.com/LetsMakeTrouble/bulchimbeon-infra) 소관입니다.

## 디자인

Figma — [사고한번쳐 / Hi-Fi 화면 (v2 · 컬러 시스템)](https://www.figma.com/design/zYXzpJCkdmZJrdhsO4fuse/?node-id=128-2)

- 시안은 **프론트엔드 세 사람(이우진 · 송정훈 · 정혜원)** 이 직접 만들었습니다
- 메인 와이어프레임 — 송정훈
- 색·타이포는 Figma 변수를 `src/index.css` 의 Tailwind `@theme` 으로 1:1 이식합니다

## 만든 사람

### 이우진 — 프론트엔드 · 디자인

> [@dldnwls07](https://github.com/dldnwls07)

**디자인** — 화면 디자인은 프론트엔드 세 사람(이우진 · 송정훈 · 정혜원)이 함께 했습니다

- Figma 하이파이 시안 · 컬러 시스템
- Figma 변수를 `src/index.css` 의 Tailwind `@theme` 으로 이식

**구조** — 위에 적은 계층 분리를 설계했습니다

- 업무 규칙을 React 밖으로 — `domain` / `application` / `infrastructure`
- 확인 카드의 액션 판단이 화면마다 복사되지 않게

**기능**

- 질문자 ↔ 담당자 양방향 대화 (대화/질문 탭 분리)
- 인박스 큐 SSE 재조회
- Notion · GitHub 연동 모달

**조용한 실패 잡기**

- 문서 조회 실패가 "문서를 선택하세요"로 보이던 것
- 사용량 조회 실패가 무한 로딩으로 오인되던 것
- 중복 전송과 늦은 응답이 겹치던 경합

**그 밖에** — 브랜치 정리, PR 리뷰·머지

### 송정훈 — 프론트엔드 · 디자인

> [@SongsBy](https://github.com/SongsBy)

**디자인** — 화면 디자인은 프론트엔드 세 사람(이우진 · 송정훈 · 정혜원)이 함께 했습니다

- **메인 와이어프레임 생성** — 화면 구조의 출발점
- Figma 하이파이 시안 · 컬러 시스템

**Figma 를 실제 화면으로**

- 대시보드를 첫 화면으로 교체
- 폴더 카드 호버 · 선택 연동
- 정보 패널을 API 사용량 기반으로 교체

**화면 추가**

- 공식 Q&A · 교훈 · 지표 세 페이지와 API 어댑터
- 인박스 허브 탭으로 통합

### 정혜원 — 프론트엔드 · 디자인 · QC

> [@jungjungjungdd-ai](https://github.com/jungjungjungdd-ai)

**디자인** — 화면 디자인은 프론트엔드 세 사람(이우진 · 송정훈 · 정혜원)이 함께 했습니다

- 화면 디자인 협업

**QC** — 만드는 사람은 자기 화면에 익숙해져서 못 보는 것들이 있습니다

- 주 개발자들이 놓친 오류를 잡아냈습니다

### 홍석영 — 팀장

> [@Seokyoung-Hong](https://github.com/Seokyoung-Hong)

- 배포용 Dockerfile
- 담당자 대화 탭이 항상 비어 있던 문제 (`mine=true` 는 질문자에게만 보냅니다)

---

팀 전체와 다른 저장소의 역할은 [조직 프로필](https://github.com/LetsMakeTrouble)에 정리해 두었습니다.

## 관련 저장소

- [`bulchimbeon-backend`](https://github.com/LetsMakeTrouble/bulchimbeon-backend) — FastAPI API 서버 · 설계 문서
- [`bulchimbeon-infra`](https://github.com/LetsMakeTrouble/bulchimbeon-infra) — 둘을 묶어 함께 띄우는 배포 설정
