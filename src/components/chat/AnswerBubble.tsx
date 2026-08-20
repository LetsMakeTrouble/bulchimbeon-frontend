import { useEffect, useState } from 'react';
import type { Citation, QuestionDetail, Role } from '../../types';
import { Badge } from '../ui/Badge';
import { CitationBox } from '../inbox/CitationBox';
import { formatTime } from '../../lib/format';
import { cn } from '../../lib/cn';
import { questionsApi } from '../../infrastructure/http/questions';
import { buildFeedback, canGiveFeedback } from '../../domain/feedback/feedbackPolicy';
import { FeedbackNotAllowedError } from '../../domain/errors';

/**
 * 답변 말풍선. **두 역할이 같이 본다** — 질문자는 자기 답변을, 담당자는 팀원 답변을.
 *
 * 색은 "이 답변을 믿어도 되는가"를 나타낸다:
 *  - draft(참고)  → 노랑. 담당자 확인 전이다.
 *  - verified(확정) → 초록.
 *  - held/failed   → 답변이 없고 서버가 만든 message 를 그대로 렌더한다 (§1.5).
 *
 * `role` 을 받는 이유는 크로스체크 때문이다 — 담당자에게는 **누르는 버튼이 아니라
 * 읽는 정보**다. 판단 자체는 domain/feedback/feedbackPolicy 가 한다.
 */
export function AnswerBubble({
  question,
  role,
  onOpenCitation,
  onFeedback,
}: {
  question: QuestionDetail;
  role: Role;
  onOpenCitation: (c: Citation) => void;
  onFeedback: (questionId: string) => void;
}) {
  const [sending, setSending] = useState(false);
  const [staleNotice, setStaleNotice] = useState(false);
  const answer = question.answer;
  // 부모가 다시 읽어온 새 상태가 도착하면 알림을 내린다 — 계속 떠 있을 이유가 없다.
  useEffect(() => setStaleNotice(false), [answer?.state]);

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
  // 담당자 확인 전인데 초록(즉답) 등급도 아직 draft 다 — Figma 는 "확인대기"만
  // 카드 전체를 노랑으로 채우고, 즉답은 흰 배경에 왼쪽 강조선만 준다.
  const isPending = answer.state === 'draft' && answer.grade === 'yellow';
  // D12 — expired·rejected·under_review 는 409 다. 버튼은 도메인 판단에서 파생시킨다.
  const canFeedback = canGiveFeedback(answer.state, role);
  const alreadyGave = answer.feedback_summary.my_feedback !== null;
  const accent = isVerified ? 'ok' : answer.grade === 'yellow' ? 'warn' : 'ok';

  const submit = async (verdict: 'correct' | 'different') => {
    // "달랐다" 는 사유가 필수다(§6) — buildFeedback 이 빈 사유를 걸러 null 을 준다.
    const note =
      verdict === 'different'
        ? window.prompt('무엇이 달랐는지 알려주세요 (담당자에게 전달됩니다)') ?? undefined
        : undefined;
    const feedback = buildFeedback(verdict, note);
    if (!feedback) return;

    setSending(true);
    try {
      await questionsApi.feedback(answer.id, feedback);
      onFeedback(question.id);
    } catch (err) {
      if (err instanceof FeedbackNotAllowedError) {
        // 화면이 스트림 갱신을 놓쳐 낡은 상태를 보여준 경합이다 — 다시 읽어 맞춘다.
        setStaleNotice(true);
        onFeedback(question.id);
      } else {
        throw err;
      }
    } finally {
      setSending(false);
    }
  };

  return (
    <Row accent={accent}>
      <div className="w-full max-w-[640px]">
        <div className="mb-1 flex items-center gap-2">
          <span
            className={cn(
              'flex h-5 items-center gap-1.5 rounded-full border px-2 text-[11px] font-bold',
              isPending
                ? 'border-warn-border bg-warn-surface text-warn'
                : 'border-ok-border bg-ok-surface text-ok'
            )}
          >
            {isPending && <span className="size-[5px] rounded-full bg-current" />}
            {isVerified ? '✓ 확정됨' : isPending ? '확인대기' : '✓ AI 즉답'}
          </span>
          {answer.source === 'reused' && <Badge tone="brand">재사용 확정 답변</Badge>}
          {answer.matching_rate !== null && (
            <span className="text-[11px] text-ink-muted">일치도 {answer.matching_rate}%</span>
          )}
        </div>

        <div
          className={cn(
            'overflow-hidden rounded-bl-2xl rounded-br-2xl rounded-tl-md rounded-tr-2xl border shadow-[0_1px_3px_0_rgba(0,0,0,0.06)]',
            isPending ? 'border-warn-border bg-warn-surface-subtle' : 'border-line bg-surface'
          )}
        >
          {/* disclaimer 도 서버 생성 문자열이다 — 프론트가 문안을 만들지 않는다 */}
          {answer.disclaimer && (
            <p
              className={cn(
                'border-b px-3.5 py-2 text-[12px] font-bold leading-[18px]',
                isPending
                  ? 'border-warn-border bg-warn-surface text-warn'
                  : 'border-ok-border bg-ok-surface-subtle text-ok'
              )}
            >
              {answer.disclaimer}
            </p>
          )}

          <div
            className={cn(
              !isPending && 'border-l-[3px]',
              !isPending && (accent === 'warn' ? 'border-warn-border' : 'border-ok-border')
            )}
          >
            <p className="whitespace-pre-wrap px-4 py-3.5 text-[14px] leading-[22px] text-ink">
              {answer.content_ko}
            </p>
          </div>

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

        {staleNotice && (
          <p className="mt-2 text-[11px] font-bold text-warn">
            그 사이 답변 상태가 바뀌어 피드백을 받을 수 없습니다. 최신 상태로 갱신했습니다.
          </p>
        )}

        {/* 담당자에게 크로스체크는 누르는 것이 아니라 읽는 정보다 — 승인 판단의 근거가 된다 */}
        {role === 'answerer' &&
          (answer.feedback_summary.correct > 0 || answer.feedback_summary.different > 0) && (
            <p className="mt-2 flex items-center gap-1.5 text-[11px] text-ink-muted">
              질문자 크로스체크
              {answer.feedback_summary.correct > 0 && (
                <Badge tone="ok">맞았다 {answer.feedback_summary.correct}</Badge>
              )}
              {answer.feedback_summary.different > 0 && (
                <Badge tone="purple">달랐다 {answer.feedback_summary.different}</Badge>
              )}
            </p>
          )}

        {/* 크로스체크 — 질문자만, 그리고 expired·rejected·under_review 는 409 다 (D12) */}
        {canFeedback && !staleNotice && (
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

/** AI 아바타는 상태색을 그대로 반복한다 — 확인대기(노랑)와 즉답/확정(초록)을 색으로도 구분한다. */
function Row({
  children,
  accent = 'neutral',
}: {
  children: React.ReactNode;
  accent?: 'ok' | 'warn' | 'neutral';
}) {
  const toneClass = {
    ok: 'bg-ok-surface text-ok',
    warn: 'bg-warn-surface text-warn',
    neutral: 'bg-surface-alt text-ink-muted',
  }[accent];
  return (
    <div className="flex items-start gap-2.5">
      <span
        className={cn(
          'mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-full text-[11px] font-bold',
          toneClass
        )}
      >
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
