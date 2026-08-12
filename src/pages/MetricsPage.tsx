import { useEffect, useState } from 'react';
import { Loader2 } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { metricsApi } from '../infrastructure/http/metrics';
import type { AccuracyContext, MetricsTimeseries, ProjectMetrics, RatioMetric } from '../types';
import { cn } from '../lib/cn';

const RATIO_LABEL: Record<string, string> = {
  auto_answer_rate: '자동 응답률',
  correction_rate: '정정률',
  card_handle_30s_rate: '30초 내 처리율',
  requestion_instant_rate: '재질문 즉답률',
};

const GRADE_LABEL: Record<AccuracyContext['grade'], string> = { green: '즉답', yellow: '확인대기', red: '보류' };

const DAY_OPTIONS = [7, 30, 90] as const;

/** 날짜 → "8/6" — 축 라벨은 연도 없이 짧게 */
const shortDate = (d: string) => {
  const [, m, day] = d.split('-');
  return `${Number(m)}/${Number(day)}`;
};

/**
 * 학습 곡선 — "쓸수록 좋아진다"를 그래프 하나로 (§13). 버킷마다 등급 분포를 쌓은 막대 위에,
 * 누적 공식 Q&A 수(지식이 쌓이는 곡선)를 선으로 겹친다.
 *
 * 차트 라이브러리를 새로 깔지 않는다 — 버킷 90개 이하짜리 막대+선 하나에 의존성 하나는 과하다.
 */
function LearningCurveChart({ items }: { items: MetricsTimeseries['items'] }) {
  const width = 780;
  const height = 200;
  const padTop = 12;
  const padBottom = 24;
  const plotH = height - padTop - padBottom;
  const barW = Math.min(28, (width / items.length) * 0.6);
  const step = width / items.length;

  const maxQuestions = Math.max(1, ...items.map((i) => i.green + i.yellow + i.red));
  const maxQa = Math.max(1, ...items.map((i) => i.official_qas));

  const barY = (v: number) => padTop + plotH * (1 - v / maxQuestions);
  const lineY = (v: number) => padTop + plotH * (1 - v / maxQa);

  const linePoints = items
    .map((i, idx) => `${idx * step + step / 2},${lineY(i.official_qas)}`)
    .join(' ');

  // 라벨이 겹치지 않도록 최대 8개까지만 x축에 찍는다
  const labelEvery = Math.max(1, Math.ceil(items.length / 8));

  return (
    <svg viewBox={`0 0 ${width} ${height}`} className="w-full" role="img" aria-label="기간별 질문 등급 분포와 누적 공식 Q&A 추이">
      {items.map((i, idx) => {
        const x = idx * step + (step - barW) / 2;
        const green = i.green;
        const yellow = i.yellow;
        const red = i.red;
        const yGreen = barY(green);
        const yYellow = barY(green + yellow);
        const yRed = barY(green + yellow + red);
        return (
          <g key={i.date}>
            <rect x={x} y={yGreen} width={barW} height={padTop + plotH - yGreen} className="fill-ok" />
            <rect x={x} y={yYellow} width={barW} height={yGreen - yYellow} className="fill-warn" />
            <rect x={x} y={yRed} width={barW} height={yYellow - yRed} className="fill-purple" />
            {idx % labelEvery === 0 && (
              <text x={x + barW / 2} y={height - 6} textAnchor="middle" className="fill-ink-muted text-[9px]">
                {shortDate(i.date)}
              </text>
            )}
          </g>
        );
      })}
      <polyline points={linePoints} fill="none" strokeWidth={2} className="stroke-brand" />
      {items.map((i, idx) => (
        <circle key={i.date} cx={idx * step + step / 2} cy={lineY(i.official_qas)} r={2.5} className="fill-brand" />
      ))}
    </svg>
  );
}

function RatioCard({ metricKey, metric }: { metricKey: string; metric: RatioMetric }) {
  const pct = metric.value === null ? null : Math.round(metric.value * 100);
  const targetPct = Math.round(metric.target * 100);
  const meetsTarget = pct !== null && metric.value! >= metric.target;

  return (
    <div className="rounded-xl border border-line bg-surface p-4">
      <p className="text-[12px] text-ink-muted">{RATIO_LABEL[metricKey] ?? metricKey}</p>
      <p className={cn('mt-1 text-[22px] font-bold', pct === null ? 'text-ink-subtle' : 'text-ink')}>
        {pct === null ? '측정 전' : `${pct}%`}
      </p>
      <div className="mt-2 h-1.5 overflow-hidden rounded bg-surface-alt">
        <div
          className={cn('h-full rounded', meetsTarget ? 'bg-ok' : 'bg-brand')}
          style={{ width: `${pct ?? 0}%` }}
        />
      </div>
      <p className="mt-1.5 text-[11px] text-ink-muted">목표 {targetPct}%</p>
    </div>
  );
}

