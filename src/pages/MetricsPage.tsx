import { useCallback, useEffect, useState } from 'react';
import { Loader2 } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { metricsApi } from '../infrastructure/http/metrics';
import type { MetricsTimeseries, ProjectMetrics, TimeseriesItem } from '../types';
import { Badge, ReasonBadge } from '../components/ui/Badge';
import { cn } from '../lib/cn';

const RANGES = [
  { days: 7, label: '7일' },
  { days: 30, label: '30일' },
  { days: 90, label: '90일' },
] as const;

/**
 * 차트 시리즈색 — 앱의 ok/warn/purple 토큰에서 파생.
 * ok(#0e7a63)는 채도가 차트 기준(OKLab chroma 0.1)에 살짝 못 미쳐
 * 명도를 유지한 채 한 단계 올렸다. CVD 검증(validate_palette) 3색 전부 통과.
 */
const SERIES = [
  { key: 'green', label: '즉답', color: '#0f8f72' },
  { key: 'yellow', label: '확인', color: '#8a5d00' },
  { key: 'red', label: '보류', color: '#6b45d6' },
] as const;

const pct = (v: number | null | undefined) =>
  v === null || v === undefined ? null : `${Math.round(v * 100)}%`;

/** 목표 대비 현재값 게이지가 붙은 지표 타일 */
function RateTile({
  label,
  value,
  target,
  caption,
}: {
  label: string;
  value: number | null;
  target: number;
  caption: string;
}) {
  const met = value !== null && value >= target;
  return (
    <div className="rounded-xl border border-line bg-surface p-4">
      <p className="text-[12px] font-bold text-ink-muted">{label}</p>
      <div className="mt-1.5 flex items-baseline gap-2">
        <p className="text-[24px] font-bold leading-7 text-ink">{pct(value) ?? '—'}</p>
        <p className={cn('text-[11px] font-bold', met ? 'text-ok' : 'text-ink-muted')}>
          목표 {pct(target)}
        </p>
      </div>
      {/* 게이지 — 목표 지점에 눈금을 새겨 "얼마나 남았는지"를 보여준다 */}
      <div className="relative mt-2.5 h-1.5 overflow-hidden rounded bg-surface-alt">
        <div
          className={cn('h-full rounded', met ? 'bg-ok-border' : 'bg-brand')}
          style={{ width: `${Math.min(100, (value ?? 0) * 100)}%` }}
        />
        <div
          className="absolute top-0 h-full w-[2px] bg-ink-subtle"
          style={{ left: `${Math.min(100, target * 100)}%` }}
        />
      </div>
      <p className="mt-2 text-[11px] text-ink-muted">{value === null ? '표본 없음' : caption}</p>
    </div>
  );
}

