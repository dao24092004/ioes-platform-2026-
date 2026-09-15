import React, { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { useQuery } from '@tanstack/react-query';
import InstructorLayout from '@/components/layout/InstructorLayout';
import { examApi } from '@/services/api/exam.api';
import { formatRelative } from '@/utils/time';

/**
 * Phân tích của giảng viên.
 *
 * Chỉ còn số liệu backend thật sự có cho giảng viên: đề của mình (`GET /exams`)
 * và hàng đợi chấm (`/exams/grading/*`). Biểu đồ ghi danh / điểm thi theo thời
 * gian cũ sinh bằng `Math.random()`, tỉ lệ hoàn thành và token cũng viết cứng —
 * không service nào tổng hợp chuỗi thời gian theo giảng viên (`/exams/admin/*`
 * chỉ mở cho ADMIN), nên phần đó là trạng thái trống.
 */
const AnalyticsPage: React.FC = () => {
  const { t } = useTranslation();

  const { data: exams = [], isLoading, isError } = useQuery({
    queryKey: ['instructor', 'exams', 'list'],
    queryFn: () => examApi.listExams(),
  });
  const { data: stats } = useQuery({
    queryKey: ['exams', 'grading', 'stats'],
    queryFn: () => examApi.getGradingStats(),
  });
  const { data: queue = [] } = useQuery({
    queryKey: ['exams', 'grading', 'queue'],
    queryFn: () => examApi.getGradingQueue(),
  });

  const pendingByExam = useMemo(() => {
    const map = new Map<string, number>();
    for (const item of queue) map.set(item.examId, (map.get(item.examId) ?? 0) + 1);
    return map;
  }, [queue]);

  return (
    <InstructorLayout title={t('instructor.analytics.title')} subtitle={t('instructor.analytics.subtitle')}>
      <section className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4 mb-6">
        <KpiCard color="blue" value={isLoading ? '—' : exams.length} label={t('instructor.dashboard.stats.exams')} />
        <KpiCard color="orange" value={stats?.pending ?? '—'} label={t('examApi.instructorDashboard.stats.pending')} />
        <KpiCard color="green" value={stats?.graded ?? '—'} label={t('examApi.instructorDashboard.stats.graded')} />
        <KpiCard
          color="purple"
          value={stats?.oldestPendingSubmittedAt ? formatRelative(stats.oldestPendingSubmittedAt) : t('shared.none')}
          label={t('examApi.grading.stats.oldestPending')}
        />
      </section>

      <section className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-8 mb-6 text-center">
        <h2 className="text-base font-bold text-slate-900 dark:text-white mb-2">
          {t('instructor.analytics.charts.enrollmentTrend')}
        </h2>
        <p className="text-sm text-slate-500 dark:text-slate-400 max-w-xl mx-auto">
          {t('examApi.instructorAnalytics.noTimeSeries')}
        </p>
      </section>

      <section className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-100 dark:border-slate-800">
          <h2 className="text-base font-bold text-slate-900 dark:text-white">{t('examApi.instructorDashboard.myExams')}</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 dark:bg-slate-800/50 text-xs text-slate-500 dark:text-slate-400 uppercase tracking-wider">
              <tr>
                <th className="text-left px-5 py-3">{t('examAdmin.table.exam')}</th>
                <th className="text-left px-5 py-3">{t('examApi.adminExams.table.type')}</th>
                <th className="text-left px-5 py-3">{t('examAdmin.table.duration')}</th>
                <th className="text-left px-5 py-3">{t('examApi.instructorAnalytics.proctored')}</th>
                <th className="text-left px-5 py-3">{t('examApi.instructorDashboard.stats.pending')}</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr>
                  <td colSpan={5} className="px-5 py-12 text-center">
                    <div className="inline-block w-8 h-8 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
                  </td>
                </tr>
              ) : isError ? (
                <tr>
                  <td colSpan={5} className="px-5 py-12 text-center text-red-600 dark:text-red-400">{t('common.loadError')}</td>
                </tr>
              ) : exams.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-5 py-12 text-center text-slate-500">{t('examApi.instructorDashboard.noExams')}</td>
                </tr>
              ) : (
                exams.map(exam => (
                  <tr key={exam.id} className="border-t border-slate-100 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/40">
                    <td className="px-5 py-3 font-semibold text-slate-900 dark:text-white">{exam.title}</td>
                    <td className="px-5 py-3 text-slate-700 dark:text-slate-300">{t(`student.exams.type.${exam.examType}`)}</td>
                    <td className="px-5 py-3 text-slate-700 dark:text-slate-300 tabular-nums">
                      {exam.timeLimitMinutes !== null ? `${exam.timeLimitMinutes} ${t('shared.durationUnit')}` : t('shared.none')}
                    </td>
                    <td className="px-5 py-3 text-slate-700 dark:text-slate-300">{exam.isProctored ? t('shared.on') : t('shared.off')}</td>
                    <td className="px-5 py-3 font-semibold tabular-nums">{pendingByExam.get(exam.id) ?? 0}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>
    </InstructorLayout>
  );
};

interface KpiCardProps {
  color: 'blue' | 'green' | 'orange' | 'purple';
  value: string | number;
  label: string;
}

const KpiCard: React.FC<KpiCardProps> = ({ color, value, label }) => {
  const colorMap: Record<KpiCardProps['color'], string> = {
    blue: 'border-blue-200 dark:border-blue-900/50',
    green: 'border-emerald-200 dark:border-emerald-900/50',
    orange: 'border-amber-200 dark:border-amber-900/50',
    purple: 'border-purple-200 dark:border-purple-900/50',
  };
  return (
    <div className={`bg-white dark:bg-slate-900 rounded-2xl p-5 border ${colorMap[color]} hover:shadow-lg transition-shadow`}>
      <div className="text-3xl font-bold text-slate-900 dark:text-white">{value}</div>
      <div className="text-sm text-slate-500 dark:text-slate-400 mt-1">{label}</div>
    </div>
  );
};

export default AnalyticsPage;
