import React, { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useQuery, keepPreviousData } from '@tanstack/react-query';
import Header from '../../components/public/Header';
import Footer from '../../components/public/Footer';
import { useAuthStore } from '@/app/store/authStore';
import { contentApi, courseStat, formatCoursePrice } from '@/services/api/content.api';

const PAGE_SIZE = 9;

/**
 * Catalogue công khai.
 *
 * Gateway chỉ mở `/api/auth/**` và `/api/public/**` cho khách; route khoá học
 * và danh mục đều đòi token. Vì vậy khách chưa đăng nhập chỉ thấy lời mời
 * đăng nhập thay vì một danh sách bịa.
 */
const Courses: React.FC = () => {
  const { t } = useTranslation();
  const isAuthenticated = useAuthStore(s => s.isAuthenticated && !!s.accessToken);

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900">
      <Header />

      {/* Hero */}
      <section className="pt-32 pb-16 px-6 bg-gradient-to-b from-white to-blue-50 dark:from-slate-900 dark:to-blue-900/20 text-center">
        <div className="max-w-4xl mx-auto">
          <div className="inline-flex items-center gap-2 px-4 py-2 bg-blue-100 dark:bg-blue-900/50 text-blue-700 dark:text-blue-300 rounded-full text-sm font-semibold mb-6">
            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M4 19.5A2.5 2.5 0 016.5 17H20" />
              <path d="M6.5 2H20v20H6.5A2.5 2.5 0 014 19.5v-15A2.5 2.5 0 016.5 2z" />
            </svg>
            {t('courses.explore')}
          </div>
          <h1 className="text-3xl md:text-4xl lg:text-5xl font-extrabold text-slate-900 dark:text-white mb-6 whitespace-nowrap">
            {t('courses.title')} <span className="bg-gradient-to-r from-blue-600 to-cyan-500 bg-clip-text text-transparent">{t('courses.titleHighlight')}</span>
          </h1>
        </div>
      </section>

      {isAuthenticated ? <Catalog /> : <LoginRequired />}

      {/* CTA */}
      <section className="bg-gradient-to-r from-blue-600 to-cyan-500 py-20 px-6 text-center">
        <div className="max-w-2xl mx-auto">
          <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">
            {t('cta.courses.title')}
          </h2>
          <p className="text-lg text-white/90 mb-8">
            {t('cta.courses.subtitle')}
          </p>
          <Link
            to="/auth/register"
            className="inline-flex items-center gap-2 bg-white text-blue-600 px-8 py-4 rounded-xl font-bold text-lg hover:bg-blue-50 transition-colors"
          >
            {t('cta.courses.button')}
            <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M5 12h14M12 5l7 7-7 7" />
            </svg>
          </Link>
        </div>
      </section>

      <Footer />
    </div>
  );
};

const LoginRequired: React.FC = () => {
  const { t } = useTranslation();
  return (
    <section className="py-16 px-6">
      <div className="max-w-md mx-auto text-center bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-8">
        <h2 className="text-xl font-bold text-slate-900 dark:text-white mb-2">{t('courseApi.loginRequired.title')}</h2>
        <p className="text-sm text-slate-500 dark:text-slate-400 mb-6">{t('courseApi.loginRequired.description')}</p>
        <Link
          to="/auth/login"
          className="inline-flex items-center gap-2 px-5 py-3 bg-blue-600 text-white rounded-xl font-semibold hover:bg-blue-700"
        >
          {t('courseApi.loginRequired.action')}
        </Link>
      </div>
    </section>
  );
};

const formatNumber = (num: number): string => {
  if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
  if (num >= 1000) return `${(num / 1000).toFixed(1)}K`;
  return num.toString();
};

