import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from 'react';
import { API_BASE_URL } from '../infrastructure/http/client';
import { sseApi } from '../infrastructure/http/sse';
import { notificationsApi } from '../infrastructure/http/notifications';
import { useAuth } from './AuthContext';

/**
 * §12.3 이벤트 목록. 배열이 원본이고 타입은 거기서 파생시킨다 —
 * 유니온과 배열에 같은 이름을 두 번 적으면 하나만 고쳤을 때 조용히 어긋난다.
 * `notification.unread_count` 는 값 자체가 의미라 여기 없다.
 */
const STREAM_EVENTS = [
  'answer.completed',
  'answer.updated',
  'card.created',
  'card.resolved',
  'briefing.ready',
  'document.ingested',
  'sync.completed',
  'sync.failed',
  'notification.created',
  'message.created',
] as const;

export type SseEvent = (typeof STREAM_EVENTS)[number];

/**
 * 재연결 자체가 하나의 신호다.
 *
 * 끊긴 동안의 이벤트는 유실되고 **SSE 에는 재생(replay) 계약이 없다** (§12.2 2번).
 * 그래서 재연결되면 화면에 떠 있는 구독자 전원이 리소스를 GET 으로 다시 읽는다.
 */
export const SSE_RECONNECT = 'reconnect';
type Signal = SseEvent | typeof SSE_RECONNECT;

/** §12.2 5번 — 서버는 14초마다 ping 을 보낸다. 30초 넘게 없으면 죽은 연결로 본다. */
const PING_TIMEOUT_MS = 30_000;
/** §12.2 1번 — 지수 백오프 1s → 2s → 4s, 상한 30s */
const BACKOFF_MS = [1000, 2000, 4000, 8000, 16000, 30000];

interface SseContextType {
  /** 스트림이 살아 있는지. 끊겨 있는 동안에는 화면이 폴링으로 버틴다. */
  connected: boolean;
  subscribe: (signals: Signal[], onSignal: () => void) => () => void;
}

const SseContext = createContext<SseContextType | undefined>(undefined);

