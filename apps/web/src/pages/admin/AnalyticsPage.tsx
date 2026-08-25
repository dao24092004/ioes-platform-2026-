import React, { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useQuery } from '@tanstack/react-query';
import AdminLayout from '@/components/layout/AdminLayout';
import {
  analyticsApi,
  type AnalyticsPoint,
  type AnalyticsTopCourse,
} from '@/services/api';
import { ANIMATION, TEST_IDS, CHART_SIZES } from '@/constants/ui';

type RangeKey = '7d' | '30d' | '90d' | 'ytd';
type Granularity = 'day' | 'week' | 'month';

const LineChart: React.FC<{
  data: AnalyticsPoint[];
  color: string;
  fill: string;
  height?: number;
}> = ({ data, color, fill, height = CHART_SIZES.LINE_DEFAULT_PX }) => {
  const points = data.map((d, i) => {
    const max = Math.max(...data.map(x => x.value));
    const min = Math.min(...data.map(x => x.value));
    const range = max - min || 1;
    const x = (i / Math.max(1, data.length - 1)) * 100;
    const y = 100 - ((d.value - min) / range) * 100;
    return { x, y };
  });

  const pathD = points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ');
  const areaD = `${pathD} L 100 100 L 0 100 Z`;

  return (
    <div className="relative" style={{ height }}>
      <svg viewBox="0 0 100 100" preserveAspectRatio="none" className="w-full h-full">
        {/* Grid lines */}
        {[0, 25, 50, 75, 100].map(y => (
          <line
            key={y}
            x1="0"
            y1={y}
            x2="100"
            y2={y}
            stroke="currentColor"
            strokeOpacity="0.08"
            strokeWidth="0.2"
          />
        ))}
        {/* Area */}
        <path d={areaD} fill={fill} className="transition-all duration-700" />
        {/* Line */}
        <path
          d={pathD}
          fill="none"
          stroke={color}
          strokeWidth="0.6"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="transition-all duration-700"
          vectorEffect="non-scaling-stroke"
          style={{ strokeWidth: 2 }}
        />
        {/* Points */}
        {points.map((p, i) =>
          i % Math.ceil(points.length / 8) === 0 ? (
            <circle key={i} cx={p.x} cy={p.y} r={0.8} fill={color} />
          ) : null
        )}
      </svg>
    </div>
  );
};

const BarChart: React.FC<{ data: AnalyticsPoint[]; color: string; height?: number }> = ({
  data,
  color,
  height = CHART_SIZES.BAR_DEFAULT_PX,
}) => {
  const max = Math.max(...data.map(d => d.value)) || 1;
  return (
    <div className="flex items-end gap-1" style={{ height }}>
      {data.map((d, i) => (
        <div
          key={d.date}
          className="flex-1 rounded-t-md transition-all duration-500 hover:opacity-80"
          style={{
            height: `${(d.value / max) * 100}%`,
            background: `linear-gradient(to top, ${color}80, ${color})`,
            animationDelay: `${i * 10}ms`,
            minHeight: 4,
          }}
          title={`${d.date}: ${d.value}`}
        />
      ))}
    </div>
  );
};

const DonutChart: React.FC<{
  data: Array<{ role: string; count: number; color: string; label: string }>;
}> = ({ data }) => {
  const { t } = useTranslation();
  const total = data.reduce((acc, d) => acc + d.count, 0);
  let cumulative = 0;
  const radius = 40;
  const cx = 50;
  const cy = 50;
  const segments = data.map(seg => {
    const start = (cumulative / total) * 360;
    cumulative += seg.count;
    const end = (cumulative / total) * 360;
    const startRad = ((start - 90) * Math.PI) / 180;
    const endRad = ((end - 90) * Math.PI) / 180;
    const x1 = cx + radius * Math.cos(startRad);
    const y1 = cy + radius * Math.sin(startRad);
    const x2 = cx + radius * Math.cos(endRad);
    const y2 = cy + radius * Math.sin(endRad);
    const large = end - start > 180 ? 1 : 0;
    const path = `M ${cx} ${cy} L ${x1} ${y1} A ${radius} ${radius} 0 ${large} 1 ${x2} ${y2} Z`;
    return { path, color: seg.color };
  });

  return (
    <div className="flex items-center gap-6">
      <div className="relative w-44 h-44">
        <svg viewBox="0 0 100 100" className="w-full h-full -rotate-90">
          {segments.map((s, i) => (
            <path key={i} d={s.path} fill={s.color} className="transition-all hover:opacity-80" />
          ))}
          <circle cx="50" cy="50" r="22" fill="white" className="dark:fill-slate-900" />
          <text x="50" y="48" textAnchor="middle" className="fill-slate-700 dark:fill-slate-200 text-[10px] font-medium">
            {t('shared.total')}
          </text>
          <text x="50" y="60" textAnchor="middle" className="fill-slate-900 dark:fill-white text-[10px] font-bold">
            {total.toLocaleString()}
          </text>
        </svg>
      </div>
      <div className="flex-1 space-y-2">
        {data.map(d => (
          <div key={d.role} className="flex items-center gap-2 text-sm">
            <span className="w-3 h-3 rounded-sm" style={{ background: d.color }} />
            <span className="font-medium capitalize">{d.label}</span>
            <span className="ml-auto text-slate-500 tabular-nums">{d.count.toLocaleString()}</span>
          </div>
        ))}
      </div>
    </div>
  );
};

