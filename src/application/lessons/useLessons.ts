import { useCallback, useEffect, useState } from 'react';
import type { Lesson, LessonStatus } from '../../types';
import { lessonsApi } from '../../infrastructure/http/lessons';

/** 교훈 목록 유즈케이스. status 탭 전환마다 다시 읽는다 — 서버가 candidate/approved 만 허용한다 (§10.1). */
export function useLessons(projectId: string | undefined, status: LessonStatus) {
  const [items, setItems] = useState<Lesson[]>([]);
  const [cleanupSuggestions, setCleanupSuggestions] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);

  const reload = useCallback(() => {
    if (!projectId) return;
    setLoading(true);
    lessonsApi
      .list(projectId, status)
      .then((res) => {
        setItems(res.items);
        setCleanupSuggestions(res.cleanup_suggestions);
      })
      .finally(() => setLoading(false));
  }, [projectId, status]);

  useEffect(reload, [reload]);

  const approve = useCallback(
    async (id: string) => {
      setBusyId(id);
      try {
        await lessonsApi.approve(id);
        reload();
      } finally {
        setBusyId(null);
      }
    },
    [reload]
  );

  const remove = useCallback(
    async (id: string) => {
      setBusyId(id);
      try {
        await lessonsApi.remove(id);
        reload();
      } finally {
        setBusyId(null);
      }
    },
    [reload]
  );

  return { items, cleanupSuggestions, loading, busyId, approve, remove, reload };
}
