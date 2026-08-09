import { useRef } from 'react';
import type { ReactNode } from 'react';
import { Loader2, Plug, Upload } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useDocumentLibrary } from '../application/document/useDocumentLibrary';
import { canActivate, isStale, STALE_DAYS } from '../domain/document/documentPolicy';
import { Button } from '../components/ui/Button';
import { formatRelative } from '../lib/format';
import { cn } from '../lib/cn';

const sourceLabel: Record<string, string> = {
  upload: '직접 업로드',
  notion: 'Notion',
  github: 'GitHub',
};

const ingestLabel: Record<string, string> = {
  pending: '인제스트 대기',
  processing: '인제스트 중',
  failed: '인제스트 실패',
};

/**
 * 문서 화면 전용 사각 태그 — 리뷰카드·필터에 쓰는 pill 형 Badge 와는 다른
 * 별도 컴포넌트다(Figma "Tag" 는 rounded-5·h-18, Badge/Pill 은 rounded-full·h-19+).
 * 이 화면 밖에서 재사용되는 걸 확인 못해 로컬에 둔다.
 */
function Tag({
  tone = 'neutral',
  children,
}: {
  tone?: 'neutral' | 'warn' | 'brand';
  children: ReactNode;
}) {
  const toneClass = {
    neutral: 'border-line bg-surface-subtle text-ink-muted',
    warn: 'border-warn-border bg-warn-surface text-warn',
    brand: 'border-brand-border bg-brand-surface text-brand-deep',
  }[tone];
  return (
    <span
      className={cn(
        'inline-flex h-[18px] items-center whitespace-nowrap rounded-[5px] border px-1.5 text-[10px] font-bold',
        toneClass
      )}
    >
      {children}
    </span>
  );
}

