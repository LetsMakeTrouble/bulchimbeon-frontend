import { useCallback, useEffect, useState } from 'react';
import { Check, Loader2, Trash2 } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useSseRefresh } from '../context/SseContext';
import { lessonsApi } from '../infrastructure/http/lessons';
import type { LessonItem, LessonStatus } from '../types';
import { Badge } from '../components/ui/Badge';
import { Button } from '../components/ui/Button';
import { formatRelative } from '../lib/format';
import { cn } from '../lib/cn';

const PAGE_SIZE = 50;

type Filter = 'all' | Extract<LessonStatus, 'candidate' | 'approved'>;

const FILTERS: { key: Filter; label: string }[] = [
  { key: 'all', label: '전체' },
  { key: 'candidate', label: '승인 대기' },
  { key: 'approved', label: '승인됨' },
];

/**
 * §9 교훈(Lessons) — 카드 수정·반려에서 추출된 "다음에 이렇게 답하라" 규칙.
 * candidate 는 담당자가 승인해야 프롬프트에 반영된다. max_lessons 초과분은
 * cleanup_suggestions 로 내려와 정리를 권한다.
 */
export function LessonsPage() {
  const { activeProject } = useAuth();

  const [items, setItems] = useState<LessonItem[]>([]);
  const [cleanupIds, setCleanupIds] = useState<Set<string>>(new Set());
  const [total, setTotal] = useState(0);
  const [offset, setOffset] = useState(0);
  const [filter, setFilter] = useState<Filter>('all');
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const projectId = activeProject?.id;

  const load = useCallback(() => {
    if (!projectId) return;
    setLoading(true);
    lessonsApi
      .list(projectId, {
        status: filter === 'all' ? undefined : filter,
        limit: PAGE_SIZE,
        offset,
      })
      .then((page) => {
        setItems(page.items);
        setTotal(page.total);
        setCleanupIds(new Set(page.cleanup_suggestions));
      })
      .catch(() => setNotice('답변 지침 목록을 불러오지 못했습니다.'))
      .finally(() => setLoading(false));
  }, [projectId, filter, offset]);

  useEffect(load, [load]);
  // 카드 수정·반려가 교훈 후보를 만든다 (§7 → §9)
  useSseRefresh(['card.resolved'], load);

  const approve = async (lesson: LessonItem) => {
    setBusyId(lesson.id);
    setNotice(null);
    try {
      const updated = await lessonsApi.approve(lesson.id);
      setItems((prev) => prev.map((i) => (i.id === lesson.id ? updated : i)));
    } catch {
      setNotice('승인에 실패했습니다. 잠시 후 다시 시도해 주세요.');
    } finally {
      setBusyId(null);
    }
  };

  const remove = async (lesson: LessonItem) => {
    if (!window.confirm('이 지침을 삭제할까요? 이후 답변 생성에 반영되지 않습니다.')) return;
    setBusyId(lesson.id);
    setNotice(null);
    try {
      await lessonsApi.remove(lesson.id);
      setItems((prev) => prev.filter((i) => i.id !== lesson.id));
      setTotal((t) => Math.max(0, t - 1));
    } catch {
      setNotice('삭제에 실패했습니다. 잠시 후 다시 시도해 주세요.');
    } finally {
      setBusyId(null);
    }
  };

  if (!activeProject) {
    return <p className="p-10 text-[13px] text-ink-muted">프로젝트를 먼저 선택하세요.</p>;
  }
  if (activeProject.role !== 'answerer') {
    return <p className="p-10 text-[13px] text-ink-muted">담당자 전용 화면입니다.</p>;
  }

  const candidateCount = items.filter((i) => i.status === 'candidate').length;
  const pageEnd = offset + items.length;

  return (
    <div className="mx-auto w-full max-w-[860px] px-6 pb-8 pt-5">
      <div className="flex items-center gap-3">
        <h1 className="text-2xl font-bold leading-8 text-ink">답변 지침</h1>
        {candidateCount > 0 && <Badge tone="warn">대기 {candidateCount}</Badge>}
      </div>
      <p className="mt-1.5 text-[13px] text-ink-muted">
        수정·반려에서 배운 지침입니다. 승인하면 이후 AI 답변 생성에 반영됩니다.
      </p>

      <div className="mt-4 flex flex-wrap gap-2">
        {FILTERS.map(({ key, label }) => {
          const selected = filter === key;
          return (
            <button
              key={key}
              onClick={() => {
                setFilter(key);
                setOffset(0);
              }}
              className={cn(
                'inline-flex h-8 items-center rounded-full border px-3 text-[12px] transition-colors',
                selected
                  ? 'border-brand-strong bg-brand-strong font-bold text-white'
                  : 'border-line bg-surface font-medium text-ink-muted hover:bg-surface-muted'
              )}
            >
              {label}
            </button>
          );
        })}
      </div>

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
          아직 쌓인 답변 지침이 없습니다. 인박스에서 답변을 수정·반려하면 후보가 만들어집니다.
        </p>
      )}

      <ul className="mt-4 flex flex-col gap-2">
        {items.map((lesson) => (
          <li
            key={lesson.id}
            className={cn(
              'rounded-xl border bg-surface px-4 py-3.5',
              lesson.status === 'candidate' ? 'border-warn-border' : 'border-line'
            )}
          >
            <div className="flex flex-wrap items-center gap-2">
              {lesson.status === 'candidate' ? (
                <Badge tone="warn" dot>
                  승인 대기
                </Badge>
              ) : (
                <Badge tone="ok">승인됨</Badge>
              )}
              {lesson.needs_recheck && <Badge tone="purple">재확인 필요</Badge>}
              {cleanupIds.has(lesson.id) && <Badge tone="neutral">정리 추천</Badge>}
              <span className="ml-auto text-[11px] text-ink-muted">
                {lesson.last_used_at
                  ? `마지막 사용 ${formatRelative(lesson.last_used_at)}`
                  : '아직 사용 안 됨'}
                {' · '}
                {formatRelative(lesson.created_at)}
              </span>
            </div>

            <p className="mt-2.5 whitespace-pre-wrap text-[13px] leading-[21px] text-ink">
              {lesson.content}
            </p>

            <div className="mt-3 flex justify-end gap-2">
              {lesson.status === 'candidate' && (
                <Button
                  size="sm"
                  variant="primary"
                  disabled={busyId === lesson.id}
                  onClick={() => approve(lesson)}
                >
                  <Check className="size-3.5" /> 승인
                </Button>
              )}
              <Button
                size="sm"
                variant="danger"
                disabled={busyId === lesson.id}
                onClick={() => remove(lesson)}
              >
                <Trash2 className="size-3.5" /> 삭제
              </Button>
            </div>
          </li>
        ))}
      </ul>

      {total > PAGE_SIZE && (
        <div className="mt-4 flex items-center justify-between">
          <p className="text-[12px] text-ink-muted">
            총 {total}건 중 {total === 0 ? 0 : offset + 1}–{pageEnd}
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
