import { apiClient } from './client';
import type { Question } from '../types';

export const questionsApi = {
  list: async (projectId: string, limit = 20, offset = 0) => {
    const res = await apiClient.get<{
      items: Question[];
      total: number;
      limit: number;
      offset: number;
    }>(`/projects/${projectId}/questions`, {
      params: { limit, offset },
    });
    return res.data;
  },

  ask: async (projectId: string, content: string, isUrgent = false) => {
    const res = await apiClient.post<Question>(`/projects/${projectId}/questions`, {
      content,
      is_urgent: isUrgent,
    });
    return res.data;
  },

  getDetail: async (questionId: string) => {
    const res = await apiClient.get<Question>(`/questions/${questionId}`);
    return res.data;
  },

  sendFeedback: async (answerId: string, rating: 'positive' | 'negative', comment?: string) => {
    const res = await apiClient.post(`/answers/${answerId}/feedback`, {
      rating,
      comment,
    });
    return res.data;
  },
};
