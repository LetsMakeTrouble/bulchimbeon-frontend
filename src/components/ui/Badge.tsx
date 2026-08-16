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
  if (grade) return <ReasonBadge reason={grade} />;
  return <Badge>확인 대기</Badge>;
}

/**
 * §7 카드 reason 표기. Grade('green'|'yellow'|'red')는 CardReason 의 부분집합이라
 * 등급 뱃지도 이 표 하나로 그린다 — 같은 라벨을 두 표에 적어두면 반드시 갈라진다.
 *
 * Figma "질문 목록 (관리자)"·"브리핑 인박스" 실측 확인: danger(빨강)는 "급함"
 * 긴급 플래그 전용이다. "보류" 자체는 purple, "피드백"은 info(파랑)다 —
 * 색만 보고 급함으로 착각하면 안 된다는 게 이 배색의 의도로 보인다.
 */
const reasonMeta: Record<CardReason, { label: string; tone: Tone; dot: boolean }> = {
  green: { label: '즉답', tone: 'ok', dot: false },
  yellow: { label: '확인대기', tone: 'warn', dot: true },
  red: { label: '보류', tone: 'purple', dot: false },
  feedback: { label: '피드백', tone: 'info', dot: false },
  doc_update: { label: '문서 갱신', tone: 'info', dot: false },
  failed: { label: '실패', tone: 'danger', dot: false },
};

export function ReasonBadge({ reason }: { reason: CardReason }) {
  const { label, tone, dot } = reasonMeta[reason];
  return (
    <Badge tone={tone} dot={dot}>
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
