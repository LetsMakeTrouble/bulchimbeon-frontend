import { useCallback, useEffect, useState } from 'react';
import { Copy, Loader2, RefreshCw } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { projectsApi } from '../infrastructure/http/projects';
import type { ProjectDetail, ProjectMember } from '../types';
import { Avatar } from '../components/ui/Avatar';
import { Badge } from '../components/ui/Badge';
import { Button } from '../components/ui/Button';
import { TransferAnswererModal } from '../components/modals/TransferAnswererModal';
import { formatRelative } from '../lib/format';

export function MembersPage() {
  const { user, activeProject, refreshMe } = useAuth();
  const projectId = activeProject?.id;
  const isAnswerer = activeProject?.role === 'answerer';

  const [members, setMembers] = useState<ProjectMember[]>([]);
  const [project, setProject] = useState<ProjectDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [notice, setNotice] = useState<string | null>(null);
  const [transferring, setTransferring] = useState(false);

  const load = useCallback(() => {
    if (!projectId) return;
    setLoading(true);
    Promise.all([projectsApi.members(projectId), projectsApi.detail(projectId)])
      .then(([m, p]) => {
        setMembers(m);
        setProject(p);
      })
      .finally(() => setLoading(false));
  }, [projectId]);

  useEffect(load, [load]);

  const copyInvite = async () => {
    if (!project?.invite_code) return;
    await navigator.clipboard.writeText(project.invite_code);
    setNotice('초대 코드를 복사했습니다. 이 코드로 질문자가 참여합니다.');
  };

  const regenerate = async () => {
    if (!projectId) return;
    const { invite_code } = await projectsApi.regenerateInviteCode(projectId);
    setProject((p) => (p ? { ...p, invite_code } : p));
    setNotice('초대 코드를 새로 발급했습니다. 이전 코드는 더 이상 쓸 수 없습니다.');
  };

  const remove = async (m: ProjectMember) => {
    if (!projectId) return;
    if (!window.confirm(`${m.name} 님을 내보낼까요?`)) return;
    await projectsApi.removeMember(projectId, m.user_id);
    load();
  };

  if (!activeProject) {
    return <p className="p-10 text-[13px] text-ink-muted">프로젝트를 먼저 선택하세요.</p>;
  }
  if (!isAnswerer) {
    return <p className="p-10 text-[13px] text-ink-muted">담당자 전용 화면입니다.</p>;
  }

  const active = members.filter((m) => m.status === 'active');

  return (
    <div className="mx-auto w-full max-w-[900px] px-6 py-8">
      <h1 className="text-2xl font-bold leading-8 text-ink">멤버</h1>
      <p className="mt-1.5 text-[13px] text-ink-muted">
        {activeProject.name} · 멤버 {active.length}명
      </p>

      {notice && (
        <p className="mt-4 rounded-lg border border-info-border bg-info-surface px-3 py-2 text-[12px] font-bold text-info">
          {notice}
        </p>
      )}

      {/* 초대 — 계약상 초대는 이메일 발송이 아니라 초대 코드 공유다 (§3).
          Figma 는 이메일 토큰 입력 + 대기중/재전송/취소 UI 를 그리지만, 그 흐름을
          받쳐줄 이메일 발송 엔드포인트도 "대기중" 멤버 상태도 계약에 없다.
          없는 걸 있는 척 그리지 않는다 — 실제로 되는 초대 코드 흐름을 유지한다. */}
      <section className="mt-5 rounded-xl border border-line bg-surface p-4 shadow-[0_1px_2px_0_rgba(30,32,44,0.04)]">
        <h2 className="text-[13px] font-bold text-ink">멤버 초대</h2>
        <p className="mt-1 text-[12px] text-ink-muted">
          초대 코드를 전달하면 상대가 질문자로 참여합니다.
        </p>
        <div className="mt-3 flex flex-wrap items-center gap-2">
          <code className="flex h-[38px] min-w-[220px] items-center rounded-lg border border-line bg-surface-muted px-3 font-mono text-[13px] tracking-wider text-ink">
            {project?.invite_code ?? '—'}
          </code>
          <Button variant="primary" onClick={copyInvite} disabled={!project?.invite_code}>
            <Copy className="size-3.5" /> 초대 코드 복사
          </Button>
          <Button onClick={regenerate}>
            <RefreshCw className="size-3.5" /> 재발급
          </Button>
          <Button className="ml-auto" onClick={() => setTransferring(true)} disabled={active.length < 2}>
            담당자 교체
          </Button>
        </div>
      </section>

      {/* 멤버 표 */}
      <section className="mt-4 overflow-x-auto rounded-xl border border-line bg-surface shadow-[0_1px_2px_0_rgba(30,32,44,0.04)]">
        <table className="w-full min-w-[620px] text-left">
          <thead>
            <tr className="border-b border-line bg-surface-muted text-[11px] font-bold text-ink-muted">
              <th className="whitespace-nowrap py-2.5 pl-[18px] pr-4">이름</th>
              <th className="whitespace-nowrap px-4 py-2.5">역할</th>
              <th className="whitespace-nowrap px-4 py-2.5">상태</th>
              <th className="whitespace-nowrap px-4 py-2.5">가입일</th>
              <th className="px-4 py-2.5" />
            </tr>
          </thead>
          <tbody>
            {loading && (
              <tr>
                <td colSpan={5} className="px-4 py-8 text-[13px] text-ink-muted">
                  <span className="flex items-center gap-2">
                    <Loader2 className="size-4 animate-spin" /> 불러오는 중…
                  </span>
                </td>
              </tr>
            )}
            {members.map((m) => (
              <tr key={m.user_id} className="border-b border-line last:border-0">
                <td className="py-3.5 pl-[18px] pr-4">
                  <div className="flex items-center gap-2.5">
                    <Avatar name={m.name} />
                    <div className="min-w-0">
                      <p className="truncate text-[13px] font-bold text-ink">
                        {m.name}
                        {m.user_id === user?.id && ' (나)'}
                      </p>
                      <p className="truncate text-[11px] text-ink-muted">{m.email}</p>
                    </div>
                  </div>
                </td>
                <td className="px-4 py-3.5">
                  {/* 담당자는 solid 채움, 질문자는 옅은 tint — Badge 의 'brand' 는
                      tint 쪽 의미로 이미 다른 화면에 쓰이고 있어 여기만 override 한다 */}
                  {m.role === 'answerer' ? (
                    <span className="inline-flex h-5 items-center rounded-full bg-brand-strong px-2 text-[11px] font-bold text-white">
                      담당자
                    </span>
                  ) : (
                    <Badge tone="brand">질문자</Badge>
                  )}
                </td>
                <td className="whitespace-nowrap px-4 py-3.5 text-[12px] font-medium text-ok">
                  {m.status === 'active' ? '수락함' : '탈퇴'}
                </td>
                <td className="whitespace-nowrap px-4 py-3.5 text-[12px] text-ink-muted">
                  {formatRelative(m.joined_at)}
                </td>
                <td className="px-4 py-3.5 text-right">
                  {m.role === 'asker' && m.status === 'active' && (
                    <Button variant="ghost" size="sm" onClick={() => remove(m)}>
                      내보내기
                    </Button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      {transferring && projectId && (
        <TransferAnswererModal
          projectId={projectId}
          currentAnswererName={user?.name ?? '나'}
          pendingCards={activeProject.pending_cards}
          candidates={active.filter((m) => m.role === 'asker')}
          onClose={() => setTransferring(false)}
          onDone={() => {
            setTransferring(false);
            setNotice('담당자를 교체했습니다. 미처리 카드와 브리핑이 함께 이관됩니다.');
            load();
            refreshMe();
          }}
        />
      )}
    </div>
  );
}
