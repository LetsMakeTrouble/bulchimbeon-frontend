import type { ButtonHTMLAttributes } from 'react';
import { cn } from '../../lib/cn';

type Variant = 'primary' | 'secondary' | 'ghost' | 'danger';
type Size = 'sm' | 'md';

const variantClass: Record<Variant, string> = {
  primary:
    'bg-brand-strong text-white border-brand-strong hover:bg-brand-deep disabled:bg-brand-border disabled:border-brand-border',
  secondary:
    'bg-surface text-ink border-line-strong hover:bg-surface-muted disabled:text-ink-subtle',
  ghost: 'bg-transparent text-ink-muted border-transparent hover:bg-surface-alt',
  danger: 'bg-surface text-danger border-danger-border hover:bg-danger-surface',
};

const sizeClass: Record<Size, string> = {
  sm: 'h-[30px] px-3 text-[12px] rounded-md',
  md: 'h-[38px] px-4 text-[13px] rounded-lg',
};

export function Button({
  variant = 'secondary',
  size = 'md',
  className,
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: Variant; size?: Size }) {
  return (
    <button
      className={cn(
        'inline-flex items-center justify-center gap-1.5 border font-bold whitespace-nowrap transition-colors',
        'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-strong',
        'disabled:cursor-not-allowed',
        variantClass[variant],
        sizeClass[size],
        className
      )}
      {...props}
    />
  );
}
