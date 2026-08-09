import { useState } from 'react';
import { ArrowUpDown, Loader2 } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useReviewQueue, type QueueEvent } from '../application/review/useReviewQueue';
import type { CardReason, Citation } from '../types';
import { ReviewCard } from '../components/inbox/ReviewCard';
import { CitationViewerModal } from '../components/common/CitationViewerModal';
import { cn } from '../lib/cn';
import { formatFullDate, formatTime } from '../lib/format';

type Filter = 'all' | CardReason;

const FILTERS: { key: Filter; label: string }[] = [
  { key: 'all', label: '전체' },
  { key: 'green', label: '즉답' },
  { key: 'yellow', label: '확인대기' },
  { key: 'red', label: '보류' },
  { key: 'feedback', label: '피드백' },
  { key: 'doc_update', label: '문서 갱신' },
  { key: 'failed', label: '실패' },
];

/** 유즈케이스 결과 → 사용자 문구. 문구는 표현 계층에서만 정한다. */
const noticeOf = (e: QueueEvent | null): string | null => {
  if (!e) return null;
  switch (e.kind) {
    case 'deferred':
      return e.until ? `${formatTime(e.until)} 이후로 미뤘습니다.` : '나중에 처리하도록 미뤘습니다.';
    case 'already-resolved':
      return '이미 처리된 카드입니다.';
    case 'resolve-failed':
      return '처리에 실패했습니다. 잠시 후 다시 시도해 주세요.';
  }
};

export function InboxPage() {
  const { activeProject } = useAuth();
  const queue = useReviewQueue(activeProject?.id);

  const [filter, setFilter] = useState<Filter>('all');
  const [citation, setCitation] = useState<Citation | null>(null);

  if (!activeProject) {
    return <p className="p-10 text-[13px] text-ink-muted">프로젝트를 먼저 선택하세요.</p>;
  }
  if (activeProject.role !== 'answerer') {
    return <p className="p-10 text-[13px] text-ink-muted">담당자 전용 화면입니다.</p>;
  }

  const { cards, loading, countsByReason, resolvedCount } = queue;
  const visible = filter === 'all' ? cards : cards.filter((c) => c.reason === filter);
  const notice = noticeOf(queue.lastEvent);

  return (
    <div className="mx-auto w-full max-w-[860px] px-6 py-8">
      <p className="text-[12px] text-ink-muted">
        {formatFullDate(new Date().toISOString())} · {formatTime(new Date().toISOString())}
      </p>
      <h1 className="mt-1.5 text-2xl font-bold leading-8 text-ink">
        {loading ? '브리핑을 불러오는 중…' : `밤사이 AI가 ${cards.length}건에 응답했어요`}
      </h1>
      <p className="mt-1.5 text-[13px] text-ink-muted">
        검수 후 확정하면 질문자에게 최종 답변으로 전달됩니다.
      </p>

      {/* 필터 칩 */}
      <div className="mt-4 flex flex-wrap gap-2">
        {FILTERS.filter((f) => f.key === 'all' || countsByReason.get(f.key)).map((f) => (
          <button
            key={f.key}
            onClick={() => setFilter(f.key)}
            className={cn(
              'inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-[12px] font-bold transition-colors',
              filter === f.key
                ? 'border-brand-border bg-brand-surface text-brand-deep'
                : 'border-line bg-surface text-ink-muted hover:bg-surface-muted'
            )}
          >
            {f.label}
            <span className="text-ink-subtle">{countsByReason.get(f.key) ?? 0}</span>
          </button>
        ))}
      </div>

      {/* 진행률 */}
      {cards.length > 0 && (
        <div className="mt-4 rounded-xl border border-line bg-surface px-4 py-3.5">
          <div className="flex items-baseline justify-between">
            <p className="text-[14px] font-bold text-ink">
              {resolvedCount}/{cards.length} 처리됨
            </p>
            <p className="text-[12px] text-ink-muted">남은 {cards.length - resolvedCount}건</p>
          </div>
          <div className="mt-2.5 h-1.5 overflow-hidden rounded-full bg-surface-alt">
            <div
              className="h-full rounded-full bg-brand-strong transition-[width]"
              style={{ width: `${cards.length ? (resolvedCount / cards.length) * 100 : 0}%` }}
            />
          </div>
        </div>
      )}

      {/* 정렬은 서버가 한다 — 클라이언트가 다시 정렬하지 않는다 */}
      <p className="mt-4 flex items-center gap-2 rounded-lg bg-surface-alt px-3 py-2 text-[12px] text-ink-muted">
        <ArrowUpDown className="size-3.5" />
        승인 추천 → 긴급 → 오래된 순으로 정렬됨
      </p>

      {notice && (
        <p className="mt-3 rounded-lg border border-info-border bg-info-surface px-3 py-2 text-[12px] font-bold text-info">
          {notice}
        </p>
      )}

      <div className="mt-4 flex flex-col gap-3">
        {loading && (
          <p className="flex items-center gap-2 py-10 text-[13px] text-ink-muted">
            <Loader2 className="size-4 animate-spin" /> 불러오는 중…
          </p>
        )}
        {!loading && visible.length === 0 && (
          <p className="rounded-xl border border-line bg-surface px-4 py-12 text-center text-[13px] text-ink-muted">
            처리할 카드가 없습니다.
          </p>
        )}
        {visible.map((card, i) => (
          <ReviewCard
            key={card.id}
            index={i + 1}
            item={card}
            detail={queue.detailOf(card.id)}
            loading={queue.openId === card.id && queue.detailLoading}
            expanded={queue.openId === card.id}
            resolved={queue.isResolved(card.id)}
            busy={queue.busyId === card.id}
            onToggle={() => queue.toggle(card.id)}
            onResolve={(resolution) => queue.resolve(card, resolution)}
            onOpenCitation={setCitation}
          />
        ))}
      </div>

      {citation && (
        <CitationViewerModal citation={citation} onClose={() => setCitation(null)} />
      )}
    </div>
  );
}
