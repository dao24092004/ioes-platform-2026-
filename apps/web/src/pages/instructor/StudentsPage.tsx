import React, { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useQuery } from '@tanstack/react-query';
import InstructorLayout from '@/components/layout/InstructorLayout';
import PaginationBar from '@/components/common/PaginationBar';
import { instructorApi } from '@/services/api';
import { formatRelative } from '@/utils/time';

interface StudentRow {
  id: string;
  full_name: string;
  email: string;
  avatar: string | null;
  courses_enrolled: number;
  lessons_completed: number;
  avg_score: number;
  last_active: string;
  status: 'active' | 'at_risk' | 'inactive';
}

const StudentsPage: React.FC = () => {
  const { t } = useTranslation();
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | StudentRow['status']>('all');
  const [sort, setSort] = useState<'recent' | 'score' | 'name'>('recent');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  const { data: students = [], isLoading } = useQuery({
    queryKey: ['instructor', 'students', 'list'],
    queryFn: () => instructorApi.students(),
  });

  const filtered = useMemo(() => {
    let arr = students;
    if (statusFilter !== 'all') arr = arr.filter((s: StudentRow) => s.status === statusFilter);
    if (search.trim()) {
      const q = search.toLowerCase();
      arr = arr.filter((s: StudentRow) => s.full_name.toLowerCase().includes(q) || s.email.toLowerCase().includes(q));
    }
    if (sort === 'score') arr = [...arr].sort((a, b) => b.avg_score - a.avg_score);
    else if (sort === 'name') arr = [...arr].sort((a, b) => a.full_name.localeCompare(b.full_name));
    else arr = [...arr].sort((a, b) => +new Date(b.last_active) - +new Date(a.last_active));
    return arr;
  }, [students, statusFilter, search, sort]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const safePage = Math.min(page, totalPages);
  const startIdx = (safePage - 1) * pageSize;
  const endIdx = Math.min(startIdx + pageSize, filtered.length);
  const paged = filtered.slice(startIdx, endIdx);

  React.useEffect(() => {
    setPage(1);
  }, [statusFilter, search, sort, pageSize]);

  const totals = useMemo(() => {
    const total = students.length;
    const active = students.filter((s: StudentRow) => s.status === 'active').length;
    const atRisk = students.filter((s: StudentRow) => s.status === 'at_risk').length;
    const avg = total > 0 ? Math.round(students.reduce((a: number, s: StudentRow) => a + s.avg_score, 0) / total) : 0;
    return { total, active, atRisk, avg };
  }, [students]);

  return (
    <InstructorLayout
      title={t('instructor.students.title')}
      subtitle={t('instructor.students.subtitle')}
      headerActions={
        <button className="hidden sm:inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold shadow-sm transition-colors">
          <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
          </svg>
          {t('instructor.students.export')}
        </button>
      }
    >
      <section className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <StatCard color="blue" label={t('instructor.students.stats.total')} value={totals.total} icon={<UsersSvg />} />
        <StatCard color="emerald" label={t('instructor.students.stats.active')} value={totals.active} icon={<BoltSvg />} />
        <StatCard color="amber" label={t('instructor.students.stats.atRisk')} value={totals.atRisk} icon={<AlertSvg />} />
        <StatCard color="cyan" label={t('instructor.students.stats.avgScore')} value={totals.avg} icon={<TrophySvg />} />
      </section>

      <section className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-800 flex flex-wrap gap-3 items-center justify-between">
          <div className="flex flex-wrap gap-2">
            {(['all', 'active', 'at_risk', 'inactive'] as const).map((s) => (
              <button
                key={s}
                onClick={() => setStatusFilter(s)}
                className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-all ${
                  statusFilter === s
                    ? 'bg-blue-600 text-white shadow-sm'
                    : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
                }`}
              >
                {t(`instructor.students.filter.${s}`)}
              </button>
            ))}
          </div>
          <div className="flex items-center gap-2">
            <div className="relative">
              <input
                type="search"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder={t('instructor.students.searchPlaceholder')}
                className="pl-9 pr-3 py-2 text-sm rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 focus:outline-none focus:border-blue-500 w-64"
              />
              <svg className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="11" cy="11" r="8" />
                <line x1="21" y1="21" x2="16.65" y2="16.65" />
              </svg>
            </div>
            <select
              value={sort}
              onChange={(e) => setSort(e.target.value as 'recent' | 'score' | 'name')}
              className="px-3 py-2 text-sm rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 focus:outline-none focus:border-blue-500"
            >
              <option value="recent">{t('instructor.students.sort.recent')}</option>
              <option value="score">{t('instructor.students.sort.score')}</option>
              <option value="name">{t('instructor.students.sort.name')}</option>
            </select>
          </div>
        </div>

        {isLoading ? (
          <div className="p-12 text-center">
            <div className="inline-block w-8 h-8 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="p-12 text-center text-sm text-slate-500">{t('instructor.students.empty')}</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-slate-50 dark:bg-slate-800/50 text-xs uppercase tracking-wider text-slate-500">
                  <th className="text-left px-6 py-3 font-semibold">{t('instructor.students.table.student')}</th>
                  <th className="text-center px-6 py-3 font-semibold">{t('instructor.students.table.courses')}</th>
                  <th className="text-center px-6 py-3 font-semibold">{t('instructor.students.table.lessons')}</th>
                  <th className="text-center px-6 py-3 font-semibold">{t('instructor.students.table.avgScore')}</th>
                  <th className="text-left px-6 py-3 font-semibold">{t('instructor.students.table.lastActive')}</th>
                  <th className="text-left px-6 py-3 font-semibold">{t('instructor.students.table.status')}</th>
                </tr>
              </thead>
              <tbody>
                {paged.map((s: StudentRow) => {
                  const initials = s.full_name.split(' ').filter(Boolean).map((p: string) => p.charAt(0)).slice(0, 2).join('').toUpperCase();
                  return (
                    <tr key={s.id} className="border-t border-slate-100 dark:border-slate-800 hover:bg-blue-50/50 dark:hover:bg-blue-900/10 transition-colors">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          {s.avatar ? (
                            <img src={s.avatar} alt={s.full_name} className="w-9 h-9 rounded-full object-cover" />
                          ) : (
                            <div className="w-9 h-9 rounded-full bg-gradient-to-br from-blue-500 to-cyan-500 text-white flex items-center justify-center font-semibold text-xs">
                              {initials}
                            </div>
                          )}
                          <div className="min-w-0">
                            <div className="font-semibold text-sm">{s.full_name}</div>
                            <div className="text-xs text-slate-500 truncate">{s.email}</div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-center text-sm font-semibold">{s.courses_enrolled}</td>
                      <td className="px-6 py-4 text-center">
                        <div className="flex items-center justify-center gap-2">
                          <span className="text-sm font-semibold">{s.lessons_completed}</span>
                          <div className="w-16 h-1.5 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                            <div className="h-full bg-blue-500" style={{ width: `${Math.min(100, s.lessons_completed * 4)}%` }} />
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-center">
                        <span className={`inline-flex items-center px-2 py-0.5 rounded-md text-xs font-bold ${
                          s.avg_score >= 80 ? 'bg-emerald-50 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400'
                          : s.avg_score >= 60 ? 'bg-amber-50 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400'
                          : 'bg-red-50 dark:bg-red-900/30 text-red-600 dark:text-red-400'
                        }`}>
                          {s.avg_score}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-sm text-slate-500">{formatRelative(s.last_active)}</td>
                      <td className="px-6 py-4">
                        <StatusBadge status={s.status} />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {!isLoading && filtered.length > 0 && (
          <PaginationBar
            i18nKey="instructor.students"
            page={safePage}
            totalPages={totalPages}
            pageSize={pageSize}
            startIdx={startIdx}
            endIdx={endIdx}
            total={filtered.length}
            onPageChange={setPage}
            onPageSizeChange={setPageSize}
          />
        )}
      </section>
    </InstructorLayout>
  );
};

const StatusBadge: React.FC<{ status: StudentRow['status'] }> = ({ status }) => {
  const { t } = useTranslation();
  const map: Record<StudentRow['status'], { cls: string; label: string }> = {
    active: { cls: 'bg-emerald-50 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400', label: t('instructor.students.status.active') },
    at_risk: { cls: 'bg-amber-50 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400', label: t('instructor.students.status.at_risk') },
    inactive: { cls: 'bg-slate-100 dark:bg-slate-800 text-slate-500', label: t('instructor.students.status.inactive') },
  };
  const s = map[status];
  return <span className={`inline-flex items-center px-2 py-1 rounded-md text-xs font-semibold ${s.cls}`}>{s.label}</span>;
};

interface StatCardProps { color: 'blue' | 'emerald' | 'amber' | 'cyan'; label: string; value: string | number; icon: React.ReactNode; }

const colorMap: Record<StatCardProps['color'], string> = {
  blue: 'bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400',
  emerald: 'bg-emerald-50 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400',
  amber: 'bg-amber-50 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400',
  cyan: 'bg-cyan-50 dark:bg-cyan-900/30 text-cyan-600 dark:text-cyan-400',
};

const StatCard: React.FC<StatCardProps> = ({ color, label, value, icon }) => (
  <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-5 hover:-translate-y-1 transition-all hover:shadow-lg hover:shadow-blue-500/5">
    <div className={`w-11 h-11 rounded-xl flex items-center justify-center mb-3 ${colorMap[color]}`}>{icon}</div>
    <div className="text-2xl font-bold tabular-nums mb-1">{value}</div>
    <div className="text-xs text-slate-500 dark:text-slate-400">{label}</div>
  </div>
);

const UsersSvg = () => (
  <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2" /><circle cx="9" cy="7" r="4" />
  </svg>
);
const BoltSvg = () => (
  <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
  </svg>
);
const AlertSvg = () => (
  <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" /><line x1="12" y1="9" x2="12" y2="13" /><line x1="12" y1="17" x2="12.01" y2="17" />
  </svg>
);
const TrophySvg = () => (
  <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M8 21h8M12 17v4M17 4H7l1 7a5 5 0 0010 0l-1-7zM3 4h4v3a3 3 0 01-3 3V4zM21 4h-4v3a3 3 0 003-3V4z" />
  </svg>
);

export default StudentsPage;
