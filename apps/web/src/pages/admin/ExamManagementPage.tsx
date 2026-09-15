import React, { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useQuery } from '@tanstack/react-query';
import AdminLayout from '@/components/layout/AdminLayout';
import { examApi, type AdminExamRow, type ExamType } from '@/services/api/exam.api';
import { formatRelative } from '@/utils/time';
import { ANIMATION, TEST_IDS } from '@/constants/ui';

/**
 * Giám sát bài thi của admin — `GET /exams/admin/stats` và `/exams/admin/overview`.
 *
 * Lọc theo loại đề thay vì trạng thái: entity `Exam` không có lịch thi hay
 * trạng thái nháp/đang thi, nên các tab trạng thái cũ không có dữ liệu thật để
 * đếm. Cũng không còn ô "đáng ngờ" và các nút xem/sửa/xuất vì backend chưa có
 * số liệu vi phạm gộp và chưa có endpoint tương ứng.
 */

const typeStyles: Record<ExamType, string> = {
  practice: 'bg-emerald-50 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400',
  graded: 'bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400',
  certification: 'bg-purple-50 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400',
};

const TYPE_KEYS: Array<ExamType | 'all'> = ['all', 'practice', 'graded', 'certification'];

const colorMap: Record<string, string> = {
  blue: 'bg-blue-50 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400',
  emerald: 'bg-emerald-50 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-400',
  cyan: 'bg-cyan-50 text-cyan-600 dark:bg-cyan-900/30 dark:text-cyan-400',
  amber: 'bg-amber-50 text-amber-600 dark:bg-amber-900/30 dark:text-amber-400',
  purple: 'bg-purple-50 text-purple-600 dark:bg-purple-900/30 dark:text-purple-400',
  red: 'bg-red-50 text-red-600 dark:bg-red-900/30 dark:text-red-400',
};

