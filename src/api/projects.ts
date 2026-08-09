import { apiClient } from './client';
import type {
  Integration,
  IntegrationProvider,
  Listed,
  ProjectDetail,
  ProjectMember,
  ProjectSettings,
  UserProjectSummary,
} from '../types';

export const projectsApi = {
  list: async () => {
    const res = await apiClient.get<Listed<UserProjectSummary>>('/projects');
    return res.data.items;
  },

  /** 생성자 = 담당자 */
  create: async (data: { name: string; description?: string }) => {
    const res = await apiClient.post<ProjectDetail>('/projects', data);
    return res.data;
  },

  detail: async (projectId: string) => {
    const res = await apiClient.get<ProjectDetail>(`/projects/${projectId}`);
    return res.data;
  },

  updateSettings: async (projectId: string, settings: Partial<ProjectSettings>) => {
    const res = await apiClient.patch<ProjectSettings>(
      `/projects/${projectId}/settings`,
      settings
    );
    return res.data;
  },

  /** 퇴근 모드. 꺼도 카드는 유지된다 (룰 9) */
  setAwayMode: async (projectId: string, awayMode: boolean) => {
    const res = await apiClient.patch<{ away_mode: boolean }>(
      `/projects/${projectId}/away-mode`,
      { away_mode: awayMode }
    );
    return res.data;
  },

  members: async (projectId: string) => {
    const res = await apiClient.get<Listed<ProjectMember>>(`/projects/${projectId}/members`);
    return res.data.items;
  },

  /** 담당자 교체 + 미처리 카드·브리핑 이관 */
  transferAnswerer: async (projectId: string, newAnswererId: string) => {
    const res = await apiClient.post<Listed<ProjectMember>>(
      `/projects/${projectId}/transfer-answerer`,
      { new_answerer_id: newAnswererId }
    );
    return res.data.items;
  },

  removeMember: async (projectId: string, userId: string) => {
    const res = await apiClient.delete(`/projects/${projectId}/members/${userId}`);
    return res.data;
  },

  leave: async (projectId: string) => {
    const res = await apiClient.post(`/projects/${projectId}/leave`);
    return res.data;
  },

  regenerateInviteCode: async (projectId: string) => {
    const res = await apiClient.post<{ invite_code: string }>(
      `/projects/${projectId}/invite-code`
    );
    return res.data;
  },

  join: async (inviteCode: string) => {
    const res = await apiClient.post<ProjectDetail>('/projects/join', {
      invite_code: inviteCode,
    });
    return res.data;
  },

  guidelines: async (projectId: string) => {
    const res = await apiClient.get<{ content: string }>(`/projects/${projectId}/guidelines`);
    return res.data;
  },

  updateGuidelines: async (projectId: string, content: string) => {
    const res = await apiClient.put<{ content: string }>(
      `/projects/${projectId}/guidelines`,
      { content }
    );
    return res.data;
  },

  integrations: async (projectId: string) => {
    const res = await apiClient.get<Listed<Integration>>(`/projects/${projectId}/integrations`);
    return res.data.items;
  },

  addIntegration: async (
    projectId: string,
    provider: IntegrationProvider,
    config: Record<string, unknown>
  ) => {
    const res = await apiClient.post<Integration>(`/projects/${projectId}/integrations`, {
      provider,
      config,
    });
    return res.data;
  },

  syncIntegration: async (integrationId: string) => {
    const res = await apiClient.post(`/integrations/${integrationId}/sync`);
    return res.data;
  },

  removeIntegration: async (integrationId: string) => {
    const res = await apiClient.delete(`/integrations/${integrationId}`);
    return res.data;
  },
};
