import { http } from './client';
import type { OfficialQAArchived, OfficialQADetail, OfficialQAItem, Paginated } from '../../types';

export const officialQasApi = {
  /** query 는 ko/en 질문·답변 본문 키워드 부분일치다 — 재사용 판정용 벡터 검색과는 별개 (§9) */
  list: (projectId: string, query = '', limit = 20, offset = 0) =>
    http.get<Paginated<OfficialQAItem>>(`/projects/${projectId}/official-qas`, {
      params: { query: query || undefined, limit, offset },
    }),

  detail: (officialQaId: string) => http.get<OfficialQADetail>(`/official-qas/${officialQaId}`),

  /** 물리 삭제가 아니라 status→archived 전환 */
  archive: (officialQaId: string) =>
    http.delete<OfficialQAArchived>(`/official-qas/${officialQaId}`),
};
