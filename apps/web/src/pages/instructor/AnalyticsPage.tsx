import React, { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useQuery } from '@tanstack/react-query';
import InstructorLayout from '@/components/layout/InstructorLayout';
import { instructorApi, type InstructorCourseRow } from '@/services/api';

type Range = '7d' | '30d' | '90d' | 'ytd';

const AnalyticsPage: React.FC = () => {
  const { t } = useTranslation();
  const [range, setRange] = useState<Range>('30d');

  const { data: stats } = useQuery({
    queryKey: ['instructor', 'analytics', 'stats'],
    queryFn: () => instructorApi.dashboardStats(),
  });

  const { data: courses = [] } = useQuery({
    queryKey: ['instructor', 'analytics', 'courses'],
    queryFn: () => instructorApi.myCourses(),
  });

  const enrollmentSeries = useMemo(
    () => generateSeries(range, 80, 220),
    [range],
  );
  const examSeries = useMemo(
    () => generateSeries(range, 50, 95),
    [range],
  );

  const completionRate = 89;
  const tokensIssued = 1456;

  return (
    <InstructorLayout
      title={t('instructor.analytics.title')}
      subtitle={t('instructor.analytics.subtitle')}
      headerActions={
        <button className="hidden sm:inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold shadow-sm transition-colors">
          <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
          </svg>
          {t('instructor.grading.export')}
        </button>
      }
    >
      <section className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4 mb-6">
        <KpiCard
          color="blue"
          icon={<UsersIcon />}
          value={(stats?.students ?? 0).toLocaleString('en-US')}
          label={t('instructor.analytics.kpi.students')}
          trend="+15%"
          trendUp
        />
        <KpiCard
          color="green"
          icon={<CheckIcon />}
          value={`${completionRate}%`}
          label={t('instructor.analytics.kpi.completion')}
          trend="+8%"
          trendUp
        />
        <KpiCard
          color="orange"
          icon={<StarIcon />}
          value={(stats?.rating ?? 0).toFixed(1)}
          label={t('instructor.analytics.kpi.rating')}
          trend="+12%"
          trendUp
        />
        <KpiCard
          color="purple"
          icon={<TokenIcon />}
          value={tokensIssued.toLocaleString('en-US')}
          label="Tokens phân phối"
          trend="-3%"
          trendUp={false}
        />
      </section>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        <div className="xl:col-span-2 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 overflow-hidden">
          <div className="px-5 py-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
            <h2 className="text-base font-bold text-slate-900 dark:text-white">
              {t('instructor.analytics.charts.enrollmentTrend')}
            </h2>
            <select
              value={range}
              onChange={e => setRange(e.target.value as Range)}
              className="text-sm bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-blue-500"
              aria-label="Time range"
            >
              <option value="7d">7 ngày</option>
              <option value="30d">30 ngày</option>
              <option value="90d">90 ngày</option>
              <option value="ytd">YTD</option>
            </select>
          </div>
          <div className="p-5">
            <BarChart data={enrollmentSeries} color="blue" />
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 overflow-hidden">
          <div className="px-5 py-4 border-b border-slate-100 dark:border-slate-800">
            <h2 className="text-base font-bold text-slate-900 dark:text-white">
              {t('instructor.analytics.charts.examScores')}
            </h2>
          </div>
          <div className="p-5">
            <LineChart data={examSeries} color="orange" />
          </div>
        </div>
      </div>

      <section className="mt-6 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-100 dark:border-slate-800">
          <h2 className="text-base font-bold text-slate-900 dark:text-white">Top khóa học</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 dark:bg-slate-800/50 text-xs text-slate-500 dark:text-slate-400 uppercase tracking-wider">
              <tr>
                <th className="text-left px-5 py-3">#</th>
                <th className="text-left px-5 py-3">Khóa học</th>
                <th className="text-left px-5 py-3">{t('instructor.analytics.kpi.students')}</th>
                <th className="text-left px-5 py-3">{t('instructor.analytics.kpi.completion')}</th>
                <th className="text-left px-5 py-3">{t('instructor.analytics.kpi.rating')}</th>
              </tr>
            </thead>
            <tbody>
              {courses.slice(0, 5).map((course: InstructorCourseRow, idx: number) => (
                <tr
                  key={course.id}
                  className="border-t border-slate-100 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/40"
                >
                  <td className="px-5 py-3">
                    <RankBadge rank={idx + 1} />
                  </td>
                  <td className="px-5 py-3 font-semibold text-slate-900 dark:text-white">{course.title}</td>
                  <td className="px-5 py-3 text-slate-700 dark:text-slate-300">
                    {course.enrollments.toLocaleString('en-US')}
                  </td>
                  <td className="px-5 py-3">
                    <div className="flex items-center gap-2">
                      <div className="flex-1 h-1.5 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden max-w-[140px]">
                        <div
                          className="h-full bg-gradient-to-r from-blue-500 to-cyan-500 rounded-full"
                          style={{ width: `${course.progress}%` }}
                        />
                      </div>
                      <span className="text-xs font-medium text-slate-600 dark:text-slate-400">{course.progress}%</span>
                    </div>
                  </td>
                  <td className="px-5 py-3 font-semibold text-amber-600 dark:text-amber-400">
                    {(4.5 + Math.random() * 0.5).toFixed(1)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </InstructorLayout>
  );
};

interface KpiCardProps {
  color: 'blue' | 'green' | 'orange' | 'purple';
  icon: React.ReactNode;
  value: string;
  label: string;
  trend: string;
  trendUp: boolean;
}

const KpiCard: React.FC<KpiCardProps> = ({ color, icon, value, label, trend, trendUp }) => {
  const colorMap: Record<KpiCardProps['color'], string> = {
    blue: 'bg-blue-100 text-blue-600 dark:bg-blue-900/40 dark:text-blue-300',
    green: 'bg-emerald-100 text-emerald-600 dark:bg-emerald-900/40 dark:text-emerald-300',
    orange: 'bg-amber-100 text-amber-600 dark:bg-amber-900/40 dark:text-amber-300',
    purple: 'bg-purple-100 text-purple-600 dark:bg-purple-900/40 dark:text-purple-300',
  };
  return (
    <div className="bg-white dark:bg-slate-900 rounded-2xl p-5 border border-slate-200 dark:border-slate-800 hover:shadow-lg transition-shadow">
      <div className="flex items-start justify-between mb-4">
        <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${colorMap[color]}`}>{icon}</div>
        <span
          className={`flex items-center gap-1 text-xs font-semibold px-2 py-1 rounded-md ${
            trendUp
              ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300'
              : 'bg-rose-50 text-rose-700 dark:bg-rose-900/30 dark:text-rose-300'
          }`}
        >
          <svg
            className={`w-3 h-3 ${trendUp ? '' : 'rotate-180'}`}
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="3"
          >
            <path d="M5 10l7-7m0 0l7 7m-7-7v18" />
          </svg>
          {trend}
        </span>
      </div>
      <div className="text-3xl font-bold text-slate-900 dark:text-white">{value}</div>
      <div className="text-sm text-slate-500 dark:text-slate-400 mt-1">{label}</div>
    </div>
  );
};

interface BarChartProps {
  data: Array<{ label: string; value: number }>;
  color: 'blue' | 'orange';
}

const BarChart: React.FC<BarChartProps> = ({ data, color }) => {
  const max = Math.max(...data.map(d => d.value));
  const gradient = color === 'blue' ? 'from-blue-500 to-cyan-500' : 'from-amber-500 to-orange-500';
  return (
    <div className="flex items-end gap-1 h-64">
      {data.map((point, idx) => (
        <div key={idx} className="flex-1 flex flex-col items-center gap-2 group">
          <div className="w-full relative flex items-end h-full">
            <div
              className={`w-full bg-gradient-to-t ${gradient} rounded-t-md hover:opacity-80 transition-all cursor-pointer`}
              style={{ height: `${(point.value / max) * 100}%` }}
              title={`${point.value}`}
            />
          </div>
          <span className="text-[10px] text-slate-500 dark:text-slate-400 whitespace-nowrap">
            {point.label}
          </span>
        </div>
      ))}
    </div>
  );
};

interface LineChartProps {
  data: Array<{ label: string; value: number }>;
  color: 'blue' | 'orange';
}

const LineChart: React.FC<LineChartProps> = ({ data, color }) => {
  const width = 400;
  const height = 200;
  const padding = 20;
  const max = Math.max(...data.map(d => d.value));
  const min = Math.min(...data.map(d => d.value));
  const range = max - min || 1;
  const stroke = color === 'blue' ? '#3b82f6' : '#f59e0b';
  const fill = color === 'blue' ? 'rgba(59,130,246,0.15)' : 'rgba(245,158,11,0.15)';

  const points = data
    .map((d, i) => {
      const x = padding + (i * (width - padding * 2)) / (data.length - 1);
      const y = height - padding - ((d.value - min) / range) * (height - padding * 2);
      return `${x},${y}`;
    })
    .join(' ');

  const areaPoints = `${padding},${height - padding} ${points} ${width - padding},${height - padding}`;

  return (
    <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-64">
      <defs>
        <linearGradient id="line-grad" x1="0" x2="0" y1="0" y2="1">
          <stop offset="0%" stopColor={fill} />
          <stop offset="100%" stopColor="rgba(255,255,255,0)" />
        </linearGradient>
      </defs>
      <polygon points={areaPoints} fill="url(#line-grad)" />
      <polyline
        points={points}
        fill="none"
        stroke={stroke}
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      {data.map((d, i) => {
        const x = padding + (i * (width - padding * 2)) / (data.length - 1);
        const y = height - padding - ((d.value - min) / range) * (height - padding * 2);
        return <circle key={i} cx={x} cy={y} r="3" fill={stroke} />;
      })}
    </svg>
  );
};

const RankBadge: React.FC<{ rank: number }> = ({ rank }) => {
  const colors =
    rank === 1
      ? 'bg-gradient-to-br from-amber-300 to-amber-500 text-white'
      : rank === 2
      ? 'bg-gradient-to-br from-slate-300 to-slate-400 text-white'
      : rank === 3
      ? 'bg-gradient-to-br from-orange-300 to-orange-500 text-white'
      : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400';
  return (
    <div className={`w-8 h-8 rounded-lg flex items-center justify-center font-bold text-sm ${colors}`}>{rank}</div>
  );
};

const generateSeries = (range: Range, min: number, max: number) => {
  const days = range === '7d' ? 7 : range === '30d' ? 30 : range === '90d' ? 90 : 240;
  const out: Array<{ label: string; value: number }> = [];
  for (let i = 0; i < days; i++) {
    const value = min + Math.floor(Math.random() * (max - min));
    let label: string;
    if (days <= 7) label = `${i + 1}`;
    else if (days <= 30) label = `${i + 1}`;
    else if (days <= 90) label = `T${Math.floor(i / 7) + 1}`;
    else label = `T${Math.floor(i / 30) + 1}`;
    out.push({ label, value });
  }
  return out;
};

const UsersIcon = () => (
  <svg className="w-6 h-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2" />
    <circle cx="9" cy="7" r="4" />
    <path d="M23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75" />
  </svg>
);

const CheckIcon = () => (
  <svg className="w-6 h-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
  </svg>
);

const StarIcon = () => (
  <svg className="w-6 h-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
  </svg>
);

const TokenIcon = () => (
  <svg className="w-6 h-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <circle cx="12" cy="12" r="10" />
    <path d="M12 6v12M8 9h8M8 15h8" />
  </svg>
);

export default AnalyticsPage;