/** 일자별 등급 구성 누적 막대 — hover 시 그날의 전체 내역 툴팁 */
function TimeseriesChart({ series }: { series: MetricsTimeseries }) {
  const [hover, setHover] = useState<number | null>(null);

  const W = 800;
  const H = 200;
  const PAD_L = 30;
  const PAD_B = 20;
  const plotW = W - PAD_L - 8;
  const plotH = H - PAD_B - 8;

  const items = series.items;
  const max = Math.max(1, ...items.map((d) => d.questions));
  const yMax = Math.ceil(max / 4) * 4;
  const slot = plotW / Math.max(1, items.length);
  const barW = Math.max(3, Math.min(28, slot * 0.6));
  const y = (v: number) => 8 + plotH - (v / yMax) * plotH;

  const stack = (d: TimeseriesItem) => {
    let acc = 0;
    return SERIES.map(({ key, color }) => {
      const v = d[key];
      const seg = { color, y0: acc, y1: acc + v, v };
      acc += v;
      return seg;
    });
  };

  const label = (iso: string) => {
    const d = new Date(iso);
    return `${d.getMonth() + 1}/${d.getDate()}`;
  };
  const hovered = hover !== null ? items[hover] : null;

  return (
    <div className="relative">
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full" role="img" aria-label="일자별 질문·등급 추이">
        {/* 눈금 — 배경으로 물러나 있게 */}
        {[0.25, 0.5, 0.75, 1].map((t) => (
          <g key={t}>
            <line x1={PAD_L} x2={W - 8} y1={y(yMax * t)} y2={y(yMax * t)} stroke="#edf1f7" strokeWidth="1" />
            <text x={PAD_L - 6} y={y(yMax * t) + 3} textAnchor="end" fontSize="9" fill="#8c93a4">
              {Math.round(yMax * t)}
            </text>
          </g>
        ))}
        <line x1={PAD_L} x2={W - 8} y1={y(0)} y2={y(0)} stroke="#cbd5e1" strokeWidth="1" />

        {items.map((d, i) => {
          const cx = PAD_L + slot * i + slot / 2;
          return (
            <g key={d.date}>
              {stack(d).map(
                (seg) =>
                  seg.v > 0 && (
                    <rect
                      key={seg.color}
                      x={cx - barW / 2}
                      y={y(seg.y1)}
                      width={barW}
                      height={y(seg.y0) - y(seg.y1)}
                      rx={2}
                      fill={seg.color}
                      stroke="#ffffff"
                      strokeWidth="1"
                      opacity={hover === null || hover === i ? 1 : 0.35}
                    />
                  )
              )}
              {/* x 라벨은 겹치지 않을 만큼만 */}
              {(items.length <= 10 || i % Math.ceil(items.length / 10) === 0) && (
                <text x={cx} y={H - 6} textAnchor="middle" fontSize="9" fill="#8c93a4">
                  {label(d.date)}
                </text>
              )}
              {/* 마크보다 넉넉한 히트 영역 */}
              <rect
                x={PAD_L + slot * i}
                y={8}
                width={slot}
                height={plotH}
                fill="transparent"
                onMouseEnter={() => setHover(i)}
                onMouseLeave={() => setHover(null)}
              />
            </g>
          );
        })}
      </svg>

      <div className="mt-2 flex items-center gap-4">
        {SERIES.map(({ key, label: l, color }) => (
          <span key={key} className="inline-flex items-center gap-1.5 text-[11px] text-ink-muted">
            <span className="size-2.5 rounded-[3px]" style={{ backgroundColor: color }} />
            {l}
          </span>
        ))}
      </div>

      {hovered && hover !== null && (
        <div
          className="pointer-events-none absolute top-2 z-10 w-[168px] rounded-lg border border-line bg-surface p-3 shadow-lg"
          style={{
            left: `${Math.min(94, Math.max(2, ((hover + 0.5) / items.length) * 100))}%`,
            transform: hover / items.length > 0.7 ? 'translateX(-100%)' : undefined,
          }}
        >
          <p className="text-[11px] font-bold text-ink">
            {hovered.date}
            {series.bucket === 'week' && ' 주'}
          </p>
          <p className="mt-1 text-[11px] text-ink-muted">질문 {hovered.questions}건</p>
          <div className="mt-1 flex flex-col gap-0.5 text-[11px] text-ink-muted">
            {SERIES.map(({ key, label: l, color }) => (
              <span key={key} className="inline-flex items-center gap-1.5">
                <span className="size-2 rounded-[2px]" style={{ backgroundColor: color }} />
                {l} {hovered[key]}
              </span>
            ))}
          </div>
          <p className="mt-1.5 border-t border-line pt-1.5 text-[11px] text-ink-muted">
            재사용 {hovered.reused} · 지침 승인 {hovered.lessons_approved} · 공식 Q&A{' '}
            {hovered.official_qas}
          </p>
        </div>
      )}
    </div>
  );
}

