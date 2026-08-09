import type { ReactNode } from 'react';
import { cn } from '../../lib/cn';
import type { AnswerState, CardReason, Grade, QuestionStatus } from '../../types';

export type Tone = 'neutral' | 'brand' | 'ok' | 'warn' | 'danger' | 'info' | 'purple';

const toneClass: Record<Tone, string> = {
  neutral: 'bg-surface-alt text-ink-muted border-transparent',
  brand: 'bg-brand-surface text-brand-deep border-brand-border',
  ok: 'bg-ok-surface text-ok border-ok-border',
  warn: 'bg-warn-surface text-warn border-warn-border',
  danger: 'bg-danger-surface text-danger border-danger-border',
  info: 'bg-info-surface text-info border-info-border',
  purple: 'bg-purple-surface text-purple border-purple-border',
};

export function Badge({
  tone = 'neutral',
  dot = false,
  className,
  children,
}: {
  tone?: Tone;
  /** 주의 환기용 앞 점 — 확인대기·급함처럼 "아직 안 끝난 것"에만 쓴다 */
  dot?: boolean;
  className?: string;
  children: ReactNode;
}) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 rounded-full border px-2 py-[3px] text-[11px] font-bold leading-none whitespace-nowrap',
        toneClass[tone],
        className
      )}
    >
      {dot && <span className="size-[5px] rounded-full bg-current" />}
      {children}
    </span>
  );
}

/** §1.3 grade — 🟢 즉답 / 🟡 확인 대기 / 🔴 보류 */
const gradeMeta: Record<Grade, { label: string; tone: Tone; dot: boolean }> = {
  green: { label: '즉답', tone: 'ok', dot: false },
  yellow: { label: '확인대기', tone: 'warn', dot: true },
  red: { label: '보류', tone: 'danger', dot: false },
};

export function GradeBadge({ grade, className }: { grade: Grade; className?: string }) {
  const { label, tone, dot } = gradeMeta[grade];
  return (
    <Badge tone={tone} dot={dot} className={className}>
      {label}
    </Badge>
  );
}

/**
 * 질문 목록에서 한 줄로 상태를 읽히게 한다.
 * grade 가 있으면 grade 가 우선 — 질문자에게 "processing/answered" 보다
 * "즉답/확인대기/보류" 가 더 정확한 정보다.
 */
export function QuestionStatusBadge({
  status,
  grade,
  state,
}: {
  status: QuestionStatus;
  grade: Grade | null;
  state?: AnswerState | null;
}) {
  if (status === 'processing') return <Badge dot>답변 생성 중</Badge>;
  if (status === 'failed') return <Badge tone="danger">실패</Badge>;
  if (state === 'under_review') return <Badge tone="purple">재검토 중</Badge>;
  if (grade) return <GradeBadge grade={grade} />;
  return <Badge>확인 대기</Badge>;
}

/** §7 카드 reason — 액션 매트릭스의 키를 그대로 뱃지로 */
const reasonMeta: Record<CardReason, { label: string; tone: Tone }> = {
  green: { label: '즉답', tone: 'ok' },
  yellow: { label: '확인대기', tone: 'warn' },
  red: { label: '보류', tone: 'danger' },
  feedback: { label: '피드백', tone: 'purple' },
  doc_update: { label: '문서 갱신', tone: 'info' },
  failed: { label: '실패', tone: 'danger' },
};

export function ReasonBadge({ reason }: { reason: CardReason }) {
  const { label, tone } = reasonMeta[reason];
  return (
    <Badge tone={tone} dot={reason === 'yellow'}>
      {label}
    </Badge>
  );
}

/** §6 answer.state — 확정/참고 구분은 질문자에게 가장 중요한 신호다 */
const stateMeta: Record<AnswerState, { label: string; tone: Tone }> = {
  draft: { label: '참고', tone: 'warn' },
  verified: { label: '확정됨', tone: 'ok' },
  under_review: { label: '재검토 중', tone: 'purple' },
  expired: { label: '만료됨', tone: 'neutral' },
  rejected: { label: '반려됨', tone: 'danger' },
};

export function StateBadge({ state }: { state: AnswerState }) {
  const { label, tone } = stateMeta[state];
  return (
    <Badge tone={tone}>
      {state === 'verified' ? `✓ ${label}` : label}
    </Badge>
  );
}
