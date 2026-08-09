import { apiClient } from './client';
import type { ProjectDetail, ProjectSettings, UserProjectSummary } from '../types';

export const projectsApi = {
  list: async () => {
    const res = await apiClient.get<UserProjectSummary[]>('/projects');
    return res.data;
  },

  create: async (data: { name: string; description?: string }) => {
    const res = await apiClient.post<ProjectDetail>('/projects', data);
    return res.data;
  },

  getDetail: async (projectId: string) => {
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

  toggleAwayMode: async (projectId: string, awayMode: boolean) => {
    const res = await apiClient.patch<{ away_mode: boolean }>(
      `/projects/${projectId}/away-mode`,
      { away_mode: awayMode }
    );
    return res.data;
  },

  joinByInvite: async (inviteCode: string) => {
    const res = await apiClient.post<UserProjectSummary>('/projects/join', {
      invite_code: inviteCode,
    });
    return res.data;
  },

  regenerateInviteCode: async (projectId: string) => {
    const res = await apiClient.post<{ invite_code: string }>(
      `/projects/${projectId}/invite-code`
    );
    return res.data;
  },

  getGuidelines: async (projectId: string) => {
    const res = await apiClient.get<{ content: string }>(
      `/projects/${projectId}/guidelines`
    );
    return res.data;
  },

  updateGuidelines: async (projectId: string, content: string) => {
    const res = await apiClient.put<{ content: string }>(
      `/projects/${projectId}/guidelines`,
      { content }
    );
    return res.data;
  },
};
