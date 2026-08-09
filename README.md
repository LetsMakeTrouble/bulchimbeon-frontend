# bulchimbeon-frontend

> ⚠️ **`main` 에는 구현 코드가 없다.** 빌드 파이프라인과 `src/` 디렉터리 뼈대만 남겨둔
> 상태다. 완성된 구현은 **`woojin` 브랜치**에 있다.
>
> ```bash
> git checkout woojin
> ```

## 스택

Vite + React 19 + TypeScript + Tailwind CSS v4 + React Router.
API 계약은 `bulchimbeon-backend` 저장소의 `docs/05-api-contract.md` 가 정본이다.

## 명령

```bash
npm install
npm run dev      # http://localhost:5173 (/api → localhost:8000 프록시)
npm run build    # tsc -b && vite build
npm run lint     # oxlint
```

`main` 상태에서는 `src/main.tsx` 가 없으므로 `dev`·`build` 가 돌지 않는다.
구현을 채우거나 `woojin` 을 체크아웃한다.

## 디렉터리

```
src/
├── api/           # 엔드포인트별 클라이언트 (client.ts 가 axios 인스턴스·토큰 갱신)
├── assets/
├── components/
│   ├── auth/      # 로그인·가입 껍데기
│   ├── chat/      # 질문자 대화 말풍선
│   ├── common/    # 근거 원문 열람 등 화면 공용
│   ├── inbox/     # 담당자 확인 카드 큐
│   ├── layout/    # Sidebar · TopBar · Layout
│   ├── modals/
│   └── ui/        # Badge · Button · Avatar 프리미티브
├── context/       # AuthContext (user · projects · activeProject)
├── lib/           # cn · 날짜 포맷 등 순수 헬퍼
├── pages/         # 라우트 단위 화면
└── types/         # API 계약과 1:1 대응하는 타입
```

## 디자인

Figma — [사고한번쳐 / Hi-Fi 화면 (v2 · 컬러 시스템)](https://www.figma.com/design/zYXzpJCkdmZJrdhsO4fuse/?node-id=128-2).
색·타이포는 Figma 변수를 `src/index.css` 의 Tailwind `@theme` 으로 1:1 이식한다.