const Catalog: React.FC = () => {
  const { t } = useTranslation();
  const [activeCategory, setActiveCategory] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [debounced, setDebounced] = useState('');
  const [page, setPage] = useState(1);

  useEffect(() => {
    const timer = setTimeout(() => setDebounced(searchQuery.trim()), 300);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  useEffect(() => {
    setPage(1);
  }, [debounced, activeCategory]);

  const { data: categories = [] } = useQuery({
    queryKey: ['content', 'categories'],
    queryFn: () => contentApi.listCategories(),
    staleTime: 5 * 60_000,
  });
  const categoryName = useMemo(() => {
    const byId = new Map(categories.map(c => [c.id, c.name]));
    return (id: string | null) => (id ? byId.get(id) : undefined) ?? t('courseApi.uncategorized');
  }, [categories, t]);

  const { data, isLoading, isError } = useQuery({
    queryKey: ['content', 'courses', 'public', { debounced, activeCategory, page }],
    // Backend không tự lọc theo vai trò: phải truyền status=published.
    queryFn: () => contentApi.listCourses({
      status: 'published',
      search: debounced,
      categoryId: activeCategory === 'all' ? undefined : activeCategory,
      page,
      perPage: PAGE_SIZE,
    }),
    placeholderData: keepPreviousData,
  });
  const courses = data?.data ?? [];
  const totalPages = Math.max(1, data?.meta.totalPages ?? 1);

  return (
    <>
      {/* Filters */}
      <div className="px-6 py-6 bg-white dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700">
        <div className="max-w-7xl mx-auto flex flex-wrap gap-4 items-center">
          <div className="flex-1 min-w-[250px] max-w-md">
            <div className="relative">
              <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="11" cy="11" r="8" />
                <path d="M21 21l-4.35-4.35" />
              </svg>
              <input
                type="text"
                placeholder={t('common.search')}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 text-sm border-2 border-slate-200 dark:border-slate-700 rounded-xl bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-white focus:outline-none focus:border-blue-500"
              />
            </div>
          </div>
        </div>
      </div>

      <section className="py-16 px-6">
        <div className="max-w-7xl mx-auto">
          {/* Danh mục thật từ /api/v1/categories */}
          <div className="flex flex-wrap gap-2 mb-12">
            {[{ id: 'all', name: t('courses.all') }, ...categories].map((cat) => (
              <button
                key={cat.id}
                onClick={() => setActiveCategory(cat.id)}
                className={`px-4 py-2 text-sm font-medium rounded-lg border transition-colors ${
                  activeCategory === cat.id
                    ? 'bg-blue-600 border-blue-600 text-white'
                    : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:border-blue-300'
                }`}
              >
                {cat.name}
              </button>
            ))}
          </div>

          {isLoading && (
            <div className="text-center py-12">
              <div className="inline-block w-8 h-8 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
            </div>
          )}
          {isError && <div className="text-center py-12 text-sm text-red-600">{t('common.loadError')}</div>}

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {courses.map((course) => {
              const enrollments = courseStat(course, 'enrollments');
              return (
                <div
                  key={course.id}
                  className="bg-white dark:bg-slate-800 rounded-2xl overflow-hidden border border-slate-200 dark:border-slate-700 hover:shadow-xl hover:-translate-y-1 transition-all duration-300"
                >
                  <div className="h-44 relative overflow-hidden bg-gradient-to-br from-blue-600 to-cyan-500">
                    {course.thumbnailUrl && (
                      <img src={course.thumbnailUrl} alt={course.title} loading="lazy" className="w-full h-full object-cover" />
                    )}
                    {course.difficultyLevel && (
                      <span className="absolute top-3 right-3 px-2 py-1 text-xs font-medium bg-slate-900/80 text-white rounded-md">
                        {t(`courseApi.level.${course.difficultyLevel}`)}
                      </span>
                    )}
                  </div>
                  <div className="p-5">
                    <div className="text-xs font-semibold text-blue-600 dark:text-blue-400 mb-2">
                      {categoryName(course.categoryId)}
                      {course.language && course.language !== 'vi' && (
                        <span className="ml-2 px-1.5 py-0.5 bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 rounded text-[10px] uppercase">{course.language}</span>
                      )}
                    </div>
                    <h3 className="text-base font-semibold text-slate-900 dark:text-white mb-2 line-clamp-2">
                      {course.title}
                    </h3>
                    {course.shortDescription && (
                      <p className="text-sm text-slate-500 dark:text-slate-400 mb-3 line-clamp-2">
                        {course.shortDescription}
                      </p>
                    )}
                    <div className="flex items-center gap-4 text-sm text-slate-500 dark:text-slate-400 mb-4">
                      {enrollments !== null && (
                        <span className="flex items-center gap-1">
                          <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2" />
                            <circle cx="9" cy="7" r="4" />
                          </svg>
                          {formatNumber(enrollments)}
                        </span>
                      )}
                      {course.durationHours ? (
                        <span className="flex items-center gap-1">
                          <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <circle cx="12" cy="12" r="10" />
                            <polyline points="12 6 12 12 16 14" />
                          </svg>
                          {course.durationHours}h
                        </span>
                      ) : null}
                    </div>
                    <div className="flex items-center justify-between pt-4 border-t border-slate-100 dark:border-slate-700">
                      <span className="text-lg font-bold text-slate-900 dark:text-white">
                        {formatCoursePrice(course, t('courses.free'))}
                      </span>
                      <Link
                        to={`/courses/${course.slug}`}
                        className="px-3 py-2 border border-blue-600 text-blue-600 dark:text-blue-400 text-sm font-semibold rounded-lg hover:bg-blue-50 dark:hover:bg-blue-900/30 transition-colors"
                      >
                        {t('courses.viewDetail')}
                      </Link>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {!isLoading && !isError && courses.length === 0 && (
            <div className="text-center py-12">
              <svg className="w-16 h-16 mx-auto text-slate-300 dark:text-slate-600 mb-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                <path d="M4 19.5A2.5 2.5 0 016.5 17H20" />
                <path d="M6.5 2H20v20H6.5A2.5 2.5 0 014 19.5v-15A2.5 2.5 0 016.5 2z" />
              </svg>
              <h3 className="text-lg font-medium text-slate-600 dark:text-slate-400">{t('courseApi.noCourses')}</h3>
            </div>
          )}
        </div>
      </section>

      {/* Phân trang theo `meta` của backend */}
      {data && data.meta.total > 0 && (
        <div className="py-8 px-6 bg-slate-50 dark:bg-slate-900">
          <div className="max-w-7xl mx-auto flex items-center justify-between">
            <span className="text-sm text-slate-500 dark:text-slate-400">
              {courses.length}/{data.meta.total} {t('courses.coursesOf')}
            </span>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setPage(p => Math.max(1, p - 1))}
                disabled={page <= 1}
                className="p-2 rounded-lg border border-slate-300 dark:border-slate-600 text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-50"
              >
                <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M15 18l-6-6 6-6" />
                </svg>
              </button>
              {Array.from({ length: totalPages }, (_, i) => i + 1).map(n => (
                <button
                  key={n}
                  onClick={() => setPage(n)}
                  className={`w-10 h-10 rounded-lg font-medium ${
                    n === page
                      ? 'bg-blue-600 text-white'
                      : 'border border-slate-300 dark:border-slate-600 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
                  }`}
                >
                  {n}
                </button>
              ))}
              <button
                onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                disabled={page >= totalPages}
                className="p-2 rounded-lg border border-slate-300 dark:border-slate-600 text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-50"
              >
                <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M9 18l6-6-6-6" />
                </svg>
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default Courses;