const ExamManagementPage: React.FC = () => {
  const { t } = useTranslation();
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState<ExamType | 'all'>('all');

  const { data: stats, isError: statsError } = useQuery({
    queryKey: ['admin', 'exams', 'stats'],
    queryFn: () => examApi.getAdminStats(),
  });
  const { data: exams, isLoading, isError } = useQuery({
    queryKey: ['admin', 'exams', 'overview'],
    queryFn: () => examApi.getAdminOverview(),
  });

  const filtered = useMemo(() => {
    let arr = exams ?? [];
    if (typeFilter !== 'all') arr = arr.filter(e => e.examType === typeFilter);
    if (search) {
      const s = search.toLowerCase();
      arr = arr.filter(e => e.title.toLowerCase().includes(s));
    }
    return arr;
  }, [exams, search, typeFilter]);

  const percent = (value: number | null | undefined) =>
    value === null || value === undefined ? t('shared.none') : `${value.toFixed(1)}%`;

  const statCards = [
    { value: stats?.totalExams ?? '—', label: t('examApi.adminExams.stats.totalExams'), color: 'blue', icon: <svg className="w-6 h-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2" /><path d="M9 14l2 2 4-4" /></svg> },
    { value: stats?.totalAttempts ?? '—', label: t('examApi.adminExams.stats.totalAttempts'), color: 'cyan', icon: <svg className="w-6 h-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2" /><circle cx="9" cy="7" r="4" /></svg> },
    { value: stats?.inProgress ?? '—', label: t('examApi.adminExams.stats.inProgress'), color: 'emerald', icon: <svg className="w-6 h-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" /></svg> },
    { value: stats?.awaitingGrading ?? '—', label: t('examApi.adminExams.stats.awaitingGrading'), color: 'red', icon: <svg className="w-6 h-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 8v4l3 3" /><circle cx="12" cy="12" r="10" /></svg> },
    { value: stats ? percent(stats.avgScore) : '—', label: t('examApi.adminExams.stats.avgScore'), color: 'amber', icon: <svg className="w-6 h-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polygon points="12 2 15 8.5 22 9.3 17 14.1 18.2 21 12 17.8 5.8 21 7 14.1 2 9.3 9 8.5" /></svg> },
    { value: stats ? percent(stats.passRate) : '—', label: t('examApi.adminExams.stats.passRate'), color: 'purple', icon: <svg className="w-6 h-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M22 11.08V12a10 10 0 11-5.93-9.14" /><polyline points="22 4 12 14.01 9 11.01" /></svg> },
  ];

  return (
    <AdminLayout title={t('examAdmin.title')} subtitle={t('examAdmin.subtitle')}>
      {statsError && (
        <div className="mb-4 p-3 rounded-xl bg-red-50 dark:bg-red-900/20 text-sm text-red-600 dark:text-red-400">
          {t('common.loadError')}
        </div>
      )}

      <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-4 mb-6">
        {statCards.map((s, i) => (
          <div
            key={i}
            data-testid={TEST_IDS.ANALYTICS_KPI}
            className="group relative overflow-hidden bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-5 transition-all hover:-translate-y-1 hover:shadow-lg hover:shadow-blue-500/5 opacity-0 animate-[fadeInUp_.6s_ease-out_forwards]"
            style={{ animationDelay: `${(i + 1) * ANIMATION.STAGGER_DURATION_S}s` }}
          >
            <div className={`w-11 h-11 rounded-xl flex items-center justify-center mb-3 transition-all group-hover:scale-110 group-hover:rotate-[10deg] ${colorMap[s.color]}`}>
              {s.icon}
            </div>
            <div className="text-2xl font-bold tabular-nums mb-1">{s.value}</div>
            <div className="text-xs text-slate-500 dark:text-slate-400">{s.label}</div>
          </div>
        ))}
      </div>

      <div className="flex flex-wrap gap-2 mb-4" role="group" aria-label={t('examApi.adminExams.filterType')}>
        {TYPE_KEYS.map(type => {
          const count = type === 'all' ? (exams?.length ?? 0) : (exams?.filter(e => e.examType === type).length ?? 0);
          const active = typeFilter === type;
          return (
            <button
              key={type}
              data-testid={TEST_IDS.EXAM_STATUS_TAB}
              onClick={() => setTypeFilter(type)}
              aria-pressed={active}
              className={`inline-flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-xl transition-all ${
                active
                  ? 'bg-blue-600 text-white shadow-md shadow-blue-500/30'
                  : 'bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:border-blue-400 hover:text-blue-600'
              }`}
            >
              {type === 'all' ? t('shared.all') : t(`student.exams.type.${type}`)}
              <span className={`px-1.5 py-0.5 text-[10px] font-bold rounded-md ${active ? 'bg-white/20 text-white' : 'bg-slate-100 dark:bg-slate-800 text-slate-500'}`}>
                {count}
              </span>
            </button>
          );
        })}
      </div>

      <div className="relative max-w-md mb-4">
        <svg className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="8" /><path d="M21 21l-4.35-4.35" /></svg>
        <input
          type="text"
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder={t('examApi.adminExams.searchPlaceholder')}
          aria-label={t('aria.searchExam')}
          data-testid={TEST_IDS.EXAM_SEARCH}
          className="w-full pl-11 pr-4 py-2.5 text-sm bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all"
        />
      </div>

      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 overflow-hidden opacity-0 animate-[fadeInUp_.6s_ease-out_forwards]" style={{ animationDelay: `${2 * ANIMATION.STAGGER_DURATION_S}s` }}>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-slate-50 dark:bg-slate-800/50 text-xs uppercase tracking-wider text-slate-500">
                <th className="text-left px-6 py-4 font-semibold">{t('examAdmin.table.exam')}</th>
                <th className="text-left px-6 py-4 font-semibold">{t('examAdmin.table.course')}</th>
                <th className="text-left px-6 py-4 font-semibold">{t('examApi.adminExams.table.type')}</th>
                <th className="text-left px-6 py-4 font-semibold">{t('examAdmin.table.duration')}</th>
                <th className="text-left px-6 py-4 font-semibold">{t('examAdmin.table.participants')}</th>
                <th className="text-left px-6 py-4 font-semibold">{t('examApi.adminExams.table.graded')}</th>
                <th className="text-left px-6 py-4 font-semibold">{t('examAdmin.table.avgScore')}</th>
              </tr>
            </thead>
            <tbody>
              {isLoading && (
                <tr><td colSpan={7} className="text-center py-12">
                  <div className="inline-block w-8 h-8 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
                </td></tr>
              )}
              {isError && (
                <tr><td colSpan={7} className="text-center py-12 text-sm text-red-600 dark:text-red-400">{t('common.loadError')}</td></tr>
              )}
              {!isLoading && !isError && filtered.length === 0 && (
                <tr><td colSpan={7} className="text-center py-12 text-sm text-slate-500">{t('examAdmin.empty')}</td></tr>
              )}
              {filtered.map((e: AdminExamRow) => (
                <tr
                  key={e.id}
                  data-testid={TEST_IDS.EXAM_ROW}
                  className="border-t border-slate-100 dark:border-slate-800 transition-all hover:bg-blue-50/50 dark:hover:bg-blue-900/10"
                >
                  <td className="px-6 py-4">
                    <div className="font-semibold text-sm">{e.title}</div>
                    <div className="text-xs text-slate-500 mt-0.5">{formatRelative(e.createdAt)}</div>
                  </td>
                  <td className="px-6 py-4">
                    {/* Backend chỉ trả id; tên khoá học / giảng viên chưa có service nào phân giải. */}
                    <div className="text-sm font-mono text-slate-600 dark:text-slate-300">
                      {e.courseId ? e.courseId.slice(0, 8) : t('examApi.adminExams.noCourse')}
                    </div>
                    <div className="text-xs text-slate-500 font-mono">{e.instructorId.slice(0, 8)}</div>
                  </td>
                  <td className="px-6 py-4">
                    <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium ${typeStyles[e.examType]}`}>
                      {t(`student.exams.type.${e.examType}`)}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-sm tabular-nums">
                    {e.timeLimitMinutes !== null ? `${e.timeLimitMinutes} ${t('shared.durationUnit')}` : t('shared.none')}
                  </td>
                  <td className="px-6 py-4 text-sm font-semibold tabular-nums">{e.participants}</td>
                  <td className="px-6 py-4 text-sm tabular-nums">{e.gradedAttempts}</td>
                  <td className="px-6 py-4 text-sm tabular-nums font-semibold">{percent(e.avgScore)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </AdminLayout>
  );
};

export default ExamManagementPage;
