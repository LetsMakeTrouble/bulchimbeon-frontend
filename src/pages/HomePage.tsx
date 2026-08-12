import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { FolderPlus, Loader2 } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { projectsApi } from '../infrastructure/http/projects';
import type { UserProjectSummary } from '../types';
import { Button } from '../components/ui/Button';
import { CreateProjectModal } from '../components/modals/CreateProjectModal';
import { cn } from '../lib/cn';

/**
 * 진입점 — 프로젝트 카드 대시보드.
 *
 * 저해상도 와이어프레임(node 29:267/29:392, "프로젝트 있는/없는 홈화면")의 구조를
 * Hi-Fi 토큰으로 옮겼다. 그 목업엔 "초대 1건 · 수락/거절" 배너가 있지만, 백엔드
 * 계약엔 특정 이메일을 지정해 초대하는 API 가 없다(초대는 코드 공유뿐이다) —
 * 없는 걸 있는 척 만들지 않았다. 프로젝트 카드의 "N명"·"마지막 활동"도 같은
 * 이유로 뺐다 — UserProjectSummary 에 그 데이터가 없다.
 */
export function HomePage() {
  const { projects, refreshMe, setActiveProject } = useAuth();
  const navigate = useNavigate();

  const [creating, setCreating] = useState(false);
  const [joining, setJoining] = useState(false);
  const [showCodeInput, setShowCodeInput] = useState(false);
  const [code, setCode] = useState('');
  const [error, setError] = useState<string | null>(null);

  const enter = (p: UserProjectSummary) => {
    setActiveProject(p);
    navigate('/chat');
  };

  const join = async () => {
    if (!code.trim()) return;
    setJoining(true);
    setError(null);
    try {
      await projectsApi.join(code.trim());
      await refreshMe();
      navigate('/chat');
    } catch (err) {
      const e = err as { response?: { data?: { error?: { code?: string } } } };
      setError(
        e.response?.data?.error?.code === 'INVITE_ALREADY_JOINED'
          ? '이미 참여한 프로젝트입니다.'
          : '초대 코드를 확인해 주세요.'
      );
    } finally {
      setJoining(false);
    }
  };

  return (
    <div className="mx-auto w-full max-w-[1040px] px-8 py-9">
      <div className="flex items-end justify-between">
        <div>
          <h1 className="text-[22px] font-bold leading-8 text-ink">프로젝트</h1>
          <p className="mt-1 text-[13px] text-ink-muted">
            {projects.length > 0 ? `참여 중인 프로젝트 ${projects.length}개` : '아직 참여 중인 프로젝트가 없습니다'}
          </p>
        </div>
        <Button variant="primary" onClick={() => setCreating(true)}>
          + 새 프로젝트
        </Button>
      </div>

      {projects.length > 0 ? (
        <div className="mt-5 grid grid-cols-3 gap-3.5">
          {projects.map((p) => (
            <ProjectCard key={p.id} project={p} onClick={() => enter(p)} />
          ))}
        </div>
      ) : (
        <div className="mt-5 flex flex-col items-center rounded-lg border border-dashed border-line-strong px-8 py-16">
          <FolderPlus className="size-10 text-ink-subtle" />
          <p className="mt-5 text-[18px] font-bold text-ink">아직 프로젝트가 없어요</p>
          <p className="mt-2 text-[13px] text-ink-muted">
            팀의 Q&A 공간을 만들거나, 초대 코드로 합류할 수 있습니다.
          </p>

          {showCodeInput ? (
            <div className="mt-5 flex w-full max-w-[360px] flex-col gap-2">
              <div className="flex gap-2">
                <input
                  autoFocus
                  value={code}
                  onChange={(e) => setCode(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && join()}
                  placeholder="초대 코드"
                  className="h-[38px] flex-1 rounded-lg border border-line bg-surface px-3 font-mono text-[13px] tracking-wider text-ink placeholder:font-sans placeholder:tracking-normal placeholder:text-ink-subtle focus:border-brand focus:outline-none"
                />
                <Button variant="primary" disabled={joining || !code.trim()} onClick={join}>
                  {joining && <Loader2 className="size-3.5 animate-spin" />} 참여
                </Button>
              </div>
              {error && <p className="text-[12px] font-bold text-danger">{error}</p>}
            </div>
          ) : (
            <div className="mt-5 flex gap-2">
              <Button variant="primary" onClick={() => setCreating(true)}>
                + 새 프로젝트
              </Button>
              <Button onClick={() => setShowCodeInput(true)}>초대 코드 입력</Button>
            </div>
          )}
        </div>
      )}

      {creating && (
        <CreateProjectModal
          onClose={() => setCreating(false)}
          onCreated={async () => {
            setCreating(false);
            await refreshMe();
            navigate('/inbox');
          }}
        />
      )}
    </div>
  );
}

function ProjectCard({ project: p, onClick }: { project: UserProjectSummary; onClick: () => void }) {
  const isAnswerer = p.role === 'answerer';
  // 담당자에게는 검수 대기, 질문자에게는 새 알림 — 둘 다 실제로 있는 필드만 쓴다.
  const statCount = isAnswerer ? p.pending_cards : p.unread_notifications;
  const statLabel = isAnswerer ? '검수 대기' : '새 알림';

  return (
    <button
      onClick={onClick}
      className="flex min-h-[148px] flex-col items-start gap-3 rounded-lg border border-line bg-surface p-4 text-left shadow-[0_1px_2px_0_rgba(30,32,44,0.04)] transition-colors hover:border-brand-border hover:bg-brand-surface/20"
    >
      <div className="flex w-full items-start gap-2.5">
        <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-brand text-[12px] font-bold text-white">
          {p.name.slice(0, 2)}
        </span>
        <p className="min-w-0 flex-1 truncate text-[14px] font-bold text-ink">{p.name}</p>
        <span
          className={cn(
            'shrink-0 rounded-md px-2.5 py-[3px] text-[11px] font-bold',
            isAnswerer ? 'bg-ink text-white' : 'border border-line-strong bg-surface text-ink'
          )}
        >
          {isAnswerer ? '담당자' : '질문자'}
        </span>
      </div>

      <div className="flex-1" />

      {statCount > 0 && (
        <span className="w-full rounded-md border border-line bg-surface-subtle px-2.5 py-2 text-[12px] font-bold text-ink">
          {statLabel} {statCount}건
        </span>
      )}
    </button>
  );
}
