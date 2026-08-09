import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Loader2 } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { projectsApi } from '../api/projects';
import { Button } from '../components/ui/Button';
import { Badge } from '../components/ui/Badge';
import { CreateProjectModal } from '../components/modals/CreateProjectModal';

export function ProjectsPage() {
  const { projects, refreshMe, setActiveProject } = useAuth();
  const navigate = useNavigate();

  const [creating, setCreating] = useState(false);
  const [code, setCode] = useState('');
  const [joining, setJoining] = useState(false);
  const [error, setError] = useState<string | null>(null);

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
    <div className="mx-auto w-full max-w-[720px] px-6 py-10">
      <h1 className="text-2xl font-bold leading-8 text-ink">프로젝트</h1>
      <p className="mt-1.5 text-[13px] text-ink-muted">
        만들면 담당자가 되고, 초대 코드로 참여하면 질문자가 됩니다.
      </p>

      <section className="mt-6 rounded-xl border border-line bg-surface p-5">
        <h2 className="text-[13px] font-bold text-ink">새 프로젝트 만들기</h2>
        <p className="mb-3 mt-1 text-[12px] text-ink-muted">
          근거 문서와 AI 임계치를 이어서 설정할 수 있습니다.
        </p>
        <Button variant="primary" onClick={() => setCreating(true)}>
          새 프로젝트 만들기
        </Button>
      </section>

      <section className="mt-4 rounded-xl border border-line bg-surface p-5">
        <h2 className="text-[13px] font-bold text-ink">초대 코드로 참여</h2>
        <p className="mb-3 mt-1 text-[12px] text-ink-muted">
          담당자에게 받은 코드를 입력하세요.
        </p>
        <div className="flex gap-2">
          <input
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
        {error && <p className="mt-2 text-[12px] font-bold text-danger">{error}</p>}
      </section>

      {projects.length > 0 && (
        <section className="mt-4 rounded-xl border border-line bg-surface p-5">
          <h2 className="mb-3 text-[13px] font-bold text-ink">내 프로젝트</h2>
          <ul className="flex flex-col gap-2">
            {projects.map((p) => (
              <li key={p.id}>
                <button
                  onClick={() => {
                    setActiveProject(p);
                    navigate('/chat');
                  }}
                  className="flex w-full items-center gap-2 rounded-lg border border-line px-3.5 py-3 text-left hover:bg-surface-muted"
                >
                  <span className="min-w-0 flex-1 truncate text-[13px] font-bold text-ink">
                    {p.name}
                  </span>
                  <Badge tone={p.role === 'answerer' ? 'brand' : 'neutral'}>
                    {p.role === 'answerer' ? '담당자' : '질문자'}
                  </Badge>
                  {p.pending_cards > 0 && <Badge tone="warn">카드 {p.pending_cards}</Badge>}
                </button>
              </li>
            ))}
          </ul>
        </section>
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
