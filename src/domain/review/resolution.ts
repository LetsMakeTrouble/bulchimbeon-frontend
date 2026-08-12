import type { CardReason } from '../../types/index.ts';
// 도메인 내부의 런타임 import 는 확장자를 붙인다 — 이 계층은 프레임워크 의존이 0이라
// `node src/domain/review/selfCheck.ts` 로 번들러 없이 그대로 돌릴 수 있어야 한다.
import { InvalidCardActionError } from '../errors.ts';
import { allows, type CardAction } from './cardPolicy.ts';

/**
 * 카드 처리 명령 (Value Object).
 *
 * 판별 유니온이라 **잘못된 조합이 아예 표현되지 않는다** — `edit` 인데 본문이 없거나
 * `answer-option` 인데 인덱스가 없는 값은 컴파일되지 않는다.
 * 이전 `{ kind, content?, index? }` 모양은 그 조합을 허용해서 호출부마다
 * `args.content!` 같은 non-null 단언이 필요했다. 단언은 검사가 아니라 침묵이다.
 */
export type Resolution =
  | { action: 'approve' }
  | { action: 'edit'; contentEn: string }
  | { action: 'answer-option'; index: number }
  | { action: 'keep'; reasonEn: string }
  | { action: 'reject'; reasonEn: string }
  | { action: 'defer' };

/** 처리 결과 — HTTP 응답이 아니라 업무적으로 의미 있는 값만 남긴다. */
export interface ResolveOutcome {
  /** defer 일 때만 값이 있다. 서버가 다음 briefing_hour 로 정한다 (D15). */
  deferredUntil: string | null;
}

/**
 * 도메인 불변식 검사 — 이 카드에 이 액션이 허용되는가.
 *
 * 서버도 409 로 막지만, 막는 이유를 아는 곳은 도메인이다.
 * 네트워크를 왕복해서야 규칙 위반을 아는 것은 규칙을 모르는 것과 같다.
 */
export function assertAllowed(reason: CardReason, resolution: Resolution): void {
  if (!allows(reason, resolution.action)) {
    throw new InvalidCardActionError(reason, resolution.action);
  }
}

/** 사유가 비어 있으면 명령을 만들지 않는다 — 빈 사유는 질문자에게 무의미하다. */
export function withReason(
  action: Extract<CardAction, 'keep' | 'reject'>,
  reason: string
): Resolution | null {
  const reasonEn = reason.trim();
  if (!reasonEn) return null;
  return { action, reasonEn };
}
