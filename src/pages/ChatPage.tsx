import { useCallback, useEffect, useRef, useState } from 'react';
import { ArrowUp, Loader2, Paperclip } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { questionsApi } from '../infrastructure/http/questions';
import { useSse, useSseRefresh } from '../context/SseContext';
import type { Citation, QuestionDetail, QuestionListItem } from '../types';

/** QuestionDetail 에는 created_at 이 없다 — 시각은 목록 아이템에서 가져온다. */
type ThreadItem = { item: QuestionListItem; detail: QuestionDetail };
import { AnswerBubble, QuestionBubble } from '../components/chat/AnswerBubble';
import { CitationViewerModal } from '../components/common/CitationViewerModal';
import { Avatar } from '../components/ui/Avatar';
import { cn } from '../lib/cn';

/** SSE 가 끊겼을 때만 쓰는 폴백 간격 (§6 "SSE 미사용 시 2~3초 폴링"). */
const POLL_MS = 2500;

export function ChatPage() {
  const { activeProject } = useAuth();
  const { connected } = useSse();
  const projectId = activeProject?.id;
  const isAsker = activeProject?.role === 'asker';

  const [thread, setThread] = useState<ThreadItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [draft, setDraft] = useState('');
  const [urgent, setUrgent] = useState(false);
  const [sending, setSending] = useState(false);
  const [sendNotice, setSendNotice] = useState<string | null>(null);
  const [citation, setCitation] = useState<Citation | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);

  const loadThread = useCallback(async () => {
    if (!projectId) return;
    setError(false);
    try {
      // 담당자는 질문할 수 없어(D17) mine=true 면 항상 0건이다 — 담당자에겐 전체 목록을 보여준다.
      const page = await questionsApi.list(
        projectId,
        isAsker ? { mine: true, limit: 20 } : { limit: 20 }
      );
      // 목록에는 답변 본문이 없다 — 스레드를 그리려면 각 질문의 상세가 필요하다.
      // ponytail: 20건 N+1 조회, 계약에 목록 확장(embed=answer)이나 무한 스크롤이 생기면 교체
      const details = await Promise.all(
        page.items.map((i) => questionsApi.detail(i.id).catch(() => null))
      );
      setThread(
        page.items
          .map((item, i) => ({ item, detail: details[i] }))
          .filter((x): x is ThreadItem => x.detail !== null)
          .sort((a, b) => a.item.created_at.localeCompare(b.item.created_at))
      );
    } catch {
      // 실패해도 loading 이 안 꺼지면 스피너가 영구히 멈추지 않는다 — try 없이 await 만
      // 쌓이면 여기서 던진 예외가 setLoading(false) 를 건너뛰고 미처리 rejection 이 된다.
      setError(true);
    } finally {
      setLoading(false);
    }
  }, [projectId, isAsker]);

  useEffect(() => {
    loadThread();
  }, [loadThread]);

  useSseRefresh(['answer.completed', 'answer.updated'], loadThread);

  // 폴백 폴링. 스트림이 살아 있으면 돌리지 않는다 — 같은 일을 두 번 하는 셈이다.
  useEffect(() => {
    if (connected) return;
    if (!thread.some((t) => t.detail.status === 'processing')) return;
    const timer = setInterval(loadThread, POLL_MS);
    return () => clearInterval(timer);
  }, [connected, thread, loadThread]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [thread.length]);

  const send = async () => {
    if (!projectId || !draft.trim()) return;
    setSending(true);
    setSendNotice(null);
    try {
      await questionsApi.ask(projectId, draft.trim(), urgent ? 'urgent' : 'normal');
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
          {!loading && !error && thread.length === 0 && (
            <p className="py-10 text-center text-[13px] text-ink-muted">
              아직 질문이 없습니다. 아래에 첫 질문을 남겨보세요.
            </p>
          )}
          {thread.map(({ item, detail }) => (
            <div key={item.id} className="flex flex-col gap-3">
              <QuestionBubble text={detail.content_ko} createdAt={item.created_at} />
              <AnswerBubble
                question={detail}
                role={activeProject.role}
                onOpenCitation={setCitation}
                onFeedback={loadThread}
              />
            </div>
          ))}
          <div ref={bottomRef} />
        </div>
      </div>

      {/* 담당자는 자기 프로젝트에 질문할 수 없다 (D17) — 서버도 403 이지만 입력창부터 감춘다 */}
      {isAsker ? (
        <div className="shrink-0 border-t border-line bg-surface px-6 py-4">
          <div className="mx-auto max-w-[760px]">
            {sendNotice && (
              <p className="mb-2 rounded-lg border border-danger-border bg-danger-surface px-3 py-2 text-[12px] font-bold text-danger">
                {sendNotice}
              </p>
            )}
            {urgent && (
              <p className="mb-2 flex items-center gap-2 rounded-lg border border-danger-border-soft bg-danger-surface-subtle px-3 py-2 text-[12px] font-medium text-danger">
                <span className="size-[7px] shrink-0 rounded-full bg-danger" />
                급함 모드: 담당자에게 즉시 멘션됩니다
              </p>
            )}
            <div
              className={cn(
                'overflow-hidden rounded-xl border bg-surface shadow-[0_1px_2px_0_rgba(30,32,44,0.04)]',
                urgent ? 'border-2 border-danger-border' : 'border-line-strong'
              )}
            >
              <textarea
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) send();
                }}
                rows={2}
                placeholder="질문을 입력하세요…"
                className="w-full resize-none px-4 py-3 text-[14px] leading-[22px] text-ink placeholder:text-ink-subtle focus:outline-none"
              />
              <div className="flex items-center gap-2 border-t border-line px-3 py-2">
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
                    urgent
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
              AI가 근거 문서를 기반으로 1차 답변합니다. 중요한 내용은 담당자 확인 후 확정됩니다.
            </p>
          </div>
        </div>
      ) : (
        <p className="shrink-0 border-t border-line bg-surface px-6 py-4 text-center text-[12px] text-ink-muted">
          담당자는 자기 프로젝트에 질문할 수 없습니다.
        </p>
      )}

      {citation && <CitationViewerModal citation={citation} onClose={() => setCitation(null)} />}
    </div>
  );
}
