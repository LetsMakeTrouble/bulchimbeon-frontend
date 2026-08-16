import { http } from './client';
import type { BriefingToday } from '../../types';

export const briefingApi = {
  today: (projectId: string) => http.get<BriefingToday>(`/projects/${projectId}/briefing/today`),
};
