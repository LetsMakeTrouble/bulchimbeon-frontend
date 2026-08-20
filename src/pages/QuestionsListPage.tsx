import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Loader2, Search } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { questionsApi } from '../infrastructure/http/questions';
import { useSseRefresh } from '../context/SseContext';
import type { Citation, QuestionDetail, QuestionListItem, QuestionStatus } from '../types';
import { Badge, QuestionStatusBadge } from '../components/ui/Badge';
import { Button } from '../components/ui/Button';
import { CitationBox } from '../components/inbox/CitationBox';
import { CitationViewerModal } from '../components/common/CitationViewerModal';
import { formatRelative } from '../lib/format';
import { cn } from '../lib/cn';

const STATUS_FILTERS: { key: QuestionStatus | 'all'; label: string }[] = [
  { key: 'all', label: '상태: 전체' },
  { key: 'answered', label: '답변됨' },
  { key: 'held', label: '보류' },
  { key: 'processing', label: '처리 중' },
  { key: 'failed', label: '실패' },
];

/** 한 번에 읽어오는 건수. 이 수만큼 꽉 차 오면 뒤에 더 있을 수 있다는 뜻이다. */
const PAGE_LIMIT = 50;

const chipClass =
  'flex h-[30px] items-center gap-1.5 whitespace-nowrap rounded-full border px-3 text-[12px] font-bold transition-colors';

