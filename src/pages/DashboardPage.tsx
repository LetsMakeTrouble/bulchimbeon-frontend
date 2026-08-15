import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { projectsApi } from '../infrastructure/http/projects';
import { metricsApi } from '../infrastructure/http/metrics';
import type { ProjectUsage, UserProjectSummary } from '../types';
import { CreateProjectModal } from '../components/modals/CreateProjectModal';
import { cn } from '../lib/cn';

/**
 * 진입점 — Figma "Edit Designs with High Resolution"(node 25:1264) 대시보드 1:1 구현.
 * 폴더 카드 = 프로젝트. 카드를 누르면 setActiveProject 후 /chat(대화·질문 목록·공식
 * Q&A 탭이 있는 기존 상세 화면)으로 들어간다. 프로젝트가 없으면 디자인의 6개
 * 폴더 카드를 데모로 그대로 보여준다.
 */

const A = '/dashboard'; // Figma 에셋 루트 (public/dashboard)

// 디자인의 6개 카드 테마 — 글리프·진행바 색/너비·용량 텍스트 색을 순환 적용한다.
// 파란 하이라이트는 더 이상 카드에 고정하지 않는다 — FolderCard 가 호버 상태로 직접 적용한다.
const THEMES = [
  { glyph: `${A}/folder-blue.svg`, bar: '#60a5fa', barW: 60.195, accent: '#4f7bd6' },
  { glyph: `${A}/folder-white.svg`, bar: '#93c5fd', barW: 154.797, accent: '#4f7bd6' },
  { glyph: `${A}/folder-teal.svg`, bar: '#14b8a6', barW: 73.094, accent: '#3f9c92' },
  { glyph: `${A}/folder-purple.svg`, bar: '#7c3aed', barW: 47.297, accent: '#6d5bd0' },
  { glyph: `${A}/folder-amber.svg`, bar: '#f59e0b', barW: 98.898, accent: '#a3833a' },
  { glyph: `${A}/folder-rose.svg`, bar: '#e11d48', barW: 64.5, accent: '#c2566d' },
] as const;

// 프로젝트가 하나도 없을 때 보여주는 디자인 원본 데모 카드 (전부 한글).
const DEMO_CARDS = [
  { name: 'UX 리서치', meta: '노트 233개', size: '116.9 MB' },
  { name: '원본 데이터', meta: '노트 39개', size: '180.2 MB' },
  { name: '가공 데이터', meta: '노트 21개', size: '23.4 MB' },
  { name: '리포트', meta: '노트 17개', size: '490 MB' },
  { name: '데이터 시각화', meta: '노트 96개', size: '1.3 GB' },
  { name: '아이디어와 인사이트', meta: '노트 103개', size: '126.3 MB' },
];

// 정보 패널 폭 — 사용자가 좌측 경계를 끌어 조절한다. 최소값은 "오늘 API 호출" 카드의
// 숫자가 줄바꿈되지 않는 선, 최대값은 메인 카드 그리드가 한 열은 남는 선이다.
const PANEL_MIN_WIDTH = 200;
const PANEL_MAX_WIDTH = 560;
const PANEL_DEFAULT_WIDTH = 272; // 디자인 원본 값

const HIGHLIGHT_GRADIENT =
  'linear-gradient(136.01629091150167deg, rgb(127, 168, 253) 0%, rgb(125, 164, 252) 7.1429%, rgb(122, 161, 252) 14.286%, rgb(120, 157, 251) 21.429%, rgb(118, 153, 250) 28.571%, rgb(115, 150, 250) 35.714%, rgb(113, 146, 249) 42.857%, rgb(111, 142, 248) 50%, rgb(113, 139, 247) 57.143%, rgb(115, 137, 245) 64.286%, rgb(117, 134, 244) 71.429%, rgb(118, 132, 243) 78.571%, rgb(120, 129, 242) 85.714%, rgb(122, 127, 240) 92.857%, rgb(123, 124, 239) 100%)';

