/**
 * 도메인 예외.
 *
 * SRP: 표현 계층은 "409 인가"가 아니라 "이미 처리된 카드인가"를 알아야 한다.
 * axios 에러 모양(`err.response.data.error.code`)을 화면이 파헤치는 순간
 * 화면은 HTTP 클라이언트 구현에 묶이고, 백엔드가 에러 봉투를 바꾸면 화면이 깨진다.
 * 번역은 인프라 계층에서 딱 한 번 한다.
 */

/** 다른 기기·다른 담당자가 이미 처리한 카드 (§1.4). 실패가 아니라 "이미 done" 이다. */
export class AlreadyResolvedError extends Error {
  constructor() {
    super('card already resolved');
    this.name = 'AlreadyResolvedError';
  }
}

/**
 * 피드백을 받을 수 없는 상태의 답변에 피드백을 보냈다 (§6 D12).
 * 버튼은 canGiveFeedback 을 보고 감추므로, 나온다면 화면이 스트림 갱신을 놓친 경합뿐이다.
 */
export class FeedbackNotAllowedError extends Error {
  constructor() {
    super('feedback not allowed for this answer state');
    this.name = 'FeedbackNotAllowedError';
  }
}

/** 매트릭스가 허용하지 않는 액션. 정상 UI 라면 나올 수 없다 — 나오면 버그다. */
export class InvalidCardActionError extends Error {
  // 파라미터 프로퍼티(`readonly x` in constructor)는 지울 수 없는 문법이라
  // tsconfig 의 erasableSyntaxOnly 와 충돌한다. 평범한 필드로 쓴다.
  readonly reason: string;
  readonly action: string;

  constructor(reason: string, action: string) {
    super(`action "${action}" is not allowed for card reason "${reason}"`);
    this.name = 'InvalidCardActionError';
    this.reason = reason;
    this.action = action;
  }
}
