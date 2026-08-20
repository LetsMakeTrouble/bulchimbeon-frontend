import { useCallback, useEffect, useRef, useState } from 'react';
import { ArrowUp, Loader2, Paperclip } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { questionsApi } from '../infrastructure/http/questions';
import { fetchLatestMessages, messagesApi } from '../infrastructure/http/messages';
import { useSse, useSseRefresh } from '../context/SseContext';
import type {
  Citation,
  ConversationMessage,
  QuestionDetail,
  QuestionListItem,
} from '../types';

/** QuestionDetail 에는 created_at 이 없다 — 시각은 목록 아이템에서 가져온다. */
type TimelineEntry =
  | { kind: 'question'; id: string; at: string; item: QuestionListItem; detail: QuestionDetail }
  | { kind: 'message'; id: string; at: string; message: ConversationMessage };
import { AnswerBubble, PersonBubble } from '../components/chat/AnswerBubble';
import { CitationViewerModal } from '../components/common/CitationViewerModal';
import { Avatar } from '../components/ui/Avatar';
import { cn } from '../lib/cn';

/** SSE 가 끊겼을 때만 쓰는 폴백 간격 (§6 "SSE 미사용 시 2~3초 폴링"). */
const POLL_MS = 2500;

export function ChatPage() {
  const { user, activeProject } = useAuth();
  const { connected } = useSse();
  const projectId = activeProject?.id;
  const isAsker = activeProject?.role === 'asker';
  const myId = user?.id;

  const [timeline, setTimeline] = useState<TimelineEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [draft, setDraft] = useState('');
  const [urgent, setUrgent] = useState(false);
  const [sending, setSending] = useState(false);
  const [sendNotice, setSendNotice] = useState<string | null>(null);
  const [citation, setCitation] = useState<Citation | null>(null);
  // 질문자만 AI 질문(§6)과 대화 메시지(§6.1)를 오간다 — 담당자는 항상 대화다 (D17).
  const [composerMode, setComposerMode] = useState<'question' | 'message'>('question');
  const mode = isAsker ? composerMode : 'message';
  const bottomRef = useRef<HTMLDivElement>(null);
  /**
   * 실행 순번. 프로젝트 전환 직후 이전 프로젝트의 느린 응답(목록 + 상세 20건)이
   * 늦게 도착해 새 프로젝트의 타임라인을 덮어쓰는 경합을 막는다 — 최신 실행분만 쓴다.
   */
  const loadSeq = useRef(0);

  const loadThread = useCallback(async () => {
    if (!projectId) return;
    const seq = ++loadSeq.current;
    setError(false);
    try {
      const [page, messages] = await Promise.all([
        // 담당자는 질문할 수 없어(D17) mine=true 면 항상 0건이다 — 담당자에겐 전체 목록을 보여준다.
        questionsApi.list(projectId, isAsker ? { mine: true, limit: 20 } : { limit: 20 }),
        fetchLatestMessages(projectId),
      ]);
      // 목록에는 답변 본문이 없다 — 스레드를 그리려면 각 질문의 상세가 필요하다.
      // ponytail: 20건 N+1 조회 + 질문 20건·메시지 100건의 비대칭 창(오래된 구간은 메시지만
      // 남는다), 계약에 목록 확장(embed=answer)이나 무한 스크롤이 생기면 교체
      const details = await Promise.all(
        page.items.map((i) => questionsApi.detail(i.id).catch(() => null))
      );
      const questionEntries = page.items.flatMap((item, i): TimelineEntry[] => {
        const detail = details[i];
        return detail
          ? [{ kind: 'question', id: item.id, at: item.created_at, item, detail }]
          : [];
      });
      if (seq !== loadSeq.current) return;
      const messageEntries = messages.map(
        (m): TimelineEntry => ({ kind: 'message', id: m.id, at: m.created_at, message: m })
      );
      setTimeline(
        [...questionEntries, ...messageEntries].sort(
          (a, b) => a.at.localeCompare(b.at) || a.id.localeCompare(b.id)
        )
      );
    } catch {
      // 실패해도 loading 이 안 꺼지면 스피너가 영구히 멈추지 않는다 — try 없이 await 만
      // 쌓이면 여기서 던진 예외가 setLoading(false) 를 건너뛰고 미처리 rejection 이 된다.
      if (seq === loadSeq.current) setError(true);
    } finally {
      if (seq === loadSeq.current) setLoading(false);
    }
  }, [projectId, isAsker]);

  // 프로젝트가 바뀌면 이전 대화를 비우고 스피너부터 다시 — SSE·전송 후 재조회는
  // loadThread 를 직접 불러 이 초기화를 타지 않는다.
  useEffect(() => {
    setLoading(true);
    setTimeline([]);
    loadThread();
  }, [loadThread]);

  // message.created 는 발신자 포함 활성 멤버 전원에게 온다 (§12.3) — 수신 시 재조회가 계약이다.
  useSseRefresh(['answer.completed', 'answer.updated', 'message.created'], loadThread);

  // 폴백 폴링. 스트림이 살아 있으면 돌리지 않는다 — 같은 일을 두 번 하는 셈이다.
  // 처리 중 답변만이 아니라 상대의 대화 메시지도 SSE 없이는 도착을 알 길이 없으므로
  // (message.created 유실, 재생 계약 없음 §12.2) 끊겨 있는 동안은 화면 전체를 폴링한다.
  useEffect(() => {
    if (connected) return;
    const timer = setInterval(loadThread, POLL_MS);
    return () => clearInterval(timer);
  }, [connected, loadThread]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [timeline.length]);

  const send = async () => {
    // sending 가드는 Cmd+Enter 연타용이다 — state 반영 전 두 번째 호출이 중복 POST 를 만든다.
    if (!projectId || !draft.trim() || sending) return;
    setSending(true);
    setSendNotice(null);
    try {
      if (mode === 'question') {
        await questionsApi.ask(projectId, draft.trim(), urgent ? 'urgent' : 'normal');
      } else {
        await messagesApi.send(projectId, draft.trim());
      }
      setDraft('');
      setUrgent(false);
      await loadThread();
    } catch {
      setSendNotice('전송에 실패했습니다. 잠시 후 다시 시도해 주세요.');
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
          {!loading && !error && timeline.length === 0 && (
            <p className="py-10 text-center text-[13px] text-ink-muted">
              아직 대화가 없습니다. 아래에 첫 {isAsker ? '질문' : '메시지'}을(를) 남겨보세요.
            </p>
          )}
          {timeline.map((entry) =>
            entry.kind === 'message' ? (
              <PersonBubble
                key={entry.id}
                text={entry.message.content}
                createdAt={entry.message.created_at}
                mine={entry.message.sender.id === myId}
                senderName={entry.message.sender.name}
                senderRole={entry.message.sender.role}
              />
            ) : (
              <div key={entry.id} className="flex flex-col gap-3">
                <PersonBubble
                  text={entry.detail.content_ko}
                  createdAt={entry.item.created_at}
                  mine={entry.detail.asked_by.id === myId}
                  senderName={entry.detail.asked_by.name}
                  senderRole="asker"
                />
                <AnswerBubble
                  question={entry.detail}
                  onOpenCitation={setCitation}
                  onFeedback={loadThread}
                />
              </div>
            )
          )}
          <div ref={bottomRef} />
        </div>
      </div>

      {/* §6.1 — 대화 메시지는 멤버면 역할 무관이다. 담당자도 여기서 발화한다. */}
      <div className="shrink-0 border-t border-line bg-surface px-6 py-4">
        <div className="mx-auto max-w-[760px]">
          {sendNotice && (
            <p className="mb-2 rounded-lg border border-danger-border bg-danger-surface px-3 py-2 text-[12px] font-bold text-danger">
              {sendNotice}
            </p>
          )}
          {isAsker && (
            <div className="mb-2 flex items-center gap-1">
              {(
                [
                  { key: 'question', label: 'AI 질문' },
                  { key: 'message', label: '대화' },
                ] as const
              ).map((m) => (
                <button
                  key={m.key}
                  type="button"
                  onClick={() => {
                    setComposerMode(m.key);
                    if (m.key === 'message') setUrgent(false);
                  }}
                  className={cn(
                    'h-7 rounded-full border px-3 text-[12px] font-bold transition-colors',
                    composerMode === m.key
                      ? 'border-brand-strong bg-brand-strong text-white'
                      : 'border-line-strong bg-surface text-ink hover:bg-surface-muted'
                  )}
                >
                  {m.label}
                </button>
              ))}
            </div>
          )}
          {urgent && mode === 'question' && (
            <p className="mb-2 flex items-center gap-2 rounded-lg border border-danger-border-soft bg-danger-surface-subtle px-3 py-2 text-[12px] font-medium text-danger">
              <span className="size-[7px] shrink-0 rounded-full bg-danger" />
              급함 모드: 담당자에게 즉시 멘션됩니다
            </p>
          )}
          <div
            className={cn(
              'overflow-hidden rounded-xl border bg-surface shadow-[0_1px_2px_0_rgba(30,32,44,0.04)]',
              urgent && mode === 'question'
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
              placeholder={mode === 'question' ? '질문을 입력하세요…' : '메시지를 입력하세요…'}
              className="w-full resize-none px-4 py-3 text-[14px] leading-[22px] text-ink placeholder:text-ink-subtle focus:outline-none"
            />
            <div className="flex items-center gap-2 border-t border-line px-3 py-2">
              {mode === 'question' && (
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
                  urgent && mode === 'question'
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
            {mode === 'question'
              ? 'AI가 근거 문서를 기반으로 1차 답변합니다. 중요한 내용은 담당자 확인 후 확정됩니다.'
              : '대화 메시지는 AI 답변 없이 프로젝트 멤버에게 그대로 전달됩니다.'}
          </p>
        </div>
      </div>

      {citation && <CitationViewerModal citation={citation} onClose={() => setCitation(null)} />}
    </div>
  );
}
