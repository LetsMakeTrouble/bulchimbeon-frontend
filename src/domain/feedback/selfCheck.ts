/** `node src/domain/feedback/selfCheck.ts` — 프레임워크 의존 0, 러너 없이 돈다. */
import assert from 'node:assert/strict';
import type { AnswerState } from '../../types/index.ts';
import { buildFeedback, canGiveFeedback } from './feedbackPolicy.ts';

const STATES: AnswerState[] = ['draft', 'verified', 'under_review', 'expired', 'rejected'];

// D12 — 피드백이 허용되는 상태
assert.ok(canGiveFeedback('draft'));
assert.ok(canGiveFeedback('verified'));
for (const s of ['under_review', 'expired', 'rejected'] as AnswerState[]) {
  assert.ok(!canGiveFeedback(s), `${s} 상태는 409 FEEDBACK_NOT_ALLOWED 라 버튼이 보이면 안 된다`);
}
assert.equal(STATES.filter(canGiveFeedback).length, 2, '허용 상태는 정확히 2개다');

// "맞았다" — 사유 불필요, 항상 만들어진다
assert.deepEqual(buildFeedback('correct'), { verdict: 'correct' });
assert.deepEqual(buildFeedback('correct', '아무 텍스트'), { verdict: 'correct' });

// "달랐다" — 사유 필수
assert.equal(buildFeedback('different'), null, '사유 없이 different 는 만들 수 없다');
assert.equal(buildFeedback('different', '   '), null, '공백뿐인 사유도 거부한다');
assert.deepEqual(buildFeedback('different', '  금액이 달랐음 '), {
  verdict: 'different',
  note: '금액이 달랐음',
});

console.log('domain/feedback self-check: ok');
