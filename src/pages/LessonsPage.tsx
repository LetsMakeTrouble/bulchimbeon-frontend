import { useState } from 'react';
import { Loader2, Trash2 } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useLessons } from '../application/lessons/useLessons';
import type { LessonStatus } from '../types';
import { Badge } from '../components/ui/Badge';
import { Button } from '../components/ui/Button';
import { cn } from '../lib/cn';
import { formatRelative } from '../lib/format';

const TABS: { key: LessonStatus; label: string }[] = [
  { key: 'candidate', label: '후보' },
  { key: 'approved', label: '승인됨' },
];

export function LessonsPage() {
  const { activeProject } = useAuth();
  const [tab, setTab] = useState<LessonStatus>('candidate');
  const lessons = useLessons(activeProject?.id, tab);

  if (!activeProject) {
    return <p className="p-10 text-[13px] text-ink-muted">프로젝트를 먼저 선택하세요.</p>;
  }
  if (activeProject.role !== 'answerer') {
    return <p className="p-10 text-[13px] text-ink-muted">담당자 전용 화면입니다.</p>;
  }

  return (
    <div className="mx-auto w-full max-w-[860px] px-6 py-8">
      <h1 className="text-2xl font-bold leading-8 text-ink">교훈</h1>
      <p className="mt-1.5 text-[13px] text-ink-muted">
        승인된 교훈은 이후 답변 생성에 주입됩니다. 삭제하면 동일 내용 재생성이 차단됩니다.
      </p>

      <div className="mt-4 flex gap-1 rounded-lg bg-surface-alt p-1">
        {TABS.map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={cn(
              'flex-1 rounded-md py-1.5 text-[12px] font-bold transition-colors',
              tab === t.key ? 'bg-surface text-ink shadow-sm' : 'text-ink-muted hover:text-ink'
            )}
          >
            {t.label}
          </button>
        ))}
      </div>

      <div className="mt-4 flex flex-col gap-2.5">
        {lessons.loading && (
          <p className="flex items-center gap-2 py-10 text-[13px] text-ink-muted">
            <Loader2 className="size-4 animate-spin" /> 불러오는 중…
          </p>
        )}
        {!lessons.loading && lessons.items.length === 0 && (
          <p className="rounded-xl border border-line bg-surface px-4 py-12 text-center text-[13px] text-ink-muted">
            {tab === 'candidate' ? '후보 교훈이 없습니다.' : '승인된 교훈이 없습니다.'}
          </p>
        )}
        {lessons.items.map((lesson) => {
          const busy = lessons.busyId === lesson.id;
          const suggestCleanup = lessons.cleanupSuggestions.includes(lesson.id);
          return (
            <div key={lesson.id} className="rounded-xl border border-line bg-surface p-4">
              <div className="flex items-start gap-2">
                <p className="min-w-0 flex-1 text-[13px] leading-[20px] text-ink">{lesson.content}</p>
                <div className="flex shrink-0 flex-col items-end gap-1">
                  {lesson.needs_recheck && <Badge tone="warn">재확인 필요</Badge>}
                  {suggestCleanup && <Badge tone="info">정리 제안</Badge>}
                </div>
              </div>
              <div className="mt-2.5 flex items-center justify-between">
                <p className="text-[11px] text-ink-muted">
                  {lesson.last_used_at ? `마지막 사용 ${formatRelative(lesson.last_used_at)}` : '사용된 적 없음'}
                </p>
                <div className="flex gap-2">
                  {tab === 'candidate' && (
                    <Button size="sm" variant="primary" disabled={busy} onClick={() => lessons.approve(lesson.id)}>
                      {busy && <Loader2 className="size-3.5 animate-spin" />} 승인
                    </Button>
                  )}
                  <Button size="sm" variant="danger" disabled={busy} onClick={() => lessons.remove(lesson.id)}>
                    <Trash2 className="size-3.5" /> 삭제
                  </Button>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
