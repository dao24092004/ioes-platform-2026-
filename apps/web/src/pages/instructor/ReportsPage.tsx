import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useQuery } from '@tanstack/react-query';
import InstructorLayout from '@/components/layout/InstructorLayout';
import { instructorApi } from '@/services/api';

type ReportType = 'enrollment' | 'completion' | 'revenue' | 'engagement';
type DateRange = '7d' | '30d' | '90d' | 'ytd';

const reportTabs: { key: ReportType; labelKey: string; color: string }[] = [
  { key: 'enrollment', labelKey: 'instructor.reports.tab.enrollment', color: 'blue' },
  { key: 'completion', labelKey: 'instructor.reports.tab.completion', color: 'emerald' },
  { key: 'revenue', labelKey: 'instructor.reports.tab.revenue', color: 'amber' },
  { key: 'engagement', labelKey: 'instructor.reports.tab.engagement', color: 'cyan' },
];

const ReportsPage: React.FC = () => {
  const { t } = useTranslation();
  const [tab, setTab] = useState<ReportType>('enrollment');
  const [range, setRange] = useState<DateRange>('30d');

  const { data: summary } = useQuery({
    queryKey: ['instructor', 'reports', 'summary', range],
    queryFn: () => instructorApi.reportSummary(range),
  });

  const { data: data = [] } = useQuery({
    queryKey: ['instructor', 'reports', tab, range],
    queryFn: () => instructorApi.reportData(tab, range),
  });

  return (
    <InstructorLayout
      title={t('instructor.reports.title')}
      subtitle={t('instructor.reports.subtitle')}
      headerActions={
        <button className="hidden sm:inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold shadow-sm transition-colors">
          <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
          </svg>
          {t('instructor.reports.exportPdf')}
        </button>
      }
    >
      <section className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <Kpi color="blue" label={t('instructor.reports.kpi.totalEnrollments')} value={summary?.enrollments.toLocaleString('en-US') ?? '—'} />
        <Kpi color="emerald" label={t('instructor.reports.kpi.completionRate')} value={`${summary?.completion ?? 0}%`} />
        <Kpi color="amber" label={t('instructor.reports.kpi.revenue')} value={`${(summary?.revenue ?? 0).toLocaleString('en-US')} ₫`} />
        <Kpi color="cyan" label={t('instructor.reports.kpi.avgWatchTime')} value={`${summary?.avgWatch ?? 0} ${t('instructor.reports.minutes')}`} />
      </section>

      <section className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-800 flex flex-wrap gap-3 items-center justify-between">
          <div className="flex flex-wrap gap-1 p-1 bg-slate-100 dark:bg-slate-800 rounded-xl">
            {reportTabs.map((rt) => (
              <button
                key={rt.key}
                onClick={() => setTab(rt.key)}
                className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-all ${
                  tab === rt.key ? 'bg-white dark:bg-slate-700 text-blue-600 dark:text-blue-400 shadow-sm' : 'text-slate-600 dark:text-slate-400'
                }`}
              >
                {t(rt.labelKey)}
              </button>
            ))}
          </div>
          <div className="flex gap-1">
            {(['7d', '30d', '90d', 'ytd'] as DateRange[]).map((r) => (
              <button
                key={r}
                onClick={() => setRange(r)}
                className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-all ${
                  range === r ? 'bg-blue-600 text-white shadow-sm' : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
                }`}
              >
                {t(`instructor.reports.range.${r}`)}
              </button>
            ))}
          </div>
        </div>

        <ChartView data={data} tab={tab} />

        <div className="px-6 py-5">
          <h3 className="text-sm font-semibold mb-3">{t('instructor.reports.breakdown')}</h3>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-xs uppercase tracking-wider text-slate-500 border-b border-slate-200 dark:border-slate-800">
                  <th className="text-left py-2 font-semibold">{t('instructor.reports.table.metric')}</th>
                  <th className="text-right py-2 font-semibold">{t('instructor.reports.table.current')}</th>
                  <th className="text-right py-2 font-semibold">{t('instructor.reports.table.previous')}</th>
                  <th className="text-right py-2 font-semibold">{t('instructor.reports.table.delta')}</th>
                </tr>
              </thead>
              <tbody>
                {(summary?.breakdown ?? []).map((b: { label: string; current: number; previous: number }, i: number) => {
                  const delta = b.previous === 0 ? 100 : Math.round(((b.current - b.previous) / b.previous) * 100);
                  const positive = delta >= 0;
                  return (
                    <tr key={i} className="border-b border-slate-100 dark:border-slate-800">
                      <td className="py-3 font-medium">{b.label}</td>
                      <td className="py-3 text-right tabular-nums">{b.current.toLocaleString('en-US')}</td>
                      <td className="py-3 text-right tabular-nums text-slate-500">{b.previous.toLocaleString('en-US')}</td>
                      <td className="py-3 text-right">
                        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-xs font-bold ${
                          positive ? 'bg-emerald-50 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400' : 'bg-red-50 dark:bg-red-900/30 text-red-600 dark:text-red-400'
                        }`}>
                          {positive ? '↑' : '↓'} {Math.abs(delta)}%
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </section>
    </InstructorLayout>
  );
};

const Kpi: React.FC<{ color: 'blue' | 'emerald' | 'amber' | 'cyan'; label: string; value: string }> = ({ color, label, value }) => {
  const map: Record<string, string> = {
    blue: 'bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400',
    emerald: 'bg-emerald-50 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400',
    amber: 'bg-amber-50 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400',
    cyan: 'bg-cyan-50 dark:bg-cyan-900/30 text-cyan-600 dark:text-cyan-400',
  };
  return (
    <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-5">
      <div className={`w-10 h-10 rounded-lg flex items-center justify-center mb-3 ${map[color]}`}>
        <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M3 3v18h18M9 17V9m4 8V5m4 12v-6" />
        </svg>
      </div>
      <div className="text-2xl font-bold tabular-nums mb-1">{value}</div>
      <div className="text-xs text-slate-500 dark:text-slate-400">{label}</div>
    </div>
  );
};

interface ChartPoint { label: string; value: number; }

const ChartView: React.FC<{ data: ChartPoint[]; tab: ReportType }> = ({ data }) => {
  const max = Math.max(1, ...data.map((d) => d.value));
  const width = 100;
  const height = 30;

  return (
    <div className="px-6 py-5 border-b border-slate-200 dark:border-slate-800">
      <div className="w-full" style={{ aspectRatio: `${width}/${height}` }}>
        <svg viewBox={`0 0 ${width} ${height}`} preserveAspectRatio="none" className="w-full h-full">
          {[0.25, 0.5, 0.75].map((p) => (
            <line key={p} x1="0" x2={width} y1={height * p} y2={height * p} stroke="currentColor" strokeOpacity="0.08" strokeWidth="0.15" />
          ))}
          {data.length > 0 && (
            <>
              {(() => {
                const step = width / Math.max(1, data.length - 1);
                const points = data.map((d, i) => `${i === 0 ? 'M' : 'L'} ${i * step} ${height - (d.value / max) * height}`).join(' ');
                const area = `${points} L ${width} ${height} L 0 ${height} Z`;
                return (
                  <>
                    <path d={area} fill="url(#reportFill)" opacity="0.45" />
                    <path d={points} fill="none" stroke="#2563eb" strokeWidth="0.4" strokeLinejoin="round" strokeLinecap="round" vectorEffect="non-scaling-stroke" />
                  </>
                );
              })()}
              <defs>
                <linearGradient id="reportFill" x1="0" x2="0" y1="0" y2={height} gradientUnits="userSpaceOnUse">
                  <stop offset="0%" stopColor="#3b82f6" stopOpacity="0.7" />
                  <stop offset="100%" stopColor="#3b82f6" stopOpacity="0" />
                </linearGradient>
              </defs>
            </>
          )}
        </svg>
      </div>
      <div className="flex justify-between mt-2 text-[10px] text-slate-400">
        {data.map((d, i) => i % Math.ceil(data.length / 7) === 0 && (
          <span key={i}>{d.label}</span>
        ))}
      </div>
    </div>
  );
};

export default ReportsPage;
