import type {
  ConversationMessage,
  QuestionDetail,
  QuestionListItem,
  QuestionMode,
  Role,
} from '../../types/index.ts';

/**
 * 채팅방 타임라인 규칙.
 *
 * 한 프로젝트의 발화가 **두 리소스에 나뉘어** 있다:
 *  - `questions` — AI 답변을 받는 질문. mode="conversation" 이면 답변 없는 질문자 단방향 발화다.
 *  - `messages`  — 역할 제한 없는 대화 채널. 담당자가 말할 수 있는 유일한 곳.
 * 둘을 한 화면에 합칠지는 계약에 정해진 바가 없어 화면이 정한다 — 여기서는 합친다.
 * 사람이 보기에 둘 다 "이 방에서 오간 말"이고, 나눠 놓으면 답장이 어느 탭에 있는지
 * 매번 찾아야 한다.
 *
 * SRP: 여기가 바뀌는 이유는 "무엇이 한 방에 함께 흐르는가", "누가 무엇을 보낼 수 있는가"가
 * 바뀔 때뿐이다. 말풍선을 어느 쪽에 그리는지는 표현 계층 몫이다.
 */

/**
 * questions 로 만들어진 발화의 발화자 역할.
 *
 * 배지의 의미는 "**현재** 이 프로젝트에서의 역할"이다 — `/messages` 의 `sender.role` 이
 * 저장값이 아니라 조회 시점 `project_members.role` 조인이라 그렇게 정의돼 있다(D16 으로 바뀐다).
 * questions 에는 role 이 아예 없으므로 여기서 채워 넣는데, 그 값이 'asker' 로 고정돼도
 * **현재 역할과 어긋나지 않는다.** 배지는 남의 말풍선에만 붙기 때문이다:
 *  - 담당자가 볼 때: 질문 작성자는 전부 질문자다. 현재 역할이 담당자인 사람은 자기 자신뿐이고
 *    (프로젝트당 담당자 1명), 자기 말풍선에는 배지가 없다.
 *  - 질문자가 볼 때: `mine=true` 라 질문은 전부 자기 것 → 역시 배지가 없다.
 * `create_question` 경로에 `require_asker` 가 걸려 있어(D17) 애초에 담당자는 질문을 만들 수 없다.
 *
 * ⚠️ 이 등식이 깨지는 조건은 하나다 — **프로젝트에 담당자가 둘 이상 생기는 것**.
 * 그때는 이 상수를 지우고 멤버 목록(`projectsApi.members`)에서 현재 역할을 읽으면 된다.
 * 그 엔드포인트는 `require_member` 라 질문자도 부를 수 있다 — 역할별 분기가 필요 없다.
 */
export const QUESTION_SENDER_ROLE: Role = 'asker';

/** 답변이 붙지 않는 순수 발화. 출처(questions/messages)가 달라도 화면에는 같은 것이다. */
export interface TalkEntry {
  kind: 'talk';
  id: string;
  at: string;
  senderId: string;
  senderName: string;
  senderRole: Role;
  text: string;
}

export type ThreadEntry =
  | { kind: 'question'; id: string; at: string; item: QuestionListItem; detail: QuestionDetail }
  | TalkEntry;

export const isConversation = (item: Pick<QuestionListItem, 'mode'>): boolean =>
  item.mode === 'conversation';

/**
 * 두 출처를 하나의 시간순 스레드로 만든다.
 *
 * 질문인데 상세를 못 읽었으면 답변 말풍선을 그릴 수 없으므로 아예 뺀다 —
 * 반쪽짜리 항목을 남기면 "답변이 사라진 질문"처럼 보여 더 나쁘다.
 */
export function buildThread(
  items: QuestionListItem[],
  detailsById: Map<string, QuestionDetail>,
  messages: ConversationMessage[]
): ThreadEntry[] {
  const fromQuestions = items.flatMap((item): ThreadEntry[] => {
    if (isConversation(item)) {
      // mode="conversation" 은 answer 가 항상 null 이다 — 상세를 읽지 않고 목록만으로 그린다.
      return [
        {
          kind: 'talk',
          id: item.id,
          at: item.created_at,
          senderId: item.asked_by.id,
          senderName: item.asked_by.name,
          senderRole: QUESTION_SENDER_ROLE,
          text: item.content_ko,
        },
      ];
    }
    const detail = detailsById.get(item.id);
    return detail ? [{ kind: 'question', id: item.id, at: item.created_at, item, detail }] : [];
  });

  const fromMessages: ThreadEntry[] = messages.map((m) => ({
    kind: 'talk',
    id: m.id,
    at: m.created_at,
    senderId: m.sender.id,
    senderName: m.sender.name,
    // 대화 채널은 발화자 role 을 직접 준다 — 여기선 추론할 필요가 없다.
    senderRole: m.sender.role,
    text: m.content,
  }));

  // 문자열 비교가 아니라 시각 비교다 — 두 API 가 오프셋 표기('+09:00')와 'Z' 를 섞어 보내면
  // 사전순 정렬은 조용히 뒤집힌다. 같은 시각이면 id 로 갈라 폴링마다 순서가 흔들리지 않게 한다.
  return [...fromQuestions, ...fromMessages].sort(
    (a, b) => Date.parse(a.at) - Date.parse(b.at) || a.id.localeCompare(b.id)
  );
}

/**
 * D17 — 담당자는 자기 프로젝트에 **질문**할 수 없다(서버 403 FORBIDDEN_ROLE).
 * `require_asker` 는 mode 와 무관하게 걸리므로 mode="conversation" 도 예외가 아니다.
 * 대화 채널(`/messages`)에는 이 제한이 없다 — 그래서 화면의 "대화" 전송은 그쪽으로 간다.
 */
export const canSend = (role: Role, mode: QuestionMode): boolean =>
  mode === 'conversation' || role === 'asker';
