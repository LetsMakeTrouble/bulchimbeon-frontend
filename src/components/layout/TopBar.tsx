import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Bell, Search } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { notificationsApi } from '../../api/notifications';

export function TopBar() {
  const { activeProject, unreadTotal, setUnreadTotal } = useAuth();
  const [query, setQuery] = useState('');

  // SSE 가 스트림 시작 시 unread_count 를 1회 push 하지만(§12.2), 그 전까지
  // 뱃지가 비어 있으면 안 되므로 마운트 시 1회 동기화한다.
  useEffect(() => {
    notificationsApi.unreadCount().then(setUnreadTotal).catch(() => {});
  }, [setUnreadTotal]);

  return (
    <header className="flex h-[68px] shrink-0 items-center gap-4 border-b border-line bg-surface px-6">
      <label className="relative flex h-9 w-[230px] items-center">
        <Search className="pointer-events-none absolute left-3 size-4 text-ink-subtle" />
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="검색"
          className="h-full w-full rounded-lg border border-line bg-surface-muted pl-9 pr-3 text-[13px] text-ink placeholder:text-ink-subtle focus:border-brand focus:bg-surface focus:outline-none"
        />
      </label>

      <div className="ml-auto flex items-center gap-4">
        <Link to="/notifications" className="relative text-ink-muted hover:text-ink" aria-label="알림">
          <Bell className="size-5" />
          {unreadTotal > 0 && (
            <span className="absolute -right-1.5 -top-1.5 flex h-[16px] min-w-[16px] items-center justify-center rounded-full bg-danger-border px-1 text-[9px] font-bold text-white">
              {unreadTotal > 99 ? '99+' : unreadTotal}
            </span>
          )}
        </Link>
        <span className="rounded-full border border-line-strong px-3 py-1.5 text-[12px] font-bold text-ink">
          {activeProject?.role === 'answerer' ? '담당자' : '질문자'}
        </span>
      </div>
    </header>
  );
}
