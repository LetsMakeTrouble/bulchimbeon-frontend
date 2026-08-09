import { apiClient } from './client';
import type {
  BriefingToday,
  CardResolveResponse,
  CardStatus,
  Paginated,
  ReviewCardDetail,
  ReviewCardListItem,
} from '../types';

export const reviewCardsApi = {
  /** 정렬: 승인 추천 → 긴급 → 오래된 순 */
  list: async (projectId: string, status: CardStatus = 'pending') => {
    const res = await apiClient.get<Paginated<ReviewCardListItem>>(
      `/projects/${projectId}/review-cards`,
      { params: { status } }
    );
    return res.data;
  },

  /**
   * ⚠️ 프리페치 금지 — 최초 조회가 first_viewed_at 을 기록하고
   * 그 값이 card_handle_30s_rate 지표의 시작점이다.
   * 담당자가 실제로 카드를 열었을 때 정확히 1회만 호출한다.
   */
  detail: async (cardId: string) => {
    const res = await apiClient.get<ReviewCardDetail>(`/review-cards/${cardId}`);
    return res.data;
  },

  approve: async (cardId: string) => {
    const res = await apiClient.post<CardResolveResponse>(`/review-cards/${cardId}/approve`);
    return res.data;
  },

  edit: async (cardId: string, contentEn: string) => {
    const res = await apiClient.post<CardResolveResponse>(`/review-cards/${cardId}/edit`, {
      content_en: contentEn,
    });
    return res.data;
  },

  /** 선택지 탭 응답 — reason="red" 카드 전용 */
  answerOption: async (cardId: string, index: number) => {
    const res = await apiClient.post<CardResolveResponse>(
      `/review-cards/${cardId}/answer-option`,
      { index }
    );
    return res.data;
  },

  /** 원안 유지 — 재검토 카드(feedback·doc_update) 전용 */
  keep: async (cardId: string, reasonEn: string) => {
    const res = await apiClient.post<CardResolveResponse>(`/review-cards/${cardId}/keep`, {
      reason_en: reasonEn,
    });
    return res.data;
  },

  reject: async (cardId: string, reasonEn: string) => {
    const res = await apiClient.post<CardResolveResponse>(`/review-cards/${cardId}/reject`, {
      reason_en: reasonEn,
    });
    return res.data;
  },

  /** until 생략 시 서버가 다음 briefing_hour 로 정한다 — 프론트가 계산하지 않는다 */
  defer: async (cardId: string, until?: string) => {
    const res = await apiClient.post<{
      id: string;
      status: CardStatus;
      deferred_until: string | null;
    }>(`/review-cards/${cardId}/defer`, until ? { until } : {});
    return res.data;
  },

  bulkKeep: async (projectId: string, documentVersionId: string) => {
    const res = await apiClient.post(`/projects/${projectId}/review-cards/bulk-keep`, {
      document_version_id: documentVersionId,
    });
    return res.data;
  },

  briefingToday: async (projectId: string) => {
    const res = await apiClient.get<BriefingToday>(`/projects/${projectId}/briefing/today`);
    return res.data;
  },
};
