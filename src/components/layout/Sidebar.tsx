import { Link, NavLink } from 'react-router-dom';
import {
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

const item = 'flex h-[34px] w-full items-center gap-2.5 rounded-lg px-3 text-[13px] transition-colors';
const idle = 'font-medium text-ink hover:bg-surface-subtle';
const active = 'bg-brand-surface font-bold text-brand-deep';

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
    <NavLink to={to} className={({ isActive }) => cn(item, isActive ? active : idle)}>
      {({ isActive }) => (
        <>
          <Icon className={cn('size-4 shrink-0', isActive ? 'text-brand' : 'text-ink-muted')} />
          <span className="min-w-0 flex-1 truncate">{label}</span>
          {badge ? (
            <span className="flex h-[17px] min-w-[23px] items-center justify-center rounded-full bg-brand-strong px-[5px] text-[11px] font-bold text-white">
              {badge}
            </span>
          ) : null}
        </>
      )}
    </NavLink>
  );
}

export function Sidebar() {
  const { user, projects, activeProject, setActiveProject, logout } = useAuth();
  const isAnswerer = activeProject?.role === 'answerer';

  return (
    <aside className="flex w-60 shrink-0 flex-col border-r border-line bg-surface">
      {/* 프로젝트 스위처 — <details> 로 팝오버를 만든다. 바깥 클릭 닫힘이 공짜다. */}
      <details className="group relative shrink-0 border-b border-line">
        <summary className="flex h-[68px] cursor-pointer list-none items-center gap-2.5 pl-5 pr-4 hover:bg-surface-muted">
          <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-brand text-[12px] font-bold text-white">
            {activeProject?.name.slice(0, 2) ?? '—'}
          </span>
          <div className="min-w-0 flex-1">
            <p className="truncate text-[13px] font-bold text-ink">
              {activeProject?.name ?? '프로젝트 없음'}
            </p>
            <p className="truncate text-[11px] text-ink-muted">
              {activeProject ? (isAnswerer ? '담당자' : '질문자') : '초대 코드로 참여하세요'}
            </p>
          </div>
          <ChevronsUpDown className="size-4 shrink-0 text-ink-subtle" />
        </summary>

        <div className="absolute left-3 right-3 top-[64px] z-20 rounded-lg border border-line bg-surface p-1.5 shadow-lg">
          {projects.map((p) => (
            <button
              key={p.id}
              onClick={() => setActiveProject(p)}
              className={cn(
                'flex w-full items-center gap-2 rounded-md px-2.5 py-2 text-left text-[13px] hover:bg-surface-muted',
                p.id === activeProject?.id ? 'font-bold text-brand-deep' : 'text-ink'
              )}
            >
              <span className="min-w-0 flex-1 truncate">{p.name}</span>
              {p.pending_cards > 0 && (
                <span className="text-[11px] font-bold text-ink-muted">{p.pending_cards}</span>
              )}
            </button>
          ))}
          <hr className="my-1.5 border-line" />
          <Link
            to="/"
            className="block rounded-md px-2.5 py-2 text-[13px] font-bold text-brand-deep hover:bg-surface-muted"
          >
            + 새 프로젝트 · 초대 코드로 참여
          </Link>
          <button
            onClick={logout}
            className="block w-full rounded-md px-2.5 py-2 text-left text-[13px] text-ink-muted hover:bg-surface-muted"
          >
            로그아웃
          </button>
        </div>
      </details>

      <nav className="flex flex-1 flex-col gap-0.5 overflow-y-auto px-3 py-2">
        <NavItem to="/chat" icon={MessageSquare} label="대화" />
        <NavItem to="/questions" icon={List} label="질문 목록" />
        <NavItem to="/documents" icon={FileText} label="문서" />

        {isAnswerer && (
          <>
            <p className="px-2 pb-1.5 pt-4 text-[10px] font-bold text-ink-muted">담당자 전용</p>
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

      <div className="flex h-[60px] shrink-0 items-center gap-2.5 border-t border-line pl-5 pr-4">
        <Avatar name={user?.name ?? '?'} />
        <div className="min-w-0">
          <p className="truncate text-[13px] font-bold text-ink">{user?.name}</p>
          <p className="truncate text-[11px] text-ink-muted">
            {isAnswerer ? '담당자' : '질문자'}
          </p>
        </div>
      </div>
    </aside>
  );
}
