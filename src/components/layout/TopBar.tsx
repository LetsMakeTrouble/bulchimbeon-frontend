import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Bell, Search } from 'lucide-react';
// 아이콘·검색창 치수는 Figma "_TopBar" (node 128:192) 스펙: 검색 220×32 · 아이콘 12px ·
// 벨 24px · 배지 14×14 bg status/danger-text · role pill h-23 px-10 text-11.
import { useAuth } from '../../context/AuthContext';
import { notificationsApi } from '../../infrastructure/http/notifications';

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
      <label className="relative flex h-8 w-[220px] items-center rounded-lg bg-surface-subtle px-3">
        <Search className="pointer-events-none size-3 shrink-0 text-ink-muted" />
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="검색"
          className="ml-2 h-full w-full bg-transparent text-[12px] text-ink placeholder:text-ink-muted focus:outline-none"
        />
      </label>

      <div className="ml-auto flex items-center gap-4">
        <Link to="/notifications" className="relative text-ink-muted hover:text-ink" aria-label="알림">
          <Bell className="size-6" />
          {unreadTotal > 0 && (
            <span className="absolute -right-1 -top-1 flex size-3.5 items-center justify-center rounded-full bg-danger text-[9px] font-bold text-white">
              {unreadTotal > 99 ? '99+' : unreadTotal}
            </span>
          )}
        </Link>
        <span className="flex h-[23px] items-center rounded-full border border-line-strong px-2.5 text-[11px] font-bold text-ink">
          {activeProject?.role === 'answerer' ? '담당자' : '질문자'}
        </span>
      </div>
    </header>
  );
}
