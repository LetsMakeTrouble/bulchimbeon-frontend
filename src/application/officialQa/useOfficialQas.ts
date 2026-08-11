import { useCallback, useEffect, useState } from 'react';
import type { OfficialQAItem } from '../../types';
import { officialQasApi } from '../../infrastructure/http/officialQas';

/** 공식 Q&A 검색·보관 유즈케이스. query 는 키워드 부분일치다 (§9). */
export function useOfficialQas(projectId: string | undefined, query: string) {
  const [items, setItems] = useState<OfficialQAItem[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);

  const reload = useCallback(() => {
    if (!projectId) return;
    setLoading(true);
    officialQasApi
      .list(projectId, query)
      .then((res) => {
        setItems(res.items);
        setTotal(res.total);
      })
      .finally(() => setLoading(false));
  }, [projectId, query]);

  useEffect(reload, [reload]);

  const archive = useCallback(
    async (id: string) => {
      setBusyId(id);
      try {
        await officialQasApi.archive(id);
        setItems((prev) => prev.filter((i) => i.id !== id));
      } finally {
        setBusyId(null);
      }
    },
    []
  );

  return { items, total, loading, busyId, archive, reload };
}
