import { apiClient } from './client';
import type {
  ActivateVersionResponse,
  DocumentContent,
  DocumentDetail,
  DocumentItem,
  Listed,
} from '../types';

export const documentsApi = {
  list: async (projectId: string) => {
    const res = await apiClient.get<Listed<DocumentItem>>(`/projects/${projectId}/documents`);
    return res.data.items;
  },

  detail: async (documentId: string) => {
    const res = await apiClient.get<DocumentDetail>(`/documents/${documentId}`);
    return res.data;
  },

  /** MD/TXT/PDF/DOCX. 201 즉시 반환, 인제스트는 비동기 → SSE document.ingested 로 완료 통지 */
  upload: async (projectId: string, file: File, title?: string, autoActivate = true) => {
    const form = new FormData();
    form.append('file', file);
    if (title) form.append('title', title);
    form.append('auto_activate', String(autoActivate));
    const res = await apiClient.post<DocumentDetail>(`/projects/${projectId}/documents`, form);
    return res.data;
  },

  /** 재업로드 = 새 버전 (룰 5) */
  addVersion: async (documentId: string, file: File) => {
    const form = new FormData();
    form.append('file', file);
    const res = await apiClient.post<DocumentDetail>(`/documents/${documentId}/versions`, form);
    return res.data;
  },

  /** 활성 버전 전환 — 이 시점에 재검토 연쇄가 돈다 */
  activateVersion: async (documentId: string, versionId: string) => {
    const res = await apiClient.patch<ActivateVersionResponse>(
      `/documents/${documentId}/versions/${versionId}/activate`
    );
    return res.data;
  },

  /** 근거 원문 — citations[].document_id / document_version_id 를 그대로 넣는다 */
  versionContent: async (documentId: string, versionId: string) => {
    const res = await apiClient.get<DocumentContent>(
      `/documents/${documentId}/versions/${versionId}/content`
    );
    return res.data;
  },

  remove: async (documentId: string) => {
    await apiClient.delete(`/documents/${documentId}`);
  },
};
