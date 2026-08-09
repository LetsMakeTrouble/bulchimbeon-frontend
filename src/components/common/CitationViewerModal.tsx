import { useEffect, useRef, useState } from 'react';
import { Loader2, X } from 'lucide-react';
import type { Citation, DocumentContent } from '../../types';
import { documentsApi } from '../../api/documents';

/**
 * 근거 원문 열람 (기능 2.2).
 * URL 은 citation 의 document_id · document_version_id 로 구성한다 — version_no 로 만들지 않는다 (§4).
 * heading_path 로 스크롤 앵커를 잡고 quote 를 하이라이트한다.
 */
export function CitationViewerModal({
  citation,
  onClose,
}: {
  citation: Citation;
  onClose: () => void;
}) {
  const [doc, setDoc] = useState<DocumentContent | null>(null);
  const [error, setError] = useState<string | null>(null);
  const markRef = useRef<HTMLElement>(null);

  useEffect(() => {
    let cancelled = false;
    documentsApi
      .versionContent(citation.document_id, citation.document_version_id)
      .then((d) => !cancelled && setDoc(d))
      .catch(() => !cancelled && setError('원문을 불러오지 못했습니다.'));
    return () => {
      cancelled = true;
    };
  }, [citation.document_id, citation.document_version_id]);

  useEffect(() => {
    markRef.current?.scrollIntoView({ block: 'center' });
  }, [doc]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  // quote 를 기준으로 원문을 쪼개 하이라이트한다. 원문에 없으면 통째로 보여준다.
  const idx = doc ? doc.content.indexOf(citation.quote) : -1;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-ink/40 p-6"
      onClick={onClose}
    >
      <div
        className="flex max-h-full w-full max-w-3xl flex-col overflow-hidden rounded-xl border border-line bg-surface shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start gap-3 border-b border-line px-5 py-4">
          <div className="min-w-0 flex-1">
            <p className="truncate text-[15px] font-bold text-ink">
              {doc?.title ?? citation.doc_title}
              <span className="ml-2 text-[12px] font-medium text-ink-muted">
                v{doc?.version_no ?? citation.version_no}
              </span>
            </p>
            {citation.heading_path.length > 0 && (
              <p className="mt-0.5 truncate text-[12px] text-ink-muted">
                {citation.heading_path.join(' › ')}
              </p>
            )}
          </div>
          <button onClick={onClose} className="text-ink-subtle hover:text-ink" aria-label="닫기">
            <X className="size-5" />
          </button>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto px-5 py-4">
          {error && <p className="text-[13px] text-danger">{error}</p>}
          {!doc && !error && (
            <p className="flex items-center gap-2 text-[13px] text-ink-muted">
              <Loader2 className="size-4 animate-spin" /> 원문 불러오는 중…
            </p>
          )}
          {doc && (
            <pre className="whitespace-pre-wrap break-words font-sans text-[13px] leading-[22px] text-ink">
              {idx >= 0 ? (
                <>
                  {doc.content.slice(0, idx)}
                  <mark ref={markRef} className="rounded bg-warn-surface px-0.5 text-ink">
                    {citation.quote}
                  </mark>
                  {doc.content.slice(idx + citation.quote.length)}
                </>
              ) : (
                doc.content
              )}
            </pre>
          )}
        </div>
      </div>
    </div>
  );
}
