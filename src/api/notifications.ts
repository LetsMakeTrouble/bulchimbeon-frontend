import { apiClient } from './client';
import type { NotificationItem, Paginated } from '../types';

export const notificationsApi = {
  list: async (unreadOnly = false, limit = 30) => {
    const res = await apiClient.get<Paginated<NotificationItem>>('/notifications', {
      params: { unread_only: unreadOnly, limit },
    });
    return res.data;
  },

  markRead: async (ids: string[]) => {
    const res = await apiClient.post('/notifications/read', { ids });
    return res.data;
  },

  unreadCount: async () => {
    const res = await apiClient.get<{ count: number }>('/notifications/unread-count');
    return res.data.count;
  },
};
