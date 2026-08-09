import type { ReactNode } from 'react';

export const authInput =
  'h-[42px] w-full rounded-lg border border-line bg-surface px-3.5 text-[14px] text-ink placeholder:text-ink-subtle focus:border-brand focus:outline-none';

export function AuthShell({
  title,
  caption,
  children,
}: {
  title: string;
  caption: string;
  children: ReactNode;
}) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-surface-subtle px-6 py-10">
      <div className="w-full max-w-[400px]">
        <div className="mb-6 text-center">
          <span className="mx-auto mb-3 flex size-11 items-center justify-center rounded-xl bg-brand text-[15px] font-bold text-white">
            불침
          </span>
          <h1 className="text-2xl font-bold leading-8 text-ink">{title}</h1>
          <p className="mt-1.5 text-[13px] text-ink-muted">{caption}</p>
        </div>
        <div className="rounded-xl border border-line bg-surface p-6">{children}</div>
      </div>
    </div>
  );
}