const AnalyticsPage: React.FC = () => {
  const { t } = useTranslation();
  const [range, setRange] = useState<RangeKey>('30d');
  const [, setGranularity] = useState<Granularity>('day');

  const { data: kpi } = useQuery({
    queryKey: ['analytics', 'kpi'],
    queryFn: () => analyticsApi.kpi(),
  });

  const { data: userGrowth } = useQuery({
    queryKey: ['analytics', 'userGrowth', range],
    queryFn: () => analyticsApi.userGrowth(range),
  });

  const { data: enrollments } = useQuery({
    queryKey: ['analytics', 'enrollments', range],
    queryFn: () => analyticsApi.enrollments(range),
  });

  const { data: examCompletion } = useQuery({
    queryKey: ['analytics', 'examCompletion', range],
    queryFn: () => analyticsApi.examCompletion(range),
  });

  const { data: passRate } = useQuery({
    queryKey: ['analytics', 'passRate'],
    queryFn: () => analyticsApi.passRate(),
  });

  const { data: topCourses } = useQuery({
    queryKey: ['analytics', 'topCourses'],
    queryFn: () => analyticsApi.topCourses(),
  });

  const { data: roles } = useQuery({
    queryKey: ['analytics', 'roles'],
    queryFn: () => analyticsApi.roleDistribution(),
  });

  const kpiCards = useMemo(
    () => [
      {
        label: t('analytics.kpi.activeUsers'),
        value: kpi?.activeUsers ?? 0,
        change: '+12.4%',
        color: 'blue',
        svg: <svg className="w-6 h-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2" /><circle cx="9" cy="7" r="4" /></svg>,
      },
      {
        label: t('analytics.kpi.newSignups'),
        value: kpi?.newSignups ?? 0,
        change: '+8.7%',
        color: 'emerald',
        svg: <svg className="w-6 h-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M16 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2" /><circle cx="8.5" cy="7" r="4" /><line x1="20" y1="8" x2="20" y2="14" /><line x1="23" y1="11" x2="17" y2="11" /></svg>,
      },
      {
        label: t('analytics.kpi.courseEnrolls'),
        value: kpi?.courseEnrolls ?? 0,
        change: '+15.2%',
        color: 'cyan',
        svg: <svg className="w-6 h-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M4 19.5A2.5 2.5 0 016.5 17H20M6.5 2H20v20H6.5A2.5 2.5 0 014 19.5v-15A2.5 2.5 0 016.5 2z" /></svg>,
      },
      {
        label: t('analytics.kpi.examSubmits'),
        value: kpi?.examSubmits ?? 0,
        change: '+22.1%',
        color: 'amber',
        svg: <svg className="w-6 h-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2" /><path d="M9 5a2 2 0 002 2h2a2 2 0 002-2" /><path d="M9 14l2 2 4-4" /></svg>,
      },
      {
        label: t('analytics.kpi.tokensIssued'),
        value: kpi?.tokensIssued ?? 0,
        change: '+5.4%',
        color: 'purple',
        svg: <svg className="w-6 h-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" /></svg>,
      },
      {
        label: t('analytics.kpi.avgSession'),
        value: kpi?.avgSession ?? 0,
        change: '-1.2%',
        color: 'rose',
        svg: <svg className="w-6 h-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" /></svg>,
      },
    ],
    [t, kpi]
  );

  const colorMap: Record<string, { bg: string; text: string; line: string }> = {
    blue: { bg: 'bg-blue-50 dark:bg-blue-900/30', text: 'text-blue-600 dark:text-blue-400', line: '#3b82f6' },
    emerald: { bg: 'bg-emerald-50 dark:bg-emerald-900/30', text: 'text-emerald-600 dark:text-emerald-400', line: '#10b981' },
    cyan: { bg: 'bg-cyan-50 dark:bg-cyan-900/30', text: 'text-cyan-600 dark:text-cyan-400', line: '#06b6d4' },
    amber: { bg: 'bg-amber-50 dark:bg-amber-900/30', text: 'text-amber-600 dark:text-amber-400', line: '#f59e0b' },
    purple: { bg: 'bg-purple-50 dark:bg-purple-900/30', text: 'text-purple-600 dark:text-purple-400', line: '#a855f7' },
    rose: { bg: 'bg-rose-50 dark:bg-rose-900/30', text: 'text-rose-600 dark:text-rose-400', line: '#f43f5e' },
  };

  const ranges: RangeKey[] = ['7d', '30d', '90d', 'ytd'];

  return (
    <AdminLayout
      title={t('analytics.title')}
      subtitle={t('analytics.subtitle')}
      headerActions={
        <div className="flex gap-2" role="radiogroup" aria-label={t('aria.selectRange')}>
          {ranges.map(r => (
            <button
              key={r}
              data-testid={TEST_IDS.ANALYTICS_RANGE}
              type="button"
              role="radio"
              aria-checked={range === r}
              onClick={() => {
                setRange(r);
                setGranularity(r === '7d' ? 'day' : r === '30d' ? 'day' : r === '90d' ? 'week' : 'month');
              }}
              className={`px-3 py-1.5 text-xs font-semibold rounded-lg border transition-all ${
                range === r
                  ? 'bg-blue-600 border-blue-600 text-white shadow-md shadow-blue-500/30'
                  : 'border-slate-200 dark:border-slate-700 hover:border-blue-400 hover:text-blue-600'
              }`}
            >
              {t(`analytics.filters.ranges.${r}`)}
            </button>
          ))}
        </div>
      }
    >
      {/* KPI grid */}
      <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-4 mb-6">
        {kpiCards.map((card, i) => (
          <div
            key={card.label}
            data-testid={TEST_IDS.ANALYTICS_KPI}
            className="group relative overflow-hidden bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-5 transition-all hover:-translate-y-1 hover:shadow-lg hover:shadow-blue-500/5 opacity-0 animate-[fadeInUp_.6s_ease-out_forwards]"
            style={{ animationDelay: `${(i + 1) * ANIMATION.STAGGER_DURATION_S}s` }}
          >
            <div className="absolute top-0 left-0 w-full h-full bg-gradient-to-r from-transparent via-blue-500/5 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-700" />
            <div className={`relative w-10 h-10 rounded-xl flex items-center justify-center mb-3 ${colorMap[card.color].bg} ${colorMap[card.color].text} transition-all group-hover:scale-110 group-hover:rotate-[10deg]`}>
              {card.svg}
            </div>
            <div className="relative text-2xl font-bold tabular-nums mb-1">{card.value.toLocaleString()}</div>
            <div className="relative text-xs text-slate-500 dark:text-slate-400 mb-2">{card.label}</div>
            <div className={`relative text-xs font-semibold ${card.change.startsWith('+') ? 'text-emerald-600' : 'text-red-600'}`}>
              {card.change} {t('shared.vsLastPeriod')}
            </div>
          </div>
        ))}
      </div>

      {/* Charts grid */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6 mb-6">
        {/* User growth (line) */}
        <div
          data-testid={TEST_IDS.ANALYTICS_KPI}
          className="xl:col-span-2 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-6 opacity-0 animate-[fadeInUp_.6s_ease-out_forwards] hover:shadow-lg hover:shadow-blue-500/5 transition-all"
          style={{ animationDelay: `${2 * ANIMATION.STAGGER_DURATION_S}s` }}
        >
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-base font-semibold">{t('analytics.charts.usersGrowth')}</h2>
            <span className="text-xs text-slate-500">{range.toUpperCase()}</span>
          </div>
          {userGrowth && <LineChart data={userGrowth} color={colorMap.blue.line} fill="rgba(59,130,246,0.15)" />}
        </div>

        {/* Role distribution (donut) */}
        <div
          className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-6 opacity-0 animate-[fadeInUp_.6s_ease-out_forwards] hover:shadow-lg hover:shadow-blue-500/5 transition-all"
          style={{ animationDelay: `${2.5 * ANIMATION.STAGGER_DURATION_S}s` }}
        >
          <h2 className="text-base font-semibold mb-4">{t('analytics.charts.roleDistribution')}</h2>
          {roles && (
            <DonutChart
              data={roles.map((r: { role: string; count: number; color: string }) => ({
                ...r,
                label: t(
                  r.role === 'super_admin'
                    ? 'admin.role.superAdmin'
                    : `admin.role.${r.role}`
                ),
              }))}
            />
          )}
        </div>

        {/* Enrollments (line) */}
        <div
          className="xl:col-span-2 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-6 opacity-0 animate-[fadeInUp_.6s_ease-out_forwards] hover:shadow-lg hover:shadow-blue-500/5 transition-all"
          style={{ animationDelay: `${3 * ANIMATION.STAGGER_DURATION_S}s` }}
        >
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-base font-semibold">{t('analytics.charts.enrollments')}</h2>
            <span className="text-xs text-slate-500">{range.toUpperCase()}</span>
          </div>
          {enrollments && (
            <LineChart data={enrollments} color={colorMap.emerald.line} fill="rgba(16,185,129,0.15)" />
          )}
        </div>

        {/* Exam completion (line) */}
        <div
          className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-6 opacity-0 animate-[fadeInUp_.6s_ease-out_forwards] hover:shadow-lg hover:shadow-blue-500/5 transition-all"
          style={{ animationDelay: `${3.5 * ANIMATION.STAGGER_DURATION_S}s` }}
        >
          <h2 className="text-base font-semibold mb-4">{t('analytics.charts.examCompletion')}</h2>
          {examCompletion && (
            <LineChart data={examCompletion} color={colorMap.amber.line} fill="rgba(245,158,11,0.15)" height={CHART_SIZES.LINE_SMALL_PX} />
          )}
        </div>
      </div>

      {/* Pass rate + Top courses */}
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-6">
        <div
          className="xl:col-span-5 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-6 opacity-0 animate-[fadeInUp_.6s_ease-out_forwards] hover:shadow-lg hover:shadow-blue-500/5 transition-all"
          style={{ animationDelay: `${4 * ANIMATION.STAGGER_DURATION_S}s` }}
        >
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-base font-semibold">{t('analytics.charts.passRate')}</h2>
            <span className="text-xs text-slate-500">{t('shared.time.12months')}</span>
          </div>
          {passRate && <BarChart data={passRate} color={colorMap.cyan.line} height={CHART_SIZES.BAR_LARGE_PX} />}
        </div>

        <div
          className="xl:col-span-7 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 overflow-hidden opacity-0 animate-[fadeInUp_.6s_ease-out_forwards] hover:shadow-lg hover:shadow-blue-500/5 transition-all"
          style={{ animationDelay: `${4.5 * ANIMATION.STAGGER_DURATION_S}s` }}
        >
          <div className="px-6 py-5 border-b border-slate-200 dark:border-slate-800">
            <h2 className="text-base font-semibold">{t('analytics.charts.topCourses')}</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-slate-50 dark:bg-slate-800/50 text-xs uppercase tracking-wider text-slate-500">
                  <th className="text-left px-6 py-3 font-semibold">#</th>
                  <th className="text-left px-6 py-3 font-semibold">{t('analytics.table.course')}</th>
                  <th className="text-left px-6 py-3 font-semibold">{t('analytics.table.enrollments')}</th>
                  <th className="text-left px-6 py-3 font-semibold">{t('analytics.table.completion')}</th>
                  <th className="text-left px-6 py-3 font-semibold">{t('analytics.table.rating')}</th>
                </tr>
              </thead>
              <tbody>
                {(topCourses ?? []).map((c: AnalyticsTopCourse, idx: number) => (
                  <tr key={c.id} className="border-t border-slate-100 dark:border-slate-800 transition-all hover:bg-blue-50/50 dark:hover:bg-blue-900/10 group">
                    <td className="px-6 py-4 text-sm text-slate-500">{idx + 1}</td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-500 to-cyan-500 text-white flex items-center justify-center font-bold text-xs transition-all group-hover:scale-110 group-hover:rotate-[5deg]">
                          {idx + 1}
                        </div>
                        <span className="font-medium text-sm">{c.title}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-sm tabular-nums font-semibold">{c.enrollments.toLocaleString()}</td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <div className="flex-1 h-2 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden max-w-[120px]">
                          <div
                            className="h-full bg-gradient-to-r from-blue-500 to-cyan-500 rounded-full transition-all"
                            style={{ width: `${c.completion}%` }}
                          />
                        </div>
                        <span className="text-xs font-semibold tabular-nums">{c.completion}%</span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-amber-50 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400 text-xs font-semibold transition-transform hover:scale-105">
                        <svg className="w-3 h-3" viewBox="0 0 24 24" fill="currentColor"><polygon points="12 2 15 8.5 22 9.3 17 14.1 18.2 21 12 17.8 5.8 21 7 14.1 2 9.3 9 8.5" /></svg>
                        {c.rating.toFixed(1)}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </AdminLayout>
  );
};

export default AnalyticsPage;