export const SseProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, setUnreadTotal } = useAuth();
  // refreshMe() 가 새 user 객체를 만들 때마다 스트림을 끊지 않도록 id 로만 반응한다.
  const userId = user?.id;
  const [connected, setConnected] = useState(false);

  const listeners = useRef(new Map<Signal, Set<() => void>>());
  const source = useRef<EventSource | null>(null);
  const pingTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const retryTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const attempt = useRef(0);
  /** 최초 연결에는 재조회 신호를 쏘지 않는다 — 화면이 방금 마운트하며 읽었다. */
  const hadConnection = useRef(false);

  const subscribe = useCallback((signals: Signal[], onSignal: () => void) => {
    for (const s of signals) {
      const set = listeners.current.get(s) ?? new Set();
      set.add(onSignal);
      listeners.current.set(s, set);
    }
    return () => {
      for (const s of signals) listeners.current.get(s)?.delete(onSignal);
    };
  }, []);

  const emit = useCallback((signal: Signal) => {
    listeners.current.get(signal)?.forEach((fn) => fn());
  }, []);

  useEffect(() => {
    if (!userId) return;

    /**
     * 이 이펙트 실행분이 아직 유효한지.
     *
     * ref 로 두면 안 된다 — 티켓 요청을 await 하는 사이에 다음 실행분이 ref 를 되돌려
     * 이미 버려진 실행분이 EventSource 를 만들어 버린다. 그렇게 새는 스트림은
     * 참조가 없어 close 되지 않고 계속 이벤트를 쏜다.
     */
    let cancelled = false;

    const clearTimers = () => {
      if (pingTimer.current) clearTimeout(pingTimer.current);
      if (retryTimer.current) clearTimeout(retryTimer.current);
    };

    const teardown = () => {
      // 워치독을 같이 끈다. 안 그러면 onerror 로 이미 정리한 연결을 워치독이 한 번 더
      // 정리하면서 재연결을 이중으로 예약한다.
      if (pingTimer.current) {
        clearTimeout(pingTimer.current);
        pingTimer.current = null;
      }
      source.current?.close();
      source.current = null;
      setConnected(false);
    };

    const scheduleRetry = () => {
      if (cancelled) return;
      // 끊김 하나에 재연결 하나. 이미 잡혀 있으면 겹쳐 잡지 않는다 —
      // 스트림 하나가 죽을 때 onerror 와 워치독이 둘 다 불릴 수 있다.
      if (retryTimer.current) return;
      const delay = BACKOFF_MS[Math.min(attempt.current, BACKOFF_MS.length - 1)];
      attempt.current += 1;
      retryTimer.current = setTimeout(() => {
        retryTimer.current = null;
        connect();
      }, delay);
    };

    /** ping 이 끊기면 브라우저가 알려주지 않으므로 직접 감시한다 (§12.2 5번). */
    const armWatchdog = () => {
      if (pingTimer.current) clearTimeout(pingTimer.current);
      pingTimer.current = setTimeout(() => {
        teardown();
        scheduleRetry();
      }, PING_TIMEOUT_MS);
    };

    async function connect() {
      if (cancelled) return;
      if (retryTimer.current) {
        clearTimeout(retryTimer.current);
        retryTimer.current = null;
      }
      // 로그아웃 직후 남은 재시도로 401 을 만들지 않는다.
      if (!localStorage.getItem('access_token')) return;

      teardown();

      let ticket: string;
      try {
        ({ ticket } = await sseApi.ticket());
      } catch {
        // refresh 까지 실패했으면 인터셉터가 이미 로그인으로 보냈다. 아니면 재시도.
        scheduleRetry();
        return;
      }
      if (cancelled) return;

      const es = new EventSource(
        `${API_BASE_URL}/sse/stream?ticket=${encodeURIComponent(ticket)}`
      );
      source.current = es;

      es.onopen = () => {
        attempt.current = 0;
        setConnected(true);
        armWatchdog();
        // 재연결이면 유실 구간이 있으므로 구독자 전원이 다시 읽는다 (§12.2 2번).
        if (hadConnection.current) emit(SSE_RECONNECT);
        hadConnection.current = true;
      };

      // EventSource 의 기본 재연결은 쓸 수 없다 — 티켓이 1회용이라 같은 URL 로는 401 이다.
      es.onerror = () => {
        teardown();
        scheduleRetry();
      };

      es.addEventListener('ping', armWatchdog);

      // 스트림 시작 시 1회 push. 뱃지는 이 값으로 즉시 동기화한다 (§12.2 3번).
      es.addEventListener('notification.unread_count', (e) => {
        armWatchdog();
        try {
          setUnreadTotal(JSON.parse((e as MessageEvent).data).count);
        } catch {
          /* 값이 깨졌으면 뱃지를 건드리지 않는다 */
        }
      });

      for (const name of STREAM_EVENTS) {
        es.addEventListener(name, () => {
          armWatchdog();
          // SSE 는 "갱신 신호"로만 쓴다 — payload 를 화면 상태에 직접 넣지 않는다 (§12.2).
          emit(name);
          if (name === 'notification.created') {
            notificationsApi.unreadCount().then(setUnreadTotal).catch(() => {});
          }
        });
      }
    }

    connect();

    return () => {
      cancelled = true;
      clearTimers();
      teardown();
    };
  }, [userId, emit, setUnreadTotal]);

  return (
    <SseContext.Provider value={{ connected, subscribe }}>{children}</SseContext.Provider>
  );
};

// eslint-disable-next-line react-refresh/only-export-components
export const useSse = () => {
  const ctx = useContext(SseContext);
  if (!ctx) throw new Error('useSse must be used within an SseProvider');
  return ctx;
};

/**
 * 이벤트가 오거나 재연결되면 `onRefresh` 를 부른다.
 *
 * 화면은 이것만 붙이면 되고, "무엇을 다시 읽을지"는 화면이 정한다.
 * 재연결 신호는 자동으로 포함된다.
 */
// eslint-disable-next-line react-refresh/only-export-components
export function useSseRefresh(events: SseEvent[], onRefresh: () => void) {
  const { subscribe } = useSse();
  const callback = useRef(onRefresh);
  callback.current = onRefresh;

  // 호출부가 매 렌더 새 배열을 넘겨도 재구독하지 않도록 내용으로 키를 만든다.
  const key = events.join(',');
  useEffect(() => {
    const signals: Signal[] = key ? (key.split(',') as SseEvent[]) : [];
    return subscribe([...signals, SSE_RECONNECT], () => callback.current());
  }, [key, subscribe]);
}
