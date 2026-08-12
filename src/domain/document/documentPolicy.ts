import type { DocumentVersion } from '../../types/index.ts';

/**
 * 근거 문서에 대한 업무 규칙.
 *
 * SRP: 이 파일이 바뀌는 유일한 이유는 "언제 버전을 전환할 수 있는가",
 * "언제 문서를 오래됐다고 볼 것인가" 같은 업무 판단이 바뀔 때다.
 * 화면이 이 판단을 몇 번째 컬럼에 그리는지는 여기와 무관하다.
 */

/** 이 이상 갱신이 없으면 담당자에게 경고한다. 값 자체가 업무 판단이라 상수도 여기 산다. */
export const STALE_DAYS = 90;

export const isStale = (updatedAtIso: string, now = Date.now()): boolean =>
  now - new Date(updatedAtIso).getTime() > STALE_DAYS * 86_400_000;

/**
 * 이 버전으로 전환할 수 있는가.
 *
 * - 이미 활성인 버전은 전환할 수 없다(대상이 아니다).
 * - 인제스트가 끝나지 않은 버전은 아직 검색 가능한 원문이 없어 전환하면 빈 근거로 답변이 나간다.
 */
export const canActivate = (version: DocumentVersion): boolean =>
  !version.is_active && version.ingest_status === 'ready';

/** 원문을 읽을 수 있는가 — 인제스트가 끝난 버전만 content 엔드포인트가 의미 있는 값을 준다. */
export const hasReadableContent = (version: DocumentVersion): boolean =>
  version.ingest_status === 'ready';