export function MetricsPage() {
  const { activeProject } = useAuth();
  const [days, setDays] = useState<(typeof DAY_OPTIONS)[number]>(30);
  const [metrics, setMetrics] = useState<ProjectMetrics | null>(null);
  const [timeseries, setTimeseries] = useState<MetricsTimeseries | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!activeProject?.id) return;
    setLoading(true);
    Promise.all([
      metricsApi.get(activeProject.id, days),
      metricsApi.timeseries(activeProject.id, days),
    ])
      .then(([m, t]) => {
        setMetrics(m);
        setTimeseries(t);
      })
      .finally(() => setLoading(false));
  }, [activeProject?.id, days]);

  if (!activeProject) {
    return <p className="p-10 text-[13px] text-ink-muted">프로젝트를 먼저 선택하세요.</p>;
  }
  if (activeProject.role !== 'answerer') {
    return <p className="p-10 text-[13px] text-ink-muted">담당자 전용 화면입니다.</p>;
  }

  return (
    <div className="mx-auto w-full max-w-[860px] px-6 py-8">
      <div className="flex items-end justify-between">
        <div>
          <h1 className="text-2xl font-bold leading-8 text-ink">지표</h1>
          {metrics && <p className="mt-1.5 text-[13px] text-ink-muted">최근 {metrics.window_days}일 기준</p>}
        </div>
        <div className="flex gap-1 rounded-lg bg-surface-alt p-1">
          {DAY_OPTIONS.map((d) => (
            <button
              key={d}
              onClick={() => setDays(d)}
              className={cn(
                'rounded-md px-2.5 py-1.5 text-[12px] font-bold transition-colors',
                days === d ? 'bg-surface text-ink shadow-sm' : 'text-ink-muted hover:text-ink'
              )}
            >
              {d}일
            </button>
          ))}
        </div>
      </div>

      {loading && (
        <p className="mt-6 flex items-center gap-2 py-10 text-[13px] text-ink-muted">
          <Loader2 className="size-4 animate-spin" /> 불러오는 중…
        </p>
      )}

      {!loading && metrics && (
        <>
          <div className="mt-4 grid grid-cols-2 gap-3">
            <RatioCard metricKey="auto_answer_rate" metric={metrics.auto_answer_rate} />
            <RatioCard metricKey="correction_rate" metric={metrics.correction_rate} />
            <RatioCard metricKey="card_handle_30s_rate" metric={metrics.card_handle_30s_rate} />
            <RatioCard metricKey="requestion_instant_rate" metric={metrics.requestion_instant_rate} />
          </div>

          {timeseries && timeseries.items.length > 0 && (
            <section className="mt-6">
              <h2 className="text-[13px] font-bold text-ink">학습 곡선</h2>
              <p className="mt-0.5 text-[11px] text-ink-muted">
                막대 = 일별 등급 분포(즉답·확인대기·보류) · 선 = 누적 공식 Q&A 수
              </p>
              <div className="mt-2.5 rounded-xl border border-line bg-surface p-4">
                <LearningCurveChart items={timeseries.items} />
                <div className="mt-2 flex flex-wrap gap-3 text-[11px] text-ink-muted">
                  <span className="flex items-center gap-1.5">
                    <span className="size-2.5 rounded-sm bg-ok" /> 즉답
                  </span>
                  <span className="flex items-center gap-1.5">
                    <span className="size-2.5 rounded-sm bg-warn" /> 확인대기
                  </span>
                  <span className="flex items-center gap-1.5">
                    <span className="size-2.5 rounded-sm bg-purple" /> 보류
                  </span>
                  <span className="flex items-center gap-1.5">
                    <span className="h-0.5 w-3 rounded-full bg-brand" /> 누적 공식 Q&A
                  </span>
                </div>
              </div>
            </section>
          )}

          <section className="mt-6">
            <h2 className="text-[13px] font-bold text-ink">등급별 정확도</h2>
            <div className="mt-2.5 flex flex-col gap-2">
              {metrics.grade_accuracy.map((g) => (
                <div key={g.grade} className="flex items-center justify-between rounded-lg border border-line bg-surface px-3.5 py-2.5">
                  <span className="text-[13px] font-bold text-ink">{GRADE_LABEL[g.grade]}</span>
                  {g.sufficient ? (
                    <span className="text-[13px] text-ink">
                      {Math.round((g.verified_rate ?? 0) * 100)}%{' '}
                      <span className="text-ink-muted">({g.sample}건)</span>
                    </span>
                  ) : (
                    <span className="text-[12px] text-ink-muted">{g.message ?? '표본 부족'}</span>
                  )}
                </div>
              ))}
            </div>
          </section>

          <section className="mt-6">
            <h2 className="text-[13px] font-bold text-ink">절약된 대기 시간</h2>
            <div className="mt-2.5 rounded-xl border border-line bg-surface p-4">
              <p className="text-[22px] font-bold text-ink">{metrics.saved_wait_hours.value}시간</p>
              {/* 실측이 아니라 추정이다 — 가정을 숨기고 숫자만 크게 보여주지 않는다 */}
              <p className="mt-1 text-[12px] text-ink-muted">
                평균 대기 {metrics.saved_wait_hours.assumption_hours}시간 가정,{' '}
                {metrics.saved_wait_hours.basis_count}건 기준
              </p>
            </div>
          </section>
        </>
      )}
    </div>
  );
}
