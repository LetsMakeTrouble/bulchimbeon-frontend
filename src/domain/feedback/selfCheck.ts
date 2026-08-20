/** `node src/domain/feedback/selfCheck.ts` — 프레임워크 의존 0, 러너 없이 돈다. */
import assert from 'node:assert/strict';
import type { AnswerState, Role } from '../../types/index.ts';
import { buildFeedback, canGiveFeedback } from './feedbackPolicy.ts';

const STATES: AnswerState[] = ['draft', 'verified', 'under_review', 'expired', 'rejected'];

// D12 — 피드백이 허용되는 상태 (질문자 기준)
assert.ok(canGiveFeedback('draft', 'asker'));
assert.ok(canGiveFeedback('verified', 'asker'));
for (const s of ['under_review', 'expired', 'rejected'] as AnswerState[]) {
  assert.ok(
    !canGiveFeedback(s, 'asker'),
    `${s} 상태는 409 FEEDBACK_NOT_ALLOWED 라 버튼이 보이면 안 된다`
  );
}
assert.equal(
  STATES.filter((s) => canGiveFeedback(s, 'asker')).length,
  2,
  '허용 상태는 정확히 2개다'
);

// 역할 — 담당자가 크로스체크하면 자기 승인 근거를 자기가 만든다
const ROLES: Role[] = ['asker', 'answerer'];
for (const s of STATES) {
  assert.ok(
    !canGiveFeedback(s, 'answerer'),
    `담당자는 어떤 상태에서도 크로스체크할 수 없다 (state=${s})`
  );
}
assert.equal(
  ROLES.filter((r) => canGiveFeedback('draft', r)).length,
  1,
  '크로스체크가 가능한 역할은 정확히 하나다'
);

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