export function QuestionsListPage() {
  const { activeProject } = useAuth();
  const projectId = activeProject?.id;

  const [items, setItems] = useState<QuestionListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [notice, setNotice] = useState<string | null>(null);
  const [status, setStatus] = useState<QuestionStatus | 'all'>('all');
  const [query, setQuery] = useState('');

  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [detail, setDetail] = useState<QuestionDetail | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [citation, setCitation] = useState<Citation | null>(null);
  // QuestionListItem 에 urgency 필드가 없어 "급함만"은 걸러낼 데이터 자체가
  // 없다(비활성으로 둔다). feedback_summary 는 있으므로 피드백만 클라이언트로 거른다.
  const [feedbackOnly, setFeedbackOnly] = useState(false);

  const load = useCallback(() => {
    if (!projectId) return;
    setLoading(true);
    setNotice(null);
    questionsApi
      .list(projectId, { ...(status === 'all' ? {} : { status }), limit: PAGE_LIMIT })
      .then((page) => {
        setItems(page.items);
        // 대화 발화를 고르면 좌측 목록에 없는 항목이 우측 상세에 "질문 원문"으로 뜬다.
        setSelectedId(
          (prev) => prev ?? page.items.find((i) => i.mode !== 'conversation')?.id ?? null
        );
      })
      .catch(() => setNotice('질문 목록을 불러오지 못했습니다.'))
      .finally(() => setLoading(false));
  }, [projectId, status]);

  useEffect(load, [load]);
  useSseRefresh(['answer.completed', 'answer.updated'], load);

  useEffect(() => {
    if (!selectedId) return;
    setDetailLoading(true);
    questionsApi
      .detail(selectedId)
      .then(setDetail)
      .catch(() => setDetail(null))
      .finally(() => setDetailLoading(false));
  }, [selectedId]);

  /**
   * 대화 발화도 `questions` 에 섞여 온다 — 여기는 질문 목록이라 먼저 뺀다.
   * 목록 API 에 mode 필터가 없어 클라이언트 몫이다.
   * ponytail: 서버에 mode 필터가 생기면 이 단계는 사라진다
   */
  const questions = useMemo(() => items.filter((i) => i.mode !== 'conversation'), [items]);

  // 검색은 목록 엔드포인트에 query 파라미터가 없어 클라이언트에서 거른다.
  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    // ponytail: 현재 페이지 20건만 훑는 클라이언트 검색, 목록 API 에 q 파라미터가 생기면 서버로 이관
    let list = q ? questions.filter((i) => i.content_ko.toLowerCase().includes(q)) : questions;
    if (feedbackOnly) list = list.filter((i) => (i.feedback_summary?.different ?? 0) > 0);
    return list;
  }, [questions, query, feedbackOnly]);

  if (!activeProject) {
    return <p className="p-10 text-[13px] text-ink-muted">프로젝트를 먼저 선택하세요.</p>;
  }

  return (
    <div className="flex h-full flex-col">
      <div className="shrink-0 border-b border-line bg-surface px-5 py-3.5">
        <label className="relative flex h-10 items-center">
          <Search className="pointer-events-none absolute left-3 size-3 text-ink-muted" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="질문 내용 검색"
            className="h-full w-full rounded-lg border border-line-strong bg-surface pl-8 pr-3 text-[13px] text-ink placeholder:text-ink-muted focus:border-brand focus:outline-none"
          />
        </label>

        <div className="mt-2.5 flex flex-wrap items-center gap-2">
          {STATUS_FILTERS.map((f) => (
            <button
              key={f.key}
              onClick={() => setStatus(f.key)}
              className={cn(
                chipClass,
                status === f.key
                  ? 'border-brand-strong bg-brand-strong text-white'
                  : 'border-line-strong bg-surface text-ink hover:bg-surface-muted'
              )}
            >
              {f.label}
            </button>
          ))}
          <span
            title="이 화면에서 급함 여부를 구분할 데이터가 아직 없습니다"
            className={cn(chipClass, 'cursor-not-allowed border-line-strong bg-surface text-ink-subtle')}
          >
            급함만
          </span>
          <button
            onClick={() => setFeedbackOnly((v) => !v)}
            className={cn(
              chipClass,
              feedbackOnly
                ? 'border-brand-strong bg-brand-strong text-white'
                : 'border-line-strong bg-surface text-ink hover:bg-surface-muted'
            )}
          >
            피드백
          </button>
          <span
            title="기간 필터는 아직 없습니다"
            className={cn(chipClass, 'cursor-not-allowed border-line-strong bg-surface text-ink-subtle')}
          >
            기간
          </span>
          <span className="ml-auto text-[11px] text-ink-muted">
            {/* 서버 total 은 대화 발화까지 센 값이고, mode 필터가 없어 뺄 수도 없다
                (다음 페이지의 대화 건수를 모른다) — 그래서 불러온 질문 수만 말한다 */}
            질문 {questions.length}건 중 {visible.length}건 표시
            {items.length >= PAGE_LIMIT && ' · 더 있을 수 있음'}
          </span>
        </div>
      </div>

      <div className="grid min-h-0 flex-1 grid-cols-[minmax(320px,420px)_1fr]">
        {/* 목록 */}
        <div className="min-h-0 overflow-y-auto border-r border-line bg-surface-muted p-4">
          {loading && (
            <p className="flex items-center gap-2 text-[13px] text-ink-muted">
              <Loader2 className="size-4 animate-spin" /> 불러오는 중…
            </p>
          )}
          {!loading && notice && (
            <p className="rounded-lg border border-danger-border bg-danger-surface px-3 py-2 text-[12px] font-bold text-danger">
              {notice}
            </p>
          )}
          {!loading && !notice && visible.length === 0 && (
            <p className="py-10 text-center text-[13px] text-ink-muted">질문이 없습니다.</p>
          )}
          <ul className="flex flex-col gap-2">
            {visible.map((q) => (
              <li key={q.id}>
                <button
                  onClick={() => setSelectedId(q.id)}
                  className={cn(
                    'w-full rounded-xl border px-4 py-3.5 text-left transition-colors',
                    selectedId === q.id
                      ? 'border-brand bg-surface'
                      : 'border-transparent bg-surface hover:border-line'
                  )}
                >
                  <p className="text-[14px] font-bold leading-[20px] text-ink">{q.content_ko}</p>
                  <div className="mt-2.5 flex items-center gap-1.5">
                    <QuestionStatusBadge status={q.status} grade={q.grade} state={q.state} />
                    {q.feedback_summary && q.feedback_summary.different > 0 && (
                      <Badge tone="purple">피드백 {q.feedback_summary.different}</Badge>
                    )}
                    <span className="ml-auto text-[11px] text-ink-muted">
                      {formatRelative(q.created_at)}
                    </span>
                  </div>
                </button>
              </li>
            ))}
          </ul>
        </div>

        {/* 상세 */}
        <div className="flex min-h-0 flex-col bg-surface">
          {detail && (
            <div className="flex shrink-0 items-center gap-2 border-b border-line px-5 py-3.5 shadow-[0_1px_2px_0_rgba(30,32,44,0.04)]">
              <QuestionStatusBadge
                status={detail.status}
                grade={detail.answer?.grade ?? null}
                state={detail.answer?.state}
              />
              {detail.urgency === 'urgent' && (
                <Badge tone="danger" dot>
                  급함
                </Badge>
              )}
              <span className="flex-1 truncate text-[11px] text-ink-muted">
                {detail.asked_by.name} 생성
              </span>
              <Link to="/chat">
                <Button variant="primary" size="sm">
                  대화로 이동
                </Button>
              </Link>
            </div>
          )}

          <div className="min-h-0 flex-1 overflow-y-auto bg-surface-subtle px-5 py-4.5">
          {detailLoading && (
            <p className="flex items-center gap-2 text-[13px] text-ink-muted">
              <Loader2 className="size-4 animate-spin" /> 불러오는 중…
            </p>
          )}
          {!detailLoading && !detail && selectedId && (
            <p className="py-10 text-center text-[13px] text-danger">
              상세를 불러오지 못했습니다. 잠시 후 다시 시도해 주세요.
            </p>
          )}
          {!detailLoading && !detail && !selectedId && (
            <p className="py-10 text-center text-[13px] text-ink-muted">
              질문을 선택하면 상세가 표시됩니다.
            </p>
          )}
          {detail && (
            <div className="mx-auto flex max-w-[680px] flex-col gap-3">
              <Section title="질문 원문">
                <p className="text-[13px] leading-[20px] text-ink">{detail.content_ko}</p>
              </Section>

              {detail.answer && (
                <Section title="AI 답변 원문">
                  <p className="whitespace-pre-wrap text-[13px] leading-[20px] text-ink">
                    {detail.answer.content_ko}
                  </p>
                  <div className="mt-2 flex flex-wrap items-center gap-2 text-[11px] text-ink-muted">
                    <span>{detail.answer.source === 'reused' ? '재사용' : 'AI 생성'}</span>
                    {detail.answer.matching_rate !== null && (
                      <Badge tone="warn">일치도 {detail.answer.matching_rate}%</Badge>
                    )}
                    {detail.answer.grounding_score !== null && (
                      <span>근거율 {detail.answer.grounding_score}%</span>
                    )}
                  </div>
                </Section>
              )}

              {detail.answer && detail.answer.citations.length > 0 && (
                <CitationBox citations={detail.answer.citations} onOpen={setCitation} />
              )}

              {(detail.held_info || detail.failure_info) && (
                <Section title={detail.held_info ? '보류 사유' : '실패 사유'}>
                  <p className="text-[13px] leading-[20px] text-ink">
                    {(detail.held_info ?? detail.failure_info)!.message}
                  </p>
                </Section>
              )}

              {detail.answer?.feedback_summary && (
                <Section title="피드백 이력">
                  <p className="text-[13px] text-ink">
                    맞았다 {detail.answer.feedback_summary.correct}건 · 달랐다{' '}
                    {detail.answer.feedback_summary.different}건
                  </p>
                </Section>
              )}

              {detail.similar_official_qa && (
                <Section title="관련 확정 지식">
                  <p className="text-[13px] font-bold text-ink">
                    {detail.similar_official_qa.question_ko}
                  </p>
                  <p className="mt-1 text-[13px] leading-[20px] text-ink-muted">
                    {detail.similar_official_qa.answer_ko}
                  </p>
                  <p className="mt-1.5 text-[11px] text-ink-subtle">
                    유사도 {detail.similar_official_qa.similarity.toFixed(2)}
                  </p>
                </Section>
              )}
            </div>
          )}
          </div>
        </div>
      </div>

      {citation && <CitationViewerModal citation={citation} onClose={() => setCitation(null)} />}
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="rounded-xl border border-line bg-surface px-4 py-3.5">
      <p className="mb-2 text-[11px] font-bold text-ink-muted">{title}</p>
      {children}
    </section>
  );
}
