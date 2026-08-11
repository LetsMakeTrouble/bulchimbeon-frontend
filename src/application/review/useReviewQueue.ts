import { useCallback, useEffect, useMemo, useState } from 'react';
import type { CardReason, ReviewCardDetail, ReviewCardListItem } from '../../types';
import { assertAllowed, type Resolution } from '../../domain/review/resolution';
import { AlreadyResolvedError } from '../../domain/errors';
import { reviewCardApi as repo } from '../../infrastructure/http/reviewCardApi';
import { useAuth } from '../../context/AuthContext';
import { useSseRefresh } from '../../context/SseContext';

/**
 * 유즈케이스 결과 — 화면이 무엇을 알려야 하는지는 정하되, **뭐라고 쓸지는 정하지 않는다.**
 * 한국어 문구가 여기 있으면 문구 수정이 응용 계층 변경이 되어 버린다.
 */
export type QueueEvent =
  | { kind: 'deferred'; until: string | null }
  | { kind: 'already-resolved' }
  | { kind: 'resolve-failed' };

/**
 * 담당자 확인 큐 유즈케이스.
 *
 * SRP: 이 훅이 바뀌는 이유는 "카드를 처리하는 흐름"이 바뀔 때뿐이다.
 * - 어떤 액션이 허용되는가 → 도메인 (cardPolicy)
 * - 어떻게 전송하는가     → 인프라 (reviewCardApi)
 * - 어떻게 보이는가       → 표현 (InboxPage)
 *
 */
export function useReviewQueue(projectId: string | undefined) {
  const { refreshMe } = useAuth();

  const [cards, setCards] = useState<ReviewCardListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [openId, setOpenId] = useState<string | null>(null);
  const [details, setDetails] = useState<Record<string, ReviewCardDetail>>({});
  const [detailLoading, setDetailLoading] = useState(false);
  const [resolvedIds, setResolvedIds] = useState<Set<string>>(new Set());
  const [busyId, setBusyId] = useState<string | null>(null);
  const [lastEvent, setLastEvent] = useState<QueueEvent | null>(null);

  const reload = useCallback(() => {
    if (!projectId) return;
    setLoading(true);
    repo
      .listPending(projectId)
      .then(setCards)
      .finally(() => setLoading(false));
  }, [projectId]);

  useEffect(reload, [reload]);

  // card.resolved 는 다른 기기에서 처리된 경우다 — 큐를 다시 읽어 맞춘다.
  useSseRefresh(['card.created', 'card.resolved', 'briefing.ready'], reload);

  /**
   * ⚠️ 카드를 실제로 연 순간에만, 정확히 1회 상세를 부른다.
   * 프리페치하면 first_viewed_at 이 조기에 찍혀 card_handle_30s_rate 지표가 망가진다 (§7).
   */
  const toggle = useCallback(
    (id: string) => {
      if (openId === id) {
        setOpenId(null);
        return;
      }
      setOpenId(id);
      if (details[id]) return;
      setDetailLoading(true);
      repo
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
      // 서버에 보내기 전에 도메인 불변식으로 먼저 막는다. 왕복해서야 규칙 위반을 아는 것은
      // 규칙을 모르는 것과 같다 — 정상 UI 라면 여기서 던지지 않는다.
      assertAllowed(card.reason, resolution);

      setBusyId(card.id);
      try {
        const outcome = await repo.resolve(card.id, resolution);
        markResolved(card.id);
        if (resolution.action === 'defer') {
          setLastEvent({ kind: 'deferred', until: outcome.deferredUntil });
        } else {
          setLastEvent(null);
        }
        refreshMe(); // 사이드바 pending_cards 뱃지 동기화
      } catch (err) {
        // 이미 처리된 카드는 실패가 아니라 "이미 done" 이다 (§1.4).
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

  const countsByReason = useMemo(() => {
    const map = new Map<CardReason | 'all', number>([['all', cards.length]]);
    for (const c of cards) map.set(c.reason, (map.get(c.reason) ?? 0) + 1);
    return map;
  }, [cards]);

  return {
    cards,
    loading,
    countsByReason,
    resolvedCount: resolvedIds.size,
    isResolved: (id: string) => resolvedIds.has(id),
    openId,
    detailOf: (id: string) => details[id] ?? null,
    detailLoading,
    toggle,
    busyId,
    resolve,
    lastEvent,
    reload,
  };
}
