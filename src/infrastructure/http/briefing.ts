import { http } from './client';
import type { BriefingToday } from '../../types';

export const briefingApi = {
  /** §8. 언제든 호출 가능 — 수동 새로고침이 데모 플랜B다. */
  today: (projectId: string) => http.get<BriefingToday>(`/projects/${projectId}/briefing/today`),
};
