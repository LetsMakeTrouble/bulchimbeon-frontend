import { apiClient } from './client';
import type { NotificationItem } from '../types';

export const notificationsApi = {
  list: async () => {
    const res = await apiClient.get<NotificationItem[]>('/notifications');
    return res.data;
  },

  markRead: async (notificationId: string) => {
    const res = await apiClient.patch(`/notifications/${notificationId}/read`);
    return res.data;
  },

  markAllRead: async () => {
    const res = await apiClient.post('/notifications/read-all');
    return res.data;
  },
};
