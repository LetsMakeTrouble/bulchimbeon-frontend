import { apiClient } from './client';
import type { DocumentItem } from '../types';

export const documentsApi = {
  list: async (projectId: string) => {
    const res = await apiClient.get<DocumentItem[]>(`/projects/${projectId}/documents`);
    return res.data;
  },

  upload: async (projectId: string, file: File, title?: string, autoActivate = true) => {
    const formData = new FormData();
    formData.append('file', file);
    if (title) formData.append('title', title);
    formData.append('auto_activate', String(autoActivate));

    const res = await apiClient.post<DocumentItem>(
      `/projects/${projectId}/documents`,
      formData,
      {
        headers: { 'Content-Type': 'multipart/form-data' },
      }
    );
    return res.data;
  },

  uploadNewVersion: async (documentId: string, file: File) => {
    const formData = new FormData();
    formData.append('file', file);

    const res = await apiClient.post(
      `/documents/${documentId}/versions`,
      formData,
      {
        headers: { 'Content-Type': 'multipart/form-data' },
      }
    );
    return res.data;
  },

  activateVersion: async (documentId: string, versionId: string) => {
    const res = await apiClient.patch<{
      document_id: string;
      active_version: number;
      review_cascade_count: number;
      message: string;
    }>(`/documents/${documentId}/versions/${versionId}/activate`);
    return res.data;
  },

  getVersionContent: async (documentId: string, versionId: string) => {
    const res = await apiClient.get<{
      document_id: string;
      version_id: string;
      version_no: number;
      title: string;
      mime: string;
      content: string;
    }>(`/documents/${documentId}/versions/${versionId}/content`);
    return res.data;
  },

  delete: async (documentId: string) => {
    const res = await apiClient.delete(`/documents/${documentId}`);
    return res.data;
  },
};
