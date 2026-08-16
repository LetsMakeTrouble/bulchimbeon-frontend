import { http } from './client';
import type { OfficialQAArchived, OfficialQADetail, OfficialQAListItem, Paginated } from '../../types';

export const officialQasApi = {
  list: (
    projectId: string,
    opts: { query?: string; limit?: number; offset?: number } = {}
  ) =>
    http.get<Paginated<OfficialQAListItem>>(`/projects/${projectId}/official-qas`, {
      params: {
        query: opts.query || undefined,
        limit: opts.limit ?? 20,
        offset: opts.offset ?? 0,
      },
    }),

  get: (id: string) => http.get<OfficialQADetail>(`/official-qas/${id}`),

  /** DELETE 지만 물리 삭제가 아니라 보관(archive)이다 */
  archive: (id: string) => http.delete<OfficialQAArchived>(`/official-qas/${id}`),
};
