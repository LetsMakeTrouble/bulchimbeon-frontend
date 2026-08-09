import type { CardReason } from '../../types';

export type CardAction = 'approve' | 'edit' | 'answer-option' | 'keep' | 'reject' | 'defer';

/**
 * §7.1 카드 액션 매트릭스. `O` 가 아닌 액션을 호출하면 409 INVALID_CARD_ACTION 이므로
 * 버튼은 반드시 이 표에서 파생시킨다 — 화면마다 하드코딩하지 않는다.
 */
const MATRIX: Record<CardReason, CardAction[]> = {
  green: ['approve', 'edit', 'reject', 'defer'],
  yellow: ['approve', 'edit', 'reject', 'defer'],
  red: ['approve', 'edit', 'answer-option', 'reject', 'defer'],
  feedback: ['edit', 'keep', 'reject', 'defer'],
  doc_update: ['edit', 'keep', 'reject', 'defer'],
  failed: ['edit', 'reject', 'defer'],
};

export const allowedActions = (reason: CardReason): CardAction[] => MATRIX[reason];
export const allows = (reason: CardReason, action: CardAction) =>
  MATRIX[reason].includes(action);

export const actionLabel: Record<CardAction, string> = {
  approve: '승인 (원안 유지)',
  edit: '수정 후 저장',
  'answer-option': '선택지로 응답',
  keep: '원안 유지',
  reject: '반려',
  defer: '나중에 처리',
};
