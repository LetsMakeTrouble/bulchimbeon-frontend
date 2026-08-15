import { http } from './client';
import type { MetricsTimeseries, ProjectMetrics, ProjectUsage, TimeseriesBucket } from '../../types';

export const metricsApi = {
  get: (projectId: string, days = 30) =>
    http.get<ProjectMetrics>(`/projects/${projectId}/metrics`, { params: { days } }),

  /** §13.1 — **담당자 전용**이다. 질문자가 부르면 403 이므로 호출 전에 역할을 확인한다. */
  usage: (projectId: string, windowDays = 30) =>
    http.get<ProjectUsage>(`/projects/${projectId}/usage`, {
      params: { window_days: windowDays },
    }),

  timeseries: (projectId: string, days = 30, bucket: TimeseriesBucket = 'day') =>
    http.get<MetricsTimeseries>(`/projects/${projectId}/metrics/timeseries`, {
      params: { days, bucket },
    }),
};
