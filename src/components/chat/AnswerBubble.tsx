import { useState } from 'react';
import type { Citation, QuestionDetail } from '../../types';
import { Badge, StateBadge } from '../ui/Badge';
import { CitationBox } from '../inbox/CitationBox';
import { formatTime } from '../../lib/format';
import { cn } from '../../lib/cn';
import { questionsApi } from '../../infrastructure/http/questions';

/**
 * 질문자 화면의 답변 말풍선.
 *
 * 색은 "이 답변을 믿어도 되는가"를 나타낸다:
 *  - draft(참고)  → 노랑. 담당자 확인 전이다.
 *  - verified(확정) → 초록.
 *  - held/failed   → 답변이 없고 서버가 만든 message 를 그대로 렌더한다 (§1.5).
 */
export function AnswerBubble({
  question,
  onOpenCitation,
  onFeedback,
}: {
  question: QuestionDetail;
  onOpenCitation: (c: Citation) => void;
  onFeedback: (questionId: string) => void;
}) {
  const [sending, setSending] = useState(false);
  const answer = question.answer;

  if (question.status === 'processing') {
    return (
      <Row>
        <div className="inline-flex items-center gap-2 rounded-full border border-line bg-surface px-4 py-2.5 text-[13px] text-ink-muted">
          답변을 검토하고 있어요
          <span className="flex gap-1">
            {[0, 1, 2].map((i) => (
              <span
                key={i}
                className="size-1.5 animate-pulse rounded-full bg-brand-border"
                style={{ animationDelay: `${i * 150}ms` }}
              />
            ))}
          </span>
        </div>
      </Row>
    );
  }

  // 🔴 보류 · 실패 — 서버가 수신자 언어로 만든 문자열을 그대로 렌더한다.
  const info = question.held_info ?? question.failure_info;
  if (!answer && info) {
    return (
      <Row>
        <div className="w-full max-w-[640px] rounded-xl border border-danger-border bg-danger-surface/40 px-4 py-3">
          <p className="text-[13px] font-bold text-danger">담당자에게 전달되었습니다</p>
          <p className="mt-1 text-[13px] leading-[20px] text-ink">{info.message}</p>
        </div>
      </Row>
    );
  }

  if (!answer) return null;

  const isVerified = answer.state === 'verified';
  const canFeedback = answer.state === 'draft' || answer.state === 'verified';
  const alreadyGave = answer.feedback_summary.my_feedback !== null;

  const submit = async (verdict: 'correct' | 'different') => {
    let note: string | undefined;
    if (verdict === 'different') {
      // "달랐다" 는 note 가 필수다 (§6) — 없으면 400 이므로 여기서 막는다.
      const input = window.prompt('무엇이 달랐는지 알려주세요 (담당자에게 전달됩니다)');
      if (!input?.trim()) return;
      note = input.trim();
    }
    setSending(true);
    try {
      await questionsApi.feedback(answer.id, verdict, note);
      onFeedback(question.id);
    } finally {
      setSending(false);
    }
  };

  return (
    <Row>
      <div className="w-full max-w-[640px]">
        <div className="mb-1.5 flex items-center gap-2">
          <StateBadge state={answer.state} />
          {answer.source === 'reused' && <Badge tone="brand">재사용 확정 답변</Badge>}
          {answer.matching_rate !== null && (
            <span className="text-[11px] text-ink-muted">일치도 {answer.matching_rate}%</span>
          )}
        </div>

        <div
          className={cn(
            'overflow-hidden rounded-xl border',
            isVerified ? 'border-ok-border bg-surface' : 'border-warn-border bg-warn-surface/40'
          )}
        >
          {/* disclaimer 도 서버 생성 문자열이다 — 프론트가 문안을 만들지 않는다 */}
          {answer.disclaimer && (
            <p
              className={cn(
                'border-b px-4 py-2.5 text-[12px] font-bold',
                isVerified
                  ? 'border-ok-border bg-ok-surface/50 text-ok'
                  : 'border-warn-border bg-warn-surface text-warn'
              )}
            >
              {answer.disclaimer}
            </p>
          )}

          <p className="whitespace-pre-wrap px-4 py-3.5 text-[14px] leading-[22px] text-ink">
            {answer.content_ko}
          </p>

          {answer.citations.length > 0 && (
            <div className="border-t border-line px-3 py-3">
              <CitationBox citations={answer.citations} onOpen={onOpenCitation} />
            </div>
          )}

          {/* 정확도 실적 — sufficient:false 면 % 대신 message 를 쓴다 (D25) */}
          {answer.accuracy_context && (
            <p className="border-t border-line px-4 py-2 text-[11px] text-ink-muted">
              {answer.accuracy_context.sufficient
                ? `이 등급의 최근 ${answer.accuracy_context.window_days}일 확정률 ${Math.round(
                    (answer.accuracy_context.verified_rate ?? 0) * 100
                  )}% (${answer.accuracy_context.sample}건)`
                : answer.accuracy_context.message}
            </p>
          )}
        </div>

        {/* 크로스체크 — expired·rejected·under_review 는 409 이므로 버튼을 감춘다 (D12) */}
        {canFeedback && (
          <div className="mt-2 flex items-center gap-2">
            {alreadyGave ? (
              <span className="text-[11px] text-ink-muted">
                {answer.feedback_summary.my_feedback === 'correct'
                  ? '맞았다고 알려주셨어요'
                  : '달랐다고 알려주셨어요 — 재검토 중입니다'}
              </span>
            ) : (
              <>
                <span className="text-[11px] text-ink-muted">이 답변이 실제로 맞았나요?</span>
                <button
                  disabled={sending}
                  onClick={() => submit('correct')}
                  className="rounded-md border border-line-strong px-2.5 py-1 text-[11px] font-bold text-ink hover:bg-surface-muted"
                >
                  맞았어요
                </button>
                <button
                  disabled={sending}
                  onClick={() => submit('different')}
                  className="rounded-md border border-danger-border px-2.5 py-1 text-[11px] font-bold text-danger hover:bg-danger-surface"
                >
                  달랐어요
                </button>
              </>
            )}
          </div>
        )}
      </div>
    </Row>
  );
}

function Row({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex items-start gap-2.5">
      <span className="mt-0.5 flex size-7 shrink-0 items-center justify-center rounded-full bg-surface-alt text-[10px] font-bold text-ink-muted">
        AI
      </span>
      {children}
    </div>
  );
}

export function QuestionBubble({ text, createdAt }: { text: string; createdAt: string }) {
  return (
    <div className="flex justify-end">
      <div className="max-w-[560px] rounded-xl rounded-br-sm bg-brand-strong px-4 py-3">
        <p className="whitespace-pre-wrap text-[14px] leading-[22px] text-white">{text}</p>
        <p className="mt-1 text-right text-[11px] text-white/70">{formatTime(createdAt)}</p>
      </div>
    </div>
  );
}
