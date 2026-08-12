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

/**
 * 필터 칩 배색 — Figma "브리핑 인박스" 실측(즉답/확인대기는 흰 배경+글자색만,
 * 보류/피드백은 배경까지 톤을 입힌다). 카테고리마다 고정색이고, 선택 시에는
 * 굵기만 bold 로 바뀐다 — "전체" 칩의 선택/비선택 대비에서 유일하게 확인 가능한
 * 차이가 그것뿐이라 다른 칩도 같은 규칙을 따르게 했다.
 */
const CHIP: Record<
  Filter,
  { label: string; chip: string; badge: string }
> = {
  all: { label: '전체', chip: 'border-line bg-surface text-ink-muted', badge: 'bg-surface-subtle text-ink-muted' },
  green: { label: '즉답', chip: 'border-line bg-surface text-ok', badge: 'bg-surface-subtle text-ink-muted' },
  yellow: { label: '확인대기', chip: 'border-line bg-surface text-warn', badge: 'bg-surface-subtle text-ink-muted' },
  red: { label: '보류', chip: 'border-purple-border bg-purple-surface text-purple', badge: 'bg-surface-subtle text-purple' },
  feedback: { label: '피드백', chip: 'border-info-border bg-info-surface text-info', badge: 'bg-surface-subtle text-ink-muted' },
  doc_update: { label: '문서 갱신', chip: 'border-info-border bg-info-surface text-info', badge: 'bg-surface-subtle text-ink-muted' },
  failed: { label: '실패', chip: 'border-danger-border bg-danger-surface text-danger', badge: 'bg-surface-subtle text-ink-muted' },
};
const FILTER_ORDER: Filter[] = ['all', 'green', 'yellow', 'red', 'feedback', 'doc_update', 'failed'];

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

      {/* 필터 칩 — "전체" 선택 시에만 브랜드 단색 채움(유일하게 확인된 선택 상태)이고,
          나머지는 카테고리 고정색을 유지한 채 굵기로만 선택을 표시한다 */}
      <div className="mt-4 flex flex-wrap gap-2">
        {FILTER_ORDER.filter((k) => k === 'all' || countsByReason.get(k)).map((k) => {
          const selected = filter === k;
          const isAll = k === 'all';
          return (
            <button
              key={k}
              onClick={() => setFilter(k)}
              className={cn(
                'inline-flex h-8 items-center gap-1.5 rounded-full border px-3 text-[12px] transition-colors',
                selected ? 'font-bold' : 'font-medium',
                isAll && selected ? 'border-brand-strong bg-brand-strong text-white' : CHIP[k].chip
              )}
            >
              {CHIP[k].label}
              <span
                className={cn(
                  'flex h-4 min-w-[17px] items-center justify-center rounded-full px-[5px] text-[11px] font-bold',
                  isAll && selected ? 'bg-brand text-white' : CHIP[k].badge
                )}
              >
                {countsByReason.get(k) ?? 0}
              </span>
            </button>
          );
        })}
      </div>

      {/* 진행률 */}
      {cards.length > 0 && (
        <div className="mt-4 rounded-xl border border-line bg-surface p-4 shadow-[0_1px_2px_0_rgba(30,32,44,0.04)]">
          <div className="flex items-baseline justify-between">
            <p className="text-[13px] font-bold text-ink">
              {resolvedCount}/{cards.length} 처리됨
            </p>
            <p className="text-[12px] text-ink-muted">남은 {cards.length - resolvedCount}건</p>
          </div>
          <div className="mt-2.5 h-2 overflow-hidden rounded bg-surface-alt">
            <div
              className="h-full rounded bg-brand transition-[width]"
              style={{ width: `${cards.length ? (resolvedCount / cards.length) * 100 : 0}%` }}
            />
          </div>
        </div>
      )}

      {/* 정렬은 서버가 한다 — 클라이언트가 다시 정렬하지 않는다.
          문구는 Figma 원문을 따랐다 — 이전에 §7 계약 문서 기준으로 적었던
          "승인 추천 → 긴급 → 오래된 순"과 표현이 달라 확인이 필요하다. */}
      <p className="mt-4 flex items-center gap-2 rounded-lg bg-brand-surface px-3.5 py-2.5 text-[12px] font-medium text-brand-deep">
        <ArrowUpDown className="size-3 text-brand" />
        보류·급함 → 피드백 → 확인대기 순으로 정렬됨
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
