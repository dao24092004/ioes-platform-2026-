import React, { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useQuery } from '@tanstack/react-query';
import AdminLayout from '@/components/layout/AdminLayout';
import { examApi, type ExamItem, type ExamStatus } from '@/services/api';
import { formatRelative } from '@/utils/time';
import { ANIMATION, TEST_IDS } from '@/constants/ui';

const statusStyles: Record<ExamStatus, { bg: string; text: string; dot: string }> = {
  draft: { bg: 'bg-slate-100 dark:bg-slate-800', text: 'text-slate-600 dark:text-slate-400', dot: 'bg-slate-400' },
  scheduled: { bg: 'bg-blue-50 dark:bg-blue-900/30', text: 'text-blue-600 dark:text-blue-400', dot: 'bg-blue-500' },
  active: { bg: 'bg-emerald-50 dark:bg-emerald-900/30', text: 'text-emerald-600 dark:text-emerald-400', dot: 'bg-emerald-500' },
  completed: { bg: 'bg-cyan-50 dark:bg-cyan-900/30', text: 'text-cyan-600 dark:text-cyan-400', dot: 'bg-cyan-500' },
  cancelled: { bg: 'bg-red-50 dark:bg-red-900/30', text: 'text-red-600 dark:text-red-400', dot: 'bg-red-500' },
};

