import type { ReactNode } from 'react';
import { cn } from '../../lib/cn';

/**
 * 사각 태그 — Badge(pill 형)와는 다른 별도 Figma 컴포넌트다.
 * 문서 화면과 프로젝트 생성 모달 두 곳에서 확인돼 공유로 승격했다.
 */
export type TagTone = 'neutral' | 'warn' | 'brand' | 'ok';

const toneClass: Record<TagTone, string> = {
  neutral: 'border-line bg-surface-subtle text-ink-muted',
  warn: 'border-warn-border bg-warn-surface text-warn',
  brand: 'border-brand-border bg-brand-surface text-brand-deep',
  ok: 'border-ok-border bg-ok-surface text-ok',
};

export function Tag({ tone = 'neutral', children }: { tone?: TagTone; children: ReactNode }) {
  return (
    <span
      className={cn(
        'inline-flex h-[18px] items-center whitespace-nowrap rounded-[5px] border px-1.5 text-[10px] font-bold',
        toneClass[tone]
      )}
    >
      {children}
    </span>
  );
}
