import { http } from './client';
import type { LessonItem, LessonListResponse, LessonStatus } from '../../types';

export const lessonsApi = {
  list: (
    projectId: string,
    opts: { status?: LessonStatus; limit?: number; offset?: number } = {}
  ) =>
    http.get<LessonListResponse>(`/projects/${projectId}/lessons`, {
      params: {
        status: opts.status,
        limit: opts.limit ?? 50,
        offset: opts.offset ?? 0,
      },
    }),

  approve: (lessonId: string) => http.post<LessonItem>(`/lessons/${lessonId}/approve`),

  remove: (lessonId: string) => http.delete<LessonItem>(`/lessons/${lessonId}`),
};