const ExamManagementPage: React.FC = () => {
  const { t } = useTranslation();
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<ExamStatus | 'all'>('all');

  const { data: stats } = useQuery({ queryKey: ['exams', 'stats'], queryFn: () => examApi.stats() });
  const { data: exams, isLoading } = useQuery({ queryKey: ['exams', 'list'], queryFn: () => examApi.list() });

  const filtered = useMemo(() => {
    let arr = exams ?? [];
    if (statusFilter !== 'all') arr = arr.filter((e: ExamItem) => e.status === statusFilter);
    if (search) {
      const s = search.toLowerCase();
      arr = arr.filter((e: ExamItem) =>
        e.title.toLowerCase().includes(s) ||
        e.course.toLowerCase().includes(s) ||
        e.instructor.toLowerCase().includes(s)
      );
    }
    return arr;
  }, [exams, search, statusFilter]);

  const statCards = [
    { value: stats?.total ?? 0, label: t('examAdmin.stats.total'), color: 'blue', icon: <svg className="w-6 h-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2" /><path d="M9 14l2 2 4-4" /></svg> },
    { value: stats?.active ?? 0, label: t('examAdmin.stats.active'), color: 'emerald', icon: <svg className="w-6 h-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" /></svg> },
    { value: stats?.completed ?? 0, label: t('examAdmin.stats.completed'), color: 'cyan', icon: <svg className="w-6 h-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="20 6 9 17 4 12" /></svg> },
    { value: stats?.avgScore ?? 0, label: t('examAdmin.stats.avgScore'), suffix: '/10', color: 'amber', icon: <svg className="w-6 h-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polygon points="12 2 15 8.5 22 9.3 17 14.1 18.2 21 12 17.8 5.8 21 7 14.1 2 9.3 9 8.5" /></svg> },
    { value: stats?.passRate ?? 0, label: t('examAdmin.stats.passRate'), suffix: '%', color: 'purple', icon: <svg className="w-6 h-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M22 11.08V12a10 10 0 11-5.93-9.14" /><polyline points="22 4 12 14.01 9 11.01" /></svg> },
    { value: stats?.flagged ?? 0, label: t('examAdmin.stats.flagged'), color: 'red', icon: <svg className="w-6 h-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z" /><line x1="4" y1="22" x2="4" y2="15" /></svg> },
  ];

  const colorMap: Record<string, string> = {
    blue: 'bg-blue-50 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400',
    emerald: 'bg-emerald-50 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-400',
    cyan: 'bg-cyan-50 text-cyan-600 dark:bg-cyan-900/30 dark:text-cyan-400',
    amber: 'bg-amber-50 text-amber-600 dark:bg-amber-900/30 dark:text-amber-400',
    purple: 'bg-purple-50 text-purple-600 dark:bg-purple-900/30 dark:text-purple-400',
    red: 'bg-red-50 text-red-600 dark:bg-red-900/30 dark:text-red-400',
  };

  const statusKeys: Array<ExamStatus | 'all'> = ['all', 'draft', 'scheduled', 'active', 'completed', 'cancelled'];

  return (
    <AdminLayout title={t('examAdmin.title')} subtitle={t('examAdmin.subtitle')}>
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
            <div className="text-2xl font-bold tabular-nums mb-1">
              {typeof s.value === 'number' && s.value % 1 !== 0 ? s.value.toFixed(1) : s.value}
              {s.suffix && <span className="text-sm text-slate-500 font-normal">{s.suffix}</span>}
            </div>
            <div className="text-xs text-slate-500 dark:text-slate-400">{s.label}</div>
          </div>
        ))}
      </div>

      <div className="flex flex-wrap gap-2 mb-4" role="group" aria-label={t('aria.filterStatus')}>
        {statusKeys.map(s => {
          const count = s === 'all' ? (exams?.length ?? 0) : (exams?.filter((e: ExamItem) => e.status === s).length ?? 0);
          const active = statusFilter === s;
          return (
            <button
              key={s}
              data-testid={TEST_IDS.EXAM_STATUS_TAB}
              onClick={() => setStatusFilter(s)}
              aria-pressed={active}
              className={`inline-flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-xl transition-all ${
                active
                  ? 'bg-blue-600 text-white shadow-md shadow-blue-500/30'
                  : 'bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:border-blue-400 hover:text-blue-600'
              }`}
            >
              {s === 'all' ? t('shared.all') : t(`examAdmin.status.${s}`)}
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
          placeholder={t('examAdmin.filters.searchPlaceholder')}
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
                <th className="text-left px-6 py-4 font-semibold">{t('examAdmin.table.duration')}</th>
                <th className="text-left px-6 py-4 font-semibold">{t('examAdmin.table.participants')}</th>
                <th className="text-left px-6 py-4 font-semibold">{t('examAdmin.table.avgScore')}</th>
                <th className="text-left px-6 py-4 font-semibold">{t('examAdmin.table.status')}</th>
                <th className="text-right px-6 py-4 font-semibold">{t('examAdmin.table.actions')}</th>
              </tr>
            </thead>
            <tbody>
              {isLoading && (
                <tr><td colSpan={7} className="text-center py-12">
                  <div className="inline-block w-8 h-8 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
                </td></tr>
              )}
              {!isLoading && filtered.length === 0 && (
                <tr><td colSpan={7} className="text-center py-12 text-sm text-slate-500">{t('examAdmin.empty')}</td></tr>
              )}
              {filtered.map((e: ExamItem) => {
                const st = statusStyles[e.status];
                return (
                  <tr
                    key={e.id}
                    data-testid={TEST_IDS.EXAM_ROW}
                    className="border-t border-slate-100 dark:border-slate-800 transition-all hover:bg-blue-50/50 dark:hover:bg-blue-900/10 group"
                  >
                    <td className="px-6 py-4">
                      <div className="font-semibold text-sm">{e.title}</div>
                      <div className="text-xs text-slate-500 mt-0.5">{formatRelative(e.starts_at)}</div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-sm">{e.course}</div>
                      <div className="text-xs text-slate-500">{e.instructor}</div>
                    </td>
                    <td className="px-6 py-4 text-sm tabular-nums">{e.duration_min} {t('shared.durationUnit')}</td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-semibold tabular-nums">{e.participants}</span>
                        {e.flagged > 0 && (
                          <span className="inline-flex items-center gap-1 px-1.5 py-0.5 text-[10px] font-bold rounded-md bg-red-50 dark:bg-red-900/30 text-red-600 dark:text-red-400">
                            <svg className="w-2.5 h-2.5" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2L2 22h20L12 2z" /></svg>
                            {e.flagged}
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 text-sm tabular-nums font-semibold">
                      {e.avg_score > 0 ? e.avg_score.toFixed(1) : t('shared.none')}
                    </td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium transition-transform hover:scale-105 ${st.bg} ${st.text}`}>
                        <span className={`w-1.5 h-1.5 rounded-full ${st.dot} ${e.status === 'active' ? 'animate-pulse' : ''}`} />
                        {t(`examAdmin.status.${e.status}`)}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center justify-end gap-1.5" data-testid={TEST_IDS.EXAM_ACTIONS}>
                        <button
                          aria-label={t('aria.view')}
                          className="w-8 h-8 rounded-lg border border-slate-200 dark:border-slate-700 hover:border-blue-500 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-all flex items-center justify-center"
                        >
                          <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" /><circle cx="12" cy="12" r="3" /></svg>
                        </button>
                        <button
                          aria-label={t('aria.edit')}
                          className="w-8 h-8 rounded-lg border border-slate-200 dark:border-slate-700 hover:border-amber-500 hover:text-amber-600 hover:bg-amber-50 dark:hover:bg-amber-900/20 transition-all flex items-center justify-center"
                        >
                          <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7" /><path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z" /></svg>
                        </button>
                        <button
                          aria-label={t('aria.export')}
                          className="w-8 h-8 rounded-lg border border-slate-200 dark:border-slate-700 hover:border-emerald-500 hover:text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-900/20 transition-all flex items-center justify-center"
                        >
                          <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4" /><polyline points="7 10 12 15 17 10" /><line x1="12" y1="15" x2="12" y2="3" /></svg>
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </AdminLayout>
  );
};

export default ExamManagementPage;