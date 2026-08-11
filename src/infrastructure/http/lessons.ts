import { http } from './client';
import type { Lesson, LessonListResponse, LessonStatus } from '../../types';

export const lessonsApi = {
  /** status 는 candidate|approved 만 허용 — 그 밖의 값은 서버가 400 을 던진다 (§10.1) */
  list: (projectId: string, status: LessonStatus, limit = 20, offset = 0) =>
    http.get<LessonListResponse>(`/projects/${projectId}/lessons`, {
      params: { status, limit, offset },
    }),

  approve: (lessonId: string) => http.post<Lesson>(`/lessons/${lessonId}/approve`),

  remove: (lessonId: string) => http.delete<Lesson>(`/lessons/${lessonId}`),
};
