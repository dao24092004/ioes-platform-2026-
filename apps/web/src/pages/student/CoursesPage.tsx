import React, { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useQuery, keepPreviousData } from '@tanstack/react-query';
import StudentLayout from '@/components/layout/StudentLayout';
import PaginationBar from '@/components/common/PaginationBar';
import ProgressBar from '@/components/common/ProgressBar';
import { contentApi, courseStat, type Course, type MyEnrollment } from '@/services/api/content.api';

/**
 * Khoá học của tôi (đã ghi danh, kèm tiến độ) ở trên, catalogue khoá đã xuất
 * bản ở dưới. Khoá đã ghi danh được gắn nhãn trong catalogue.
 */
const CoursesPage: React.FC = () => {
  const { t } = useTranslation();
  const [search, setSearch] = useState('');
  const [debounced, setDebounced] = useState('');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(6);

  React.useEffect(() => {
    const timer = setTimeout(() => setDebounced(search.trim()), 300);
    return () => clearTimeout(timer);
  }, [search]);

  React.useEffect(() => {
    setPage(1);
  }, [debounced, pageSize]);

  const { data, isLoading, isError } = useQuery({
    queryKey: ['content', 'courses', 'catalog', { debounced, page, pageSize }],
    // Backend không tự lọc theo vai trò: phải truyền status=published để học viên không thấy bản nháp.
    queryFn: () => contentApi.listCourses({ status: 'published', search: debounced, page, perPage: pageSize }),
    placeholderData: keepPreviousData,
  });
  const courses = data?.data ?? [];
  const total = data?.meta.total ?? 0;
  const totalPages = Math.max(1, data?.meta.totalPages ?? 1);
  const startIdx = (page - 1) * pageSize;
  const endIdx = startIdx + courses.length;

  const { data: categories = [] } = useQuery({
    queryKey: ['content', 'categories'],
    queryFn: () => contentApi.listCategories(),
    staleTime: 5 * 60_000,
  });
  const { data: myEnrollments = [], isLoading: myLoading } = useQuery({
    queryKey: ['content', 'enrollments', 'me'],
    queryFn: () => contentApi.listMyEnrollments(),
  });
  const enrolledIds = useMemo(() => new Set(myEnrollments.map(e => e.course.id)), [myEnrollments]);

  const categoryName = useMemo(() => {
    const byId = new Map(categories.map(c => [c.id, c.name]));
    return (id: string | null) => (id ? byId.get(id) : undefined) ?? t('courseApi.uncategorized');
  }, [categories, t]);

  return (
    <StudentLayout
      title={t('student.courses.title')}
      subtitle={t('student.courses.browseAll')}
      headerActions={
        <Link to="/student/search" className="hidden sm:inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold shadow-sm transition-colors">
          {t('student.search.title')}
        </Link>
      }
    >
      <MyCoursesSection enrollments={myEnrollments} loading={myLoading} />

      <section className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-800 flex flex-wrap gap-3 items-center justify-between">
          <div>
            <h2 className="text-base font-bold text-slate-900 dark:text-white">{t('enrollmentApi.catalog')}</h2>
            <div className="text-sm text-slate-500 dark:text-slate-400">
              {data ? `${total} ${t('courses.coursesOf')}` : ''}
            </div>
          </div>
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
        </div>

        {isLoading ? (
          <div className="p-12 text-center">
            <div className="inline-block w-8 h-8 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : isError ? (
          <div className="p-12 text-center text-sm text-red-600">{t('common.loadError')}</div>
        ) : courses.length === 0 ? (
          <div className="p-12 text-center text-sm text-slate-500">{t('courseApi.noCourses')}</div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 p-6">
            {courses.map(course => (
              <CourseCard
                key={course.id}
                course={course}
                category={categoryName(course.categoryId)}
                enrolled={enrolledIds.has(course.id)}
              />
            ))}
          </div>
        )}

        {!isLoading && !isError && courses.length > 0 && (
          <PaginationBar
            i18nKey="student.courses"
            page={page}
            totalPages={totalPages}
            pageSize={pageSize}
            startIdx={startIdx}
            endIdx={endIdx}
            total={total}
            onPageChange={setPage}
            onPageSizeChange={setPageSize}
            pageSizeOptions={[6, 12, 24, 48]}
          />
        )}
      </section>
    </StudentLayout>
  );
};

