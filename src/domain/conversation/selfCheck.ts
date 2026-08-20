/** `node src/domain/conversation/selfCheck.ts` — 프레임워크 의존 0, 러너 없이 돈다. */
import assert from 'node:assert/strict';
import type {
  ConversationMessage,
  QuestionDetail,
  QuestionListItem,
  QuestionMode,
  Role,
} from '../../types/index.ts';
import { buildThread, canSend, isConversation } from './timeline.ts';

const item = (id: string, created_at: string, mode: QuestionMode = 'question') =>
  ({
    id,
    created_at,
    mode,
    content_ko: `q:${id}`,
    asked_by: { id: 'u-asker', name: '지수' },
  }) as QuestionListItem;
const detail = (id: string) => ({ id }) as QuestionDetail;
const message = (id: string, created_at: string, senderId = 'u-answerer') =>
  ({
    id,
    created_at,
    content: `m:${id}`,
    sender: { id: senderId, name: 'Mike', role: 'answerer' },
  }) as ConversationMessage;

// 세 종류의 발화가 한 스레드에 시간순으로 섞인다
assert.deepEqual(
  buildThread(
    [item('q2', '2026-08-20T04:00:00Z'), item('c1', '2026-08-20T02:00:00Z', 'conversation'), item('q1', '2026-08-20T01:00:00Z')],
    new Map([
      ['q1', detail('q1')],
      ['q2', detail('q2')],
    ]),
    [message('m1', '2026-08-20T03:00:00Z')]
  ).map((e) => e.id),
  ['q1', 'c1', 'm1', 'q2']
);

// 출처가 달라도 답변 없는 발화는 같은 모양으로 정규화된다
const [talkFromQuestion] = buildThread([item('c1', '2026-08-20T01:00:00Z', 'conversation')], new Map(), []);
const [talkFromMessage] = buildThread([], new Map(), [message('m1', '2026-08-20T01:00:00Z')]);
assert.equal(talkFromQuestion.kind, 'talk');
assert.equal(talkFromMessage.kind, 'talk');
assert.deepEqual(
  [talkFromQuestion, talkFromMessage].map((e) => e.kind === 'talk' && e.senderId),
  ['u-asker', 'u-answerer'],
  '발화자는 questions 면 asked_by, messages 면 sender 에서 온다'
);
// 역할: questions 출처는 D17 이 구조적으로 보장하고, messages 출처는 서버가 직접 준다
assert.deepEqual(
  [talkFromQuestion, talkFromMessage].map((e) => e.kind === 'talk' && e.senderRole),
  ['asker', 'answerer'],
  'questions 로는 담당자가 글을 만들 수 없으므로 asked_by 는 항상 asker 다'
);

// 표기가 섞여도 시각으로 정렬한다 — 사전순이면 '10:00+09:00'(=01:00Z)가 뒤로 간다
assert.deepEqual(
  buildThread([], new Map(), [
    message('a', '2026-08-20T10:00:00+09:00'),
    message('b', '2026-08-20T02:00:00Z'),
  ]).map((e) => e.id),
  ['a', 'b'],
  '오프셋 표기를 문자열로 비교하면 순서가 뒤집힌다'
);

// 같은 시각이면 id 로 갈린다 — 폴링마다 순서가 흔들리면 안 된다
assert.deepEqual(
  buildThread([], new Map(), [message('b', '2026-08-20T01:00:00Z'), message('a', '2026-08-20T01:00:00Z')]).map(
    (e) => e.id
  ),
  ['a', 'b']
);

// 상세를 못 읽은 질문은 빠지고, 대화는 상세 없이도 남는다
assert.deepEqual(
  buildThread(
    [item('c1', '2026-08-20T01:00:00Z', 'conversation'), item('q1', '2026-08-20T02:00:00Z')],
    new Map(),
    []
  ).map((e) => e.id),
  ['c1'],
  '상세 없는 질문은 답변 말풍선을 그릴 수 없어 뺀다'
);

assert.ok(isConversation(item('x', '2026-08-20T01:00:00Z', 'conversation')));
assert.ok(!isConversation(item('x', '2026-08-20T01:00:00Z')));

// D17 — require_asker 는 mode 와 무관하다. 대화 채널에는 제한이 없다.
const roles: Role[] = ['asker', 'answerer'];
const modes: QuestionMode[] = ['question', 'conversation'];
assert.ok(canSend('asker', 'question'));
assert.ok(!canSend('answerer', 'question'), '담당자의 질문은 403 이라 버튼이 살아 있으면 안 된다');
assert.ok(roles.every((r) => canSend(r, 'conversation')), '대화 채널에는 역할 제한이 없다');
assert.equal(
  roles.flatMap((r) => modes.filter((m) => canSend(r, m))).length,
  3,
  '4개 조합 중 막히는 건 담당자×질문 하나뿐이다'
);

console.log('domain/conversation self-check: ok');
