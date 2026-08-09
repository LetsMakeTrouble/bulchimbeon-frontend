import { useState } from 'react';
import type { ProjectMember } from '../../types';
import { projectsApi } from '../../infrastructure/http/projects';
import { Modal } from './Modal';
import { Avatar } from '../ui/Avatar';
import { Button } from '../ui/Button';
import { cn } from '../../lib/cn';

export function TransferAnswererModal({
  projectId,
  candidates,
  onClose,
  onDone,
}: {
  projectId: string;
  candidates: ProjectMember[];
  onClose: () => void;
  onDone: () => void;
}) {
  const [selected, setSelected] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const submit = async () => {
    if (!selected) return;
    setBusy(true);
    try {
      await projectsApi.transferAnswerer(projectId, selected);
      onDone();
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal
      title="담당자 교체"
      description="미처리 카드와 아침 브리핑이 새 담당자에게 함께 이관됩니다. 브리핑·방해 금지 시각도 새 담당자의 타임존을 따릅니다."
      width={580}
      onClose={onClose}
      footer={
        <>
          <Button onClick={onClose}>취소</Button>
          <Button variant="primary" disabled={!selected || busy} onClick={submit}>
            담당자로 지정
          </Button>
        </>
      }
    >
      {candidates.length === 0 ? (
        <p className="text-[13px] text-ink-muted">교체할 수 있는 멤버가 없습니다.</p>
      ) : (
        <ul className="flex flex-col gap-2">
          {candidates.map((m) => (
            <li key={m.user_id}>
              <button
                onClick={() => setSelected(m.user_id)}
                className={cn(
                  'flex w-full items-center gap-3 rounded-lg border px-3.5 py-3 text-left transition-colors',
                  selected === m.user_id
                    ? 'border-brand bg-brand-surface/40'
                    : 'border-line hover:bg-surface-muted'
                )}
              >
                <Avatar name={m.name} />
                <div className="min-w-0">
                  <p className="truncate text-[13px] font-bold text-ink">{m.name}</p>
                  <p className="truncate text-[11px] text-ink-muted">{m.email}</p>
                </div>
              </button>
            </li>
          ))}
        </ul>
      )}
    </Modal>
  );
}
