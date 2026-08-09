import type { AnswerState } from '../../types/index.ts';

/**
 * 답변 크로스체크(§6) 업무 규칙.
 *
 * SRP: 여기가 바뀌는 이유는 "언제 피드백을 받을 수 있는가", "무엇이 유효한 피드백인가"가
 * 바뀔 때뿐이다. 버튼을 몇 개 그리는지, 문구가 뭔지는 표현 계층 몫이다.
 */

/**
 * expired · rejected · under_review 상태에는 피드백을 보내면 409 FEEDBACK_NOT_ALLOWED 다 (D12).
 * 이미 재검토 중이거나 더 이상 유효하지 않은 답변에 다시 피드백을 받는 것은 의미가 없다.
 */
export const canGiveFeedback = (state: AnswerState): boolean =>
  state === 'draft' || state === 'verified';

/** 판별 유니온이라 `different` 인데 note 가 없는 상태가 표현되지 않는다. */
export type Feedback = { verdict: 'correct' } | { verdict: 'different'; note: string };

/**
 * "달랐다" 는 사유가 필수다(§6) — 없으면 400. 빈 문자열이면 명령을 만들지 않는다.
 * "맞았다" 는 사유가 필요 없으므로 입력값과 무관하게 항상 만들어진다.
 */
export const buildFeedback = (verdict: 'correct' | 'different', note?: string): Feedback | null => {
  if (verdict === 'correct') return { verdict: 'correct' };
  const trimmed = note?.trim();
  return trimmed ? { verdict: 'different', note: trimmed } : null;
};
