import { useState } from 'react';
import { ChevronDown, ChevronRight, Loader2 } from 'lucide-react';
import type { Citation, ReviewCardDetail, ReviewCardListItem } from '../../types';
import { Badge, ReasonBadge } from '../ui/Badge';
import { Button } from '../ui/Button';
import { CitationBox } from './CitationBox';
import { allows } from './CardActions';
import { formatTime } from '../../lib/format';
import { cn } from '../../lib/cn';

export type ResolveKind = 'approve' | 'edit' | 'answer-option' | 'keep' | 'reject' | 'defer';

export interface ResolveArgs {
  kind: ResolveKind;
  content?: string;
  index?: number;
}

export function ReviewCard({
  index,
  item,
  detail,
  loading,
  expanded,
  resolved,
  busy,
  onToggle,
  onResolve,
  onOpenCitation,
}: {
  index: number;
  item: ReviewCardListItem;
  detail: ReviewCardDetail | null;
  loading: boolean;
  expanded: boolean;
  resolved: boolean;
  busy: boolean;
  onToggle: () => void;
  onResolve: (args: ResolveArgs) => void;
  onOpenCitation: (c: Citation) => void;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState('');

  const startEdit = () => {
    setDraft(detail?.draft_answer?.content_en ?? '');
    setEditing(true);
  };

  const askReason = (kind: 'reject' | 'keep') => {
    const reason = window.prompt(
      kind === 'reject' ? '반려 사유를 입력하세요 (질문자에게 전달됩니다)' : '원안을 유지하는 사유를 입력하세요'
    );
    if (reason?.trim()) onResolve({ kind, content: reason.trim() });
  };

  return (
    <article
      className={cn(
        'overflow-hidden rounded-xl border bg-surface transition-colors',
        expanded ? 'border-brand-border shadow-[0_1px_3px_rgba(30,32,44,0.06)]' : 'border-line',
        resolved && 'opacity-55'
      )}
    >
      {/* 헤더 */}
      <div className="flex items-center gap-2 border-b border-line px-4 py-2.5">
        <span className="text-[12px] font-bold text-ink-subtle">{index}</span>
        <ReasonBadge reason={item.reason} />
        {item.is_urgent && (
          <Badge tone="danger" dot>
            급함
          </Badge>
        )}
        {item.recommend_approve && (
          <Badge tone="brand">
            승인 추천{item.correct_count ? ` · 맞았다 ${item.correct_count}` : ''}
          </Badge>
        )}
        {item.first_viewed_at === null && !resolved && <Badge tone="info">NEW</Badge>}
        <span className="ml-auto text-[12px] text-ink-muted">{formatTime(item.created_at)}</span>
        {resolved && <Badge tone="ok">✓ 처리됨</Badge>}
      </div>

      {/* 질문 */}
      <button
        type="button"
        onClick={onToggle}
        className="flex w-full items-center gap-3 bg-surface-muted px-4 py-3 text-left hover:bg-surface-subtle"
        aria-expanded={expanded}
      >
        <span className="shrink-0 text-[11px] font-bold text-ink-muted">질문</span>
        <span className="min-w-0 flex-1 truncate text-[14px] font-bold text-ink">
          {item.question_preview_ko}
        </span>
        {expanded ? (
          <ChevronDown className="size-4 shrink-0 text-ink-subtle" />
        ) : (
          <ChevronRight className="size-4 shrink-0 text-ink-subtle" />
        )}
      </button>

      {!expanded ? null : loading ? (
        <p className="flex items-center gap-2 px-4 py-5 text-[13px] text-ink-muted">
          <Loader2 className="size-4 animate-spin" /> 카드를 불러오는 중…
        </p>
      ) : !detail ? (
        <p className="px-4 py-5 text-[13px] text-danger">카드를 불러오지 못했습니다.</p>
      ) : (
        <div className="flex flex-col gap-3 px-4 py-4">
          {/* 🔴 전달용 구조화 질문 — reason="red" 에만 온다 */}
          {detail.question_struct && (
            <div className="rounded-lg border border-danger-border bg-danger-surface/50 p-3">
              <p className="text-[11px] font-bold text-danger">담당자 확인 필요</p>
              <p className="mt-1.5 text-[13px] leading-[20px] text-ink">
                {detail.question_struct.background}
              </p>
              <p className="mt-2 text-[13px] font-bold text-ink">
                {detail.question_struct.question}
              </p>
              {allows(item.reason, 'answer-option') && (
                <div className="mt-2.5 flex flex-col gap-1.5">
                  {detail.question_struct.options.map((opt, i) => (
                    <Button
                      key={opt}
                      size="sm"
                      disabled={busy}
                      onClick={() => onResolve({ kind: 'answer-option', index: i })}
                      className="justify-start text-left"
                    >
                      {opt}
                    </Button>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* AI 답변 */}
          {detail.draft_answer ? (
            <div>
              <p className="mb-1.5 flex items-center gap-2 text-[11px] font-bold text-ink-muted">
                AI 답변
                {editing && <Badge tone="brand">수정 모드</Badge>}
              </p>
              {editing ? (
                <>
                  <textarea
                    value={draft}
                    onChange={(e) => setDraft(e.target.value)}
                    rows={5}
                    className="w-full rounded-lg border border-brand bg-surface p-3 text-[13px] leading-[20px] text-ink focus:outline-none"
                  />
                  <div className="mt-2 flex items-center gap-2">
                    <p className="flex-1 text-[11px] text-ink-muted">
                      변경 사항은 질문자에게 최종 답변으로 전달됩니다
                    </p>
                    <Button
                      size="sm"
                      variant="primary"
                      disabled={busy || !draft.trim()}
                      onClick={() => onResolve({ kind: 'edit', content: draft.trim() })}
                    >
                      저장
                    </Button>
                    <Button size="sm" onClick={() => setEditing(false)}>
                      취소
                    </Button>
                  </div>
                </>
              ) : (
                <p className="text-[13px] leading-[20px] text-ink">
                  {detail.draft_answer.content_en}
                </p>
              )}
            </div>
          ) : (
            <p className="rounded-lg bg-surface-alt px-3 py-2.5 text-[13px] text-ink-muted">
              생성된 원안이 없습니다. 직접 작성해 주세요.
            </p>
          )}

          {detail.draft_answer && (
            <CitationBox citations={detail.draft_answer.citations} onOpen={onOpenCitation} />
          )}

          {/* 미해소 피드백 */}
          {detail.pending_feedbacks.length > 0 && (
            <div className="rounded-lg border border-purple-border bg-purple-surface/50 p-3">
              <p className="text-[11px] font-bold text-purple">
                피드백 {detail.pending_feedbacks.length}건
              </p>
              <ul className="mt-1.5 flex flex-col gap-1.5">
                {detail.pending_feedbacks.map((f) => (
                  <li key={f.id} className="text-[12px] leading-[18px] text-ink">
                    <b>{f.user.name}</b> · {f.verdict === 'different' ? '달랐다' : '맞았다'}
                    {f.note && ` — "${f.note}"`}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* 액션 — §7.1 매트릭스에서 파생 */}
          {!editing && !resolved && (
            <div className="flex flex-wrap gap-2">
              {allows(item.reason, 'approve') && (
                <Button
                  variant="primary"
                  disabled={busy}
                  onClick={() => onResolve({ kind: 'approve' })}
                  className="flex-1"
                >
                  승인 (원안 유지)
                </Button>
              )}
              {allows(item.reason, 'keep') && (
                <Button disabled={busy} onClick={() => askReason('keep')} className="flex-1">
                  원안 유지
                </Button>
              )}
              {allows(item.reason, 'edit') && (
                <Button disabled={busy} onClick={startEdit} className="flex-1">
                  수정 후 저장
                </Button>
              )}
              {allows(item.reason, 'reject') && (
                <Button
                  variant="danger"
                  disabled={busy}
                  onClick={() => askReason('reject')}
                  className="flex-1"
                >
                  반려
                </Button>
              )}
              {allows(item.reason, 'defer') && (
                <Button variant="ghost" disabled={busy} onClick={() => onResolve({ kind: 'defer' })}>
                  나중에
                </Button>
              )}
            </div>
          )}
        </div>
      )}
    </article>
  );
}
