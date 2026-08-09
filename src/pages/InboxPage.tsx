import { useCallback, useEffect, useMemo, useState } from 'react';
import { ArrowUpDown, Loader2 } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { reviewCardsApi } from '../api/reviewCards';
import { useSseRefresh } from '../context/SseContext';
import type { CardReason, Citation, ReviewCardDetail, ReviewCardListItem } from '../types';
import { ReviewCard, type ResolveArgs } from '../components/inbox/ReviewCard';
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

export function InboxPage() {
  const { activeProject, refreshMe } = useAuth();
  const projectId = activeProject?.id;

  const [cards, setCards] = useState<ReviewCardListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<Filter>('all');

  const [openId, setOpenId] = useState<string | null>(null);
  const [details, setDetails] = useState<Record<string, ReviewCardDetail>>({});
  const [detailLoading, setDetailLoading] = useState(false);
  const [resolvedIds, setResolvedIds] = useState<Set<string>>(new Set());
  const [busyId, setBusyId] = useState<string | null>(null);
  const [citation, setCitation] = useState<Citation | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const load = useCallback(() => {
    if (!projectId) return;
    setLoading(true);
    reviewCardsApi
      .list(projectId, 'pending')
      .then((page) => setCards(page.items))
      .finally(() => setLoading(false));
  }, [projectId]);

  useEffect(load, [load]);

  // card.resolved 는 다른 기기에서 내가 처리한 경우다 — 큐를 다시 읽어 맞춘다.
  useSseRefresh(['card.created', 'card.resolved', 'briefing.ready'], load);

  /**
   * ⚠️ 상세는 담당자가 카드를 실제로 연 순간에만, 정확히 1회 부른다.
   * 프리페치하면 first_viewed_at 이 조기에 찍혀 card_handle_30s_rate 지표가 망가진다 (§7).
   */
  const toggle = useCallback(
    (id: string) => {
      if (openId === id) {
        setOpenId(null);
        return;
      }
      setOpenId(id);
      if (details[id]) return;
      setDetailLoading(true);
      reviewCardsApi
        .detail(id)
        .then((d) => setDetails((prev) => ({ ...prev, [id]: d })))
        .finally(() => setDetailLoading(false));
    },
    [openId, details]
  );

  const resolve = useCallback(
    async (card: ReviewCardListItem, args: ResolveArgs) => {
      setBusyId(card.id);
      try {
        switch (args.kind) {
          case 'approve':
            await reviewCardsApi.approve(card.id);
            break;
          case 'edit':
            await reviewCardsApi.edit(card.id, args.content!);
            break;
          case 'answer-option':
            await reviewCardsApi.answerOption(card.id, args.index!);
            break;
          case 'keep':
            await reviewCardsApi.keep(card.id, args.content!);
            break;
          case 'reject':
            await reviewCardsApi.reject(card.id, args.content!);
            break;
          case 'defer': {
            // until 은 서버가 다음 briefing_hour 로 정한다 — 프론트가 계산하지 않는다 (D15)
            const res = await reviewCardsApi.defer(card.id);
            setNotice(
              res.deferred_until
                ? `${formatTime(res.deferred_until)} 이후로 미뤘습니다.`
                : '나중에 처리하도록 미뤘습니다.'
            );
            break;
          }
        }
        setResolvedIds((prev) => new Set(prev).add(card.id));
        setOpenId(null);
        refreshMe(); // 사이드바 pending_cards 뱃지 동기화
      } catch (err) {
        // 409 ALREADY_RESOLVED 는 "다른 기기/다른 사람이 이미 처리함" 이므로 (§1.4)
        // 실패가 아니라 처리됨으로 반영한다.
        const e = err as { response?: { status?: number; data?: { error?: { code?: string } } } };
        if (e.response?.data?.error?.code === 'ALREADY_RESOLVED') {
          setResolvedIds((prev) => new Set(prev).add(card.id));
          setNotice('이미 처리된 카드입니다.');
        } else {
          setNotice('처리에 실패했습니다. 잠시 후 다시 시도해 주세요.');
        }
      } finally {
        setBusyId(null);
      }
    },
    [refreshMe]
  );

  const counts = useMemo(() => {
    const map = new Map<Filter, number>([['all', cards.length]]);
    for (const c of cards) map.set(c.reason, (map.get(c.reason) ?? 0) + 1);
    return map;
  }, [cards]);

  const visible = filter === 'all' ? cards : cards.filter((c) => c.reason === filter);
  const done = resolvedIds.size;

  if (!activeProject) {
    return <p className="p-10 text-[13px] text-ink-muted">프로젝트를 먼저 선택하세요.</p>;
  }
  if (activeProject.role !== 'answerer') {
    return <p className="p-10 text-[13px] text-ink-muted">담당자 전용 화면입니다.</p>;
  }

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
        {FILTERS.filter((f) => f.key === 'all' || counts.get(f.key)).map((f) => (
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
            <span className="text-ink-subtle">{counts.get(f.key) ?? 0}</span>
          </button>
        ))}
      </div>

      {/* 진행률 */}
      {cards.length > 0 && (
        <div className="mt-4 rounded-xl border border-line bg-surface px-4 py-3.5">
          <div className="flex items-baseline justify-between">
            <p className="text-[14px] font-bold text-ink">
              {done}/{cards.length} 처리됨
            </p>
            <p className="text-[12px] text-ink-muted">남은 {cards.length - done}건</p>
          </div>
          <div className="mt-2.5 h-1.5 overflow-hidden rounded-full bg-surface-alt">
            <div
              className="h-full rounded-full bg-brand-strong transition-[width]"
              style={{ width: `${cards.length ? (done / cards.length) * 100 : 0}%` }}
            />
          </div>
        </div>
      )}

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
            detail={details[card.id] ?? null}
            loading={openId === card.id && detailLoading}
            expanded={openId === card.id}
            resolved={resolvedIds.has(card.id)}
            busy={busyId === card.id}
            onToggle={() => toggle(card.id)}
            onResolve={(args) => resolve(card, args)}
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
