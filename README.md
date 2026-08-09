# bulchimbeon-frontend


## 스택

Vite + React 19 + TypeScript + Tailwind CSS v4 + React Router.
API 계약은 `bulchimbeon-backend` 저장소의 `docs/05-api-contract.md` 가 정본이다.

## 파이프라인

```bash
npm install
npm run dev      # vite — http://localhost:5173 (/api → localhost:8000 프록시)
npm run build    # tsc -b && vite build — 타입체크 후 프로덕션 번들
npm run lint     # oxlint
```

## 디렉터리


```
src/
├── domain/              # 순수 업무 규칙 — React·axios 의존 0
│   └── review/          #   §7.1 액션 매트릭스, 처리 명령 VO, 저장소 포트
├── application/         # 유즈케이스 조율 — 업무 규칙 없음, 화면 문구 없음
│   └── review/          #   useReviewQueue: 조회·지연로딩·처리·에러 매핑
├── infrastructure/
│   └── http/            # axios 어댑터 — 도메인 포트 구현체, HTTP 에러 → 도메인 예외 번역
├── components/
│   ├── auth/             # 로그인·가입 껍데기
│   ├── chat/              # 질문자 대화 말풍선
│   ├── common/           # 근거 원문 열람 등 화면 공용
│   ├── inbox/             # 담당자 확인 카드 큐 (도메인에서 액션을 파생)
│   ├── layout/            # Sidebar · TopBar · Layout
│   ├── modals/
│   └── ui/                # Badge · Button · Avatar 프리미티브
├── context/              # AuthContext · SseContext
├── lib/                  # cn · 날짜 포맷 등 순수 헬퍼
├── pages/                # 라우트 단위 화면 — 렌더링만
└── types/                # API 계약과 1:1 대응하는 타입 (공유 커널)
```

## 디자인

Figma — [사고한번쳐 / Hi-Fi 화면 (v2 · 컬러 시스템)](https://www.figma.com/design/zYXzpJCkdmZJrdhsO4fuse/?node-id=128-2).
색·타이포는 Figma 변수를 `src/index.css` 의 Tailwind `@theme` 으로 1:1 이식한다.
