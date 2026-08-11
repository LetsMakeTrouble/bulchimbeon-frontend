import { useEffect, useState } from 'react';
import { Archive, Loader2, Search } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useOfficialQas } from '../application/officialQa/useOfficialQas';
import { Button } from '../components/ui/Button';
import { Badge } from '../components/ui/Badge';
import { formatFullDate } from '../lib/format';

export function OfficialQAsPage() {
  const { activeProject } = useAuth();
  const [input, setInput] = useState('');
  const [query, setQuery] = useState('');

  // 입력마다 검색하지 않는다 — 300ms 멈추면 검색한다
  useEffect(() => {
    const t = setTimeout(() => setQuery(input.trim()), 300);
    return () => clearTimeout(t);
  }, [input]);

  const qa = useOfficialQas(activeProject?.id, query);
  const isAnswerer = activeProject?.role === 'answerer';

  if (!activeProject) {
    return <p className="p-10 text-[13px] text-ink-muted">프로젝트를 먼저 선택하세요.</p>;
  }

  return (
    <div className="mx-auto w-full max-w-[860px] px-6 py-8">
      <h1 className="text-2xl font-bold leading-8 text-ink">공식 Q&A</h1>
      <p className="mt-1.5 text-[13px] text-ink-muted">확정된 지식 {qa.total}건</p>

      <div className="relative mt-4">
        <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-ink-subtle" />
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="질문·답변 키워드로 검색"
          className="h-[38px] w-full rounded-lg border border-line bg-surface pl-9 pr-3 text-[13px] text-ink placeholder:text-ink-subtle focus:border-brand focus:outline-none"
        />
      </div>

      <div className="mt-4 flex flex-col gap-2.5">
        {qa.loading && (
          <p className="flex items-center gap-2 py-10 text-[13px] text-ink-muted">
            <Loader2 className="size-4 animate-spin" /> 불러오는 중…
          </p>
        )}
        {!qa.loading && qa.items.length === 0 && (
          <p className="rounded-xl border border-line bg-surface px-4 py-12 text-center text-[13px] text-ink-muted">
            {query ? '검색 결과가 없습니다.' : '아직 확정된 지식이 없습니다.'}
          </p>
        )}
        {qa.items.map((item) => (
          <div key={item.id} className="rounded-xl border border-line bg-surface p-4">
            <div className="flex items-start gap-2">
              <p className="min-w-0 flex-1 text-[13px] font-bold text-ink">{item.question_ko}</p>
              {isAnswerer && (
                <Button
                  size="sm"
                  variant="ghost"
                  disabled={qa.busyId === item.id}
                  onClick={() => qa.archive(item.id)}
                  title="보관"
                >
                  {qa.busyId === item.id ? (
                    <Loader2 className="size-3.5 animate-spin" />
                  ) : (
                    <Archive className="size-3.5" />
                  )}
                </Button>
              )}
            </div>
            <p className="mt-1.5 text-[13px] leading-[20px] text-ink-muted">{item.answer_ko}</p>
            <div className="mt-2.5 flex items-center gap-2">
              <Badge tone="ok">맞았다 {item.correct_count}</Badge>
              <Badge tone="brand">재사용 {item.reuse_count}</Badge>
              <span className="ml-auto text-[11px] text-ink-muted">{formatFullDate(item.created_at)}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
