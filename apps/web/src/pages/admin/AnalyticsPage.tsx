import React, { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useQuery } from '@tanstack/react-query';
import AdminLayout from '@/components/layout/AdminLayout';
import { analyticsApi, type DailyCount } from '@/services/api/analytics.api';
import { usersApi } from '@/services/api/users.api';
import { ANIMATION, TEST_IDS, CHART_SIZES } from '@/constants/ui';

type RangeKey = '7d' | '30d' | '90d' | 'ytd';

/** Số ngày của từng khoảng; `ytd` tính từ 1/1 năm nay, kể cả hôm nay. */
const rangeToDays = (range: RangeKey): number => {
  if (range === '7d') return 7;
  if (range === '30d') return 30;
  if (range === '90d') return 90;
  const now = new Date();
  const startOfYear = new Date(now.getFullYear(), 0, 1);
  return Math.floor((now.getTime() - startOfYear.getTime()) / 86_400_000) + 1;
};

const LineChart: React.FC<{
  data: DailyCount[];
  color: string;
  fill: string;
  height?: number;
}> = ({ data, color, fill, height = CHART_SIZES.LINE_DEFAULT_PX }) => {
  const max = Math.max(...data.map(x => x.value));
  const min = Math.min(...data.map(x => x.value));
  const range = max - min || 1;
  const points = data.map((d, i) => ({
    x: (i / Math.max(1, data.length - 1)) * 100,
    y: 100 - ((d.value - min) / range) * 100,
  }));

  const pathD = points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ');
  const areaD = `${pathD} L 100 100 L 0 100 Z`;

  return (
    <div className="relative" style={{ height }}>
      <svg viewBox="0 0 100 100" preserveAspectRatio="none" className="w-full h-full">
        {[0, 25, 50, 75, 100].map(y => (
          <line key={y} x1="0" y1={y} x2="100" y2={y} stroke="currentColor" strokeOpacity="0.08" strokeWidth="0.2" />
        ))}
        <path d={areaD} fill={fill} className="transition-all duration-700" />
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
        {points.map((p, i) =>
          i % Math.ceil(points.length / 8) === 0 ? (
            <circle key={i} cx={p.x} cy={p.y} r={0.8} fill={color} />
          ) : null
        )}
      </svg>
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
  const segments = data
    .filter(seg => seg.count > 0)
    .map(seg => {
      const start = (cumulative / total) * 360;
      cumulative += seg.count;
      // Một lát đủ 360° vẽ bằng cung sẽ suy biến thành rỗng, nên chừa 0.01°.
      const end = Math.min((cumulative / total) * 360, 359.99);
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

/** Khung biểu đồ khi chưa có endpoint hoặc chưa có điểm dữ liệu nào. */
const EmptyChart: React.FC<{ label: string; height?: number }> = ({ label, height = CHART_SIZES.LINE_DEFAULT_PX }) => (
  <div className="flex items-center justify-center text-sm text-slate-500 dark:text-slate-400 text-center px-4" style={{ height }}>
    {label}
  </div>
);

/**
 * Phân tích toàn nền tảng.
 *
 * - KPI: `GET /api/analytics/admin/kpi` (cửa sổ người hoạt động theo khoảng đang chọn).
 * - Tăng trưởng: `GET /api/analytics/admin/user-growth` — đếm hồ sơ analytics mới,
 *   không phải lượt đăng ký.
 * - Phân bố vai trò: `GET /api/auth/users/stats` (không có số khách).
 * - Ghi danh theo ngày, tỷ lệ hoàn thành bài thi, tỷ lệ đạt theo tháng và top khoá
 *   học chưa có endpoint chuỗi thời gian nào: hiện trạng thái chưa có nguồn dữ liệu.
 *   Các % thay đổi so với kỳ trước cũ là số bịa nên bị bỏ.
 */
const AnalyticsPage: React.FC = () => {
  const { t } = useTranslation();
  const [range, setRange] = useState<RangeKey>('30d');
  const days = rangeToDays(range);

  const { data: kpi } = useQuery({
    queryKey: ['analytics', 'admin', 'kpi', days],
    queryFn: () => analyticsApi.getAdminKpi(days),
  });

  const { data: userGrowth, isLoading: isGrowthLoading } = useQuery({
    queryKey: ['analytics', 'admin', 'userGrowth', days],
    queryFn: () => analyticsApi.getUserGrowth(days),
  });

  const { data: userStats } = useQuery({
    queryKey: ['users', 'stats'],
    queryFn: () => usersApi.stats(),
  });

  const none = t('shared.none');
  const noSource = t('admin.noDataSource');

  const kpiCards = useMemo(
    () => [
      {
        label: t('analytics.kpi.activeUsers'),
        value: kpi ? kpi.activeUsers.toLocaleString() : none,
        color: 'blue',
        svg: <svg className="w-6 h-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2" /><circle cx="9" cy="7" r="4" /></svg>,
      },
      {
        label: t('admin.analyticsKpi.trackedUsers'),
        value: kpi ? kpi.trackedUsers.toLocaleString() : none,
        color: 'emerald',
        svg: <svg className="w-6 h-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M16 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2" /><circle cx="8.5" cy="7" r="4" /><line x1="20" y1="8" x2="20" y2="14" /><line x1="23" y1="11" x2="17" y2="11" /></svg>,
      },
      {
        label: t('analytics.kpi.courseEnrolls'),
        value: kpi ? kpi.courseEnrollments.toLocaleString() : none,
        color: 'cyan',
        svg: <svg className="w-6 h-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M4 19.5A2.5 2.5 0 016.5 17H20M6.5 2H20v20H6.5A2.5 2.5 0 014 19.5v-15A2.5 2.5 0 016.5 2z" /></svg>,
      },
      {
        label: t('analytics.kpi.examSubmits'),
        value: kpi ? kpi.examAttempts.toLocaleString() : none,
        color: 'amber',
        svg: <svg className="w-6 h-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2" /><path d="M9 5a2 2 0 002 2h2a2 2 0 002-2" /><path d="M9 14l2 2 4-4" /></svg>,
      },
      {
        label: t('admin.analyticsKpi.passRate'),
        value: kpi ? `${kpi.passRate}%` : none,
        color: 'purple',
        svg: <svg className="w-6 h-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M22 11.08V12a10 10 0 11-5.93-9.14" /><polyline points="22 4 12 14.01 9 11.01" /></svg>,
      },
      {
        label: t('admin.analyticsKpi.avgScore'),
        value: kpi ? kpi.avgScore.toLocaleString() : none,
        color: 'rose',
        svg: <svg className="w-6 h-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polygon points="12 2 15 8.5 22 9.3 17 14.1 18.2 21 12 17.8 5.8 21 7 14.1 2 9.3 9 8.5" /></svg>,
      },
    ],
    [t, kpi, none]
  );

  const roles = useMemo(() => {
    if (!userStats) return [];
    return [
      { role: 'student', count: userStats.students, color: '#10b981', label: t('admin.role.student') },
      { role: 'instructor', count: userStats.instructors, color: '#f59e0b', label: t('admin.role.instructor') },
      { role: 'admin', count: userStats.admins, color: '#3b82f6', label: t('admin.role.admin') },
      { role: 'super_admin', count: userStats.superAdmins, color: '#a855f7', label: t('admin.role.superAdmin') },
    ];
  }, [userStats, t]);

  const rolesTotal = roles.reduce((acc, r) => acc + r.count, 0);

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
              onClick={() => setRange(r)}
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
            <div className="relative text-2xl font-bold tabular-nums mb-1">{card.value}</div>
            <div className="relative text-xs text-slate-500 dark:text-slate-400">{card.label}</div>
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
          {userGrowth && userGrowth.length > 0 ? (
            <LineChart data={userGrowth} color={colorMap.blue.line} fill="rgba(59,130,246,0.15)" />
          ) : (
            <EmptyChart label={isGrowthLoading ? t('common.loading') : t('common.noData')} />
          )}
        </div>

        {/* Role distribution (donut) */}
        <div
          className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-6 opacity-0 animate-[fadeInUp_.6s_ease-out_forwards] hover:shadow-lg hover:shadow-blue-500/5 transition-all"
          style={{ animationDelay: `${2.5 * ANIMATION.STAGGER_DURATION_S}s` }}
        >
          <h2 className="text-base font-semibold mb-4">{t('analytics.charts.roleDistribution')}</h2>
          {rolesTotal > 0 ? <DonutChart data={roles} /> : <EmptyChart label={t('common.noData')} height={176} />}
        </div>

        {/* Enrollments — chưa có chuỗi ghi danh theo ngày */}
        <div
          className="xl:col-span-2 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-6 opacity-0 animate-[fadeInUp_.6s_ease-out_forwards]"
          style={{ animationDelay: `${3 * ANIMATION.STAGGER_DURATION_S}s` }}
        >
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-base font-semibold">{t('analytics.charts.enrollments')}</h2>
          </div>
          <EmptyChart label={noSource} />
        </div>

        {/* Exam completion — chưa có chuỗi hoàn thành bài thi */}
        <div
          className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-6 opacity-0 animate-[fadeInUp_.6s_ease-out_forwards]"
          style={{ animationDelay: `${3.5 * ANIMATION.STAGGER_DURATION_S}s` }}
        >
          <h2 className="text-base font-semibold mb-4">{t('analytics.charts.examCompletion')}</h2>
          <EmptyChart label={noSource} height={CHART_SIZES.LINE_SMALL_PX} />
        </div>
      </div>

      {/* Pass rate + Top courses — chưa có endpoint */}
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-6">
        <div
          className="xl:col-span-5 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-6 opacity-0 animate-[fadeInUp_.6s_ease-out_forwards]"
          style={{ animationDelay: `${4 * ANIMATION.STAGGER_DURATION_S}s` }}
        >
          <h2 className="text-base font-semibold mb-4">{t('analytics.charts.passRate')}</h2>
          <EmptyChart label={noSource} height={CHART_SIZES.BAR_LARGE_PX} />
        </div>

        <div
          className="xl:col-span-7 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 overflow-hidden opacity-0 animate-[fadeInUp_.6s_ease-out_forwards]"
          style={{ animationDelay: `${4.5 * ANIMATION.STAGGER_DURATION_S}s` }}
        >
          <div className="px-6 py-5 border-b border-slate-200 dark:border-slate-800">
            <h2 className="text-base font-semibold">{t('analytics.charts.topCourses')}</h2>
          </div>
          <EmptyChart label={noSource} height={CHART_SIZES.BAR_LARGE_PX} />
        </div>
      </div>
    </AdminLayout>
  );
};

export default AnalyticsPage;
