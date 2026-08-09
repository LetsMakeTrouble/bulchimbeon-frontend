import { useEffect, type ReactNode } from 'react';
import { X } from 'lucide-react';

export function Modal({
  title,
  description,
  width = 560,
  onClose,
  children,
  footer,
}: {
  title: string;
  description?: string;
  width?: number;
  onClose: () => void;
  children: ReactNode;
  footer?: ReactNode;
}) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-ink/40 p-6"
      onClick={onClose}
      role="dialog"
      aria-modal
      aria-label={title}
    >
      <div
        className="flex max-h-full w-full flex-col overflow-hidden rounded-xl border border-line bg-surface shadow-xl"
        style={{ maxWidth: width }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start gap-3 border-b border-line px-5 py-4">
          <div className="min-w-0 flex-1">
            <h2 className="text-[15px] font-bold text-ink">{title}</h2>
            {description && <p className="mt-1 text-[12px] text-ink-muted">{description}</p>}
          </div>
          <button onClick={onClose} className="text-ink-subtle hover:text-ink" aria-label="닫기">
            <X className="size-5" />
          </button>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto px-5 py-4">{children}</div>

        {footer && (
          <div className="flex items-center justify-end gap-2 border-t border-line px-5 py-4">
            {footer}
          </div>
        )}
      </div>
    </div>
  );
}
