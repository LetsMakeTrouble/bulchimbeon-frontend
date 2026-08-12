import { http } from './client';
import type { NotificationItem, Paginated } from '../../types';

export const notificationsApi = {
  list: (unreadOnly = false, limit = 30) =>
    http.get<Paginated<NotificationItem>>('/notifications', {
      params: { unread_only: unreadOnly, limit },
    }),

  markRead: (ids: string[]) => http.post('/notifications/read', { ids }),

  unreadCount: () => http.get<{ count: number }>('/notifications/unread-count').then((r) => r.count),
};
