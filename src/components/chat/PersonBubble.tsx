import type { Role } from '../../types';
import { Avatar } from '../ui/Avatar';
import { Tag } from '../ui/Tag';
import { formatTime } from '../../lib/format';
import { cn } from '../../lib/cn';

/**
 * 사람이 보낸 말풍선 — 질문과 대화 메시지를 같은 컴포넌트로 그린다.
 *
 * 좌우는 **역할이 아니라 "내가 보냈는가"** 로 정한다. 같은 질문이라도 질문자에게는
 * 오른쪽, 담당자에게는 왼쪽이어야 대화로 읽힌다. 예전 QuestionBubble 은 무조건
 * 오른쪽이라 담당자 화면에서 상대 발화가 자기 말처럼 보였다.
 */
export function PersonBubble({
  name,
  role,
  text,
  createdAt,
  own,
}: {
  name: string;
  role: Role;
  text: string;
  createdAt: string;
  own: boolean;
}) {
  return (
    <div className={cn('flex items-start gap-2.5', own && 'flex-row-reverse')}>
      {/* 내 말풍선에는 아바타를 달지 않는다 — 정렬만으로 이미 구분된다 */}
      {!own && <Avatar name={name} size={32} className="mt-0.5" />}
      <div className={cn('flex min-w-0 max-w-[560px] flex-col', own && 'items-end')}>
        <div className="mb-1 flex items-center gap-1.5">
          {!own && (
            <>
              <span className="text-[12px] font-bold text-ink">{name}</span>
              <Tag tone={role === 'answerer' ? 'brand' : 'neutral'}>
                {role === 'answerer' ? '담당자' : '질문자'}
              </Tag>
            </>
          )}
        </div>
        <div
          className={cn(
            'rounded-xl px-4 py-3',
            own
              ? 'rounded-br-sm bg-brand-strong'
              : 'rounded-tl-sm border border-line bg-surface shadow-[0_1px_2px_0_rgba(30,32,44,0.04)]'
          )}
        >
          <p
            className={cn(
              'whitespace-pre-wrap text-[14px] leading-[22px]',
              own ? 'text-white' : 'text-ink'
            )}
          >
            {text}
          </p>
          <p
            className={cn(
              'mt-1 text-[11px]',
              own ? 'text-right text-white/70' : 'text-ink-subtle'
            )}
          >
            {formatTime(createdAt)}
          </p>
        </div>
      </div>
    </div>
  );
}
