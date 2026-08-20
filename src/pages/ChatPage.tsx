import { useCallback, useEffect, useRef, useState } from 'react';
import { ArrowUp, Loader2, Paperclip } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { questionsApi } from '../infrastructure/http/questions';
import { isNotDeployed, messagesApi } from '../infrastructure/http/messages';
import { errorCode } from '../infrastructure/http/client';
import { useSse, useSseRefresh } from '../context/SseContext';
import {
  buildThread,
  canSend,
  isConversation,
  QUESTION_SENDER_ROLE,
  type ThreadEntry,
} from '../domain/conversation/timeline';
import type { Citation, ConversationMessage, QuestionDetail, QuestionMode } from '../types';
import { AnswerBubble } from '../components/chat/AnswerBubble';
import { PersonBubble } from '../components/chat/PersonBubble';
import { CitationViewerModal } from '../components/common/CitationViewerModal';
import { Avatar } from '../components/ui/Avatar';
import { cn } from '../lib/cn';

/** SSE 가 끊겼을 때만 쓰는 폴백 간격 (§6 "SSE 미사용 시 2~3초 폴링"). */
const POLL_MS = 2500;

export function ChatPage() {
  const { user, activeProject } = useAuth();
  const { connected } = useSse();
  const projectId = activeProject?.id;
  const role = activeProject?.role;
  const isAsker = role === 'asker';

  const [entries, setEntries] = useState<ThreadEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  /** 서버가 대화 채널을 아직 모르는가 — 질문 타임라인만으로 화면을 유지한다. */
  const [talkOff, setTalkOff] = useState(false);
  /**
   * 초안은 **탭별로** 든다.
   *
   * 하나로 두면 질문 탭에서 쓰던 글이 대화 탭으로 넘어가고, 그 상태로 보내면 AI 질문이
   * 대화 메시지로 조용히 나간다 — 탭을 나눈 목적이 무색해지는 오발송이다.
   * 탭 전환 시 비우는 방법도 있지만 그러면 잘못 누른 한 번에 쓰던 글이 날아간다.
   */
  const [drafts, setDrafts] = useState<Record<QuestionMode, string>>({
    question: '',
    conversation: '',
  });
  /** null 이면 "아직 안 골랐다" — 역할 기본값을 따른다. 프로젝트를 바꿔도 되돌릴 필요가 없다. */
  const [tab, setTab] = useState<QuestionMode | null>(null);
  const [urgent, setUrgent] = useState(false);
  const [sending, setSending] = useState(false);
  const [sendNotice, setSendNotice] = useState<string | null>(null);
  const [citation, setCitation] = useState<Citation | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  /**
   * 목록 아이템 → 상세 캐시. 키가 아이템 전체라 아이템이 한 글자라도 달라지면 자동으로 다시 읽는다.
   * 이게 없으면 폴링 한 틱마다 상세 20건을 통째로 다시 부른다.
   */
  const detailCache = useRef(new Map<string, QuestionDetail>());
  /**
   * 조회 순번.
   *
   * A 프로젝트를 읽는 중에 B 로 바꾸면 A 응답이 뒤늦게 도착해 B 화면을 덮는다.
   * 폴링·SSE 재조회까지 겹치면 같은 화면 안에서도 순서가 뒤집힐 수 있다.
   * 마지막으로 시작한 조회만 상태를 쓴다.
   */
  const loadSeq = useRef(0);

  // 질문자는 질문 탭, 담당자는 애초에 질문을 못 하므로(D17) 대화 탭에서 시작한다.
  const activeTab: QuestionMode = tab ?? (isAsker ? 'question' : 'conversation');
  const isQuestionTab = activeTab === 'question';
  /** 이 탭에서 입력창을 열어도 되는가 — 담당자×질문 조합만 막힌다. */
  const canSendHere = role ? canSend(role, activeTab) : false;
  const draft = drafts[activeTab];
  const setDraft = (value: string) => setDrafts((d) => ({ ...d, [activeTab]: value }));

  const loadThread = useCallback(async () => {
    if (!projectId) return;
    const seq = ++loadSeq.current;
    setError(false);
    let off = false;
    try {
      const [page, messages] = await Promise.all([
        // 담당자는 질문할 수 없어(D17) mine=true 면 항상 0건이다 — 담당자에겐 전체 목록을 보여준다.
        // 질문자의 mine=true 는 그대로 둔다. 담당자 답장은 질문이 아니라 대화 채널로 오므로
        // 이 필터 때문에 가려지지 않는다.
        questionsApi.list(projectId, isAsker ? { mine: true, limit: 50 } : { limit: 50 }),
        messagesApi
          .list(projectId)
          .then((r) => r.items)
          .catch((err): ConversationMessage[] => {
            // 404 만 "미배포"로 낮춘다. 500·네트워크 오류는 그대로 던져 배너를 띄운다.
            if (!isNotDeployed(err)) throw err;
            off = true;
            return [];
          }),
      ]);

      // 대화는 answer 가 없어 상세가 필요 없다 — 상세 조회는 AI 질문에만 든다.
      const byId = new Map<string, QuestionDetail>();
      const nextCache = new Map<string, QuestionDetail>();
      await Promise.all(
        page.items
          .filter((item) => !isConversation(item))
          .map(async (item) => {
            const key = JSON.stringify(item);
            const detail =
              detailCache.current.get(key) ??
              (await questionsApi.detail(item.id).catch(() => null));
            if (!detail) return;
            nextCache.set(key, detail);
            byId.set(item.id, detail);
          })
      );
      // 낡은 조회가 캐시를 덮으면 새 프로젝트가 방금 읽어둔 상세를 잃는다.
      if (seq !== loadSeq.current) return;
      detailCache.current = nextCache;

      setEntries(buildThread(page.items, byId, messages));
    } catch {
      // 실패해도 loading 이 안 꺼지면 스피너가 영구히 멈추지 않는다 — try 없이 await 만
      // 쌓이면 여기서 던진 예외가 setLoading(false) 를 건너뛰고 미처리 rejection 이 된다.
      if (seq !== loadSeq.current) return;
      setError(true);
    } finally {
      // try 안의 return 도 여기를 지난다 — 그래서 여기서도 순번을 다시 본다.
      if (seq === loadSeq.current) {
        setTalkOff(off);
        setLoading(false);
      }
    }
  }, [projectId, isAsker]);

  useEffect(() => {
    loadThread();
  }, [loadThread]);

  /**
   * held·failed 는 **답변이 만들어지지 않는다** — 그래서 answer.completed 가 영영 안 온다.
   * 그 둘만 구독하면 "답변을 검토하고 있어요" 스피너에서 넘어가지 못한다.
   * 대신 카드가 생기므로 card.created(담당자 쪽)와 notification.created(질문자 쪽)를 같이 듣는다.
   */
  useSseRefresh(
    ['answer.completed', 'answer.updated', 'message.created', 'card.created', 'notification.created'],
    loadThread
  );

  const hasProcessing = entries.some(
    (e) => e.kind === 'question' && e.detail.status === 'processing'
  );

  /**
   * 폴백 폴링.
   *
   * 평소에는 스트림이 살아 있으면 돌리지 않는다 — 같은 일을 두 번 하는 셈이다. 다만
   * processing 이 남아 있는 동안에는 붙어 있어도 돈다: 위 이벤트 중 **어느 것이 누구에게
   * 가는지**(카드 이벤트는 담당자만 받을 수 있다)에 의존하지 않고 스피너가 반드시 풀리게 하려는 것이다.
   * 처리 중인 질문이 없으면 곧바로 멈추므로 상시 부하는 아니다.
   */
  useEffect(() => {
    if (connected && !hasProcessing) return;
    const timer = setInterval(loadThread, POLL_MS);
    return () => clearInterval(timer);
  }, [connected, hasProcessing, loadThread]);

  /**
   * 탭이 화면을 가른다.
   *
   * `buildThread` 가 이미 발화 종류로 태깅해 두므로 여기서는 고르기만 한다. 데이터는
   * 한 벌이라 탭을 옮겨도 다시 읽지 않는다.
   * ⚠️ 질문 목록 API 에 mode 필터가 없어(서버는 한 목록을 준다) 분할이 클라이언트 몫이다 —
   * 즉 limit 안에서 한쪽이 많으면 다른 탭이 그만큼 짧아진다.
   * ponytail: 계약에 mode 필터나 커서 페이지네이션이 생기면 탭별로 따로 읽는다
   */
  const visible = entries.filter((e) =>
    isQuestionTab ? e.kind === 'question' : e.kind === 'talk'
  );

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [visible.length, activeTab]);

  const send = async () => {
    const text = draft.trim();
    // `sending` 가드는 Cmd+Enter 연타용이다 — 보내기 버튼은 disabled 로 막히지만
    // 단축키는 버튼을 거치지 않고 이 함수를 직접 부른다. state 반영 전에 두 번째
    // keydown 이 들어오면 같은 내용이 두 번 POST 된다.
    if (!projectId || !role || !text || !canSendHere || sending) return;
    setSending(true);
    setSendNotice(null);
    try {
      // 대화를 questions?mode=conversation 으로 보내면 담당자는 403 이라 반쪽 채널이 된다.
      // 양쪽이 같은 곳에 쓰도록 대화는 전부 대화 채널로 보낸다.
      if (isQuestionTab) await questionsApi.ask(projectId, text, urgent ? 'urgent' : 'normal', 'question');
      else await messagesApi.send(projectId, text);
      setDraft('');
      setUrgent(false);
      await loadThread();
    } catch (err) {
      // 403 을 "전송 실패"로 뭉개지 않는다 — 담당자의 대화까지 D17 이 막고 있다는
      // 신호이고, 그건 재시도로 풀리지 않는 서버 쪽 문제다.
      const code = errorCode(err);
      setSendNotice(
        isNotDeployed(err)
          ? '대화 채널이 아직 서버에 배포되지 않았습니다.'
          : code === 'FORBIDDEN_ROLE'
            ? '서버가 이 전송을 역할 제한으로 막았습니다(D17).'
            : code === 'NOT_MEMBER'
              ? '이 프로젝트의 멤버가 아니라 대화를 보낼 수 없습니다.'
              : '전송에 실패했습니다. 잠시 후 다시 시도해 주세요.'
      );
    } finally {
      setSending(false);
    }
  };

  if (!activeProject) {
    return <p className="p-10 text-[13px] text-ink-muted">프로젝트를 먼저 선택하세요.</p>;
  }

  return (
    <div className="flex h-full flex-col">
      <div className="flex shrink-0 items-center gap-3 border-b border-line bg-surface px-6 py-3.5">
        <Avatar name={activeProject.name} size={40} />
        <div>
          <p className="text-[14px] font-bold text-ink">{activeProject.name}</p>
          <p className="text-[12px] text-ink-muted">
            {activeProject.away_mode
              ? '담당자 자리 비움 · 출근 후 확인 예정'
              : '담당자 확인 가능'}
          </p>
        </div>
      </div>

      {/* 대화창/질문창 분리 — 같은 데이터를 발화 종류로 갈라 보여준다 */}
      <div className="flex shrink-0 gap-1 border-b border-line bg-surface px-6" role="tablist">
        {([
          { key: 'conversation' as const, label: '대화' },
          { key: 'question' as const, label: '질문' },
        ]).map((t) => (
          <button
            key={t.key}
            role="tab"
            aria-selected={activeTab === t.key}
            onClick={() => {
              setTab(t.key);
              setSendNotice(null);
            }}
            className={cn(
              'relative -mb-px px-4 py-2.5 text-[13px] font-bold transition-colors',
              activeTab === t.key
                ? 'border-b-2 border-brand-strong text-brand-deep'
                : 'border-b-2 border-transparent text-ink-muted hover:text-ink'
            )}
          >
            {t.label}
          </button>
        ))}
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto px-6 py-6">
        <div className="mx-auto flex max-w-[760px] flex-col gap-5">
          {loading && (
            <p className="flex items-center gap-2 text-[13px] text-ink-muted">
              <Loader2 className="size-4 animate-spin" /> 대화를 불러오는 중…
            </p>
          )}
          {!loading && error && (
            <p className="rounded-lg border border-danger-border bg-danger-surface px-3 py-2 text-center text-[12px] font-bold text-danger">
              대화를 불러오지 못했습니다. 잠시 후 다시 시도해 주세요.
            </p>
          )}
          {!loading && !error && visible.length === 0 && (
            <p className="py-10 text-center text-[13px] text-ink-muted">
              {isQuestionTab
                ? isAsker
                  ? '아직 질문이 없습니다. 아래에 첫 질문을 남겨보세요.'
                  : '아직 들어온 질문이 없습니다.'
                : '아직 대화가 없습니다. 아래에 첫 메시지를 남겨보세요.'}
            </p>
          )}
          {visible.map((entry) =>
            entry.kind === 'talk' ? (
              <PersonBubble
                key={entry.id}
                name={entry.senderName}
                role={entry.senderRole}
                text={entry.text}
                createdAt={entry.at}
                own={entry.senderId === user?.id}
              />
            ) : (
              <div key={entry.id} className="flex flex-col gap-3">
                <PersonBubble
                  name={entry.item.asked_by.name}
                  role={QUESTION_SENDER_ROLE}
                  text={entry.item.content_ko}
                  createdAt={entry.at}
                  own={entry.item.asked_by.id === user?.id}
                />
                <AnswerBubble
                  question={entry.detail}
                  role={activeProject.role}
                  onOpenCitation={setCitation}
                  onFeedback={loadThread}
                />
              </div>
            )
          )}
          <div ref={bottomRef} />
        </div>
      </div>

      <div className="shrink-0 border-t border-line bg-surface px-6 py-4">
        <div className="mx-auto max-w-[760px]">
          {/* 담당자는 질문할 수 없다(D17) — 서버도 403 이지만 입력창부터 닫는다. 대화 탭에서는 열린다. */}
          {!canSendHere && (
            <p className="text-center text-[12px] text-ink-muted">
              담당자는 질문을 보낼 수 없습니다. 대화 탭에서 답장하세요.
            </p>
          )}
          {canSendHere && (
            <>
            {sendNotice && (
              <p className="mb-2 rounded-lg border border-danger-border bg-danger-surface px-3 py-2 text-[12px] font-bold text-danger">
                {sendNotice}
              </p>
            )}
            {talkOff && (
              <p className="mb-2 rounded-lg border border-warn-border bg-warn-surface px-3 py-2 text-[12px] font-bold text-warn">
                서버에 대화 채널이 아직 없습니다 — 대화 탭이 비어 보일 수 있습니다.
              </p>
            )}
            {isQuestionTab && urgent && (
              <p className="mb-2 flex items-center gap-2 rounded-lg border border-danger-border-soft bg-danger-surface-subtle px-3 py-2 text-[12px] font-medium text-danger">
                <span className="size-[7px] shrink-0 rounded-full bg-danger" />
                급함 모드: 담당자에게 즉시 멘션됩니다
              </p>
            )}
            <div
              className={cn(
                'overflow-hidden rounded-xl border bg-surface shadow-[0_1px_2px_0_rgba(30,32,44,0.04)]',
                isQuestionTab && urgent
                  ? 'border-2 border-danger-border'
                  : 'border-line-strong'
              )}
            >
              <textarea
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) send();
                }}
                rows={2}
                placeholder={
                  isQuestionTab ? '질문을 입력하세요…' : '메시지를 입력하세요…'
                }
                className="w-full resize-none px-4 py-3 text-[14px] leading-[22px] text-ink placeholder:text-ink-subtle focus:outline-none"
              />
              <div className="flex items-center gap-2 border-t border-line px-3 py-2">
                {isQuestionTab && (
                  <button
                    type="button"
                    onClick={() => setUrgent((v) => !v)}
                    className={cn(
                      'inline-flex h-7 items-center gap-1.5 rounded-full border px-2.5 text-[12px] font-bold transition-colors',
                      urgent
                        ? 'border-[1.5px] border-danger-border bg-danger-surface-subtle text-danger'
                        : 'border-line-strong bg-surface-subtle text-ink'
                    )}
                  >
                    급함
                    <span
                      className={cn(
                        'relative h-3.5 w-6 rounded-full transition-colors',
                        urgent ? 'bg-danger-border' : 'bg-line-strong'
                      )}
                    >
                      <span
                        className={cn(
                          'absolute top-0.5 size-2.5 rounded-full bg-white transition-[left]',
                          urgent ? 'left-3' : 'left-0.5'
                        )}
                      />
                    </span>
                  </button>
                )}
                <button
                  type="button"
                  disabled
                  title="문서 첨부는 아직 API 계약에 없습니다"
                  className="inline-flex cursor-not-allowed items-center gap-1.5 rounded-md border border-line px-2.5 py-1 text-[11px] font-bold text-ink-subtle"
                >
                  <Paperclip className="size-3.5" /> 문서 첨부
                </button>
                <button
                  onClick={send}
                  disabled={sending || !draft.trim()}
                  aria-label="보내기"
                  className={cn(
                    'ml-auto flex size-11 items-center justify-center rounded-[10px] text-white transition-colors',
                    isQuestionTab && urgent
                      ? 'bg-danger disabled:bg-danger-border-soft'
                      : 'bg-brand-strong disabled:bg-brand-border'
                  )}
                >
                  {sending ? (
                    <Loader2 className="size-4 animate-spin" />
                  ) : (
                    <ArrowUp className="size-4" />
                  )}
                </button>
              </div>
            </div>
            <p className="mt-2 text-center text-[11px] text-ink-muted">
              {isQuestionTab
                ? 'AI가 근거 문서를 기반으로 1차 답변합니다. 중요한 내용은 담당자 확인 후 확정됩니다.'
                : 'AI 답변 없이 상대에게 그대로 전달되는 메시지입니다.'}
            </p>
            </>
          )}
        </div>
      </div>

      {citation && <CitationViewerModal citation={citation} onClose={() => setCitation(null)} />}
    </div>
  );
}
