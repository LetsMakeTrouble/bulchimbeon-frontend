import { ArrowRight } from 'lucide-react';
import type { Citation } from '../../types';

/**
 * 근거 인용 박스. `similarity` 는 **원시 코사인**이라 % 로 표시하면 안 된다 (§6) —
 * matching_rate 와 스케일이 다르므로 소수 두 자리로 그대로 보여준다.
 */
export function CitationBox({
  citations,
  onOpen,
}: {
  citations: Citation[];
  onOpen: (citation: Citation) => void;
}) {
  if (citations.length === 0) return null;

  return (
    <div className="rounded-lg border border-line bg-surface-muted p-3">
      <p className="mb-2 text-[11px] font-bold text-ink-muted">출처 {citations.length}건</p>
      <ul className="flex flex-col gap-2">
        {citations.map((c) => (
          <li key={c.id} className="rounded-md border border-line bg-surface px-3 py-2.5">
            <div className="flex flex-wrap items-center gap-2">
              <span className="rounded bg-warn-surface px-1.5 py-0.5 text-[11px] font-bold text-warn">
                유사도 {c.similarity.toFixed(2)}
              </span>
              <span className="text-[12px] font-bold text-ink">
                {c.doc_title} v{c.version_no}
                {c.heading_path.length > 0 && ` · ${c.heading_path.join(' › ')}`}
                {c.page_no !== null && ` · p.${c.page_no}`}
              </span>
            </div>
            <p className="mt-1.5 text-[12px] leading-[18px] text-ink-muted">&ldquo;{c.quote}&rdquo;</p>
            <button
              type="button"
              onClick={() => onOpen(c)}
              className="mt-1.5 inline-flex items-center gap-1 text-[12px] font-bold text-brand-strong hover:text-brand-deep"
            >
              문서로 이동 <ArrowRight className="size-3.5" />
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}
