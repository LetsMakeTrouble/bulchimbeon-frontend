import { useCallback, useEffect, useState } from 'react';
import { Archive, ChevronDown, Loader2, Search } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useSseRefresh } from '../context/SseContext';
import { officialQasApi } from '../infrastructure/http/officialQas';
import type { OfficialQAListItem, OfficialQAStatus } from '../types';
import { Badge, type Tone } from '../components/ui/Badge';
import { Button } from '../components/ui/Button';
import { formatRelative } from '../lib/format';
import { cn } from '../lib/cn';

const PAGE_SIZE = 20;

const statusMeta: Record<OfficialQAStatus, { label: string; tone: Tone }> = {
  active: { label: '사용 중', tone: 'ok' },
  under_review: { label: '재검토 중', tone: 'purple' },
  archived: { label: '보관됨', tone: 'neutral' },
};

/**
 * §8 공식 Q&A — 확정된 지식의 목록.
 * DELETE 는 물리 삭제가 아니라 보관(archive)이라 행을 지우지 않고 상태만 바꾼다.
 */
export function OfficialQAsPage() {
  const { activeProject } = useAuth();
  const isAnswerer = activeProject?.role === 'answerer';

  const [items, setItems] = useState<OfficialQAListItem[]>([]);
  const [total, setTotal] = useState(0);
  const [offset, setOffset] = useState(0);
  const [loading, setLoading] = useState(true);
  /** 입력 중인 값과 서버에 보낸 값을 분리 — 타이핑마다 요청하지 않는다 */
  const [queryInput, setQueryInput] = useState('');
  const [query, setQuery] = useState('');
  const [openId, setOpenId] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const projectId = activeProject?.id;

  const load = useCallback(() => {
    if (!projectId) return;
    setLoading(true);
    officialQasApi
      .list(projectId, { query, limit: PAGE_SIZE, offset })
      .then((page) => {
        setItems(page.items);
        setTotal(page.total);
      })
      .catch(() => setNotice('공식 Q&A 목록을 불러오지 못했습니다.'))
      .finally(() => setLoading(false));
  }, [projectId, query, offset]);

  useEffect(load, [load]);
  // 카드 승인(answer-option 포함)이 새 공식 Q&A 를 만들 수 있다 (§7)
  useSseRefresh(['card.resolved'], load);

  const search = (e: React.FormEvent) => {
    e.preventDefault();
    setOffset(0);
    setQuery(queryInput.trim());
  };

  const archive = async (qa: OfficialQAListItem) => {
    if (!window.confirm('이 공식 Q&A를 보관할까요? 이후 재사용 답변에 쓰이지 않습니다.')) return;
    setBusyId(qa.id);
    setNotice(null);
    try {
      const res = await officialQasApi.archive(qa.id);
      setItems((prev) => prev.map((i) => (i.id === qa.id ? { ...i, status: res.status } : i)));
    } catch {
      setNotice('보관에 실패했습니다. 잠시 후 다시 시도해 주세요.');
    } finally {
      setBusyId(null);
    }
  };

  if (!activeProject) {
    return <p className="p-10 text-[13px] text-ink-muted">프로젝트를 먼저 선택하세요.</p>;
  }

  const pageStart = total === 0 ? 0 : offset + 1;
  const pageEnd = offset + items.length;

  return (
    <div className="mx-auto w-full max-w-[860px] px-6 py-8">
      <div className="flex items-center gap-3">
        <h1 className="text-2xl font-bold leading-8 text-ink">공식 Q&A</h1>
        {total > 0 && <Badge tone="brand">{total}</Badge>}
      </div>
      <p className="mt-1.5 text-[13px] text-ink-muted">
        검수를 거쳐 확정된 답변입니다. 같은 질문이 오면 이 내용으로 즉시 답합니다.
      </p>

      <form onSubmit={search} className="mt-4 flex items-center gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-ink-subtle" />
          <input
            value={queryInput}
            onChange={(e) => setQueryInput(e.target.value)}
            placeholder="질문·답변 내용 검색"
            className="h-[38px] w-full rounded-lg border border-line bg-surface pl-9 pr-3 text-[13px] text-ink placeholder:text-ink-subtle focus:border-brand focus:outline-none"
          />
        </div>
        <Button type="submit" size="md">
          검색
        </Button>
      </form>

      {notice && (
        <p className="mt-3 rounded-lg border border-danger-border bg-danger-surface px-3 py-2 text-[12px] font-bold text-danger">
          {notice}
        </p>
      )}

      {loading && (
        <p className="mt-6 flex items-center gap-2 text-[13px] text-ink-muted">
          <Loader2 className="size-4 animate-spin" /> 불러오는 중…
        </p>
      )}

      {!loading && items.length === 0 && (
        <p className="mt-10 rounded-xl border border-line bg-surface px-4 py-12 text-center text-[13px] text-ink-muted">
          {query ? '검색 결과가 없습니다.' : '아직 확정된 Q&A가 없습니다. 인박스에서 답변을 승인하면 여기에 쌓입니다.'}
        </p>
      )}

      <ul className="mt-4 flex flex-col gap-2">
        {items.map((qa) => {
          const open = openId === qa.id;
          const meta = statusMeta[qa.status];
          return (
            <li key={qa.id} className="rounded-xl border border-line bg-surface">
              <button
                onClick={() => setOpenId(open ? null : qa.id)}
                className="flex w-full items-start gap-3 px-4 py-3.5 text-left"
              >
                <div className="min-w-0 flex-1">
                  <p className={cn('text-[14px] font-bold', qa.status === 'archived' ? 'text-ink-muted' : 'text-ink')}>
                    {qa.question_ko}
                  </p>
                  <div className="mt-1.5 flex flex-wrap items-center gap-2 text-[11px] text-ink-muted">
                    <Badge tone={meta.tone}>{meta.label}</Badge>
                    <span>맞았어요 {qa.correct_count}</span>
                    <span>· 재사용 {qa.reuse_count}회</span>
                    <span>· {formatRelative(qa.created_at)}</span>
                  </div>
                </div>
                <ChevronDown
                  className={cn('mt-1 size-4 shrink-0 text-ink-subtle transition-transform', open && 'rotate-180')}
                />
              </button>

              {open && (
                <div className="border-t border-line px-4 py-3.5">
                  <p className="text-[11px] font-bold text-ink-muted">답변</p>
                  <p className="mt-1.5 whitespace-pre-wrap text-[13px] leading-[21px] text-ink">
                    {qa.answer_ko}
                  </p>
                  <div className="mt-3 rounded-lg bg-surface-subtle px-3 py-2.5">
                    <p className="text-[11px] font-bold text-ink-muted">English</p>
                    <p className="mt-1 text-[12px] leading-[19px] text-ink-muted">{qa.question_en}</p>
                    <p className="mt-1.5 whitespace-pre-wrap text-[12px] leading-[19px] text-ink-muted">
                      {qa.answer_en}
                    </p>
                  </div>
                  {isAnswerer && qa.status !== 'archived' && (
                    <div className="mt-3 flex justify-end">
                      <Button
                        size="sm"
                        variant="danger"
                        disabled={busyId === qa.id}
                        onClick={() => archive(qa)}
                      >
                        <Archive className="size-3.5" /> 보관
                      </Button>
                    </div>
                  )}
                </div>
              )}
            </li>
          );
        })}
      </ul>

      {total > PAGE_SIZE && (
        <div className="mt-4 flex items-center justify-between">
          <p className="text-[12px] text-ink-muted">
            총 {total}건 중 {pageStart}–{pageEnd}
          </p>
          <div className="flex gap-2">
            <Button size="sm" disabled={offset === 0 || loading} onClick={() => setOffset(Math.max(0, offset - PAGE_SIZE))}>
              이전
            </Button>
            <Button size="sm" disabled={pageEnd >= total || loading} onClick={() => setOffset(offset + PAGE_SIZE)}>
              다음
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
