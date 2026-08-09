import React from 'react';
import type { Grade } from '../../types';

interface GradeBadgeProps {
  grade?: Grade;
  showText?: boolean;
  size?: 'sm' | 'md' | 'lg';
}

export const GradeBadge: React.FC<GradeBadgeProps> = ({
  grade = 'green',
  showText = true,
  size = 'md',
}) => {
  const configs = {
    green: {
      emoji: '🟢',
      labelKo: '즉답',
      labelEn: 'Instant',
      bg: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30',
    },
    yellow: {
      emoji: '🟡',
      labelKo: '확인 대기',
      labelEn: 'Pending Review',
      bg: 'bg-amber-500/10 text-amber-400 border-amber-500/30',
    },
    red: {
      emoji: '🔴',
      labelKo: '보류',
      labelEn: 'Held',
      bg: 'bg-rose-500/10 text-rose-400 border-rose-500/30',
    },
  };

  const current = configs[grade] || configs.green;

  const sizeClasses = {
    sm: 'text-xs px-2 py-0.5 space-x-1',
    md: 'text-xs px-2.5 py-1 space-x-1.5 font-medium',
    lg: 'text-sm px-3 py-1.5 space-x-2 font-semibold',
  };

  return (
    <span
      className={`inline-flex items-center rounded-full border ${current.bg} ${sizeClasses[size]}`}
    >
      <span>{current.emoji}</span>
      {showText && <span>{current.labelKo}</span>}
    </span>
  );
};
