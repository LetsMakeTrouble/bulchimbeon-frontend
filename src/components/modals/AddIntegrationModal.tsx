import { useState, type ReactNode } from 'react';
import type { IntegrationProvider } from '../../types';
import { projectsApi } from '../../infrastructure/http/projects';
import { Modal } from './Modal';
import { Button } from '../ui/Button';
import { cn } from '../../lib/cn';

const TAB: { key: IntegrationProvider; label: string }[] = [
  { key: 'notion', label: 'Notion' },
  { key: 'github', label: 'GitHub' },
];

/**
 * 등록만으로는 동기화가 돌지 않는다(`05 §5`) — 첫 수집은 별도 sync 호출이다.
 * 여기서는 등록 직후 자동으로 한 번 동기화해, 담당자가 "추가했는데 문서가 안 보인다"에
 * 빠지지 않게 한다.
 */
export function AddIntegrationModal({
  projectId,
  onClose,
  onDone,
}: {
  projectId: string;
  onClose: () => void;
  onDone: () => void;
}) {
  const [provider, setProvider] = useState<IntegrationProvider>('notion');
  const [token, setToken] = useState('');
  const [pageIds, setPageIds] = useState('');
  const [repo, setRepo] = useState('');
  const [branch, setBranch] = useState('');
  const [pathGlob, setPathGlob] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const valid =
    provider === 'notion'
      ? token.trim().length > 0 && pageIds.trim().length > 0
      : /^[^/\s]+\/[^/\s]+$/.test(repo.trim());

  const submit = async () => {
    setBusy(true);
    setError(null);
    try {
      const config =
        provider === 'notion'
          ? {
              token: token.trim(),
              page_ids: pageIds
                .split(/[\n,]/)
                .map((id) => id.trim())
                .filter(Boolean),
            }
          : {
              repo: repo.trim(),
              ...(token.trim() ? { token: token.trim() } : {}),
              ...(branch.trim() ? { branch: branch.trim() } : {}),
              ...(pathGlob.trim() ? { path_glob: pathGlob.trim() } : {}),
            };
      const integration = await projectsApi.addIntegration(projectId, provider, config);
      await projectsApi.syncIntegration(integration.id).catch(() => {});
      onDone();
    } catch {
      setError('연동 등록에 실패했습니다. 입력값을 확인해 주세요.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal
      title="연동 추가"
      description="문서를 직접 올리는 대신, Notion 페이지나 GitHub 레포에서 자동으로 가져옵니다."
      onClose={onClose}
      footer={
        <>
          <Button onClick={onClose}>취소</Button>
          <Button variant="primary" disabled={!valid || busy} onClick={submit}>
            {busy ? '연결하는 중…' : '연결'}
          </Button>
        </>
      }
    >
      <div className="flex gap-1 rounded-lg bg-surface-alt p-1">
        {TAB.map((t) => (
          <button
            key={t.key}
            onClick={() => setProvider(t.key)}
            className={cn(
              'flex-1 rounded-md py-1.5 text-[12px] font-bold transition-colors',
              provider === t.key ? 'bg-surface text-ink shadow-sm' : 'text-ink-muted hover:text-ink'
            )}
          >
            {t.label}
          </button>
        ))}
      </div>

      {provider === 'notion' ? (
        <div className="mt-4 flex flex-col gap-3">
          <Field label="Integration 토큰" hint="Notion → Integrations 에서 발급">
            <input
              type="password"
              value={token}
              onChange={(e) => setToken(e.target.value)}
              placeholder="ntn_..."
              className="h-[38px] w-full rounded-lg border border-line bg-surface px-3 text-[13px] text-ink focus:border-brand focus:outline-none"
            />
          </Field>
          <Field label="페이지 ID" hint="한 줄에 하나씩, 또는 쉼표로 구분">
            <textarea
              value={pageIds}
              onChange={(e) => setPageIds(e.target.value)}
              rows={3}
              placeholder="a1b2c3d4..."
              className="w-full resize-none rounded-lg border border-line bg-surface p-3 text-[13px] text-ink focus:border-brand focus:outline-none"
            />
          </Field>
        </div>
      ) : (
        <div className="mt-4 flex flex-col gap-3">
          <Field label="레포" hint="owner/name 형식">
            <input
              value={repo}
              onChange={(e) => setRepo(e.target.value)}
              placeholder="octocat/hello-world"
              className="h-[38px] w-full rounded-lg border border-line bg-surface px-3 text-[13px] text-ink focus:border-brand focus:outline-none"
            />
          </Field>
          <Field label="토큰" hint="공개 레포면 비워도 됩니다">
            <input
              type="password"
              value={token}
              onChange={(e) => setToken(e.target.value)}
              placeholder="ghp_... (선택)"
              className="h-[38px] w-full rounded-lg border border-line bg-surface px-3 text-[13px] text-ink focus:border-brand focus:outline-none"
            />
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="브랜치" hint="기본 main">
              <input
                value={branch}
                onChange={(e) => setBranch(e.target.value)}
                placeholder="main"
                className="h-[38px] w-full rounded-lg border border-line bg-surface px-3 text-[13px] text-ink focus:border-brand focus:outline-none"
              />
            </Field>
            <Field label="경로 패턴" hint="기본 **/*.md">
              <input
                value={pathGlob}
                onChange={(e) => setPathGlob(e.target.value)}
                placeholder="**/*.md"
                className="h-[38px] w-full rounded-lg border border-line bg-surface px-3 text-[13px] text-ink focus:border-brand focus:outline-none"
              />
            </Field>
          </div>
        </div>
      )}

      {error && <p className="mt-3 text-[12px] font-bold text-danger">{error}</p>}
    </Modal>
  );
}

function Field({ label, hint, children }: { label: string; hint: string; children: ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1 block text-[12px] font-bold text-ink">{label}</span>
      {children}
      <span className="mt-1 block text-[11px] text-ink-muted">{hint}</span>
    </label>
  );
}
