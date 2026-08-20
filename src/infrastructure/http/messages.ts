import { http } from './client';
import type { ConversationMessage, Paginated } from '../../types';

/** §6.1 limit 상한 — 백엔드 Query(le=100) 와 같은 값이다. */
export const MESSAGES_MAX_LIMIT = 100;

export const messagesApi = {
  /** §6.1 목록 — 멤버면 역할 무관 (비멤버 403 NOT_MEMBER). items 는 created_at 오름차순 */
  list: (projectId: string, params: { limit?: number; offset?: number } = {}) =>
    http.get<Paginated<ConversationMessage>>(`/projects/${projectId}/messages`, {
      params: { limit: 20, offset: 0, ...params },
    }),

  /**
   * 발송 → 201 생성된 메시지. AI·알림은 붙지 않고 SSE message.created 만 나간다.
   * 공백만인 본문은 400 VALIDATION_ERROR — 호출부가 trim 으로 먼저 거른다.
   */
  send: (projectId: string, content: string) =>
    http.post<ConversationMessage>(`/projects/${projectId}/messages`, { content }),
};

/**
 * 최신 메시지 창(window)을 가져온다.
 *
 * 목록이 오름차순이라 offset 0 은 "가장 오래된" 쪽이다 — 채팅 화면은 최신이 필요하므로
 * total 이 창보다 크면 끝에서 limit 만큼 다시 읽는다 (최악 2회 요청).
 */
export async function fetchLatestMessages(
  projectId: string,
  limit = MESSAGES_MAX_LIMIT
): Promise<ConversationMessage[]> {
  const first = await messagesApi.list(projectId, { limit, offset: 0 });
  if (first.total <= limit) return first.items;
  const last = await messagesApi.list(projectId, {
    limit,
    offset: first.total - limit,
  });
  return last.items;
}
