import { useRef } from 'react';
import { Loader2, Plug, Upload } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useDocumentLibrary } from '../application/document/useDocumentLibrary';
import { canActivate, isStale, STALE_DAYS } from '../domain/document/documentPolicy';
import { Badge } from '../components/ui/Badge';
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

  return (
    <div className="grid h-full grid-cols-[280px_1fr_260px]">
      {/* 목록 */}
      <div className="min-h-0 overflow-y-auto border-r border-line bg-surface p-4">
        <div className="flex items-baseline justify-between">
          <h1 className="text-[18px] font-bold text-ink">문서</h1>
          <span className="text-[11px] text-ink-muted">{docs.length}건 · 근거 문서</span>
        </div>

        {isAnswerer && (
          <div className="mt-3 flex gap-2">
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
              className="flex-1"
              disabled={lib.uploading}
              onClick={() => fileRef.current?.click()}
            >
              {lib.uploading ? <Loader2 className="size-3.5 animate-spin" /> : <Upload className="size-3.5" />}
              문서 업로드
            </Button>
            <Button size="sm" className="flex-1" disabled title="설정 → 연동에서 추가하세요">
              <Plug className="size-3.5" /> 연동 추가
            </Button>
          </div>
        )}

        {loading && (
          <p className="mt-4 flex items-center gap-2 text-[13px] text-ink-muted">
            <Loader2 className="size-4 animate-spin" /> 불러오는 중…
          </p>
        )}

        <ul className="mt-3 flex flex-col gap-2">
          {docs.map((d) => (
            <li key={d.id}>
              <button
                onClick={() => lib.select(d.id)}
                className={cn(
                  'w-full rounded-lg border px-3.5 py-3 text-left transition-colors',
                  lib.selectedId === d.id
                    ? 'border-brand bg-brand-surface/40'
                    : 'border-line bg-surface hover:bg-surface-muted'
                )}
              >
                <div className="flex items-start gap-2">
                  <p className="min-w-0 flex-1 text-[13px] font-bold leading-[18px] text-ink">
                    {d.title}
                  </p>
                  {d.active_version && (
                    <span className="shrink-0 text-[11px] font-bold text-ink-muted">
                      v{d.active_version.version_no}
                    </span>
                  )}
                </div>
                <p className="mt-1 text-[11px] text-ink-muted">{formatRelative(d.updated_at)}</p>
                <div className="mt-1.5 flex flex-wrap gap-1">
                  <Badge>{sourceLabel[d.source_type] ?? d.source_type}</Badge>
                  {d.active_version && d.active_version.ingest_status !== 'ready' && (
                    <Badge tone={d.active_version.ingest_status === 'failed' ? 'danger' : 'warn'}>
                      {ingestLabel[d.active_version.ingest_status]}
                    </Badge>
                  )}
                </div>
              </button>
            </li>
          ))}
        </ul>
      </div>

      {/* 본문 */}
      <div className="min-h-0 overflow-y-auto bg-surface p-8">
        {lib.activateMessage && (
          <p className="mb-4 rounded-lg border border-info-border bg-info-surface px-3 py-2 text-[12px] font-bold text-info">
            {lib.activateMessage}
          </p>
        )}
        {!detail ? (
          <p className="text-[13px] text-ink-muted">문서를 선택하세요.</p>
        ) : (
          <div className="mx-auto max-w-[720px]">
            <div className="flex flex-wrap items-center gap-2">
              <Badge>{sourceLabel[detail.source_type] ?? detail.source_type}</Badge>
              {activeVersion && <Badge tone="brand">v{activeVersion.version_no}</Badge>}
              <span className="text-[12px] text-ink-muted">
                {formatRelative(detail.updated_at)} 수정
              </span>
              {stale && <Badge tone="warn">{STALE_DAYS}일 이상 미갱신</Badge>}
            </div>

            <h2 className="mt-3 text-2xl font-bold leading-8 text-ink">{detail.title}</h2>

            <hr className="my-5 border-line" />

            {content === null ? (
              <p className="text-[13px] text-ink-muted">
                {activeVersion?.ingest_status === 'ready'
                  ? '원문을 불러오는 중…'
                  : '인제스트가 끝나면 원문을 볼 수 있습니다.'}
              </p>
            ) : (
              <pre className="whitespace-pre-wrap break-words font-sans text-[13px] leading-[22px] text-ink">
                {content}
              </pre>
            )}
          </div>
        )}
      </div>

      {/* 버전 히스토리 */}
      <div className="min-h-0 overflow-y-auto border-l border-line bg-surface p-4">
        <h3 className="text-[13px] font-bold text-ink">버전 히스토리</h3>
        {detail && (
          <p className="mt-1 text-[11px] text-ink-muted">
            {detail.versions
              .slice()
              .sort((a, b) => b.version_no - a.version_no)
              .slice(0, 3)
              .map((v) => `v${v.version_no}`)
              .join(' → ')}
          </p>
        )}

        <ul className="mt-3 flex flex-col gap-2">
          {detail?.versions
            .slice()
            .sort((a, b) => b.version_no - a.version_no)
            .map((v) => (
              <li
                key={v.id}
                className={cn(
                  'rounded-lg border px-3 py-2.5',
                  v.is_active ? 'border-brand bg-brand-surface/40' : 'border-line bg-surface'
                )}
              >
                <div className="flex items-center gap-2">
                  <span className="text-[12px] font-bold text-ink">v{v.version_no}</span>
                  {v.is_active && <span className="text-[11px] text-brand-deep">현재</span>}
                  {v.ingest_status !== 'ready' && (
                    <Badge tone={v.ingest_status === 'failed' ? 'danger' : 'warn'}>
                      {ingestLabel[v.ingest_status]}
                    </Badge>
                  )}
                </div>
                <p className="mt-1 truncate text-[11px] text-ink-muted">{v.original_filename}</p>
                <p className="mt-0.5 text-[11px] text-ink-subtle">{formatRelative(v.created_at)}</p>
                {isAnswerer && canActivate(v) && (
                  <Button size="sm" className="mt-2 w-full" onClick={() => lib.activate(v)}>
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
