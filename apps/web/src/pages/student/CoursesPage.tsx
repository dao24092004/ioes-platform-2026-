import React, { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useQuery } from '@tanstack/react-query';
import StudentLayout from '@/components/layout/StudentLayout';
import { StatCard } from '@/components/common/StatCard';
import PaginationBar from '@/components/common/PaginationBar';
import { studentApi, type StudentEnrolledCourse } from '@/services/api';
import { formatRelative } from '@/utils/time';

type StatusFilter = 'all' | 'in_progress' | 'completed' | 'not_started';
type SortBy = 'recent' | 'progress' | 'title';

// Map thumbnail ảnh thực theo courseId — đồng bộ với studentApi.myCourses()
const thumbnailMap: Record<string, string> = {
  'sc-001': 'https://images.unsplash.com/photo-1633356122544-f134324a6cee?w=800&q=70',
  'sc-002': 'https://images.unsplash.com/photo-1555949963-aa79dcee981c?w=800&q=70',
  'sc-003': 'https://images.unsplash.com/photo-1561070791-2526d30994b8?w=800&q=70',
  'sc-004': 'https://images.unsplash.com/photo-1451187580459-43490279c0fa?w=800&q=70',
  'sc-005': 'https://images.unsplash.com/photo-1518770660439-4636190af475?w=800&q=70',
  'sc-006': 'https://images.unsplash.com/photo-1550751827-4bd374c3f58b?w=800&q=70',
  'sc-007': 'https://images.unsplash.com/photo-1544383835-bda2bc66a55d?w=800&q=70',
  'sc-008': 'https://images.unsplash.com/photo-1547658719-da2b51169166?w=800&q=70',
};

