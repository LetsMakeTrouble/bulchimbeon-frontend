import { useCallback, useEffect, useState } from 'react';
import { Loader2, RefreshCw, Trash2 } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { projectsApi } from '../infrastructure/http/projects';
import type { Integration, ProjectDetail, ProjectSettings } from '../types';
import { Badge } from '../components/ui/Badge';
import { Button } from '../components/ui/Button';
import { AddIntegrationModal } from '../components/modals/AddIntegrationModal';
import { formatRelative } from '../lib/format';
import { cn } from '../lib/cn';

/** §3 허용 키 중 담당자가 실제로 만질 만한 것만 노출한다. 나머지는 캘리브레이션 값이다. */
const TUNABLE: {
  key: keyof ProjectSettings;
  label: string;
  hint: string;
  min: number;
  max: number;
  step?: number;
}[] = [
  { key: 'green_threshold', label: '즉답 하한', hint: '이 값 이상이면 🟢 즉답', min: 0, max: 100 },
  { key: 'yellow_threshold', label: '확인대기 하한', hint: '미만이면 🔴 보류', min: 0, max: 100 },
  { key: 'grounding_min', label: '근거율 하한', hint: '문장 3개 이상일 때만 적용', min: 0, max: 100 },
  { key: 'retrieval_top_k', label: '검색 top-k', hint: '답변에 참고할 청크 수', min: 1, max: 20 },
  { key: 'draft_expire_hours', label: '초안 만료(시간)', hint: '지나면 expired 처리', min: 1, max: 720 },
  { key: 'briefing_hour', label: '브리핑 시각', hint: '담당자 타임존 기준 (0~23)', min: 0, max: 23 },
];

