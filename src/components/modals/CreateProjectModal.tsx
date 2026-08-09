import { useRef, useState } from 'react';
import { Loader2, Upload } from 'lucide-react';
import { projectsApi } from '../../api/projects';
import { documentsApi } from '../../api/documents';
import type { ProjectDetail } from '../../types';
import { Modal } from './Modal';
import { Button } from '../ui/Button';
import { Badge } from '../ui/Badge';
import { cn } from '../../lib/cn';

const DAYS = ['월', '화', '수', '목', '금', '토', '일'];

export function CreateProjectModal({
  onClose,
  onCreated,
}: {
  onClose: () => void;
  onCreated: (project: ProjectDetail) => void;
}) {
  const [step, setStep] = useState<1 | 2>(1);
  const [project, setProject] = useState<ProjectDetail | null>(null);

  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // 계약은 0~100 정수를 받는다. 화면은 0~1 스케일이라 저장 시 ×100 한다.
  const [yellow, setYellow] = useState(0.6);
  const [green, setGreen] = useState(0.85);
  const [dndStart, setDndStart] = useState('22:00');
  const [dndEnd, setDndEnd] = useState('08:00');
  const [uploading, setUploading] = useState(false);
  const [uploaded, setUploaded] = useState<string[]>([]);
  const fileRef = useRef<HTMLInputElement>(null);

  const createProject = async () => {
    if (!name.trim()) return;
    setBusy(true);
    setError(null);
    try {
      const created = await projectsApi.create({
        name: name.trim(),
        description: description.trim() || undefined,
      });
      setProject(created);
      setStep(2);
    } catch {
      setError('프로젝트를 만들지 못했습니다.');
    } finally {
      setBusy(false);
    }
  };

  const upload = async (file: File) => {
    if (!project) return;
    setUploading(true);
    try {
      await documentsApi.upload(project.id, file);
      setUploaded((prev) => [...prev, file.name]);
    } finally {
      setUploading(false);
    }
  };

  const finish = async (applySettings: boolean) => {
    if (!project) return;
    setBusy(true);
    try {
      if (applySettings) {
        await projectsApi.updateSettings(project.id, {
          green_threshold: Math.round(green * 100),
          yellow_threshold: Math.round(yellow * 100),
          dnd_start: dndStart,
          dnd_end: dndEnd,
        });
      }
      onCreated(project);
    } finally {
      setBusy(false);
    }
  };

  if (step === 1) {
    return (
      <Modal
        title="새 프로젝트 만들기"
        description="프로젝트를 만들면 당신이 담당자가 됩니다."
        onClose={onClose}
        footer={
          <>
            <Button onClick={onClose}>취소</Button>
            <Button variant="primary" disabled={!name.trim() || busy} onClick={createProject}>
              {busy && <Loader2 className="size-3.5 animate-spin" />}
              다음
            </Button>
          </>
        }
      >
        <p className="mb-4 flex items-center gap-2 text-[12px] font-bold text-ink-muted">
          <StepDots current={1} /> 1/2 단계
        </p>

        <Field label="프로젝트 이름">
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="예: HR팀 내부 Q&A"
            maxLength={200}
            className={inputClass}
          />
        </Field>

        <Field label="설명" hint="선택 사항">
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={3}
            maxLength={2000}
            placeholder="어떤 질문을 다루는 공간인지 적어주세요"
            className={cn(inputClass, 'h-auto resize-none py-2.5')}
          />
        </Field>

        {error && <p className="text-[12px] font-bold text-danger">{error}</p>}
      </Modal>
    );
  }

  return (
    <Modal
      title="AI 설정을 조정할까요?"
      description="지금 설정하면 첫 질문부터 정확한 답변을 받을 수 있어요. 나중에 설정에서 바꿀 수 있습니다."
      width={620}
      onClose={() => finish(false)}
      footer={
        <>
          <Button variant="ghost" className="mr-auto" onClick={() => finish(false)}>
            전부 나중에 하기
          </Button>
          <Button variant="primary" disabled={busy} onClick={() => finish(true)}>
            {busy && <Loader2 className="size-3.5 animate-spin" />}
            설정 완료
          </Button>
        </>
      }
    >
      <p className="mb-3 flex items-center gap-2 text-[12px] font-bold text-ink-muted">
        <StepDots current={2} /> 2/2 단계
      </p>
      <p className="mb-4 flex items-center gap-2">
        <Badge tone="ok">✓ 생성 완료</Badge>
        <span className="text-[12px] font-bold text-ink">{project?.name}</span>
      </p>

      <StepCard n={1} title="근거 문서 업로드" caption="AI가 답변에 근거로 삼을 문서입니다">
        <input
          ref={fileRef}
          type="file"
          accept=".md,.txt,.pdf,.docx"
          className="hidden"
          onChange={(e) => e.target.files?.[0] && upload(e.target.files[0])}
        />
        <div className="flex flex-col items-center gap-2 rounded-lg border border-dashed border-brand-border bg-brand-surface/30 px-4 py-7">
          <Upload className="size-5 text-brand" />
          <p className="text-[13px] font-bold text-ink">파일을 선택하세요</p>
          <p className="text-[11px] text-ink-muted">PDF · DOCX · MD · TXT</p>
          <Button size="sm" disabled={uploading} onClick={() => fileRef.current?.click()}>
            {uploading ? <Loader2 className="size-3.5 animate-spin" /> : null} 파일 선택
          </Button>
        </div>
        {uploaded.length > 0 && (
          <p className="mt-2 text-[11px] text-ink-muted">
            업로드됨: {uploaded.join(', ')} — 인제스트가 끝나면 검색 대상이 됩니다.
          </p>
        )}
      </StepCard>

      <StepCard n={2} title="AI 임계치" caption="유사도에 따라 답변 상태가 정해집니다">
        <div className="flex flex-col gap-3">
          <Slider label="확인대기 하한" value={yellow} max={green - 0.01} onChange={setYellow} />
          <Slider label="즉답 하한" value={green} min={yellow + 0.01} onChange={setGreen} />
        </div>
        <div className="mt-3 rounded-lg border border-line bg-surface-muted px-3 py-2.5">
          <p className="text-[11px] font-bold text-ink-muted">결과 미리보기</p>
          <p className="mt-1.5 flex flex-wrap items-center gap-1.5 text-[12px] text-ink">
            {green.toFixed(2)} 이상 → <Badge tone="ok">즉답</Badge> ·{' '}
            {yellow.toFixed(2)}–{green.toFixed(2)} → <Badge tone="warn">확인대기</Badge> · 미만 →{' '}
            <Badge tone="danger">보류</Badge>
          </p>
        </div>
      </StepCard>

      <StepCard
        n={3}
        title="방해금지 시간대"
        caption="이 시간에는 담당자에게 알림을 보내지 않고 AI가 먼저 답합니다"
      >
        {/* 요일 선택은 API 계약(§3)에 없다 — dnd_start/dnd_end 만 저장된다 */}
        <p className="text-[11px] font-bold text-ink-muted">요일</p>
        <div className="mt-1.5 flex gap-1.5">
          {DAYS.map((d) => (
            <span
              key={d}
              title="요일별 설정은 아직 API 계약에 없습니다"
              className="flex size-8 cursor-not-allowed items-center justify-center rounded-full bg-surface-alt text-[12px] font-bold text-ink-subtle"
            >
              {d}
            </span>
          ))}
        </div>

        <p className="mt-3 text-[11px] font-bold text-ink-muted">시간</p>
        <div className="mt-1.5 flex items-center gap-2">
          <input
            type="time"
            value={dndStart}
            onChange={(e) => setDndStart(e.target.value)}
            className={cn(inputClass, 'w-[140px]')}
          />
          <span className="text-ink-muted">—</span>
          <input
            type="time"
            value={dndEnd}
            onChange={(e) => setDndEnd(e.target.value)}
            className={cn(inputClass, 'w-[140px]')}
          />
          {dndEnd <= dndStart && <Badge tone="brand">다음 날</Badge>}
        </div>
        <p className="mt-2 text-[11px] text-ink-muted">
          이 시간에 들어온 질문은 AI가 1차 답변하고, 담당자 브리핑 인박스에 모아 다음 날 아침에
          전달됩니다.
        </p>
      </StepCard>
    </Modal>
  );
}

