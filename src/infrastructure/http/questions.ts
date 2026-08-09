import { http } from './client';
import type {
  AskQuestionResponse,
  FeedbackResponse,
  Paginated,
  QuestionDetail,
  QuestionListItem,
  Urgency,
} from '../../types';

export const questionsApi = {
  /** §6 목록. 질문자는 기본 자기 것, 담당자는 전체 */
  list: (
    projectId: string,
    params: { mine?: boolean; status?: string; grade?: string; limit?: number; offset?: number } = {}
  ) =>
    http.get<Paginated<QuestionListItem>>(`/projects/${projectId}/questions`, {
      params: { limit: 20, offset: 0, ...params },
    }),

  /** asker 전용. 담당자가 호출하면 403 FORBIDDEN_ROLE (D17) */
  ask: (projectId: string, contentKo: string, urgency: Urgency = 'normal') =>
    http.post<AskQuestionResponse>(`/projects/${projectId}/questions`, {
      content_ko: contentKo,
      urgency,
    }),

  detail: (questionId: string) => http.get<QuestionDetail>(`/questions/${questionId}`),

  /** 긴급도 변경 — status="processing" 동안만 허용, 이후 409 PIPELINE_IN_PROGRESS */
  setUrgency: (questionId: string, urgency: Urgency) =>
    http.patch(`/questions/${questionId}`, { urgency }),

  /** 크로스체크. verdict="different" 면 note 필수 */
  feedback: (answerId: string, verdict: 'correct' | 'different', note?: string) =>
    http.post<FeedbackResponse>(`/answers/${answerId}/feedback`, {
      verdict,
      ...(note ? { note } : {}),
    }),
};
