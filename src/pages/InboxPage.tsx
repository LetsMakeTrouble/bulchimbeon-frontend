import { useCallback, useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { ArrowUpDown, FileText, Loader2 } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { LessonsPage } from './LessonsPage';
import { MetricsPage } from './MetricsPage';
import { useSseRefresh } from '../context/SseContext';
import { useReviewQueue, type QueueEvent } from '../application/review/useReviewQueue';
import { briefingApi } from '../infrastructure/http/briefing';
import type { BriefingToday, CardReason, Citation } from '../types';
import { ReviewCard } from '../components/inbox/ReviewCard';
import { CitationViewerModal } from '../components/common/CitationViewerModal';
import { Badge, ReasonBadge } from '../components/ui/Badge';
import { cn } from '../lib/cn';
import { formatFullDate, formatRelative, formatTime } from '../lib/format';

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

/**
 * 담당자 허브 탭 — 확인 카드(처리) · 교훈(지식 관리) · 지표(성과 확인).
 * URL 쿼리(?tab=)와 동기화해 새로고침·딥링크에도 탭이 유지된다.
 */
type HubTab = 'cards' | 'lessons' | 'metrics';
const HUB_TABS: { key: HubTab; label: string }[] = [
  { key: 'cards', label: '확인 카드' },
  { key: 'lessons', label: '답변 지침' },
  { key: 'metrics', label: '지표' },
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

  const [searchParams, setSearchParams] = useSearchParams();
  const tabParam = searchParams.get('tab');
  const tab: HubTab = tabParam === 'lessons' || tabParam === 'metrics' ? tabParam : 'cards';
  const switchTab = (next: HubTab) =>
    setSearchParams(next === 'cards' ? {} : { tab: next }, { replace: true });

  /**
   * §7.5 아침 브리핑 — 헤더의 날짜·통계와 보류/문서 재검토 섹션의 데이터 소스.
   * 실패해도 화면이 죽지 않도록 null 폴백(기존 로컬 시각·카드 수 표기)을 유지한다.
   */
  const [briefing, setBriefing] = useState<BriefingToday | null>(null);
  const projectId = activeProject?.id;
  const loadBriefing = useCallback(() => {
    if (!projectId) return;
    briefingApi
      .today(projectId)
      .then(setBriefing)
      .catch(() => setBriefing(null));
  }, [projectId]);
  useEffect(loadBriefing, [loadBriefing]);
  useSseRefresh(['briefing.ready', 'card.resolved'], loadBriefing);

  if (!activeProject) {
    return <p className="p-10 text-[13px] text-ink-muted">프로젝트를 먼저 선택하세요.</p>;
  }
  if (activeProject.role !== 'answerer') {
    return <p className="p-10 text-[13px] text-ink-muted">담당자 전용 화면입니다.</p>;
  }

  const { cards, loading, countsByReason, resolvedCount } = queue;
  const visible = filter === 'all' ? cards : cards.filter((c) => c.reason === filter);
  const notice = noticeOf(queue.lastEvent);

  /* 탭 바 — 처리(카드)와 그 결과물(교훈)·성과(지표)를 한 화면에서 넘겨 본다 */
  const tabBar = (
    <div className="mx-auto w-full max-w-[860px] px-6 pt-6">
      <div className="flex gap-1 border-b border-line" role="tablist">
        {HUB_TABS.map(({ key, label }) => {
          const selected = tab === key;
          return (
            <button
              key={key}
              role="tab"
              aria-selected={selected}
              onClick={() => switchTab(key)}
              className={cn(
                '-mb-px inline-flex h-10 items-center gap-1.5 border-b-2 px-3 text-[13px] transition-colors',
                selected
                  ? 'border-brand-strong font-bold text-brand-deep'
                  : 'border-transparent font-medium text-ink-muted hover:text-ink'
              )}
            >
              {label}
              {key === 'cards' && cards.length - resolvedCount > 0 && (
                <span className="flex h-[17px] min-w-[23px] items-center justify-center rounded-full bg-brand-strong px-[5px] text-[11px] font-bold text-white">
                  {cards.length - resolvedCount}
                </span>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );

  if (tab !== 'cards') {
    return (
      <div>
        {tabBar}
        {tab === 'lessons' ? <LessonsPage /> : <MetricsPage />}
      </div>
    );
  }

  return (
    <div>
      {tabBar}
      <div className="mx-auto w-full max-w-[860px] px-6 pb-8 pt-5">
      <p className="text-[12px] text-ink-muted">
        {briefing
          ? `${formatFullDate(briefing.date)} · ${briefing.timezone} 기준`
          : `${formatFullDate(new Date().toISOString())} · ${formatTime(new Date().toISOString())}`}
      </p>
      <h1 className="mt-1.5 text-2xl font-bold leading-8 text-ink">
        {loading
          ? '브리핑을 불러오는 중…'
          : `밤사이 AI가 ${briefing?.stats_snapshot.questions_24h ?? cards.length}건에 응답했어요`}
      </h1>
      <p className="mt-1.5 text-[13px] text-ink-muted">
        검수 후 확정하면 질문자에게 최종 답변으로 전달됩니다.
        {briefing?.stats_snapshot.auto_answer_rate != null &&
          ` · 자동 답변률 ${Math.round(briefing.stats_snapshot.auto_answer_rate * 100)}%`}
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

      {/* §7.5 보류 카드 — 큐는 pending 만 내려주므로, 미뤄둔 카드가 다시 보이는 곳은 여기뿐이다 */}
      {briefing && briefing.deferred_cards.length > 0 && (
        <section className="mt-8">
          <div className="flex items-center gap-2">
            <h2 className="text-[15px] font-bold text-ink">미뤄둔 카드</h2>
            <Badge tone="neutral">{briefing.deferred_cards.length}</Badge>
            <p className="text-[11px] text-ink-muted">설정한 시각이 되면 위 큐로 돌아옵니다</p>
          </div>
          <ul className="mt-2.5 rounded-xl border border-line bg-surface">
            {briefing.deferred_cards.map((card) => (
              <li
                key={card.id}
                className="flex items-center gap-2.5 border-t border-line px-4 py-3 first:border-t-0"
              >
                <ReasonBadge reason={card.reason} />
                {card.is_urgent && (
                  <Badge tone="danger" dot>
                    급함
                  </Badge>
                )}
                <p className="min-w-0 flex-1 truncate text-[13px] text-ink-muted">
                  {card.question_preview_ko}
                </p>
                <span className="shrink-0 text-[11px] text-ink-muted">
                  {formatRelative(card.created_at)}
                </span>
              </li>
            ))}
          </ul>
        </section>
      )}

      {/* §7.5 문서 갱신 재검토 묶음 — 새 버전 활성화로 기존 답변이 흔들리는 문서들 */}
      {briefing && briefing.doc_review_bundles.length > 0 && (
        <section className="mt-6">
          <div className="flex items-center gap-2">
            <h2 className="text-[15px] font-bold text-ink">문서 갱신으로 재검토 필요</h2>
            <Badge tone="warn">{briefing.doc_review_bundles.length}</Badge>
          </div>
          <div className="mt-2.5 flex flex-col gap-2">
            {briefing.doc_review_bundles.map((bundle) => (
              <div
                key={bundle.document_version_id}
                className="rounded-xl border border-line bg-surface px-4 py-3.5"
              >
                <div className="flex items-center gap-2">
                  <FileText className="size-4 shrink-0 text-ink-muted" />
                  <p className="min-w-0 flex-1 truncate text-[13px] font-bold text-ink">
                    {bundle.title}
                  </p>
                  <Badge tone="info">v{bundle.new_version}</Badge>
                </div>
                <p className="mt-1.5 text-[12px] text-ink-muted">
                  기존 답변 {bundle.affected_count}건이 새 버전과 어긋날 수 있습니다 · 카드{' '}
                  {bundle.cards.length}건
                </p>
              </div>
            ))}
          </div>
        </section>
      )}

      {citation && (
        <CitationViewerModal citation={citation} onClose={() => setCitation(null)} />
      )}
      </div>
    </div>
  );
}
