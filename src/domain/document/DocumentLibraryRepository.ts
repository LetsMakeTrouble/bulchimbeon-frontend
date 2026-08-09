import type { ActivateVersionResponse, DocumentContent, DocumentDetail, DocumentItem } from '../../types';

/**
 * 문서 라이브러리 포트.
 *
 * documentsApi(전체 문서 CRUD)의 부분집합이다 — addVersion·remove 는 이 유즈케이스가
 * 쓰지 않으므로 포트에 넣지 않는다. 포트는 "이 유즈케이스가 필요로 하는 것"만 선언한다.
 */
export interface DocumentLibraryRepository {
  list(projectId: string): Promise<DocumentItem[]>;
  detail(documentId: string): Promise<DocumentDetail>;
  versionContent(documentId: string, versionId: string): Promise<DocumentContent>;
  upload(projectId: string, file: File): Promise<DocumentDetail>;

  /** @returns review_cascade_count 를 포함한 결과 — 몇 건이 재검토 대상이 됐는지 반드시 알린다 (룰 5) */
  activateVersion(documentId: string, versionId: string): Promise<ActivateVersionResponse>;
}