export function SettingsPage() {
  const { activeProject, refreshMe } = useAuth();
  const projectId = activeProject?.id;
  const isAnswerer = activeProject?.role === 'answerer';

  const [project, setProject] = useState<ProjectDetail | null>(null);
  const [draft, setDraft] = useState<Partial<ProjectSettings>>({});
  const [guidelines, setGuidelines] = useState('');
  const [integrations, setIntegrations] = useState<Integration[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [addingIntegration, setAddingIntegration] = useState(false);
  const [removingId, setRemovingId] = useState<string | null>(null);

  const load = useCallback(() => {
    if (!projectId) return;
    setLoading(true);
    Promise.all([
      projectsApi.detail(projectId),
      projectsApi.guidelines(projectId).catch(() => ({ content: '' })),
      projectsApi.integrations(projectId).catch(() => []),
    ])
      .then(([p, g, i]) => {
        setProject(p);
        setDraft(p.settings);
        setGuidelines(g.content ?? '');
        setIntegrations(i);
      })
      .finally(() => setLoading(false));
  }, [projectId]);

  useEffect(load, [load]);

  const saveSettings = async () => {
    if (!projectId || !project) return;
    // 부분 갱신이므로 바뀐 키만 보낸다. 목록 밖의 키를 보내면 400 이다 (§3).
    const changed = Object.fromEntries(
      Object.entries(draft).filter(([k, v]) => project.settings[k as keyof ProjectSettings] !== v)
    );
    if (Object.keys(changed).length === 0) return;
    setSaving(true);
    try {
      await projectsApi.updateSettings(projectId, changed);
      setNotice('설정을 저장했습니다.');
      load();
    } catch {
      setNotice('저장에 실패했습니다. 값의 범위를 확인해 주세요.');
    } finally {
      setSaving(false);
    }
  };

  const toggleAway = async () => {
    if (!projectId || !project) return;
    await projectsApi.setAwayMode(projectId, !project.away_mode);
    // 퇴근 모드를 꺼도 이미 만들어진 카드는 유지된다 (룰 9).
    setNotice(
      project.away_mode
        ? '퇴근 모드를 껐습니다. 이미 쌓인 카드는 그대로 남아 있습니다.'
        : '퇴근 모드를 켰습니다. 이 시간의 질문은 AI가 1차 답변합니다.'
    );
    load();
    refreshMe();
  };

  const saveGuidelines = async () => {
    if (!projectId) return;
    await projectsApi.updateGuidelines(projectId, guidelines);
    setNotice('응답 지침을 저장했습니다.');
  };

  const removeIntegration = async (integrationId: string) => {
    if (!window.confirm('이 연동을 제거할까요? 이미 가져온 문서는 남습니다.')) return;
    setRemovingId(integrationId);
    try {
      await projectsApi.removeIntegration(integrationId);
      load();
    } finally {
      setRemovingId(null);
    }
  };

  if (!activeProject) {
    return <p className="p-10 text-[13px] text-ink-muted">프로젝트를 먼저 선택하세요.</p>;
  }
  if (!isAnswerer) {
    return <p className="p-10 text-[13px] text-ink-muted">담당자 전용 화면입니다.</p>;
  }

  return (
    <div className="mx-auto w-full max-w-[820px] px-6 py-8">
      <h1 className="text-2xl font-bold leading-8 text-ink">설정</h1>
      <p className="mt-1.5 text-[13px] text-ink-muted">{activeProject.name}</p>

      {notice && (
        <p className="mt-4 rounded-lg border border-info-border bg-info-surface px-3 py-2 text-[12px] font-bold text-info">
          {notice}
        </p>
      )}

      {loading && (
        <p className="mt-6 flex items-center gap-2 text-[13px] text-ink-muted">
          <Loader2 className="size-4 animate-spin" /> 불러오는 중…
        </p>
      )}

      {project && (
        <>
          <Card title="퇴근 모드" caption="켜두면 이 시간의 질문에 AI가 먼저 답하고 카드로 모읍니다">
            <div className="flex items-center gap-3">
              <Badge tone={project.away_mode ? 'warn' : 'ok'}>
                {project.away_mode ? '자리 비움' : '응답 가능'}
              </Badge>
              <Button className="ml-auto" onClick={toggleAway}>
                {project.away_mode ? '퇴근 모드 끄기' : '퇴근 모드 켜기'}
              </Button>
            </div>
          </Card>

          <Card
            title="AI 임계치"
            caption="유사도·근거율 기준. 브리핑·방해금지 시각은 담당자 타임존을 따릅니다"
          >
            <div className="grid grid-cols-2 gap-4">
              {TUNABLE.map((f) => (
                <label key={f.key} className="block">
                  <span className="mb-1 block text-[12px] font-bold text-ink">{f.label}</span>
                  <input
                    type="number"
                    min={f.min}
                    max={f.max}
                    step={f.step ?? 1}
                    value={String(draft[f.key] ?? '')}
                    onChange={(e) =>
                      setDraft((d) => ({ ...d, [f.key]: Number(e.target.value) }))
                    }
                    className="h-[38px] w-full rounded-lg border border-line bg-surface px-3 text-[13px] text-ink focus:border-brand focus:outline-none"
                  />
                  <span className="mt-1 block text-[11px] text-ink-muted">{f.hint}</span>
                </label>
              ))}

              <label className="block">
                <span className="mb-1 block text-[12px] font-bold text-ink">방해금지 시작</span>
                <input
                  type="time"
                  value={draft.dnd_start ?? ''}
                  onChange={(e) => setDraft((d) => ({ ...d, dnd_start: e.target.value }))}
                  className="h-[38px] w-full rounded-lg border border-line bg-surface px-3 text-[13px] text-ink focus:border-brand focus:outline-none"
                />
              </label>
              <label className="block">
                <span className="mb-1 block text-[12px] font-bold text-ink">방해금지 종료</span>
                <input
                  type="time"
                  value={draft.dnd_end ?? ''}
                  onChange={(e) => setDraft((d) => ({ ...d, dnd_end: e.target.value }))}
                  className="h-[38px] w-full rounded-lg border border-line bg-surface px-3 text-[13px] text-ink focus:border-brand focus:outline-none"
                />
              </label>
            </div>
            <Button variant="primary" className="mt-4" disabled={saving} onClick={saveSettings}>
              {saving && <Loader2 className="size-3.5 animate-spin" />} 저장
            </Button>
          </Card>

          <Card title="응답 지침" caption="AI가 답변을 만들 때 따르는 규칙입니다">
            <textarea
              value={guidelines}
              onChange={(e) => setGuidelines(e.target.value)}
              rows={5}
              maxLength={10000}
              placeholder="예: 금액은 반드시 원문 표를 인용해 답한다."
              className="w-full resize-none rounded-lg border border-line bg-surface p-3 text-[13px] leading-[20px] text-ink focus:border-brand focus:outline-none"
            />
            <Button variant="primary" className="mt-3" onClick={saveGuidelines}>
              지침 저장
            </Button>
          </Card>

          <Card title="외부 연동" caption="변경된 파일은 새 버전이 되고 재검토 연쇄가 돕니다">
            {integrations.length === 0 ? (
              <p className="text-[13px] text-ink-muted">연결된 연동이 없습니다.</p>
            ) : (
              <ul className="flex flex-col gap-2">
                {integrations.map((i) => (
                  <li
                    key={i.id}
                    className="flex items-center gap-3 rounded-lg border border-line bg-surface px-3.5 py-3"
                  >
                    <Badge tone="brand">{i.provider === 'github' ? 'GitHub' : 'Notion'}</Badge>
                    <span className="text-[12px] text-ink-muted">
                      {i.last_synced_at
                        ? `${formatRelative(i.last_synced_at)} 동기화`
                        : '아직 동기화 안 됨'}
                    </span>
                    {i.last_sync_status === 'failed' && <Badge tone="danger">실패</Badge>}
                    <Button
                      size="sm"
                      className="ml-auto"
                      onClick={async () => {
                        await projectsApi.syncIntegration(i.id);
                        setNotice('동기화를 시작했습니다. 완료되면 알림으로 전달됩니다.');
                      }}
                    >
                      <RefreshCw className="size-3.5" /> 지금 동기화
                    </Button>
                    <Button
                      size="sm"
                      variant="danger"
                      disabled={removingId === i.id}
                      onClick={() => removeIntegration(i.id)}
                    >
                      <Trash2 className="size-3.5" />
                    </Button>
                  </li>
                ))}
              </ul>
            )}
            <Button className="mt-3" onClick={() => setAddingIntegration(true)}>
              + 연동 추가
            </Button>
          </Card>
        </>
      )}

      {addingIntegration && projectId && (
        <AddIntegrationModal
          projectId={projectId}
          onClose={() => setAddingIntegration(false)}
          onDone={() => {
            setAddingIntegration(false);
            setNotice('연동을 등록하고 첫 동기화를 시작했습니다. 완료되면 알림으로 전달됩니다.');
            load();
          }}
        />
      )}
    </div>
  );
}

function Card({
  title,
  caption,
  children,
  className,
}: {
  title: string;
  caption: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <section className={cn('mt-4 rounded-xl border border-line bg-surface p-5', className)}>
      <h2 className="text-[13px] font-bold text-ink">{title}</h2>
      <p className="mb-3 mt-1 text-[12px] text-ink-muted">{caption}</p>
      {children}
    </section>
  );
}