export function DocumentsPage() {
  const { activeProject } = useAuth();
  const isAnswerer = activeProject?.role === 'answerer';
  const lib = useDocumentLibrary(activeProject?.id);
  const fileRef = useRef<HTMLInputElement>(null);

  if (!activeProject) {
    return <p className="p-10 text-[13px] text-ink-muted">프로젝트를 먼저 선택하세요.</p>;
  }

  const { docs, loading, detail, content } = lib;
  const activeVersion = detail?.versions.find((v) => v.is_active) ?? null;
  const stale = detail && isStale(detail.updated_at);
  const sortedVersions = detail?.versions.slice().sort((a, b) => b.version_no - a.version_no) ?? [];

  return (
    <div className="grid h-full grid-cols-[272px_1fr_254px]">
      {/* 목록 */}
      <div className="flex min-h-0 flex-col overflow-y-auto border-r border-line bg-surface-subtle">
        <div className="flex shrink-0 flex-col gap-3 px-4 pb-3.5 pt-[18px]">
          <div className="flex items-center justify-between">
            <h1 className="text-[17px] font-bold leading-6 text-ink">문서</h1>
            <span className="text-[11px] text-ink-muted">{docs.length}건 · 근거 문서</span>
          </div>

          {isAnswerer && (
            <div className="flex gap-1.5">
              <input
                ref={fileRef}
                type="file"
                accept=".md,.txt,.pdf,.docx"
                className="hidden"
                onChange={(e) => e.target.files?.[0] && lib.upload(e.target.files[0])}
              />
              <Button
                variant="primary"
                size="sm"
                className="h-8 flex-1 rounded-lg"
                disabled={lib.uploading}
                onClick={() => fileRef.current?.click()}
              >
                {lib.uploading ? <Loader2 className="size-3.5 animate-spin" /> : <Upload className="size-3.5" />}
                문서 업로드
              </Button>
              <Button size="sm" className="h-8 flex-1 rounded-lg" disabled title="설정 → 연동에서 추가하세요">
                <Plug className="size-3.5" /> 연동 추가
              </Button>
            </div>
          )}
        </div>

        {loading && (
          <p className="flex items-center gap-2 px-4 text-[13px] text-ink-muted">
            <Loader2 className="size-4 animate-spin" /> 불러오는 중…
          </p>
        )}

        <ul className="flex flex-col gap-1.5 px-3 pb-4">
          {docs.map((d) => {
            const selected = lib.selectedId === d.id;
            return (
              <li key={d.id}>
                <button
                  onClick={() => lib.select(d.id)}
                  className={cn(
                    'flex w-full flex-col gap-[7px] rounded-[10px] border p-3 text-left transition-colors',
                    selected
                      ? 'border-[1.5px] border-brand-border bg-brand-surface'
                      : 'border-line bg-surface shadow-[0_1px_2px_0_rgba(30,32,44,0.04)] hover:bg-surface-muted'
                  )}
                >
                  <div className={cn('flex items-center gap-2', selected && 'text-brand-deep')}>
                    <p className={cn('min-w-0 flex-1 truncate text-[13px] font-bold leading-5', !selected && 'text-ink')}>
                      {d.title}
                    </p>
                    {d.active_version && (
                      <span className={cn('shrink-0 text-[11px] font-bold', selected ? 'text-brand-deep' : 'text-ink-muted')}>
                        v{d.active_version.version_no}
                      </span>
                    )}
                  </div>
                  <p className="text-[11px] text-ink-muted">{formatRelative(d.updated_at)}</p>
                  <div className="flex flex-wrap gap-1">
                    <Tag>{sourceLabel[d.source_type] ?? d.source_type}</Tag>
                    {d.active_version && d.active_version.ingest_status !== 'ready' && (
                      <Tag tone={d.active_version.ingest_status === 'failed' ? 'warn' : 'neutral'}>
                        {ingestLabel[d.active_version.ingest_status]}
                      </Tag>
                    )}
                  </div>
                </button>
              </li>
            );
          })}
        </ul>
      </div>

      {/* 본문 */}
      <div className="min-h-0 overflow-y-auto bg-surface">
        <div className="flex flex-col px-8 pb-7 pt-[22px]">
          {lib.activateMessage && (
            <p className="mb-4 rounded-lg border border-info-border bg-info-surface px-3 py-2 text-[12px] font-bold text-info">
              {lib.activateMessage}
            </p>
          )}
          {!detail ? (
            <p className="text-[13px] text-ink-muted">문서를 선택하세요.</p>
          ) : (
            <div className="max-w-[600px]">
              <div className="flex flex-wrap items-center gap-1.5">
                <Tag>{sourceLabel[detail.source_type] ?? detail.source_type}</Tag>
                {activeVersion && <Tag tone="brand">v{activeVersion.version_no}</Tag>}
                <span className="text-[11px] text-ink-muted">
                  {formatRelative(detail.updated_at)} 수정
                </span>
                {stale && <Tag tone="warn">{STALE_DAYS}일 이상 미갱신</Tag>}
              </div>

              <h2 className="mt-2.5 text-[26px] font-bold leading-[34px] text-ink">{detail.title}</h2>

              <hr className="my-5 border-line" />

              {content === null ? (
                <p className="text-[13px] text-ink-muted">
                  {activeVersion?.ingest_status === 'ready'
                    ? '원문을 불러오는 중…'
                    : '인제스트가 끝나면 원문을 볼 수 있습니다.'}
                </p>
              ) : (
                <pre className="whitespace-pre-wrap break-words font-sans text-[13px] leading-[20px] text-ink">
                  {content}
                </pre>
              )}
            </div>
          )}
        </div>
      </div>

      {/* 버전 히스토리 */}
      <div className="flex min-h-0 flex-col overflow-y-auto border-l border-line bg-surface-subtle">
        <div className="flex shrink-0 flex-col gap-[5px] px-4 pb-3.5 pt-[18px]">
          <h3 className="text-[13px] font-bold text-ink">버전 히스토리</h3>
          {detail && (
            <p className="text-[11px] text-ink-muted">
              {sortedVersions.slice(0, 3).map((v) => `v${v.version_no}`).join(' → ')}
            </p>
          )}
        </div>

        <ul className="flex flex-1 flex-col gap-1 px-3.5 pb-3.5">
          {sortedVersions.map((v) => (
            <li
              key={v.id}
              className={cn(
                'flex flex-col gap-[7px] rounded-lg p-3',
                v.is_active && 'border border-line bg-surface shadow-[0_1px_2px_0_rgba(30,32,44,0.04)]'
              )}
            >
              <div className="flex items-center gap-1.5">
                <span className={cn('size-2 shrink-0 rounded-full', v.is_active ? 'bg-brand' : 'bg-line-strong')} />
                <span className={cn('text-[12px] font-bold', v.is_active ? 'text-ink' : 'text-ink-muted')}>
                  v{v.version_no}
                </span>
                {v.is_active && <span className="flex-1 text-[11px] text-ink-muted">현재</span>}
              </div>
              {v.ingest_status !== 'ready' && (
                <Tag tone={v.ingest_status === 'failed' ? 'warn' : 'neutral'}>{ingestLabel[v.ingest_status]}</Tag>
              )}
              <p className="truncate text-[11px] text-ink">{v.original_filename}</p>
              <p className="text-[10px] text-ink-muted">{formatRelative(v.created_at)}</p>
              {isAnswerer && canActivate(v) && (
                <Button size="sm" className="h-8 w-full rounded-lg" onClick={() => lib.activate(v)}>
                  이 버전으로 전환
                </Button>
              )}
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