const inputClass =
  'h-[38px] w-full rounded-lg border border-line bg-surface px-3 text-[13px] text-ink placeholder:text-ink-subtle focus:border-brand focus:outline-none';

function Field({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <label className="mb-4 block">
      <span className="mb-1.5 block text-[12px] font-bold text-ink">
        {label}
        {hint && <span className="ml-1.5 font-medium text-ink-subtle">{hint}</span>}
      </span>
      {children}
    </label>
  );
}

function StepDots({ current }: { current: 1 | 2 }) {
  return (
    <span className="flex items-center gap-1">
      <span className="size-1.5 rounded-full bg-brand" />
      <span
        className={cn('h-1.5 rounded-full', current === 2 ? 'w-5 bg-brand' : 'w-3 bg-line-strong')}
      />
    </span>
  );
}

function StepCard({
  n,
  title,
  caption,
  children,
}: {
  n: number;
  title: string;
  caption: string;
  children: React.ReactNode;
}) {
  return (
    <section className="mb-3 rounded-xl border border-line bg-surface-muted p-4">
      <div className="flex items-center gap-2">
        <span className="flex size-5 items-center justify-center rounded-full bg-brand-surface text-[11px] font-bold text-brand-deep">
          {n}
        </span>
        <h3 className="text-[13px] font-bold text-ink">{title}</h3>
      </div>
      <p className="mb-3 mt-1 text-[12px] text-ink-muted">{caption}</p>
      {children}
    </section>
  );
}

function Slider({
  label,
  value,
  min = 0,
  max = 1,
  onChange,
}: {
  label: string;
  value: number;
  min?: number;
  max?: number;
  onChange: (v: number) => void;
}) {
  return (
    <label className="block">
      <span className="mb-1 flex items-center justify-between text-[12px] font-bold text-ink">
        {label}
        <span className="rounded bg-brand-strong px-1.5 py-0.5 text-[11px] text-white">
          {value.toFixed(2)}
        </span>
      </span>
      <input
        type="range"
        min={Math.max(0, min)}
        max={Math.min(1, max)}
        step={0.01}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="w-full accent-[var(--color-brand-strong)]"
      />
    </label>
  );
}