/** §10 지표 — 서비스가 실제로 시간을 아껴 주는지 담당자가 확인하는 화면 */
export function MetricsPage() {
  const { activeProject } = useAuth();
  const [days, setDays] = useState<(typeof RANGES)[number]['days']>(30);
  const [metrics, setMetrics] = useState<ProjectMetrics | null>(null);
  const [series, setSeries] = useState<MetricsTimeseries | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  const projectId = activeProject?.id;

  const load = useCallback(() => {
    if (!projectId) return;
    setLoading(true);
    setError(false);
    // 90일은 일 단위 90개 막대가 읽히지 않는다 — 주 단위로 뭉친다
    const bucket = days === 90 ? 'week' : 'day';
    Promise.all([metricsApi.get(projectId, days), metricsApi.timeseries(projectId, days, bucket)])
      .then(([m, t]) => {
        setMetrics(m);
        setSeries(t);
      })
      .catch(() => setError(true))
      .finally(() => setLoading(false));
  }, [projectId, days]);

  useEffect(load, [load]);

  if (!activeProject) {
    return <p className="p-10 text-[13px] text-ink-muted">프로젝트를 먼저 선택하세요.</p>;
  }
  if (activeProject.role !== 'answerer') {
    return <p className="p-10 text-[13px] text-ink-muted">담당자 전용 화면입니다.</p>;
  }

  return (
    <div className="mx-auto w-full max-w-[860px] px-6 pb-8 pt-5">
      <div className="flex items-center gap-3">
        <h1 className="text-2xl font-bold leading-8 text-ink">지표</h1>
        <div className="ml-auto flex gap-1 rounded-lg border border-line bg-surface p-0.5">
          {RANGES.map((r) => (
            <button
              key={r.days}
              onClick={() => setDays(r.days)}
              className={cn(
                'h-7 rounded-md px-3 text-[12px] transition-colors',
                days === r.days
                  ? 'bg-brand-surface font-bold text-brand-deep'
                  : 'font-medium text-ink-muted hover:bg-surface-muted'
              )}
            >
              {r.label}
            </button>
          ))}
        </div>
      </div>
      <p className="mt-1.5 text-[13px] text-ink-muted">
        최근 {metrics?.window_days ?? days}일 기준 · 목표선을 넘으면 초록으로 표시됩니다.
      </p>

      {loading && (
        <p className="mt-6 flex items-center gap-2 text-[13px] text-ink-muted">
          <Loader2 className="size-4 animate-spin" /> 불러오는 중…
        </p>
      )}

      {!loading && error && (
        <p className="mt-6 rounded-xl border border-danger-border bg-danger-surface px-4 py-6 text-center text-[13px] font-bold text-danger">
          지표를 불러오지 못했습니다. 잠시 후 다시 시도해 주세요.
        </p>
      )}

      {!loading && metrics && (
        <>
          <div className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
            <RateTile
              label="자동 답변률"
              value={metrics.auto_answer_rate.value}
              target={metrics.auto_answer_rate.target}
              caption={`즉답 ${metrics.auto_answer_rate.green} · 확인 ${metrics.auto_answer_rate.yellow} · 보류 ${metrics.auto_answer_rate.red}`}
            />
            <RateTile
              label="피드백 정답률"
              value={metrics.correction_rate.value}
              target={metrics.correction_rate.target}
              caption={`맞았어요 ${metrics.correction_rate.correct} · 달랐어요 ${metrics.correction_rate.different}`}
            />
            <RateTile
              label="카드 30초 내 처리율"
              value={metrics.card_handle_30s_rate.value}
              target={metrics.card_handle_30s_rate.target}
              caption={`30초 내 ${metrics.card_handle_30s_rate.within_30s} / 열람 ${metrics.card_handle_30s_rate.viewed_cards}건`}
            />
            <RateTile
              label="재질문 즉답률"
              value={metrics.requestion_instant_rate.value}
              target={metrics.requestion_instant_rate.target}
              caption={`재사용 ${metrics.requestion_instant_rate.reused} · 놓침 ${metrics.requestion_instant_rate.reuse_missed}`}
            />
            <div className="rounded-xl border border-line bg-surface p-4">
              <p className="text-[12px] font-bold text-ink-muted">아낀 대기 시간</p>
              <p className="mt-1.5 text-[24px] font-bold leading-7 text-ink">
                {metrics.saved_wait_hours.value}
                <span className="ml-0.5 text-[14px] font-bold text-ink-muted">시간</span>
              </p>
              <p className="mt-2 text-[11px] text-ink-muted">
                즉답 {metrics.saved_wait_hours.basis_count}건 × 평균 대기{' '}
                {metrics.saved_wait_hours.assumption_hours}시간 가정
              </p>
            </div>
          </div>

          <section className="mt-6 rounded-xl border border-line bg-surface p-4">
            <h2 className="text-[15px] font-bold text-ink">등급 정확도</h2>
            <p className="mt-1 text-[12px] text-ink-muted">
              등급별로 "맞았어요" 피드백을 받은 비율 — 등급 임계값이 잘 맞는지의 근거입니다.
            </p>
            <ul className="mt-3 flex flex-col gap-2">
              {metrics.grade_accuracy.map((g) => (
                <li key={g.grade} className="flex items-center gap-3 rounded-lg bg-surface-subtle px-3 py-2.5">
                  <ReasonBadge reason={g.grade} />
                  <span className="text-[13px] font-bold text-ink">{pct(g.verified_rate) ?? '—'}</span>
                  <span className="text-[11px] text-ink-muted">표본 {g.sample}건</span>
                  {!g.sufficient && <Badge tone="neutral">표본 부족</Badge>}
                  {g.message && <span className="text-[11px] text-ink-muted">{g.message}</span>}
                </li>
              ))}
            </ul>
          </section>

          {series && series.items.length > 0 && (
            <section className="mt-6 rounded-xl border border-line bg-surface p-4">
              <h2 className="text-[15px] font-bold text-ink">질문·등급 추이</h2>
              <div className="mt-3">
                <TimeseriesChart series={series} />
              </div>
            </section>
          )}
        </>
      )}
    </div>
  );
}
