import { Link, NavLink } from 'react-router-dom';
import {
  BookMarked,
  ChevronsUpDown,
  FileText,
  Inbox,
  List,
  MessageSquare,
  Settings,
  User,
} from 'lucide-react';
import { cn } from '../../lib/cn';
import { Avatar } from '../ui/Avatar';
import { useAuth } from '../../context/AuthContext';

// 대시보드(Figma node 25:1264)와 같은 디자인 언어 — 232px 폭, slate 팔레트,
// 8px 라운드, 13.5px 타이포. 구성 요소(스위처·탭·프로필)는 그대로 둔다.
const item =
  'flex w-full items-center gap-[10px] rounded-[8px] px-[8px] py-[7px] text-[13.5px] leading-[20.25px] transition-colors';
const idle = 'font-medium text-[#45556c] hover:bg-[#f8fafc]';
const active =
  'bg-[#f8fafc] font-semibold text-[#0f172b] drop-shadow-[0px_1px_1px_rgba(15,23,42,0.06)]';

function NavItem({
  to,
  icon: Icon,
  label,
  badge,
}: {
  to: string;
  icon: typeof Inbox;
  label: string;
  badge?: number;
}) {
  return (
    <div className="pt-[2px]">
      <NavLink to={to} className={({ isActive }) => cn(item, isActive ? active : idle)}>
        {({ isActive }) => (
          <>
            <Icon
              className={cn('size-[17px] shrink-0', isActive ? 'text-[#0f172b]' : 'text-[#62748e]')}
            />
            <span className="min-w-0 flex-1 truncate">{label}</span>
            {badge ? (
              <span className="flex items-center rounded-full bg-[#fb2c36] px-[7px] py-px text-[11px] font-semibold leading-[16.5px] text-white">
                {badge}
              </span>
            ) : null}
          </>
        )}
      </NavLink>
    </div>
  );
}

export function Sidebar() {
  const { user, projects, activeProject, setActiveProject, logout } = useAuth();
  const isAnswerer = activeProject?.role === 'answerer';

  return (
    <aside className="flex w-[232px] shrink-0 flex-col border-r border-[rgba(226,232,240,0.7)] bg-white">
      {/* 프로젝트 스위처 — <details> 로 팝오버를 만든다. 바깥 클릭 닫힘이 공짜다. */}
      <details className="group relative shrink-0 border-b border-[rgba(226,232,240,0.7)]">
        <summary className="flex h-[64px] cursor-pointer list-none items-center gap-[10px] pl-[16px] pr-[14px] hover:bg-[#f8fafc]">
          <span className="flex size-8 shrink-0 items-center justify-center rounded-[8px] bg-[#0f172b] text-[12px] font-semibold text-white">
            {activeProject?.name.slice(0, 2) ?? '—'}
          </span>
          <div className="min-w-0 flex-1">
            <p className="truncate text-[13px] font-semibold leading-[19.5px] text-[#0f172b]">
              {activeProject?.name ?? '프로젝트 없음'}
            </p>
            <p className="truncate text-[11.5px] leading-[14.375px] text-[#62748e]">
              {activeProject ? (isAnswerer ? '담당자' : '질문자') : '초대 코드로 참여하세요'}
            </p>
          </div>
          <ChevronsUpDown className="size-4 shrink-0 text-[#90a1b9]" />
        </summary>

        <div className="absolute left-3 right-3 top-[60px] z-20 rounded-[10px] border border-[#e2e8f0] bg-white p-1.5 shadow-[0px_12px_24px_-8px_rgba(15,23,42,0.18),0px_2px_6px_0px_rgba(15,23,42,0.08)]">
          {projects.map((p) => (
            <button
              key={p.id}
              onClick={() => setActiveProject(p)}
              className={cn(
                'flex w-full items-center gap-2 rounded-[8px] px-[10px] py-[6px] text-left text-[13px] leading-[19.5px] hover:bg-[#f8fafc]',
                p.id === activeProject?.id
                  ? 'font-semibold text-[#0f172b]'
                  : 'font-medium text-[#62748e]'
              )}
            >
              <span className="min-w-0 flex-1 truncate">{p.name}</span>
              {p.pending_cards > 0 && (
                <span className="text-[11px] font-semibold text-[#62748e]">{p.pending_cards}</span>
              )}
            </button>
          ))}
          <hr className="my-1.5 border-[rgba(226,232,240,0.7)]" />
          <Link
            to="/"
            className="block rounded-[8px] px-[10px] py-[6px] text-[13px] font-semibold leading-[19.5px] text-[#0f172b] hover:bg-[#f8fafc]"
          >
            + 새 프로젝트 · 초대 코드로 참여
          </Link>
          <button
            onClick={logout}
            className="block w-full rounded-[8px] px-[10px] py-[6px] text-left text-[13px] font-medium leading-[19.5px] text-[#62748e] hover:bg-[#f8fafc]"
          >
            로그아웃
          </button>
        </div>
      </details>

      <nav className="flex flex-1 flex-col overflow-y-auto pb-[18px] pl-[16px] pr-[18px] pt-[14px]">
        <NavItem to="/chat" icon={MessageSquare} label="대화" />
        <NavItem to="/questions" icon={List} label="질문 목록" />
        <NavItem to="/official-qas" icon={BookMarked} label="공식 Q&A" />
        <NavItem to="/documents" icon={FileText} label="문서" />

        {isAnswerer && (
          <>
            <p className="px-[8px] pb-[6px] pt-[16px] text-[11px] font-semibold text-[#90a1b9]">
              담당자 전용
            </p>
            <NavItem
              to="/inbox"
              icon={Inbox}
              label="브리핑 인박스"
              badge={activeProject?.pending_cards}
            />
            <NavItem to="/members" icon={User} label="멤버" />
            <NavItem to="/settings" icon={Settings} label="설정" />
          </>
        )}
      </nav>

      <div className="shrink-0 pb-[18px] pl-[16px] pr-[18px]">
        <div className="flex items-center gap-[10px] border-t border-[rgba(226,232,240,0.7)] pt-[16px]">
          <Avatar name={user?.name ?? '?'} />
          <div className="min-w-0">
            <p className="truncate text-[12.5px] font-semibold leading-[15.625px] text-[#0f172b]">
              {user?.name}
            </p>
            <p className="truncate text-[11.5px] leading-[14.375px] text-[#62748e]">
              {isAnswerer ? '담당자' : '질문자'}
            </p>
          </div>
        </div>
      </div>
    </aside>
  );
}
