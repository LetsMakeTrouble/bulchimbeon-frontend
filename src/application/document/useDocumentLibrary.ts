import { useCallback, useEffect, useState } from 'react';
import type { ActivateVersionResponse, DocumentDetail, DocumentItem, DocumentVersion } from '../../types';
import { canActivate, hasReadableContent } from '../../domain/document/documentPolicy';
import { documentsApi as repo } from '../../infrastructure/http/documents';
import { useSseRefresh } from '../../context/SseContext';

/**
 * 문서 라이브러리 유즈케이스.
 *
 * SRP: 이 훅이 바뀌는 이유는 "문서를 어떻게 고르고 갱신하는가" 흐름이 바뀔 때뿐이다.
 * - 어떤 버전을 전환할 수 있는가 → 도메인 (documentPolicy)
 * - 어떻게 전송하는가         → 인프라 (documentsApi)
 * - 어떻게 보이는가           → 표현 (DocumentsPage)
 */
export function useDocumentLibrary(projectId: string | undefined) {
  const [docs, setDocs] = useState<DocumentItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [detail, setDetail] = useState<DocumentDetail | null>(null);
  const [content, setContent] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [activateMessage, setActivateMessage] = useState<string | null>(null);

  const loadList = useCallback(() => {
    if (!projectId) return;
    setLoading(true);
    setError(false);
    repo
      .list(projectId)
      .then((list) => {
        setDocs(list);
        setSelectedId((prev) => prev ?? list[0]?.id ?? null);
      })
      .catch(() => setError(true))
      .finally(() => setLoading(false));
  }, [projectId]);

  useEffect(loadList, [loadList]);

  // 이 이벤트가 오기 전까지 해당 버전은 검색 대상이 아니다 (§4).
  useSseRefresh(['document.ingested', 'sync.completed', 'sync.failed'], loadList);

  const loadDetail = useCallback(
    (id: string) => {
      setContent(null);
      repo
        .detail(id)
        .then(async (d) => {
          setDetail(d);
          const active = d.versions.find((v) => v.is_active) ?? d.versions[0];
          if (active && hasReadableContent(active)) {
            const c = await repo.versionContent(d.id, active.id).catch(() => null);
            setContent(c?.content ?? null);
          }
        })
        // 실패 시 detail 을 그대로 두면 사이드바 선택은 새 문서인데 상세는 이전 문서로
        // 남는다 — 선택과 상세가 어긋난 채 보이는 것보다 빈 상태가 낫다.
        .catch(() => setDetail(null));
    },
    []
  );

  useEffect(() => {
    if (selectedId) loadDetail(selectedId);
  }, [selectedId, loadDetail]);

  const upload = async (file: File) => {
    if (!projectId) return;
    setUploading(true);
    try {
      // 인제스트는 비동기다. 201 은 pending 으로 오고 완료는 SSE document.ingested 로 온다 (§4).
      const created = await repo.upload(projectId, file);
      loadList();
      setSelectedId(created.id);
    } finally {
      setUploading(false);
    }
  };

  const activate = async (version: DocumentVersion): Promise<ActivateVersionResponse | null> => {
    if (!detail || !canActivate(version)) return null;
    const res = await repo.activateVersion(detail.id, version.id);
    // 활성 전환 시점에 재검토 연쇄가 돈다 — 몇 건이 재검토 대상인지 반드시 알린다 (룰 5).
    setActivateMessage(res.message);
    loadDetail(detail.id);
    loadList();
    return res;
  };

  return {
    docs,
    loading,
    error,
    selectedId,
    select: setSelectedId,
    detail,
    content,
    uploading,
    upload,
    activate,
    activateMessage,
  };
}
