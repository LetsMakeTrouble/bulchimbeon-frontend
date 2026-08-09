import type { Paginated, ReviewCardDetail, ReviewCardListItem } from '../../types';
import type { ReviewCardRepository } from '../../domain/review/ReviewCardRepository';
import type { Resolution, ResolveOutcome } from '../../domain/review/resolution';
import { AlreadyResolvedError } from '../../domain/errors';
import { errorCode, http } from './client';

/**
 * Resolution(도메인 명령) → HTTP 경로·본문 매핑.
 *
 * SRP: 이 표가 바뀌는 유일한 이유는 **API 계약이 바뀔 때**다.
 * 업무 규칙(어떤 카드에 무엇이 허용되는가)은 domain/review/cardPolicy 에 있고
 * 여기는 "그 명령을 어떻게 전송하는가"만 안다.
 *
 * 이전에는 approve/edit/keep/reject/answer-option/defer 6개 메서드가 각각 선언돼 있고
 * 호출부에도 같은 6갈래 switch 가 있었다 — 액션 하나 추가에 두 곳을 고쳐야 했다.
 */
const wire = (r: Resolution): { path: string; body: unknown } => {
  switch (r.action) {
    case 'approve':
      return { path: 'approve', body: {} };
    case 'edit':
      return { path: 'edit', body: { content_en: r.contentEn } };
    case 'answer-option':
      return { path: 'answer-option', body: { index: r.index } };
    case 'keep':
      return { path: 'keep', body: { reason_en: r.reasonEn } };
    case 'reject':
      return { path: 'reject', body: { reason_en: r.reasonEn } };
    case 'defer':
      // until 을 보내지 않으면 서버가 다음 briefing_hour 로 정한다 — 프론트가 계산하지 않는다 (D15).
      return { path: 'defer', body: {} };
  }
};

export const reviewCardApi: ReviewCardRepository = {
  /** 정렬(승인 추천 → 긴급 → 오래된 순)은 서버가 한다. 클라이언트가 다시 정렬하지 않는다. */
  listPending: (projectId) =>
    http
      .get<Paginated<ReviewCardListItem>>(`/projects/${projectId}/review-cards`, {
        params: { status: 'pending' },
      })
      .then((page) => page.items),

  findDetail: (cardId) => http.get<ReviewCardDetail>(`/review-cards/${cardId}`),

  resolve: async (cardId, resolution): Promise<ResolveOutcome> => {
    const { path, body } = wire(resolution);
    try {
      const res = await http.post<{ deferred_until?: string | null }>(
        `/review-cards/${cardId}/${path}`,
        body
      );
      return { deferredUntil: res.deferred_until ?? null };
    } catch (err) {
      // HTTP 코드를 업무 의미로 번역하는 유일한 지점 (§1.4).
      if (errorCode(err) === 'ALREADY_RESOLVED') throw new AlreadyResolvedError();
      throw err;
    }
  },
};
