/** `node src/domain/document/selfCheck.ts` — 프레임워크 의존 0, 러너 없이 돈다. */
import assert from 'node:assert/strict';
import type { DocumentVersion } from '../../types/index.ts';
import { canActivate, hasReadableContent, isStale, STALE_DAYS } from './documentPolicy.ts';

const version = (overrides: Partial<DocumentVersion>): DocumentVersion => ({
  id: 'v-1',
  version_no: 1,
  original_filename: 'a.md',
  mime: 'text/markdown',
  size_bytes: 1024,
  is_active: false,
  ingest_status: 'ready',
  ingest_error: null,
  uploaded_by: 'u-1',
  created_at: new Date().toISOString(),
  ...overrides,
});

// 활성 전환 규칙
assert.ok(canActivate(version({})), '비활성 + ready 버전은 전환 가능해야 한다');
assert.ok(!canActivate(version({ is_active: true })), '이미 활성인 버전은 전환 대상이 아니다');
assert.ok(
  !canActivate(version({ ingest_status: 'processing' })),
  '인제스트 중인 버전을 활성화하면 빈 근거로 답변이 나간다'
);
assert.ok(!canActivate(version({ ingest_status: 'failed' })));
assert.ok(!canActivate(version({ ingest_status: 'pending' })));

// 원문 표시 규칙
assert.ok(hasReadableContent(version({ ingest_status: 'ready' })));
assert.ok(!hasReadableContent(version({ ingest_status: 'processing' })));

// 오래됨 판정
const now = Date.parse('2026-08-09T00:00:00Z');
assert.ok(!isStale('2026-08-01T00:00:00Z', now), `${STALE_DAYS}일 미만은 오래됨이 아니다`);
assert.ok(isStale('2026-01-01T00:00:00Z', now), `${STALE_DAYS}일 넘게 지나면 오래됨이다`);

console.log('domain/document self-check: ok');
