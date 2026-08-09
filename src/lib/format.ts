/** 화면 표기 헬퍼. 서버가 만든 문자열(§1.5)은 그대로 렌더하고 여기서 손대지 않는다. */

const pad = (n: number) => String(n).padStart(2, '0');

/** "오전 9:02" */
export function formatTime(iso: string): string {
  const d = new Date(iso);
  const h = d.getHours();
  const meridiem = h < 12 ? '오전' : '오후';
  const h12 = h % 12 === 0 ? 12 : h % 12;
  return `${meridiem} ${h12}:${pad(d.getMinutes())}`;
}

/** "2026년 8월 4일 화요일" */
export function formatFullDate(iso: string): string {
  return new Date(iso).toLocaleDateString('ko-KR', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    weekday: 'long',
  });
}

/** "5분 전" · "3시간 전" · "어제 오후 5:40" · "2026년 5월 2일" */
export function formatRelative(iso: string): string {
  const then = new Date(iso);
  const diffMin = Math.floor((Date.now() - then.getTime()) / 60000);

  if (diffMin < 1) return '방금 전';
  if (diffMin < 60) return `${diffMin}분 전`;
  if (diffMin < 60 * 24) return `${Math.floor(diffMin / 60)}시간 전`;

  const startOfToday = new Date();
  startOfToday.setHours(0, 0, 0, 0);
  const daysApart = Math.floor((startOfToday.getTime() - then.getTime()) / 86400000) + 1;
  if (daysApart === 1) return `어제 ${formatTime(iso)}`;
  if (daysApart < 7) return `${daysApart}일 전`;
  if (daysApart < 28) return `${Math.floor(daysApart / 7)}주 전`;
  return then.toLocaleDateString('ko-KR', { year: 'numeric', month: 'long', day: 'numeric' });
}

/** 아바타 이니셜 — 한글은 첫 글자, 라틴은 첫 글자 대문자 */
export const initial = (name: string) => (name ? name.trim()[0].toUpperCase() : '?');
