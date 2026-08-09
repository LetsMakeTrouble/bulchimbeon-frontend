import { apiClient } from './client';
import type { InboxCard } from '../types';

export const inboxApi = {
  getCards: async (projectId: string) => {
    const res = await apiClient.get<InboxCard[]>(`/projects/${projectId}/inbox/cards`);
    return res.data;
  },

  approveCard: async (cardId: string) => {
    const res = await apiClient.post<{ card_id: string; status: 'resolved'; resolution: 'approved' }>(
      `/inbox/cards/${cardId}/approve`
    );
    return res.data;
  },

  editAnswer: async (cardId: string, editedContentKo: string, editedContentEn?: string) => {
    const res = await apiClient.post(`/inbox/cards/${cardId}/edit`, {
      content_ko: editedContentKo,
      content_en: editedContentEn,
    });
    return res.data;
  },

  rejectCard: async (cardId: string, reason: string) => {
    const res = await apiClient.post(`/inbox/cards/${cardId}/reject`, {
      reason,
    });
    return res.data;
  },
};
