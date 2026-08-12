import { useState } from 'react';
import type { ProjectMember } from '../../types';
import { projectsApi } from '../../infrastructure/http/projects';
import { Modal } from './Modal';
import { Avatar } from '../ui/Avatar';
import { Button } from '../ui/Button';
import { cn } from '../../lib/cn';

/**
 * Figma 는 후보를 이미 고른 상태에서 열리는 모달(현재→새 담당자 아바타 쌍,
 * 검수대기/재답변 2분할 통계, "즉시 이관" vs "처리 완료 후 예약" 두 방식 선택)을
 * 그린다. 이 화면은 계약이 뒷받침하는 부분까지만 반영한다:
 * - 후보 선택 단계는 남긴다 — 실제로는 멤버 표 행이 아니라 이 모달에서 고른다
 * - 통계는 검수대기/재답변으로 나눌 데이터가 없어 pending_cards 합계 하나만 보인다
 * - 이관 방식은 즉시 이관 하나뿐이다 — "예약 이관"을 받는 API 가 없다
 */
export function TransferAnswererModal({
  projectId,
  currentAnswererName,
  pendingCards,
  candidates,
  onClose,
  onDone,
}: {
  projectId: string;
  currentAnswererName: string;
  pendingCards: number;
  candidates: ProjectMember[];
  onClose: () => void;
  onDone: () => void;
}) {
  const [selected, setSelected] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const selectedMember = candidates.find((c) => c.user_id === selected) ?? null;

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
      width={580}
      onClose={onClose}
      footer={
        <>
          <Button onClick={onClose}>취소</Button>
          <Button variant="primary" disabled={!selected || busy} onClick={submit}>
            교체 실행
          </Button>
        </>
      }
    >
      {selectedMember && (
        <div className="mb-4 flex items-center gap-1.5">
          <Avatar name={currentAnswererName} size={20} />
          <span className="text-[12px] font-bold text-ink">{currentAnswererName}</span>
          <span className="text-[12px] font-bold text-ink-muted">→</span>
          <Avatar name={selectedMember.name} size={20} />
          <span className="text-[12px] font-bold text-ink">{selectedMember.name}</span>
        </div>
      )}

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

      {selectedMember && (
        <div className="mt-4 rounded-xl border-[1.8px] border-brand bg-brand-surface px-4 py-3">
          <p className="text-[13px] font-bold text-brand-deep">전부 새 담당자에게 이관</p>
          <p className="mt-1.5 text-[12px] leading-[18px] text-ink-muted">
            {pendingCards > 0
              ? `미처리 카드 ${pendingCards}건이 즉시 ${selectedMember.name}의 브리핑 인박스로 이동합니다. 아침 브리핑·방해 금지 시각도 새 담당자의 타임존을 따릅니다.`
              : `미처리 카드는 없습니다. 앞으로의 새 질문은 즉시 ${selectedMember.name}에게 배정됩니다.`}
          </p>
        </div>
      )}
    </Modal>
  );
}
