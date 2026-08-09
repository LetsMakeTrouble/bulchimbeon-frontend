import type { ReviewCardDetail, ReviewCardListItem } from '../../types/index.ts';
import type { Resolution, ResolveOutcome } from './resolution.ts';

/**
 * 확인 카드 저장소 포트.
 *
 * 의존성 역전: 도메인이 "무엇이 필요한가"를 선언하고, 인프라가 "어떻게"를 구현한다.
 * 도메인·응용 계층은 axios 도 URL 도 모른다 — 이 인터페이스만 안다.
 * 그래서 테스트에서 이 인터페이스를 객체 리터럴로 갈아끼우면 네트워크 없이 유즈케이스를 돌릴 수 있다.
 */
export interface ReviewCardRepository {
  listPending(projectId: string): Promise<ReviewCardListItem[]>;

  /**
   * ⚠️ 프리페치 금지 — 최초 조회가 first_viewed_at 을 기록하고 그 값이
   * card_handle_30s_rate 지표의 시작점이다 (§7). 담당자가 실제로 연 순간 1회만 부른다.
   *
   * 이 제약이 인터페이스 주석에 있는 이유: 구현체를 바꿔도 제약은 남아야 한다.
   */
  findDetail(cardId: string): Promise<ReviewCardDetail>;

  /** @throws AlreadyResolvedError 다른 기기·담당자가 이미 처리한 경우 */
  resolve(cardId: string, resolution: Resolution): Promise<ResolveOutcome>;
}
