import { useState } from 'react';
import { CheckCircle2, Loader2 } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useBriefing } from '../application/briefing/useBriefing';
import type { Citation, DocReviewBundle, ReviewCardListItem } from '../types';
import { ReviewCard } from '../components/inbox/ReviewCard';
import { CitationViewerModal } from '../components/common/CitationViewerModal';
import { Button } from '../components/ui/Button';
import { formatFullDate, formatTime } from '../lib/format';

const noticeOf = (e: ReturnType<typeof useBriefing>['lastEvent']): string | null => {
  if (!e) return null;
  switch (e.kind) {
    case 'deferred':
      return e.until ? `${formatTime(e.until)} 이후로 미뤘습니다.` : '나중에 처리하도록 미뤘습니다.';
    case 'already-resolved':
      return '이미 처리된 카드입니다.';
    case 'resolve-failed':
      return '처리에 실패했습니다. 잠시 후 다시 시도해 주세요.';
    case 'bulk-keep-failed':
      return '일괄 유지에 실패했습니다. 잠시 후 다시 시도해 주세요.';
  }
};

export function BriefingPage() {
  const { activeProject } = useAuth();
  const briefing = useBriefing(activeProject?.id);
  const [citation, setCitation] = useState<Citation | null>(null);

  if (!activeProject) {
    return <p className="p-10 text-[13px] text-ink-muted">프로젝트를 먼저 선택하세요.</p>;
  }
  if (activeProject.role !== 'answerer') {
    return <p className="p-10 text-[13px] text-ink-muted">담당자 전용 화면입니다.</p>;
  }

  const { data, loading } = briefing;
  const notice = noticeOf(briefing.lastEvent);

  const section = (title: string, cards: ReviewCardListItem[]) =>
    cards.length === 0 ? null : (
      <section className="mt-6">
        <h2 className="text-[13px] font-bold text-ink">
          {title} <span className="text-ink-muted">({cards.length})</span>
        </h2>
        <div className="mt-2.5 flex flex-col gap-3">
          {cards.map((card, i) => (
            <ReviewCard
              key={card.id}
              index={i + 1}
              item={card}
              detail={briefing.detailOf(card.id)}
              loading={briefing.openId === card.id && briefing.detailLoading}
              expanded={briefing.openId === card.id}
              resolved={briefing.isResolved(card.id)}
              busy={briefing.busyId === card.id}
              onToggle={() => briefing.toggle(card.id)}
              onResolve={(resolution) => briefing.resolve(card, resolution)}
              onOpenCitation={setCitation}
            />
          ))}
        </div>
      </section>
    );

  const bundle = (b: DocReviewBundle) => (
    <div key={b.document_version_id} className="mt-4 rounded-xl border border-info-border bg-info-surface/40 p-4">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-[13px] font-bold text-ink">
            {b.title} <span className="text-ink-muted">v{b.new_version}</span>
          </p>
          <p className="mt-0.5 text-[12px] text-ink-muted">영향받은 답변 {b.affected_count}건</p>
        </div>
        <Button
          size="sm"
          disabled={briefing.bulkKeepBusyId === b.document_version_id}
          onClick={() => briefing.bulkKeep(b.document_version_id)}
        >
          {briefing.bulkKeepBusyId === b.document_version_id && (
            <Loader2 className="size-3.5 animate-spin" />
          )}
          전체 유지
        </Button>
      </div>
      <div className="mt-3 flex flex-col gap-3">
        {b.cards.map((card, i) => (
          <ReviewCard
            key={card.id}
            index={i + 1}
            item={card}
            detail={briefing.detailOf(card.id)}
            loading={briefing.openId === card.id && briefing.detailLoading}
            expanded={briefing.openId === card.id}
            resolved={briefing.isResolved(card.id)}
            busy={briefing.busyId === card.id}
            onToggle={() => briefing.toggle(card.id)}
            onResolve={(resolution) => briefing.resolve(card, resolution)}
            onOpenCitation={setCitation}
          />
        ))}
      </div>
    </div>
  );

  return (
    <div className="mx-auto w-full max-w-[860px] px-6 py-8">
      <p className="text-[12px] text-ink-muted">
        {data ? formatFullDate(new Date(data.date).toISOString()) : formatFullDate(new Date().toISOString())}
      </p>
      <h1 className="mt-1.5 text-2xl font-bold leading-8 text-ink">오늘의 브리핑</h1>

      {data && (
        <div className="mt-3 flex gap-4 rounded-xl border border-line bg-surface px-4 py-3.5 shadow-[0_1px_2px_0_rgba(30,32,44,0.04)]">
          <div>
            <p className="text-[11px] text-ink-muted">자동 응답률</p>
            <p className="mt-0.5 text-[16px] font-bold text-ink">
              {data.stats_snapshot.auto_answer_rate === null
                ? '측정 전'
                : `${Math.round(data.stats_snapshot.auto_answer_rate * 100)}%`}
            </p>
          </div>
          <div className="border-l border-line pl-4">
            <p className="text-[11px] text-ink-muted">24시간 질문</p>
            <p className="mt-0.5 text-[16px] font-bold text-ink">{data.stats_snapshot.questions_24h}건</p>
          </div>
        </div>
      )}

      {notice && (
        <p className="mt-3 rounded-lg border border-info-border bg-info-surface px-3 py-2 text-[12px] font-bold text-info">
          {notice}
        </p>
      )}

      {loading && (
        <p className="mt-6 flex items-center gap-2 py-10 text-[13px] text-ink-muted">
          <Loader2 className="size-4 animate-spin" /> 브리핑을 불러오는 중…
        </p>
      )}

      {!loading && data && (
        <>
          {section('승인 추천', data.recommend_approve)}
          {section('확인 대기', data.pending_cards)}
          {section('미룸', data.deferred_cards)}

          {data.doc_review_bundles.length > 0 && (
            <section className="mt-6">
              <h2 className="text-[13px] font-bold text-ink">
                문서 갱신 <span className="text-ink-muted">({data.doc_review_bundles.length})</span>
              </h2>
              {data.doc_review_bundles.map(bundle)}
            </section>
          )}

          {data.recommend_approve.length === 0 &&
            data.pending_cards.length === 0 &&
            data.deferred_cards.length === 0 &&
            data.doc_review_bundles.length === 0 && (
              <div className="mt-8 flex flex-col items-center rounded-xl border border-line bg-surface px-4 py-14 text-center">
                <CheckCircle2 className="size-8 text-ok" />
                <p className="mt-3 text-[13px] font-bold text-ink">오늘 처리할 카드가 없습니다</p>
              </div>
            )}
        </>
      )}

      {citation && <CitationViewerModal citation={citation} onClose={() => setCitation(null)} />}
    </div>
  );
}
