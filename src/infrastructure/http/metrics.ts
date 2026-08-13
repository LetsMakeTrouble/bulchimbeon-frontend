import { http } from './client';
import type { MetricsTimeseries, ProjectMetrics, TimeseriesBucket } from '../../types';

export const metricsApi = {
  get: (projectId: string, days = 30) =>
    http.get<ProjectMetrics>(`/projects/${projectId}/metrics`, { params: { days } }),

  timeseries: (projectId: string, days = 30, bucket: TimeseriesBucket = 'day') =>
    http.get<MetricsTimeseries>(`/projects/${projectId}/metrics/timeseries`, {
      params: { days, bucket },
    }),
};
