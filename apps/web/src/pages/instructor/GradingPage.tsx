import React, { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useQuery } from '@tanstack/react-query';
import InstructorLayout from '@/components/layout/InstructorLayout';
import { instructorApi, type GradingSession } from '@/services/api';
import { formatRelative } from '@/utils/time';

type FilterStatus = 'all' | 'clean' | 'warning' | 'flagged';

const GradingPage: React.FC = () => {
  const { t } = useTranslation();
  const [filter, setFilter] = useState<FilterStatus>('all');

  const { data: stats } = useQuery({
    queryKey: ['instructor', 'grading', 'stats'],
    queryFn: () => instructorApi.gradingStats(),
  });

  const { data: sessions = [] } = useQuery({
    queryKey: ['instructor', 'grading', 'sessions'],
    queryFn: () => instructorApi.gradingSessions(),
  });

  const filtered = useMemo(
    () => (filter === 'all' ? sessions : sessions.filter((s: GradingSession) => s.status === filter)),
    [filter, sessions],
  );

  return (
    <InstructorLayout
      title={t('instructor.grading.title')}
      subtitle={t('instructor.grading.subtitle')}
      headerActions={
        <button className="hidden sm:inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold shadow-sm transition-colors">
          <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
          </svg>
          {t('instructor.grading.export')}
        </button>
      }
    >
      <section className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
        <StatBox
          color="blue"
          value={stats?.total ?? 0}
          label={t('instructor.grading.stats.total')}
        />
        <StatBox
          color="emerald"
          value={stats?.clean ?? 0}
          label={t('instructor.grading.stats.clean')}
        />
        <StatBox
          color="amber"
          value={stats?.warning ?? 0}
          label={t('instructor.grading.stats.warning')}
        />
        <StatBox
          color="rose"
          value={`${stats?.avgAttention ?? 0}%`}
          label={t('instructor.grading.stats.attention')}
        />
      </section>

      <section className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-100 dark:border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <h2 className="text-base font-bold text-slate-900 dark:text-white">
            {t('instructor.grading.sessionList')}
          </h2>
          <div className="flex items-center gap-2 flex-wrap">
            {(['all', 'clean', 'warning', 'flagged'] as FilterStatus[]).map(status => (
              <button
                key={status}
                type="button"
                onClick={() => setFilter(status)}
                className={`px-3 py-1.5 rounded-lg text-sm font-semibold transition-colors ${
                  filter === status
                    ? 'bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300'
                    : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
                }`}
              >
                {t(`instructor.grading.filters.${status}`)}
              </button>
            ))}
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 dark:bg-slate-800/50 text-xs text-slate-500 dark:text-slate-400 uppercase tracking-wider">
              <tr>
                <th className="text-left px-5 py-3">{t('instructor.grading.table.student')}</th>
                <th className="text-left px-5 py-3">{t('instructor.grading.table.time')}</th>
                <th className="text-left px-5 py-3">{t('instructor.grading.table.attention')}</th>
                <th className="text-left px-5 py-3">{t('instructor.grading.table.violations')}</th>
                <th className="text-left px-5 py-3">{t('instructor.grading.table.status')}</th>
                <th className="text-right px-5 py-3">{t('instructor.grading.table.actions')}</th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-5 py-12 text-center text-slate-500 dark:text-slate-400">
                    {t('instructor.grading.empty')}
                  </td>
                </tr>
              ) : (
                filtered.map((session: GradingSession) => (
                  <tr
                    key={session.id}
                    className="border-t border-slate-100 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/40"
                  >
                    <td className="px-5 py-3">
                      <div className="flex items-center gap-3">
                        <Avatar src={session.student_avatar} name={session.student_name} />
                        <div>
                          <div className="font-semibold text-slate-900 dark:text-white">{session.student_name}</div>
                          <div className="text-xs text-slate-500 dark:text-slate-400">{session.exam_title}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-5 py-3 text-slate-700 dark:text-slate-300">
                      {formatRelative(session.started_at)}
                    </td>
                    <td className="px-5 py-3">
                      <div className="flex items-center gap-2">
                        <div className="w-24 h-1.5 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                          <div
                            className={`h-full rounded-full ${
                              session.attention_score >= 80
                                ? 'bg-emerald-500'
                                : session.attention_score >= 50
                                ? 'bg-amber-500'
                                : 'bg-rose-500'
                            }`}
                            style={{ width: `${session.attention_score}%` }}
                          />
                        </div>
                        <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                          {session.attention_score}%
                        </span>
                      </div>
                    </td>
                    <td className="px-5 py-3">
                      {session.violations === 0 ? (
                        <span className="text-slate-500 dark:text-slate-400">—</span>
                      ) : (
                        <span
                          className={`inline-flex items-center px-2 py-0.5 rounded-md text-xs font-semibold ${
                            session.violations >= 4
                              ? 'bg-rose-100 text-rose-700 dark:bg-rose-900/40 dark:text-rose-300'
                              : 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300'
                          }`}
                        >
                          {session.violations}
                        </span>
                      )}
                    </td>
                    <td className="px-5 py-3">
                      <StatusBadge status={session.status} />
                    </td>
                    <td className="px-5 py-3 text-right">
                      <button
                        type="button"
                        className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300 hover:bg-blue-200 dark:hover:bg-blue-900/60 transition-colors"
                      >
                        {t('instructor.grading.view')}
                      </button>
                    </td>
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

interface StatBoxProps {
  color: 'blue' | 'emerald' | 'amber' | 'rose';
  value: string | number;
  label: string;
}

const StatBox: React.FC<StatBoxProps> = ({ color, value, label }) => {
  const colorMap: Record<StatBoxProps['color'], string> = {
    blue: 'border-blue-200 dark:border-blue-900/50 bg-blue-50 dark:bg-blue-900/20',
    emerald: 'border-emerald-200 dark:border-emerald-900/50 bg-emerald-50 dark:bg-emerald-900/20',
    amber: 'border-amber-200 dark:border-amber-900/50 bg-amber-50 dark:bg-amber-900/20',
    rose: 'border-rose-200 dark:border-rose-900/50 bg-rose-50 dark:bg-rose-900/20',
  };
  return (
    <div className={`rounded-2xl p-4 border ${colorMap[color]}`}>
      <div className="text-3xl font-bold text-slate-900 dark:text-white">{value}</div>
      <div className="text-sm text-slate-600 dark:text-slate-400 mt-1">{label}</div>
    </div>
  );
};

interface AvatarProps {
  src: string | null;
  name: string;
}

const Avatar: React.FC<AvatarProps> = ({ src, name }) => {
  const initials = name.split(' ').filter(Boolean).map(s => s.charAt(0)).slice(0, 2).join('').toUpperCase();
  if (src) {
    return <img src={src} alt={name} className="w-9 h-9 rounded-full object-cover" />;
  }
  return (
    <div className="w-9 h-9 rounded-full bg-gradient-to-br from-blue-500 to-cyan-500 flex items-center justify-center text-white text-xs font-bold">
      {initials}
    </div>
  );
};

const StatusBadge: React.FC<{ status: GradingSession['status'] }> = ({ status }) => {
  const { t } = useTranslation();
  const map = {
    clean: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300',
    warning: 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300',
    flagged: 'bg-rose-100 text-rose-700 dark:bg-rose-900/40 dark:text-rose-300',
  };
  return (
    <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold ${map[status]}`}>
      {t(`instructor.grading.status.${status}`)}
    </span>
  );
};

export default GradingPage;