const CourseCard: React.FC<{ course: Course; category: string; enrolled: boolean }> = ({ course, category, enrolled }) => {
  const { t } = useTranslation();
  const enrollments = courseStat(course, 'enrollments');

  return (
    <div className="group bg-white dark:bg-slate-800/40 border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden hover:shadow-lg hover:-translate-y-1 transition-all">
      <div className="relative h-32 bg-gradient-to-br from-blue-500 to-cyan-500 overflow-hidden">
        {course.thumbnailUrl ? (
          <img
            src={course.thumbnailUrl}
            alt={course.title}
            loading="lazy"
            className="absolute inset-0 w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
          />
        ) : (
          <div className="absolute inset-0 flex items-center justify-center text-white/80">
            <BookIcon />
          </div>
        )}
        <div className="absolute inset-x-0 bottom-0 h-16 bg-gradient-to-t from-black/55 to-transparent pointer-events-none" />
        <span className="absolute top-3 right-3 px-2 py-1 rounded-md bg-white/25 backdrop-blur text-white text-[10px] font-bold uppercase">
          {category}
        </span>
        {enrolled && (
          <span className="absolute top-3 left-3 px-2 py-1 rounded-md bg-emerald-500 text-white text-[10px] font-bold uppercase">
            {t('enrollmentApi.enrolled')}
          </span>
        )}
      </div>
      <div className="p-4">
        <h3 className="font-semibold text-sm text-slate-900 dark:text-white line-clamp-2 mb-1">{course.title}</h3>
        {course.shortDescription && (
          <p className="text-xs text-slate-500 dark:text-slate-400 mb-3 line-clamp-2">{course.shortDescription}</p>
        )}

        <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400 mb-3">
          {course.difficultyLevel ? <span>{t(`courseApi.level.${course.difficultyLevel}`)}</span> : <span />}
          <span className="flex items-center gap-3">
            {enrollments !== null && <span>{enrollments.toLocaleString('en-US')} {t('student.courseDetail.students')}</span>}
            {course.durationHours ? <span>{course.durationHours}h</span> : null}
          </span>
        </div>
        <Link
          to={`/student/courses/${course.id}`}
          className="block w-full text-center py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold transition-colors"
        >
          {t('courses.viewDetail')}
        </Link>
      </div>
    </div>
  );
};

/** Các khoá đã ghi danh; chưa có thì chỉ một dòng để không lấn chỗ catalogue. */
const MyCoursesSection: React.FC<{ enrollments: MyEnrollment[]; loading: boolean }> = ({ enrollments, loading }) => {
  const { t } = useTranslation();
  return (
    <section className="mb-6 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-6">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-base font-bold text-slate-900 dark:text-white">{t('enrollmentApi.myCourses')}</h2>
        {enrollments.length > 0 && (
          <Link to="/student/enrollment" className="text-sm font-medium text-blue-600 dark:text-blue-400 hover:underline">
            {t('student.dashboard.viewAll')}
          </Link>
        )}
      </div>
      {loading ? (
        <div className="py-4 text-center">
          <div className="inline-block w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : enrollments.length === 0 ? (
        <p className="text-sm text-slate-500 dark:text-slate-400">{t('enrollmentApi.noEnrollments')}</p>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {enrollments.slice(0, 6).map(({ enrollment, course }) => (
            <Link
              key={enrollment.id}
              to={`/student/learn/${course.id}`}
              className="flex gap-3 p-3 rounded-xl border border-slate-200 dark:border-slate-800 hover:border-blue-400 hover:shadow-sm transition-all"
            >
              <div className="w-20 h-14 rounded-lg bg-gradient-to-br from-blue-500 to-cyan-500 overflow-hidden flex-shrink-0">
                {course.thumbnailUrl && (
                  <img src={course.thumbnailUrl} alt={course.title} className="w-full h-full object-cover" />
                )}
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-sm font-semibold text-slate-900 dark:text-white line-clamp-1">{course.title}</div>
                <div className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 mb-2">
                  {t(`enrollmentApi.status.${enrollment.status}`)} · {enrollment.progressPercent}%
                </div>
                <ProgressBar value={enrollment.progressPercent} />
              </div>
            </Link>
          ))}
        </div>
      )}
    </section>
  );
};

const BookIcon = () => (
  <svg className="w-10 h-10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
  </svg>
);

export default CoursesPage;
