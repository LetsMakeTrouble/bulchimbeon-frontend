import { useCallback, useEffect, useState } from 'react';
import type { BriefingToday, ReviewCardDetail, ReviewCardListItem } from '../../types';
import { assertAllowed, type Resolution } from '../../domain/review/resolution';
import { AlreadyResolvedError } from '../../domain/errors';
import { briefingApi } from '../../infrastructure/http/briefing';
import { reviewCardApi } from '../../infrastructure/http/reviewCardApi';
import { useAuth } from '../../context/AuthContext';
import { useSseRefresh } from '../../context/SseContext';

export type BriefingEvent =
  | { kind: 'deferred'; until: string | null }
  | { kind: 'already-resolved' }
  | { kind: 'resolve-failed' }
  | { kind: 'bulk-keep-failed' };

/**
 * §8 아침 브리핑 유즈케이스.
 *
 * useReviewQueue 와 카드 처리(open/detail/resolve) 상태머신은 동일하다 — §7 액션
 * 매트릭스는 카드가 어느 화면에서 왔든 같은 규칙이기 때문이다. 다른 점은 원천 데이터뿐이다:
 * 여기는 원시 큐가 아니라 /briefing/today 가 이미 묶어준 4개 그룹(추천승인·확인대기·미룸·문서갱신)을 그대로 쓴다.
 */
export function useBriefing(projectId: string | undefined) {
  const { refreshMe } = useAuth();

  const [data, setData] = useState<BriefingToday | null>(null);
  const [loading, setLoading] = useState(true);
  const [openId, setOpenId] = useState<string | null>(null);
  const [details, setDetails] = useState<Record<string, ReviewCardDetail>>({});
  const [detailLoading, setDetailLoading] = useState(false);
  const [resolvedIds, setResolvedIds] = useState<Set<string>>(new Set());
  const [busyId, setBusyId] = useState<string | null>(null);
  const [bulkKeepBusyId, setBulkKeepBusyId] = useState<string | null>(null);
  const [lastEvent, setLastEvent] = useState<BriefingEvent | null>(null);

  const reload = useCallback(() => {
    if (!projectId) return;
    setLoading(true);
    briefingApi
      .today(projectId)
      .then(setData)
      .finally(() => setLoading(false));
  }, [projectId]);

  useEffect(reload, [reload]);

  useSseRefresh(['card.created', 'card.resolved', 'briefing.ready'], reload);

  const toggle = useCallback(
    (id: string) => {
      if (openId === id) {
        setOpenId(null);
        return;
      }
      setOpenId(id);
      if (details[id]) return;
      setDetailLoading(true);
      reviewCardApi
        .findDetail(id)
        .then((d) => setDetails((prev) => ({ ...prev, [id]: d })))
        .finally(() => setDetailLoading(false));
    },
    [openId, details]
  );

  const markResolved = useCallback((id: string) => {
    setResolvedIds((prev) => new Set(prev).add(id));
    setOpenId(null);
  }, []);

  const resolve = useCallback(
    async (card: ReviewCardListItem, resolution: Resolution) => {
      assertAllowed(card.reason, resolution);

      setBusyId(card.id);
      try {
        const outcome = await reviewCardApi.resolve(card.id, resolution);
        markResolved(card.id);
        setLastEvent(
          resolution.action === 'defer' ? { kind: 'deferred', until: outcome.deferredUntil } : null
        );
        refreshMe();
      } catch (err) {
        if (err instanceof AlreadyResolvedError) {
          markResolved(card.id);
          setLastEvent({ kind: 'already-resolved' });
        } else {
          setLastEvent({ kind: 'resolve-failed' });
        }
      } finally {
        setBusyId(null);
      }
    },
    [refreshMe, markResolved]
  );

  /** §7.4 — 묶음 전체를 유지하고 브리핑을 다시 읽는다. 개별 카드 상태는 재조회로 확인한다. */
  const bulkKeep = useCallback(
    async (documentVersionId: string) => {
      setBulkKeepBusyId(documentVersionId);
      try {
        await reviewCardApi.bulkKeep(projectId!, documentVersionId);
        reload();
      } catch {
        setLastEvent({ kind: 'bulk-keep-failed' });
      } finally {
        setBulkKeepBusyId(null);
      }
    },
    [projectId, reload]
  );

  return {
    data,
    loading,
    openId,
    detailOf: (id: string) => details[id] ?? null,
    detailLoading,
    toggle,
    busyId,
    resolve,
    isResolved: (id: string) => resolvedIds.has(id),
    bulkKeep,
    bulkKeepBusyId,
    lastEvent,
    reload,
  };
}
