import { useCallback, useEffect, useRef, useState } from 'react';
import { ArrowUp, Loader2, Paperclip } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { questionsApi } from '../api/questions';
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
  const [draft, setDraft] = useState('');
  const [urgent, setUrgent] = useState(false);
  const [sending, setSending] = useState(false);
  const [citation, setCitation] = useState<Citation | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);

  const loadThread = useCallback(async () => {
    if (!projectId) return;
    const page = await questionsApi.list(projectId, { mine: true, limit: 20 });
    // 목록에는 답변 본문이 없다 — 스레드를 그리려면 각 질문의 상세가 필요하다.
    const details = await Promise.all(
      page.items.map((i) => questionsApi.detail(i.id).catch(() => null))
    );
    setThread(
      page.items
        .map((item, i) => ({ item, detail: details[i] }))
        .filter((x): x is ThreadItem => x.detail !== null)
        .sort((a, b) => a.item.created_at.localeCompare(b.item.created_at))
    );
    setLoading(false);
  }, [projectId]);

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
    try {
      await questionsApi.ask(projectId, draft.trim(), urgent ? 'urgent' : 'normal');
      setDraft('');
      setUrgent(false);
      await loadThread();
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
        <Avatar name={activeProject.name} size={36} />
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
          {!loading && thread.length === 0 && (
            <p className="py-10 text-center text-[13px] text-ink-muted">
              아직 질문이 없습니다. 아래에 첫 질문을 남겨보세요.
            </p>
          )}
          {thread.map(({ item, detail }) => (
            <div key={item.id} className="flex flex-col gap-3">
              <QuestionBubble text={detail.content_ko} createdAt={item.created_at} />
              <AnswerBubble question={detail} onOpenCitation={setCitation} onFeedback={loadThread} />
            </div>
          ))}
          <div ref={bottomRef} />
        </div>
      </div>

      {/* 담당자는 자기 프로젝트에 질문할 수 없다 (D17) — 서버도 403 이지만 입력창부터 감춘다 */}
      {isAsker ? (
        <div className="shrink-0 border-t border-line bg-surface px-6 py-4">
          <div className="mx-auto max-w-[760px]">
            {urgent && (
              <p className="mb-2 rounded-lg border border-danger-border bg-danger-surface px-3 py-2 text-[12px] font-bold text-danger">
                급함 모드: 담당자에게 즉시 멘션됩니다
              </p>
            )}
            <div
              className={cn(
                'overflow-hidden rounded-xl border bg-surface',
                urgent ? 'border-danger-border' : 'border-line-strong'
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
                    'inline-flex items-center gap-2 rounded-full border px-2.5 py-1 text-[11px] font-bold transition-colors',
                    urgent
                      ? 'border-danger-border bg-danger-surface text-danger'
                      : 'border-line bg-surface text-ink-muted'
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
                  className="ml-auto flex size-9 items-center justify-center rounded-lg bg-brand-strong text-white disabled:bg-brand-border"
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
