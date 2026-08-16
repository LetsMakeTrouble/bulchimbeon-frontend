/**
 * 도메인 규칙 자체 검사 — `node src/domain/review/selfCheck.ts`
 *
 * 테스트 러너를 추가하지 않는다. 이 계층은 React·axios 의존이 0이라
 * Node 가 TypeScript 를 그대로 실행할 수 있고, assert 만으로 충분하다.
 * 러너가 필요해지는 시점은 표현 계층까지 테스트할 때다.
 */
import assert from 'node:assert/strict';
import type { CardReason } from '../../types/index.ts';
import { InvalidCardActionError } from '../errors.ts';
import { allowedActions, allows, requiresReason } from './cardPolicy.ts';
import { assertAllowed, withReason, type Resolution } from './resolution.ts';

const REASONS: CardReason[] = ['green', 'yellow', 'red', 'feedback', 'doc_update', 'failed'];

// 매트릭스가 지키는 업무 규칙 — 표를 잘못 고치면 여기서 걸린다.
assert.ok(
  REASONS.every((r) => allows(r, 'defer') && allows(r, 'reject') && allows(r, 'edit')),
  '모든 카드는 미루기·반려·수정이 가능해야 한다'
);
assert.ok(!allows('failed', 'approve'), '생성 실패 카드에는 승인할 원안이 없다');
assert.ok(!allows('feedback', 'approve'), '재검토 카드는 승인이 아니라 원안 유지다');
assert.ok(!allows('doc_update', 'approve'), '재검토 카드는 승인이 아니라 원안 유지다');
assert.ok(allows('red', 'answer-option'), '보류 카드만 선택지 응답이 열린다');
assert.ok(
  REASONS.filter((r) => r !== 'red').every((r) => !allows(r, 'answer-option')),
  '보류가 아닌 카드에 선택지 응답이 열리면 409 다'
);
// XOR 이 아니다: failed 는 둘 다 없다(승인할 원안도, 유지할 원안도 없다).
assert.ok(
  REASONS.every((r) => !(allows(r, 'approve') && allows(r, 'keep'))),
  '승인과 원안 유지가 동시에 보이면 담당자가 무엇을 고를지 알 수 없다'
);
assert.ok(!allows('failed', 'approve') && !allows('failed', 'keep'));

// 화면 버튼은 이 목록에서 파생된다. 중복이 있으면 버튼이 두 번 그려진다.
for (const r of REASONS) {
  const actions = allowedActions(r);
  assert.equal(new Set(actions).size, actions.length, `${r}: 액션 목록에 중복이 있다`);
}

// 사유 필수 규칙
assert.ok(requiresReason('reject') && requiresReason('keep'));
assert.ok(!requiresReason('approve') && !requiresReason('defer'));
assert.equal(withReason('reject', '   '), null, '공백뿐인 사유로는 명령을 만들지 않는다');
assert.deepEqual(withReason('reject', '  근거 없음 '), {
  action: 'reject',
  reasonEn: '근거 없음',
});

// 불변식이 실제로 던지는가 — 서버 왕복 전에 막는 것이 이 검사의 존재 이유다.
assert.throws(
  () => assertAllowed('green', { action: 'keep', reasonEn: 'x' }),
  InvalidCardActionError
);
assert.throws(
  () => assertAllowed('failed', { action: 'approve' }),
  InvalidCardActionError
);
const ok: Resolution = { action: 'edit', contentEn: 'fixed' };
assert.doesNotThrow(() => assertAllowed('yellow', ok));

console.log('domain/review self-check: ok');
