import type { CardReason } from '../../types/index.ts';

/**
 * 확인 카드에 대해 담당자가 취할 수 있는 행동.
 *
 * SRP: 이 파일이 바뀌는 유일한 이유는 **업무 규칙(§7.1 매트릭스)이 바뀔 때**다.
 * 화면 문구가 바뀌거나 HTTP 경로가 바뀌어도 여기는 손대지 않는다.
 */
export type CardAction = 'approve' | 'edit' | 'answer-option' | 'keep' | 'reject' | 'defer';

/**
 * §7.1 액션 매트릭스 — 이 앱에서 가장 중요한 도메인 불변식.
 *
 * 표에 없는 액션을 보내면 서버가 409 INVALID_CARD_ACTION 으로 거절한다.
 * 즉 "어떤 카드에 어떤 버튼이 보이는가"는 UI 취향이 아니라 업무 규칙이며,
 * 그래서 컴포넌트가 아니라 도메인 계층에 산다.
 *
 * - green/yellow : 원안이 쓸 만하다 → 승인 가능
 * - red          : 근거가 부족하다 → 선택지 응답이 추가로 열린다
 * - feedback/doc_update : 이미 나간 답변의 재검토 → 승인 대신 "원안 유지"
 * - failed       : 생성 자체가 실패 → 승인할 원안이 없다
 */
const MATRIX: Record<CardReason, readonly CardAction[]> = {
  green: ['approve', 'edit', 'reject', 'defer'],
  yellow: ['approve', 'edit', 'reject', 'defer'],
  red: ['approve', 'edit', 'answer-option', 'reject', 'defer'],
  feedback: ['edit', 'keep', 'reject', 'defer'],
  doc_update: ['edit', 'keep', 'reject', 'defer'],
  failed: ['edit', 'reject', 'defer'],
};

/** 이 카드에 허용된 액션 전부. 화면의 버튼 목록은 반드시 여기서 파생시킨다. */
export const allowedActions = (reason: CardReason): readonly CardAction[] => MATRIX[reason];

export const allows = (reason: CardReason, action: CardAction): boolean =>
  MATRIX[reason].includes(action);

/**
 * 사유 텍스트가 필수인 액션.
 *
 * 반려와 원안 유지는 결과가 질문자에게 그대로 전달되므로 근거 없이 보낼 수 없다.
 * "왜 필수인가"는 업무 규칙이고, "어떻게 입력받는가"(prompt·모달)는 표현 계층 몫이다.
 */
export const requiresReason = (action: CardAction): action is 'keep' | 'reject' =>
  action === 'keep' || action === 'reject';