const CoursesPage: React.FC = () => {
  const { t } = useTranslation();
  const [status, setStatus] = useState<StatusFilter>('all');
  const [search, setSearch] = useState('');
  const [sort, setSort] = useState<SortBy>('recent');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(6);

  const { data: courses = [], isLoading } = useQuery({
    queryKey: ['student', 'courses', 'list'],
    queryFn: () => studentApi.myCourses(),
  });

  const filtered = useMemo(() => {
    let arr: StudentEnrolledCourse[] = courses;
    if (status !== 'all') arr = arr.filter((c: StudentEnrolledCourse) => c.status === status);
    if (search.trim()) {
      const q = search.toLowerCase();
      arr = arr.filter(c => c.title.toLowerCase().includes(q) || c.instructor.toLowerCase().includes(q));
    }
    if (sort === 'progress') arr = [...arr].sort((a, b) => b.progress - a.progress);
    else if (sort === 'title') arr = [...arr].sort((a, b) => a.title.localeCompare(b.title));
    else arr = [...arr].sort((a, b) => +new Date(b.last_accessed) - +new Date(a.last_accessed));
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
    return {
      total: courses.length,
      inProgress: courses.filter((c: StudentEnrolledCourse) => c.status === 'in_progress').length,
      completed: courses.filter((c: StudentEnrolledCourse) => c.status === 'completed').length,
      notStarted: courses.filter((c: StudentEnrolledCourse) => c.status === 'not_started').length,
    };
  }, [courses]);

  return (
    <StudentLayout
      title={t('student.courses.title')}
      subtitle={t('student.courses.subtitle')}
      headerActions={
        <Link to="/student/recommendations" className="hidden sm:inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold shadow-sm transition-colors">
          {t('student.courses.browseAll')}
        </Link>
      }
    >
      <section className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <StatCard color="blue" icon={<BookIcon />} value={totals.total} label={t('student.courses.stats.total')} />
        <StatCard color="amber" icon={<BoltIcon />} value={totals.inProgress} label={t('student.courses.stats.inProgress')} />
        <StatCard color="emerald" icon={<CheckIcon />} value={totals.completed} label={t('student.courses.stats.completed')} />
        <StatCard color="purple" icon={<ClockIcon />} value={totals.notStarted} label={t('student.courses.stats.notStarted')} />
      </section>

      <section className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-800 flex flex-wrap gap-3 items-center justify-between">
          <div className="flex flex-wrap gap-2">
            {(['all', 'in_progress', 'completed', 'not_started'] as StatusFilter[]).map(s => (
              <button
                key={s}
                onClick={() => setStatus(s)}
                className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-all ${
                  status === s
                    ? 'bg-blue-600 text-white shadow-sm'
                    : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
                }`}
              >
                {t(`student.courses.filter.${s}`)}
              </button>
            ))}
          </div>
          <div className="flex items-center gap-2">
            <div className="relative">
              <input
                type="search"
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder={t('student.courses.searchPlaceholder')}
                className="pl-9 pr-3 py-2 text-sm rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 focus:outline-none focus:border-blue-500 w-64"
              />
              <svg className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" /></svg>
            </div>
            <select
              value={sort}
              onChange={e => setSort(e.target.value as SortBy)}
              className="px-3 py-2 text-sm rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 focus:outline-none focus:border-blue-500"
            >
              <option value="recent">{t('student.courses.sort.recent')}</option>
              <option value="progress">{t('student.courses.sort.progress')}</option>
              <option value="title">{t('student.courses.sort.title')}</option>
            </select>
          </div>
        </div>

        {isLoading ? (
          <div className="p-12 text-center">
            <div className="inline-block w-8 h-8 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="p-12 text-center text-sm text-slate-500">{t('student.courses.empty')}</div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 p-6">
            {paged.map(course => (
              <CourseCard key={course.id} course={course as StudentEnrolledCourse} />
            ))}
          </div>
        )}

        {!isLoading && filtered.length > 0 && (
          <PaginationBar
            i18nKey="student.courses"
            page={safePage}
            totalPages={totalPages}
            pageSize={pageSize}
            startIdx={startIdx}
            endIdx={endIdx}
            total={filtered.length}
            onPageChange={setPage}
            onPageSizeChange={setPageSize}
            pageSizeOptions={[6, 12, 24, 48]}
          />
        )}
      </section>
    </StudentLayout>
  );
};

const CourseCard: React.FC<{ course: StudentEnrolledCourse }> = ({ course }) => {
  const { t } = useTranslation();
  const actionLabel =
    course.status === 'completed' ? t('student.courses.reviewBtn') :
    course.status === 'not_started' ? t('student.courses.startBtn') :
    t('student.courses.continueBtn');

  return (
    <div className="group bg-white dark:bg-slate-800/40 border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden hover:shadow-lg hover:-translate-y-1 transition-all">
      <div className="relative h-32 bg-slate-100 dark:bg-slate-900 overflow-hidden">
        <img
          src={thumbnailMap[course.id]}
          alt={course.title}
          loading="lazy"
          className="absolute inset-0 w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
        />
        <div className="absolute inset-x-0 bottom-0 h-16 bg-gradient-to-t from-black/55 to-transparent pointer-events-none" />
        <span className="absolute top-3 right-3 px-2 py-1 rounded-md bg-white/25 backdrop-blur text-white text-[10px] font-bold uppercase">
          {course.category}
        </span>
      </div>
      <div className="p-4">
        <h3 className="font-semibold text-sm text-slate-900 dark:text-white line-clamp-2 mb-1">{course.title}</h3>
        <p className="text-xs text-slate-500 dark:text-slate-400 mb-3">{course.instructor}</p>

        {course.status !== 'not_started' && (
          <>
            <div className="flex items-center justify-between text-xs mb-1.5">
              <span className="text-slate-500 dark:text-slate-400">{course.lessons_done}/{course.lessons_total} {t('student.dashboard.lessons')}</span>
              <span className="font-bold text-slate-700 dark:text-slate-300">{course.progress}%</span>
            </div>
            <div className="w-full h-1.5 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden mb-3">
              <div className="h-full bg-gradient-to-r from-blue-500 to-cyan-500" style={{ width: `${course.progress}%` }} />
            </div>
          </>
        )}

        <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400 mb-3">
          <span className="flex items-center gap-1">
            <StarIcon /> {course.rating}
          </span>
          <span>{course.duration_hours}h</span>
        </div>
        <p className="text-[11px] text-slate-400 dark:text-slate-500 mb-3">
          {formatRelative(course.last_accessed)}
        </p>
        <Link
          to={`/student/learn/${course.id}`}
          className="block w-full text-center py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold transition-colors"
        >
          {actionLabel}
        </Link>
      </div>
    </div>
  );
};

const BookIcon = () => (
  <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
  </svg>
);
const BoltIcon = () => (
  <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
  </svg>
);
const CheckIcon = () => (
  <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <polyline points="20 6 9 17 4 12" />
  </svg>
);
const ClockIcon = () => (
  <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <circle cx="12" cy="12" r="10" />
    <polyline points="12 6 12 12 16 14" />
  </svg>
);
const StarIcon = () => (
  <svg className="w-3 h-3 text-amber-500 inline" viewBox="0 0 24 24" fill="currentColor" stroke="none">
    <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
  </svg>
);

export default CoursesPage;
