import React, { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useQuery } from '@tanstack/react-query';
import InstructorLayout from '@/components/layout/InstructorLayout';
import PaginationBar from '@/components/common/PaginationBar';
import { instructorApi, type InstructorCourseRow } from '@/services/api';
import { formatRelative } from '@/utils/time';

type StatusFilter = 'all' | 'draft' | 'published' | 'archived';
type SortBy = 'recent' | 'enrollments' | 'title';

const statusStyles: Record<string, { bg: string; text: string; dot: string }> = {
  draft: { bg: 'bg-slate-100 dark:bg-slate-800', text: 'text-slate-600 dark:text-slate-400', dot: 'bg-slate-400' },
  published: { bg: 'bg-emerald-50 dark:bg-emerald-900/30', text: 'text-emerald-600 dark:text-emerald-400', dot: 'bg-emerald-500' },
  archived: { bg: 'bg-amber-50 dark:bg-amber-900/30', text: 'text-amber-600 dark:text-amber-400', dot: 'bg-amber-500' },
};

const CoursesPage: React.FC = () => {
  const { t } = useTranslation();
  const [status, setStatus] = useState<StatusFilter>('all');
  const [search, setSearch] = useState('');
  const [sort, setSort] = useState<SortBy>('recent');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  const { data: courses = [], isLoading } = useQuery({
    queryKey: ['instructor', 'courses', 'list'],
    queryFn: () => instructorApi.myCourses(),
  });

  const filtered = useMemo(() => {
    let arr = courses;
    if (status !== 'all') arr = arr.filter((c: InstructorCourseRow) => c.status === status);
    if (search.trim()) {
      const q = search.toLowerCase();
      arr = arr.filter((c: InstructorCourseRow) => c.title.toLowerCase().includes(q) || c.category.toLowerCase().includes(q));
    }
    if (sort === 'enrollments') arr = [...arr].sort((a, b) => b.enrollments - a.enrollments);
    else if (sort === 'title') arr = [...arr].sort((a, b) => a.title.localeCompare(b.title));
    else arr = [...arr].sort((a, b) => +new Date(b.updated_at) - +new Date(a.updated_at));
    return arr;
  }, [courses, status, search, sort]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const safePage = Math.min(page, totalPages);
  const startIdx = (safePage - 1) * pageSize;
  const endIdx = Math.min(startIdx + pageSize, filtered.length);
  const paged = filtered.slice(startIdx, endIdx);

  React.useEffect(() => {
    setPage(1);
  }, [status, search, sort, pageSize]);

  const totals = useMemo(() => {
    const total = courses.length;
    const published = courses.filter((c: InstructorCourseRow) => c.status === 'published').length;
    const drafts = courses.filter((c: InstructorCourseRow) => c.status === 'draft').length;
    const students = courses.reduce((acc: number, c: InstructorCourseRow) => acc + c.enrollments, 0);
    return { total, published, drafts, students };
  }, [courses]);

  return (
    <InstructorLayout
      title={t('instructor.courses.title')}
      subtitle={t('instructor.courses.subtitle')}
      headerActions={
        <Link
          to="/instructor/courses/create"
          className="hidden sm:inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold shadow-sm transition-colors"
        >
          <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <line x1="12" y1="5" x2="12" y2="19" />
            <line x1="5" y1="12" x2="19" y2="12" />
          </svg>
          {t('instructor.courses.createNew')}
        </Link>
      }
    >
      <section className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <StatCard color="blue" label={t('instructor.courses.stats.total')} value={totals.total} icon={<BookSvg />} />
        <StatCard color="emerald" label={t('instructor.courses.stats.published')} value={totals.published} icon={<CheckSvg />} />
        <StatCard color="amber" label={t('instructor.courses.stats.drafts')} value={totals.drafts} icon={<PencilSvg />} />
        <StatCard color="cyan" label={t('instructor.courses.stats.students')} value={totals.students.toLocaleString('en-US')} icon={<UsersSvg />} />
      </section>

      <section className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-800 flex flex-wrap gap-3 items-center justify-between">
          <div className="flex flex-wrap gap-2">
            {(['all', 'published', 'draft', 'archived'] as StatusFilter[]).map((s) => (
              <button
                key={s}
                onClick={() => setStatus(s)}
                className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-all ${
                  status === s
                    ? 'bg-blue-600 text-white shadow-sm'
                    : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
                }`}
              >
                {t(`instructor.courses.filter.${s}`)}
              </button>
            ))}
          </div>
          <div className="flex items-center gap-2">
            <div className="relative">
              <input
                type="search"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder={t('instructor.courses.searchPlaceholder')}
                className="pl-9 pr-3 py-2 text-sm rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 focus:outline-none focus:border-blue-500 w-64"
              />
              <svg className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="11" cy="11" r="8" />
                <line x1="21" y1="21" x2="16.65" y2="16.65" />
              </svg>
            </div>
            <select
              value={sort}
              onChange={(e) => setSort(e.target.value as SortBy)}
              className="px-3 py-2 text-sm rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 focus:outline-none focus:border-blue-500"
            >
              <option value="recent">{t('instructor.courses.sort.recent')}</option>
              <option value="enrollments">{t('instructor.courses.sort.enrollments')}</option>
              <option value="title">{t('instructor.courses.sort.title')}</option>
            </select>
          </div>
        </div>

        {isLoading ? (
          <div className="p-12 text-center">
            <div className="inline-block w-8 h-8 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="p-12 text-center">
            <div className="w-14 h-14 mx-auto mb-3 rounded-xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-400">
              <BookSvg />
            </div>
            <p className="text-sm text-slate-500">{t('instructor.courses.empty')}</p>
            <Link
              to="/instructor/courses/create"
              className="inline-flex items-center gap-2 mt-4 px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold transition-colors"
            >
              {t('instructor.courses.createNew')}
            </Link>
          </div>
        ) : (
          <div className="divide-y divide-slate-100 dark:divide-slate-800">
            {paged.map((c: InstructorCourseRow) => {
              const ss = statusStyles[c.status] ?? statusStyles.draft;
              return (
                <div key={c.id} className="px-6 py-4 flex items-center gap-4 hover:bg-slate-50 dark:hover:bg-slate-800/30 transition-colors">
                  <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-blue-500 to-cyan-500 flex items-center justify-center text-white flex-shrink-0">
                    <BookSvg />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="text-sm font-semibold truncate">{c.title}</h3>
                      <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold uppercase ${ss.bg} ${ss.text}`}>
                        <span className={`w-1.5 h-1.5 rounded-full ${ss.dot}`} />
                        {t(`instructor.courses.status.${c.status}`)}
                      </span>
                    </div>
                    <div className="flex items-center gap-3 text-xs text-slate-500 dark:text-slate-400">
                      <span className="inline-flex items-center gap-1">
                        <TagSvg /> {c.category}
                      </span>
                      <span>•</span>
                      <span>{c.lessons_count} {t('instructor.courses.lessons')}</span>
                      <span>•</span>
                      <span>{c.enrollments.toLocaleString('en-US')} {t('instructor.courses.studentsUnit')}</span>
                      <span>•</span>
                      <span>{t('instructor.courses.updated')} {formatRelative(c.updated_at)}</span>
                    </div>
                    {c.status === 'published' && c.progress > 0 && (
                      <div className="mt-2 flex items-center gap-2">
                        <div className="flex-1 max-w-xs h-1.5 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                          <div className="h-full bg-gradient-to-r from-blue-500 to-cyan-500 transition-all" style={{ width: `${c.progress}%` }} />
                        </div>
                        <span className="text-xs font-semibold text-slate-600 dark:text-slate-400">{c.progress}%</span>
                      </div>
                    )}
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <Link
                      to={`/instructor/courses/${c.id}/edit`}
                      className="px-3 py-1.5 text-xs font-semibold rounded-lg border border-slate-200 dark:border-slate-700 hover:border-blue-500 hover:text-blue-600 transition-colors"
                    >
                      {t('instructor.courses.edit')}
                    </Link>
                    <Link
                      to={`/instructor/courses/${c.id}/edit`}
                      className="p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500 transition-colors"
                      title={t('instructor.courses.viewStats')}
                    >
                      <ChartSvg />
                    </Link>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {!isLoading && filtered.length > 0 && (
          <PaginationBar
            i18nKey="instructor.courses"
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

interface StatCardProps {
  color: 'blue' | 'emerald' | 'amber' | 'cyan';
  label: string;
  value: string | number;
  icon: React.ReactNode;
}

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

const BookSvg = () => (
  <svg className="w-6 h-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253" />
  </svg>
);
const CheckSvg = () => (
  <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <polyline points="20 6 9 17 4 12" />
  </svg>
);
const PencilSvg = () => (
  <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M12 20h9M16.5 3.5a2.121 2.121 0 113 3L7 19l-4 1 1-4 12.5-12.5z" />
  </svg>
);
const UsersSvg = () => (
  <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2" />
    <circle cx="9" cy="7" r="4" />
  </svg>
);
const TagSvg = () => (
  <svg className="w-3 h-3 inline" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M20.59 13.41l-7.17 7.17a2 2 0 01-2.83 0L2 12V2h10l8.59 8.59a2 2 0 010 2.82z" />
    <line x1="7" y1="7" x2="7.01" y2="7" />
  </svg>
);
const ChartSvg = () => (
  <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M3 3v18h18M9 17V9m4 8V5m4 12v-6" />
  </svg>
);

export default CoursesPage;
