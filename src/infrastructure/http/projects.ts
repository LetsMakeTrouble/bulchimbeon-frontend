import { http } from './client';
import type {
  Integration,
  IntegrationProvider,
  Listed,
  ProjectDetail,
  ProjectMember,
  ProjectSettings,
  UserProjectSummary,
} from '../../types';

export const projectsApi = {
  list: () => http.get<Listed<UserProjectSummary>>('/projects').then((r) => r.items),

  /** 생성자 = 담당자 */
  create: (data: { name: string; description?: string }) =>
    http.post<ProjectDetail>('/projects', data),

  detail: (projectId: string) => http.get<ProjectDetail>(`/projects/${projectId}`),

  updateSettings: (projectId: string, settings: Partial<ProjectSettings>) =>
    http.patch<ProjectSettings>(`/projects/${projectId}/settings`, settings),

  /** 퇴근 모드. 꺼도 카드는 유지된다 (룰 9) */
  setAwayMode: (projectId: string, awayMode: boolean) =>
    http.patch<{ away_mode: boolean }>(`/projects/${projectId}/away-mode`, {
      away_mode: awayMode,
    }),

  members: (projectId: string) =>
    http.get<Listed<ProjectMember>>(`/projects/${projectId}/members`).then((r) => r.items),

  /** 담당자 교체 + 미처리 카드·브리핑 이관 */
  transferAnswerer: (projectId: string, newAnswererId: string) =>
    http
      .post<Listed<ProjectMember>>(`/projects/${projectId}/transfer-answerer`, {
        new_answerer_id: newAnswererId,
      })
      .then((r) => r.items),

  removeMember: (projectId: string, userId: string) =>
    http.delete(`/projects/${projectId}/members/${userId}`),

  leave: (projectId: string) => http.post(`/projects/${projectId}/leave`),

  regenerateInviteCode: (projectId: string) =>
    http.post<{ invite_code: string }>(`/projects/${projectId}/invite-code`),

  join: (inviteCode: string) =>
    http.post<ProjectDetail>('/projects/join', { invite_code: inviteCode }),

  guidelines: (projectId: string) =>
    http.get<{ content: string }>(`/projects/${projectId}/guidelines`),

  updateGuidelines: (projectId: string, content: string) =>
    http.put<{ content: string }>(`/projects/${projectId}/guidelines`, { content }),

  integrations: (projectId: string) =>
    http.get<Listed<Integration>>(`/projects/${projectId}/integrations`).then((r) => r.items),

  addIntegration: (
    projectId: string,
    provider: IntegrationProvider,
    config: Record<string, unknown>
  ) => http.post<Integration>(`/projects/${projectId}/integrations`, { provider, config }),

  syncIntegration: (integrationId: string) => http.post(`/integrations/${integrationId}/sync`),

  removeIntegration: (integrationId: string) => http.delete(`/integrations/${integrationId}`),
};
