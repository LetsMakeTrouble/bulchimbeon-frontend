import { apiClient } from './client';
import type {
  AskQuestionResponse,
  FeedbackResponse,
  Paginated,
  QuestionDetail,
  QuestionListItem,
  Urgency,
} from '../types';

export const questionsApi = {
  /** §6 목록. 질문자는 기본 자기 것, 담당자는 전체 */
  list: async (
    projectId: string,
    params: { mine?: boolean; status?: string; grade?: string; limit?: number; offset?: number } = {}
  ) => {
    const res = await apiClient.get<Paginated<QuestionListItem>>(
      `/projects/${projectId}/questions`,
      { params: { limit: 20, offset: 0, ...params } }
    );
    return res.data;
  },

  /** asker 전용. 담당자가 호출하면 403 FORBIDDEN_ROLE (D17) */
  ask: async (projectId: string, contentKo: string, urgency: Urgency = 'normal') => {
    const res = await apiClient.post<AskQuestionResponse>(`/projects/${projectId}/questions`, {
      content_ko: contentKo,
      urgency,
    });
    return res.data;
  },

  detail: async (questionId: string) => {
    const res = await apiClient.get<QuestionDetail>(`/questions/${questionId}`);
    return res.data;
  },

  /** 긴급도 변경 — status="processing" 동안만 허용, 이후 409 PIPELINE_IN_PROGRESS */
  setUrgency: async (questionId: string, urgency: Urgency) => {
    const res = await apiClient.patch(`/questions/${questionId}`, { urgency });
    return res.data;
  },

  /** 크로스체크. verdict="different" 면 note 필수 */
  feedback: async (answerId: string, verdict: 'correct' | 'different', note?: string) => {
    const res = await apiClient.post<FeedbackResponse>(`/answers/${answerId}/feedback`, {
      verdict,
      ...(note ? { note } : {}),
    });
    return res.data;
  },
};
