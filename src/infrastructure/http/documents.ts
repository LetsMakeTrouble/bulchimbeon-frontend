import { http } from './client';
import type {
  ActivateVersionResponse,
  DocumentContent,
  DocumentDetail,
  DocumentItem,
  Listed,
} from '../../types';

const postFile = (url: string, file: File, extra?: Record<string, string>) => {
  const form = new FormData();
  form.append('file', file);
  for (const [k, v] of Object.entries(extra ?? {})) form.append(k, v);
  return http.post<DocumentDetail>(url, form);
};

export const documentsApi = {
  list: (projectId: string) =>
    http.get<Listed<DocumentItem>>(`/projects/${projectId}/documents`).then((r) => r.items),

  detail: (documentId: string) => http.get<DocumentDetail>(`/documents/${documentId}`),

  /** MD/TXT/PDF/DOCX. 201 즉시 반환, 인제스트는 비동기 → SSE document.ingested 로 완료 통지 */
  upload: (projectId: string, file: File, title?: string, autoActivate = true) =>
    postFile(`/projects/${projectId}/documents`, file, {
      auto_activate: String(autoActivate),
      ...(title ? { title } : {}),
    }),

  /** 재업로드 = 새 버전 (룰 5) */
  addVersion: (documentId: string, file: File) =>
    postFile(`/documents/${documentId}/versions`, file),

  /** 활성 버전 전환 — 이 시점에 재검토 연쇄가 돈다 */
  activateVersion: (documentId: string, versionId: string) =>
    http.patch<ActivateVersionResponse>(
      `/documents/${documentId}/versions/${versionId}/activate`
    ),

  /** 근거 원문 — citations[].document_id / document_version_id 를 그대로 넣는다 */
  versionContent: (documentId: string, versionId: string) =>
    http.get<DocumentContent>(`/documents/${documentId}/versions/${versionId}/content`),

  remove: (documentId: string) => http.delete(`/documents/${documentId}`),
};
