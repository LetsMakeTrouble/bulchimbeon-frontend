import { http } from './client';
import type { EventItem, MetricsTimeseries, ProjectMetrics } from '../../types';

export const metricsApi = {
  get: (projectId: string, days = 30) =>
    http.get<ProjectMetrics>(`/projects/${projectId}/metrics`, { params: { days } }),

  timeseries: (projectId: string, days = 30, bucket: 'day' | 'week' = 'day') =>
    http.get<MetricsTimeseries>(`/projects/${projectId}/metrics/timeseries`, {
      params: { days, bucket },
    }),

  events: (projectId: string, params: { entity_type?: string; entity_id?: string; limit?: number } = {}) =>
    http
      .get<{ items: EventItem[] }>(`/projects/${projectId}/events`, { params })
      .then((r) => r.items),
};
