import { http } from './client';
import type { ConversationMessage, Paginated } from '../../types';

/**
 * §6.1 프로젝트 대화 채널.
 *
 * 질문 API 와 갈리는 지점은 하나다 — **역할 제한이 없다**. 멤버면 질문자든 담당자든
 * 읽고 쓴다(비멤버는 403 NOT_MEMBER). D17 은 질문에만 걸리는 규칙이고, 담당자가
 * 발화할 수 있는 유일한 통로가 여기다.
 */
export const messagesApi = {
  /** created_at 오름차순으로 내려온다 — 채팅 화면 순서 그대로다. */
  list: (projectId: string, params: { limit?: number; offset?: number } = {}) =>
    http.get<Paginated<ConversationMessage>>(`/projects/${projectId}/messages`, {
      params: { limit: 50, offset: 0, ...params },
    }),

  /** 빈 문자열·공백만이면 400 VALIDATION_ERROR — 호출부에서 trim 후 보낸다. */
  send: (projectId: string, content: string) =>
    http.post<ConversationMessage>(`/projects/${projectId}/messages`, { content }),
};

/**
 * 서버가 아직 이 채널을 모르는가.
 *
 * 엔드포인트는 2026-08-20 커밋으로 들어왔다 — 그 이전 배포본에 붙으면 404 다. 이걸 일반
 * 오류로 취급하면 질문 타임라인이 멀쩡한데도 화면 전체가 빨간 배너가 된다. 404 만 갈라내
 * 노란 안내로 낮추고, 나머지 실패(500·네트워크)는 그대로 던진다.
 * ponytail: 배포 확인되면 이 함수와 호출부 3줄을 지운다
 */
export const isNotDeployed = (err: unknown): boolean =>
  (err as { response?: { status?: number } })?.response?.status === 404;
