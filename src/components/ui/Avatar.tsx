import { cn } from '../../lib/cn';
import { initial } from '../../lib/format';

/**
 * 이름을 안정적인 색으로 매핑한다. 같은 사람은 항상 같은 색이어야
 * 목록에서 아바타가 식별자 역할을 한다.
 */
const palettes = [
  'bg-warn-surface text-warn',
  'bg-ok-surface text-ok',
  'bg-info-surface text-info',
  'bg-purple-surface text-purple',
  'bg-brand-surface text-brand-deep',
  'bg-danger-surface text-danger',
];

const paletteFor = (seed: string) => {
  let hash = 0;
  for (let i = 0; i < seed.length; i += 1) hash = (hash * 31 + seed.charCodeAt(i)) | 0;
  return palettes[Math.abs(hash) % palettes.length];
};

export function Avatar({
  name,
  size = 32,
  className,
}: {
  name: string;
  size?: number;
  className?: string;
}) {
  return (
    <span
      className={cn(
        'inline-flex shrink-0 items-center justify-center rounded-full font-bold leading-none',
        paletteFor(name),
        className
      )}
      style={{ width: size, height: size, fontSize: Math.round(size * 0.375) }}
      aria-hidden
    >
      {initial(name)}
    </span>
  );
}
