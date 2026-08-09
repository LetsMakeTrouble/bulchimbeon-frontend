import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, Loader2, Search } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { questionsApi } from '../api/questions';
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

export function QuestionsListPage() {
  const { activeProject } = useAuth();
  const projectId = activeProject?.id;

  const [items, setItems] = useState<QuestionListItem[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState<QuestionStatus | 'all'>('all');
  const [query, setQuery] = useState('');

  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [detail, setDetail] = useState<QuestionDetail | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [citation, setCitation] = useState<Citation | null>(null);

  const load = useCallback(() => {
    if (!projectId) return;
    setLoading(true);
    questionsApi
      .list(projectId, { ...(status === 'all' ? {} : { status }), limit: 50 })
      .then((page) => {
        setItems(page.items);
        setTotal(page.total);
        setSelectedId((prev) => prev ?? page.items[0]?.id ?? null);
      })
      .finally(() => setLoading(false));
  }, [projectId, status]);

  useEffect(load, [load]);

  useEffect(() => {
    if (!selectedId) return;
    setDetailLoading(true);
    questionsApi
      .detail(selectedId)
      .then(setDetail)
      .catch(() => setDetail(null))
      .finally(() => setDetailLoading(false));
  }, [selectedId]);

  // 검색은 목록 엔드포인트에 query 파라미터가 없어 클라이언트에서 거른다.
  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    return q ? items.filter((i) => i.content_ko.toLowerCase().includes(q)) : items;
  }, [items, query]);

  if (!activeProject) {
    return <p className="p-10 text-[13px] text-ink-muted">프로젝트를 먼저 선택하세요.</p>;
  }

  return (
    <div className="flex h-full flex-col">
      <div className="shrink-0 border-b border-line bg-surface px-6 py-4">
        <label className="relative flex h-10 items-center">
          <Search className="pointer-events-none absolute left-3.5 size-4 text-ink-subtle" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="질문 내용 검색"
            className="h-full w-full rounded-lg border border-line bg-surface-muted pl-10 pr-3 text-[13px] text-ink placeholder:text-ink-subtle focus:border-brand focus:bg-surface focus:outline-none"
          />
        </label>

        <div className="mt-3 flex flex-wrap items-center gap-2">
          {STATUS_FILTERS.map((f) => (
            <button
              key={f.key}
              onClick={() => setStatus(f.key)}
              className={cn(
                'rounded-full border px-3 py-1.5 text-[12px] font-bold transition-colors',
                status === f.key
                  ? 'border-brand-strong bg-brand-strong text-white'
                  : 'border-line bg-surface text-ink-muted hover:bg-surface-muted'
              )}
            >
              {f.label}
            </button>
          ))}
          <span className="ml-auto text-[12px] text-ink-muted">
            총 {total}건 중 {visible.length}건 표시
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
          {!loading && visible.length === 0 && (
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
        <div className="min-h-0 overflow-y-auto bg-surface-subtle p-5">
          {detailLoading && (
            <p className="flex items-center gap-2 text-[13px] text-ink-muted">
              <Loader2 className="size-4 animate-spin" /> 불러오는 중…
            </p>
          )}
          {!detailLoading && !detail && (
            <p className="py-10 text-center text-[13px] text-ink-muted">
              질문을 선택하면 상세가 표시됩니다.
            </p>
          )}
          {detail && (
            <div className="mx-auto flex max-w-[680px] flex-col gap-3">
              <div className="flex items-center gap-2">
                <QuestionStatusBadge
                  status={detail.status}
                  grade={detail.answer?.grade ?? null}
                  state={detail.answer?.state}
                />
                <span className="text-[12px] text-ink-muted">{detail.asked_by.name}</span>
                {detail.urgency === 'urgent' && (
                  <Badge tone="danger" dot>
                    급함
                  </Badge>
                )}
                <Link to="/chat" className="ml-auto">
                  <Button variant="primary" size="sm">
                    대화로 이동 <ArrowRight className="size-3.5" />
                  </Button>
                </Link>
              </div>

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
