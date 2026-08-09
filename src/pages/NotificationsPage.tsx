import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Loader2 } from 'lucide-react';
import { notificationsApi } from '../api/notifications';
import { useAuth } from '../context/AuthContext';
import { useSseRefresh } from '../context/SseContext';
import type { NotificationItem, NotificationType } from '../types';
import { Badge, type Tone } from '../components/ui/Badge';
import { Button } from '../components/ui/Button';
import { formatRelative } from '../lib/format';
import { cn } from '../lib/cn';

/** 알림 종류별 톤. title·body 는 서버가 수신자 언어로 만든다 — 프론트가 문안을 만들지 않는다 (§1.5). */
const tones: Partial<Record<NotificationType, Tone>> = {
  'answer.completed': 'ok',
  'answer.verified': 'ok',
  'answer.corrected': 'info',
  'answer.kept': 'info',
  'answer.rejected': 'danger',
  'answer.failed': 'danger',
  'card.created': 'brand',
  'briefing.ready': 'brand',
  'doc.review_needed': 'warn',
  'feedback.different': 'purple',
  'sync.completed': 'neutral',
  'sync.failed': 'danger',
};

/** 알림에서 바로 갈 곳 — payload 의 id 로 목적지를 정한다 */
const destination = (n: NotificationItem) => {
  if (n.payload.card_id) return '/inbox';
  if (n.payload.question_id) return '/questions';
  return '/chat';
};

export function NotificationsPage() {
  const { setUnreadTotal } = useAuth();
  const [items, setItems] = useState<NotificationItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [unreadOnly, setUnreadOnly] = useState(false);

  const load = useCallback(() => {
    setLoading(true);
    notificationsApi
      .list(unreadOnly, 50)
      .then((page) => setItems(page.items))
      .finally(() => setLoading(false));
  }, [unreadOnly]);

  useEffect(load, [load]);
  useSseRefresh(['notification.created'], load);

  const markAll = async () => {
    const unread = items.filter((i) => i.read_at === null).map((i) => i.id);
    if (unread.length === 0) return;
    await notificationsApi.markRead(unread);
    setItems((prev) =>
      prev.map((i) => (i.read_at ? i : { ...i, read_at: new Date().toISOString() }))
    );
    setUnreadTotal(0);
  };

  const markOne = async (n: NotificationItem) => {
    if (n.read_at) return;
    await notificationsApi.markRead([n.id]);
    setItems((prev) =>
      prev.map((i) => (i.id === n.id ? { ...i, read_at: new Date().toISOString() } : i))
    );
    setUnreadTotal(Math.max(0, items.filter((i) => i.read_at === null).length - 1));
  };

  const unreadCount = items.filter((i) => i.read_at === null).length;

  return (
    <div className="mx-auto w-full max-w-[720px] px-6 py-8">
      <div className="flex items-center gap-3">
        <h1 className="text-2xl font-bold leading-8 text-ink">알림</h1>
        {unreadCount > 0 && <Badge tone="danger">{unreadCount}</Badge>}
        <Button className="ml-auto" size="sm" onClick={() => setUnreadOnly((v) => !v)}>
          {unreadOnly ? '전체 보기' : '안 읽은 것만'}
        </Button>
        <Button size="sm" onClick={markAll} disabled={unreadCount === 0}>
          모두 읽음
        </Button>
      </div>

      {loading && (
        <p className="mt-6 flex items-center gap-2 text-[13px] text-ink-muted">
          <Loader2 className="size-4 animate-spin" /> 불러오는 중…
        </p>
      )}

      {!loading && items.length === 0 && (
        <p className="mt-10 text-center text-[13px] text-ink-muted">알림이 없습니다.</p>
      )}

      <ul className="mt-4 flex flex-col gap-2">
        {items.map((n) => (
          <li key={n.id}>
            <Link
              to={destination(n)}
              onClick={() => markOne(n)}
              className={cn(
                'block rounded-xl border px-4 py-3.5 transition-colors hover:bg-surface-muted',
                n.read_at ? 'border-line bg-surface' : 'border-brand-border bg-brand-surface/30'
              )}
            >
              <div className="flex items-center gap-2">
                <Badge tone={tones[n.type] ?? 'neutral'}>{n.type}</Badge>
                {!n.read_at && <span className="size-1.5 rounded-full bg-brand-strong" />}
                <span className="ml-auto text-[11px] text-ink-muted">
                  {formatRelative(n.created_at)}
                </span>
              </div>
              <p className="mt-2 text-[14px] font-bold text-ink">{n.title}</p>
              <p className="mt-1 text-[13px] leading-[20px] text-ink-muted">{n.body}</p>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