export function DashboardPage() {
  const { user, projects, activeProject, setActiveProject, unreadTotal, logout, refreshMe } =
    useAuth();
  const navigate = useNavigate();

  const [creating, setCreating] = useState(false);
  const [search, setSearch] = useState('');
  const [joinOpen, setJoinOpen] = useState(false);
  const [code, setCode] = useState('');
  const [joining, setJoining] = useState(false);
  const [joinError, setJoinError] = useState(false);
  const [usage, setUsage] = useState<ProjectUsage | null>(null);
  const [panelWidth, setPanelWidth] = useState(PANEL_DEFAULT_WIDTH);

  /**
   * 정보 패널 좌측 경계 드래그. 오른쪽에 붙은 패널이라 창 오른쪽 끝에서 커서까지의 거리가
   * 곧 패널 너비다. 메인 영역은 `flex-1 min-w-px` 라 남는 폭을 알아서 가져간다.
   *
   * 포인터 캡처를 쓰는 이유: 캡처가 없으면 드래그 중 커서가 iframe·다른 요소 위로 넘어가는
   * 순간 move 이벤트가 끊겨 패널이 그 자리에 얼어붙는다.
   */
  const startPanelResize = (e: React.PointerEvent<HTMLDivElement>) => {
    e.preventDefault();
    const handle = e.currentTarget;
    handle.setPointerCapture(e.pointerId);
    const onMove = (ev: PointerEvent) => {
      const next = window.innerWidth - ev.clientX;
      setPanelWidth(Math.min(PANEL_MAX_WIDTH, Math.max(PANEL_MIN_WIDTH, next)));
    };
    const onStop = () => {
      handle.releasePointerCapture(e.pointerId);
      handle.removeEventListener('pointermove', onMove);
      handle.removeEventListener('pointerup', onStop);
      handle.removeEventListener('pointercancel', onStop);
    };
    handle.addEventListener('pointermove', onMove);
    handle.addEventListener('pointerup', onStop);
    handle.addEventListener('pointercancel', onStop);
  };

  // 정보 패널 = 선택된 프로젝트의 API 사용량 (§13.1). 비용은 프로젝트 소유자 정보라
  // 담당자에게만 열려 있다 — 질문자면 호출 자체를 하지 않는다 (부르면 403).
  useEffect(() => {
    setUsage(null);
    if (!activeProject || activeProject.role !== 'answerer') return;
    let cancelled = false;
    metricsApi
      .usage(activeProject.id)
      .then((u) => !cancelled && setUsage(u))
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [activeProject]);

  const filtered = useMemo(
    () => projects.filter((p) => p.name.toLowerCase().includes(search.trim().toLowerCase())),
    [projects, search]
  );

  const enter = (p: UserProjectSummary) => {
    setActiveProject(p);
    navigate('/chat');
  };

  const join = async () => {
    if (!code.trim() || joining) return;
    setJoining(true);
    setJoinError(false);
    try {
      await projectsApi.join(code.trim());
      await refreshMe();
      setJoinOpen(false);
      setCode('');
      navigate('/chat');
    } catch {
      setJoinError(true);
    } finally {
      setJoining(false);
    }
  };

  const projectName = activeProject?.name ?? '프로젝트';

  return (
    <div className="h-screen w-full bg-white">
      <div className="flex h-full w-full overflow-hidden bg-white">
        {/* ── 사이드바 ─────────────────────────────────────── */}
        <aside className="flex h-full w-[232px] shrink-0 flex-col border-r border-[rgba(226,232,240,0.7)] bg-white pb-[18px] pl-[16px] pr-[18px] pt-[22px]">
          {/* 로고 */}
          <div className="relative h-[29px] w-[179px] shrink-0">
            <div className="absolute left-0 top-0 h-[29px] w-[28px] overflow-hidden">
              <img
                alt=""
                className="absolute left-[-162.62%] top-[-209.43%] h-[518.87%] w-[417.48%] max-w-none"
                src={`${A}/logo.png`}
              />
            </div>
            <p className="absolute left-[37px] top-[2px] whitespace-nowrap text-[16px] font-semibold leading-[24px] tracking-[-0.16px] text-[#0f172b]">
              불침번
            </p>
            <button className="absolute left-[156px] top-[5.5px] block" aria-label="패널 접기">
              <img alt="" className="block size-[18px]" src={`${A}/panel.svg`} />
            </button>
          </div>

          {/* 내비게이션 */}
          <nav className="flex min-h-0 w-full flex-1 flex-col overflow-y-auto pt-[24px]">
            <SideNavItem icon={`${A}/nav-home.svg`} label="홈" onClick={() => navigate('/')} />
            <SideNavItem icon={`${A}/nav-projects.svg`} label="프로젝트" bold />
            {/* 프로젝트 하위 목록 — 실제 프로젝트, 선택된 항목 강조 */}
            <div className="w-full pl-[26px]">
              {projects.map((p) => (
                <div key={p.id} className="w-full pt-[2px]">
                  <div className="w-full pt-[2px]">
                    <button
                      onClick={() => setActiveProject(p)}
                      className={cn(
                        'flex w-full items-center rounded-[8px] px-[10px] py-[6px] text-left',
                        p.id === activeProject?.id
                          ? 'bg-[#f8fafc] drop-shadow-[0px_1px_1px_rgba(15,23,42,0.06)]'
                          : 'hover:bg-[#f8fafc]/60'
                      )}
                    >
                      <span
                        className={cn(
                          'truncate whitespace-nowrap text-[13px] leading-[19.5px]',
                          p.id === activeProject?.id
                            ? 'font-semibold text-[#0f172b]'
                            : 'font-medium text-[#62748e]'
                        )}
                      >
                        {p.name}
                      </span>
                    </button>
                  </div>
                </div>
              ))}
              {/* 초대 코드 참여 — 디자인 외 기능이지만 기존 홈 화면의 기능을 유지한다 */}
              <div className="w-full pt-[4px]">
                {joinOpen ? (
                  <input
                    autoFocus
                    value={code}
                    onChange={(e) => setCode(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && join()}
                    onBlur={() => !code.trim() && setJoinOpen(false)}
                    placeholder="초대 코드 입력"
                    className={cn(
                      'w-full rounded-[8px] border bg-white px-[10px] py-[5px] text-[13px] leading-[19.5px] text-[#0f172b] placeholder:text-[#90a1b9] focus:outline-none',
                      joinError ? 'border-[#fb2c36]' : 'border-[#e2e8f0] focus:border-[#7fa8fd]'
                    )}
                  />
                ) : (
                  <button
                    onClick={() => setJoinOpen(true)}
                    className="flex w-full items-center rounded-[8px] px-[10px] py-[6px] text-[13px] font-medium leading-[19.5px] text-[#90a1b9] hover:bg-[#f8fafc]/60"
                  >
                    + 초대 코드로 참여
                  </button>
                )}
              </div>
            </div>
          </nav>

          {/* 하단 고정 — 설정 · 알림 */}
          <div className="w-full shrink-0">
            <SideNavItem
              icon={`${A}/nav-settings.svg`}
              label="설정"
              full
              onClick={() => navigate('/settings')}
            />
            <div className="w-full pt-[2px]">
              <button
                onClick={() => navigate('/notifications')}
                className="flex w-full items-center gap-[10px] rounded-[8px] px-[8px] py-[7px] hover:bg-[#f8fafc]"
              >
                <img alt="" className="block size-[17px]" src={`${A}/nav-bell.svg`} />
                <span className="whitespace-nowrap text-[13.5px] font-medium leading-[20.25px] text-[#45556c]">
                  알림
                </span>
                <span className="flex min-w-px flex-1 justify-end">
                  {unreadTotal > 0 && (
                    <span className="flex items-center rounded-full bg-[#fb2c36] px-[7px] py-px text-[11px] font-semibold leading-[16.5px] text-white">
                      {unreadTotal}
                    </span>
                  )}
                </span>
              </button>
            </div>
          </div>

          {/* 프로필 */}
          <div className="w-full shrink-0 pt-[12px]">
            <div className="flex w-full items-center gap-[10px] border-t border-[rgba(226,232,240,0.7)] pt-[16px]">
              <span className="relative block size-[32px] shrink-0 overflow-hidden rounded-full bg-[#e2e8f0]">
                <img alt="" className="absolute inset-0 size-full max-w-none object-cover" src={`${A}/avatar.png`} />
              </span>
              <div className="min-w-px flex-1 overflow-hidden">
                <p className="truncate whitespace-nowrap text-[12.5px] font-semibold leading-[15.625px] text-[#0f172b]">
                  {user?.name ?? '사용자'}
                </p>
                <p className="truncate whitespace-nowrap text-[11.5px] font-normal leading-[14.375px] text-[#62748e]">
                  {user?.email ?? ''}
                </p>
              </div>
              <button onClick={logout} aria-label="로그아웃" className="block shrink-0">
                <img alt="" className="block size-[17px]" src={`${A}/signout.svg`} />
              </button>
            </div>
          </div>
        </aside>

        {/* ── 메인 콘텐츠 ──────────────────────────────────── */}
        <section className="flex h-full min-w-px flex-1 flex-col bg-[#fcfcfd]">
          {/* 상단 헤더 — 뒤로가기 · 브레드크럼 · 관리/공유 */}
          <header className="flex h-[64px] shrink-0 items-center gap-[12px] border-b border-[rgba(226,232,240,0.7)] px-[22px] pb-px">
            <button aria-label="뒤로 가기" className="block shrink-0">
              <img alt="" className="block size-[18px]" src={`${A}/back.svg`} />
            </button>
            {/* 패널을 넓히면 헤더가 좁아진다 — 브레드크럼이 먼저 줄어들고 넘치면 말줄임 */}
            <div className="flex min-w-0 shrink items-center gap-[8px] overflow-hidden">
              <span className="flex shrink-0 items-center gap-[6px]">
                <img alt="" className="block size-[16px]" src={`${A}/crumb-projects.svg`} />
                <span className="whitespace-nowrap text-[13px] font-normal leading-[19.5px] text-[#62748e]">
                  프로젝트
                </span>
              </span>
              <img alt="" className="block size-[14px] shrink-0" src={`${A}/chevron.svg`} />
              <span className="flex min-w-0 items-center gap-[6px]">
                <img alt="" className="block size-[16px] shrink-0" src={`${A}/crumb-folder.svg`} />
                <span className="truncate text-[13px] font-medium leading-[19.5px] text-[#1d293d]">
                  {projectName}
                </span>
              </span>
            </div>
            <div className="flex min-w-px flex-1 items-center justify-end">
              <div className="flex shrink-0 items-center gap-[4px]">
                <button
                  onClick={() => navigate('/settings')}
                  className="flex items-center gap-[6px] rounded-[8px] px-[8px] py-[6px] hover:bg-[#f1f5f9]"
                >
                  <img alt="" className="block size-[16px]" src={`${A}/manage.svg`} />
                  <span className="whitespace-nowrap text-[13px] font-medium leading-[19.5px] text-[#314158]">
                    관리
                  </span>
                </button>
                <button
                  onClick={() => navigate('/members')}
                  className="flex items-center gap-[6px] rounded-[8px] px-[8px] py-[6px] hover:bg-[#f1f5f9]"
                >
                  <img alt="" className="block size-[16px]" src={`${A}/share.svg`} />
                  <span className="whitespace-nowrap text-[13px] font-medium leading-[19.5px] text-[#314158]">
                    공유
                  </span>
                </button>
                <button aria-label="더 보기" className="block rounded-[8px] p-[6px] hover:bg-[#f1f5f9]">
                  <img alt="" className="block size-[16px]" src={`${A}/more-header.svg`} />
                </button>
              </div>
            </div>
          </header>

          {/* 본문 */}
          <div className="flex min-h-px flex-1 flex-col overflow-y-auto px-[26px] pb-[28px] pt-[20px]">
            <div className="flex w-full items-center justify-between">
              <h1 className="whitespace-nowrap text-[22px] font-semibold leading-[33px] tracking-[-0.44px] text-[#0f172b]">
                {projectName}
              </h1>
              <button
                onClick={() => setCreating(true)}
                className="rounded-[8px] bg-[#0f172b] px-[14px] py-[8px] drop-shadow-[0px_4px_5px_rgba(15,23,42,0.35)] hover:bg-[#1d293d]"
              >
                <span className="whitespace-nowrap text-[13px] font-medium leading-[19.5px] text-white">
                  새 초안
                </span>
              </button>
            </div>

            {/* 검색 · 필터 */}
            <div className="flex w-full items-center justify-between pt-[20px]">
              <label className="flex h-[34px] w-[220px] items-center gap-[8px] rounded-[10px] border border-[#e2e8f0] bg-white px-[14px] drop-shadow-[0px_1px_1px_rgba(15,23,42,0.04)]">
                <img alt="" className="block size-[15px] shrink-0" src={`${A}/search.svg`} />
                <input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="검색"
                  className="w-full min-w-0 bg-transparent text-[13px] font-normal text-[#0f172b] placeholder:text-[#90a1b9] focus:outline-none"
                />
              </label>
              <button className="flex h-[34px] items-center gap-[6px] rounded-[10px] border border-[#e2e8f0] bg-white px-[14px] drop-shadow-[0px_1px_1px_rgba(15,23,42,0.04)] hover:bg-[#f8fafc]">
                <img alt="" className="block size-[15px]" src={`${A}/filter.svg`} />
                <span className="whitespace-nowrap text-[13px] font-medium leading-[19.5px] text-[#314158]">
                  필터
                </span>
              </button>
            </div>

            {/* 폴더 카드 그리드 — 프로젝트가 있으면 실제 프로젝트, 없으면 디자인 데모 */}
            <div className="w-full pt-[22px]">
              {/* 카드 크기는 디자인 원본 고정(251px) — 화면이 넓어지면 열 수만 늘어난다 */}
              <div className="grid w-full grid-cols-[repeat(auto-fill,251px)] gap-[16px]">
                {projects.length > 0
                  ? filtered.map((p, i) => {
                      const theme = THEMES[i % THEMES.length];
                      const isAnswerer = p.role === 'answerer';
                      const count = isAnswerer ? p.pending_cards : p.unread_notifications;
                      return (
                        <FolderCard
                          key={p.id}
                          theme={theme}
                          name={p.name}
                          meta={`${isAnswerer ? '검수 대기' : '새 알림'} ${count}건`}
                          size={isAnswerer ? '담당자' : '질문자'}
                          selected={p.id === activeProject?.id}
                          onClick={() => enter(p)}
                        />
                      );
                    })
                  : DEMO_CARDS.map((c, i) => (
                      <FolderCard
                        key={c.name}
                        theme={THEMES[i % THEMES.length]}
                        name={c.name}
                        meta={c.meta}
                        size={c.size}
                        onClick={() => setCreating(true)}
                      />
                    ))}
              </div>
              {projects.length > 0 && filtered.length === 0 && (
                <p className="pt-[22px] text-[13px] text-[#62748e]">
                  ‘{search}’에 해당하는 프로젝트가 없습니다.
                </p>
              )}
            </div>
          </div>
        </section>

        {/* ── 정보 패널 ────────────────────────────────────── */}
        <aside
          style={{ width: panelWidth }}
          className="relative flex h-full shrink-0 flex-col border-l border-[rgba(226,232,240,0.7)] bg-white pl-px"
        >
          {/* 좌측 경계 드래그 핸들 — 경계선 위에 겹쳐 두어 폭을 차지하지 않는다 */}
          <div
            role="separator"
            aria-orientation="vertical"
            aria-label="정보 패널 너비 조절"
            onPointerDown={startPanelResize}
            onDoubleClick={() => setPanelWidth(PANEL_DEFAULT_WIDTH)}
            title="드래그해서 너비 조절 (더블클릭: 기본값)"
            className="absolute -left-[3px] top-0 z-10 h-full w-[6px] cursor-col-resize touch-none bg-transparent transition-colors hover:bg-[#7fa8fd]/40"
          />
          <div className="flex h-[64px] shrink-0 items-center justify-between border-b border-[rgba(226,232,240,0.7)] px-[20px] pb-px">
            <h2 className="whitespace-nowrap text-[15px] font-semibold leading-[22.5px] tracking-[-0.15px] text-[#0f172b]">
              정보
            </h2>
            <button aria-label="정보 패널 접기" className="block">
              <img alt="" className="block size-[16px]" src={`${A}/collapse.svg`} />
            </button>
          </div>

          <div className="flex min-h-px flex-1 flex-col overflow-y-auto p-[16px]">
            {!usage ? (
              <p className="text-[12.5px] leading-[18.75px] text-[#62748e]">
                {activeProject?.role === 'asker'
                  ? 'API 사용량은 담당자에게만 표시됩니다.'
                  : '사용량을 불러오는 중…'}
              </p>
            ) : (
              <>
                <div className="flex w-full flex-col gap-[12px]">
                  <StorageCard
                    label="오늘 API 호출"
                    value={`${usage.calls_today.toLocaleString('ko-KR')}회`}
                    barFrom="#93c5fd"
                    barTo="#3b82f6"
                    barPct={Math.min(100, (usage.calls_today / usage.daily_call_limit) * 100)}
                    caption={`일일 상한 ${usage.daily_call_limit.toLocaleString('ko-KR')}회`}
                  />
                  <StorageCard
                    label={`최근 ${usage.window_days}일 비용`}
                    value={`$${Number(usage.total.cost_usd).toFixed(2)}`}
                    barFrom="#fca5a5"
                    barTo="#ef4444"
                    barPct={100}
                    caption={`호출 ${usage.total.calls.toLocaleString('ko-KR')}회`}
                  />
                </div>

                <h3 className="w-full whitespace-nowrap pt-[24px] text-[14px] font-semibold leading-[21px] tracking-[-0.14px] text-[#0f172b]">
                  속성
                </h3>
                {/* ⚠️ reasoning_tokens 는 output_tokens 에 포함된 값이라 따로 더하지 않는다 (§13.1) */}
                <dl className="w-full pt-[10px]">
                  <PropertyRow
                    term="입력 토큰"
                    desc={usage.total.input_tokens.toLocaleString('ko-KR')}
                  />
                  <PropertyRow
                    term="출력 토큰"
                    desc={usage.total.output_tokens.toLocaleString('ko-KR')}
                  />
                </dl>

                {usage.by_step.length > 0 && (
                  <>
                    <h3 className="w-full whitespace-nowrap pt-[24px] text-[14px] font-semibold leading-[21px] tracking-[-0.14px] text-[#0f172b]">
                      단계별 호출
                    </h3>
                    <dl className="w-full pt-[10px]">
                      {usage.by_step.map((s) => (
                        <PropertyRow
                          key={s.step}
                          term={s.step}
                          desc={`${s.totals.calls.toLocaleString('ko-KR')}회`}
                        />
                      ))}
                    </dl>
                  </>
                )}
              </>
            )}
          </div>

          <div className="w-full shrink-0 px-[16px] pb-[20px]">
            <button className="flex w-full items-center gap-[10px] rounded-[8px] p-[6px] hover:bg-[#f8fafc]">
              <img alt="" className="block size-[17px]" src={`${A}/pin.svg`} />
              <span className="whitespace-nowrap text-[13px] font-medium leading-[19.5px] text-[#314158]">
                고정된 항목
              </span>
            </button>
            <div className="w-full pt-[4px]">
              <button className="flex w-full items-center gap-[10px] rounded-[8px] p-[6px] hover:bg-[#f8fafc]">
                <img alt="" className="block size-[17px]" src={`${A}/nav-emails.svg`} />
                <span className="whitespace-nowrap text-[13px] font-medium leading-[19.5px] text-[#314158]">
                  활동
                </span>
              </button>
            </div>
          </div>
        </aside>
      </div>

      {creating && (
        <CreateProjectModal
          onClose={() => setCreating(false)}
          onCreated={async () => {
            setCreating(false);
            await refreshMe();
            navigate('/inbox');
          }}
        />
      )}
    </div>
  );
}

/* ── 부품들 ─────────────────────────────────────────────── */

function SideNavItem({
  icon,
  label,
  bold,
  full,
  onClick,
}: {
  icon: string;
  label: string;
  bold?: boolean;
  full?: boolean;
  onClick?: () => void;
}) {
  return (
    <div className={cn('pt-[2px]', full ? 'w-full' : '')}>
      <button
        onClick={onClick}
        className={cn(
          'flex items-center gap-[10px] rounded-[8px] px-[8px] py-[7px] hover:bg-[#f8fafc]',
          full ? 'w-full' : 'w-[198px]'
        )}
      >
        <img alt="" className="block size-[17px] shrink-0" src={icon} />
        <span
          className={cn(
            'whitespace-nowrap text-[13.5px] leading-[20.25px]',
            bold ? 'font-semibold text-[#0f172b]' : 'font-medium text-[#45556c]'
          )}
        >
          {label}
        </span>
      </button>
    </div>
  );
}

function FolderCard({
  theme,
  name,
  meta,
  size,
  selected = false,
  onClick,
}: {
  theme: (typeof THEMES)[number];
  name: string;
  meta: string;
  size: string;
  /** 사이드바에서 선택된 프로젝트 — 마우스를 올리지 않아도 하이라이트를 유지한다 */
  selected?: boolean;
  onClick: () => void;
}) {
  // 파란 하이라이트는 카드마다 고정된 상태가 아니라 선택 중이거나 마우스가 올라왔을 때만 켜진다.
  const [hovered, setHovered] = useState(false);
  const highlight = hovered || selected;
  return (
    <div
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      className={cn(
        'relative h-[242.25px] rounded-[16px] transition-shadow',
        highlight
          ? 'drop-shadow-[0px_16px_14px_rgba(76,104,220,0.55)]'
          : 'bg-white shadow-[0px_0px_0px_1px_rgba(226,232,240,0.9),0px_1px_2px_0px_rgba(15,23,42,0.05)]'
      )}
      style={highlight ? { backgroundImage: HIGHLIGHT_GRADIENT } : undefined}
    >
      <button onClick={onClick} className="flex size-full flex-col items-start p-[18px] text-left">
        <div className="flex h-[112px] w-full items-center justify-center">
          <img alt="" className="block h-[112px] w-[135.328px]" src={theme.glyph} />
        </div>
        <div className="w-full pt-[6px]">
          <div
            className="flex h-[3px] w-full flex-col overflow-hidden rounded-full"
            style={{ backgroundColor: highlight ? 'rgba(255,255,255,0.3)' : '#eef2f7' }}
          >
            <div
              className="h-[3px] rounded-full"
              style={{ width: theme.barW, backgroundColor: highlight ? '#ffffff' : theme.bar }}
            />
          </div>
        </div>
        <div className="flex h-[85.25px] w-full flex-col gap-[6px] pt-[14px]">
          <p
            className={cn(
              'truncate whitespace-nowrap text-[14.5px] font-semibold leading-[21.75px] tracking-[-0.15px]',
              highlight ? 'text-white' : 'text-[#0f172b]'
            )}
          >
            {name}
          </p>
          <div className="flex w-full items-center gap-[6px]">
            <img
              alt=""
              className="block size-[13px] shrink-0"
              src={highlight ? `${A}/doc-white.svg` : `${A}/doc.svg`}
            />
            <span
              className={cn(
                'whitespace-nowrap text-[12.5px] font-normal leading-[18.75px]',
                highlight ? 'text-[rgba(255,255,255,0.8)]' : 'text-[#62748e]'
              )}
            >
              {meta}
            </span>
          </div>
          <p
            className="whitespace-nowrap text-[12.5px] font-medium leading-[18.75px]"
            style={{ color: highlight ? '#ffffff' : theme.accent }}
          >
            {size}
          </p>
        </div>
      </button>
      <button
        aria-label={`${name} 더 보기`}
        className={cn(
          'absolute right-[12px] top-[14.5px] flex size-[22px] items-center justify-center rounded-[6px]',
          highlight ? 'hover:bg-white/10' : 'hover:bg-[#f1f5f9]'
        )}
      >
        <img
          alt=""
          className="block size-[16px]"
          src={highlight ? `${A}/more-white.svg` : `${A}/more.svg`}
        />
      </button>
    </div>
  );
}

function StorageCard({
  label,
  value,
  barFrom,
  barTo,
  barPct,
  caption,
}: {
  label: string;
  value: string;
  barFrom: string;
  barTo: string;
  /** 0~100 — 일일 상한 대비 사용 비율 */
  barPct: number;
  caption?: string;
}) {
  return (
    <div className="w-full rounded-[14px] border border-[rgba(226,232,240,0.8)] bg-white p-[17px] drop-shadow-[0px_1px_1px_rgba(15,23,42,0.05)]">
      <div className="flex w-full items-start justify-between">
        <p className="whitespace-nowrap text-[12.5px] font-normal leading-[18.75px] text-[#62748e]">
          {label}
        </p>
        <button aria-label={`${label} 옵션`} className="block">
          <img alt="" className="block size-[16px]" src={`${A}/more.svg`} />
        </button>
      </div>
      <p className="w-full whitespace-nowrap pt-[4px] text-[22px] font-semibold leading-[33px] tracking-[-0.44px] text-[#0f172b]">
        {value}
      </p>
      <div className="w-full pt-[12px]">
        <div className="flex h-[6px] w-full flex-col overflow-hidden rounded-full bg-[#f1f5f9]">
          <div
            className="h-[6px] rounded-full"
            style={{ width: `${barPct}%`, backgroundImage: `linear-gradient(to right, ${barFrom}, ${barTo})` }}
          />
        </div>
      </div>
      {caption && (
        <p className="w-full whitespace-nowrap pt-[8px] text-[11.5px] leading-[17.25px] text-[#90a1b9]">
          {caption}
        </p>
      )}
    </div>
  );
}

function PropertyRow({ term, desc }: { term: string; desc: string }) {
  return (
    <div className="flex w-full items-center justify-between py-[4px]">
      <dt className="whitespace-nowrap text-[12.5px] font-normal leading-[18.75px] text-[#62748e]">
        {term}
      </dt>
      <dd className="m-0 whitespace-nowrap text-[12.5px] font-semibold leading-[18.75px] text-[#0f172b]">
        {desc}
      </dd>
    </div>
  );
}
