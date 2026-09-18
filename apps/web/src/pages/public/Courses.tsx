import React, { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useQuery, keepPreviousData } from '@tanstack/react-query';
import Header from '../../components/public/Header';
import Footer from '../../components/public/Footer';
import AnimatedSection from '@/components/common/AnimatedSection';
import { useAuthStore } from '@/app/store/authStore';
import { contentApi, courseStat, formatCoursePrice } from '@/services/api/content.api';

const PAGE_SIZE = 9;

const FloatingParticles = () => (
  <div className="absolute inset-0 overflow-hidden pointer-events-none">
    {[...Array(20)].map((_, i) => (
      <div
        key={i}
        className="absolute w-2 h-2 bg-blue-400/30 rounded-full animate-float"
        style={{
          left: `${Math.random() * 100}%`,
          top: `${Math.random() * 100}%`,
          animationDelay: `${Math.random() * 5}s`,
          animationDuration: `${3 + Math.random() * 4}s`,
        }}
      />
    ))}
  </div>
);

const Courses: React.FC = () => {
  const { t } = useTranslation();
  const isAuthenticated = useAuthStore(s => s.isAuthenticated && !!s.accessToken);

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900">
      <Header />

      {/* Hero */}
      <section className="relative pt-32 pb-24 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-b from-blue-50 via-white to-slate-50 dark:from-slate-800 dark:via-slate-900 dark:to-slate-800" />
        <FloatingParticles />
        
        {/* Gradient orbs */}
        <div className="absolute top-20 left-1/4 w-72 h-72 bg-blue-400/20 rounded-full blur-3xl animate-pulse" />
        <div className="absolute top-40 right-1/4 w-96 h-96 bg-cyan-400/20 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1s' }} />
        
        <div className="relative max-w-4xl mx-auto px-6 text-center z-10">
          <AnimatedSection delay={100}>
            <span className="inline-flex items-center gap-2 px-5 py-2.5 bg-blue-100 dark:bg-blue-900/50 text-blue-700 dark:text-blue-400 rounded-full text-sm font-medium mb-6 shadow-lg shadow-blue-500/10">
              <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M4 19.5A2.5 2.5 0 016.5 17H20" />
                <path d="M6.5 2H20v20H6.5A2.5 2.5 0 014 19.5v-15A2.5 2.5 0 016.5 2z" />
              </svg>
              {t('courses.explore')}
            </span>
          </AnimatedSection>
          
          <AnimatedSection delay={200}>
            <h1 className="text-4xl md:text-5xl lg:text-6xl font-extrabold mb-6 leading-tight">
              <span className="bg-gradient-to-r from-blue-600 via-cyan-500 to-purple-600 bg-clip-text text-transparent">
                {t('courses.title')}
              </span>
              <br />
              <span className="text-slate-800 dark:text-white">{t('courses.titleHighlight')}</span>
            </h1>
          </AnimatedSection>
          
          <AnimatedSection delay={300}>
            <p className="text-lg md:text-xl text-slate-600 dark:text-slate-300 max-w-2xl mx-auto leading-relaxed">
              {t('courses.subtitle') || 'Khám phá hàng trăm khóa học chất lượng cao từ các chuyên gia hàng đầu'}
            </p>
          </AnimatedSection>
        </div>
        
        {/* Wave separator */}
        <div className="absolute -bottom-1 left-0 right-0 h-24">
          <svg viewBox="0 0 1440 120" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full h-full">
            <path d="M0 120L60 105C120 90 240 60 360 45C480 30 600 30 720 37.5C840 45 960 60 1080 67.5C1200 75 1320 75 1380 75L1440 75V120H1380C1320 120 1200 120 1080 120C960 120 840 120 720 120C600 120 480 120 360 120C240 120 120 120 60 120H0Z" className="fill-white dark:fill-slate-900"/>
          </svg>
        </div>
      </section>

      {isAuthenticated ? <Catalog /> : <LoginRequired />}

      {/* CTA */}
      <section className="relative bg-gradient-to-r from-blue-600 to-cyan-500 py-20 px-6 overflow-hidden">
        <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA2MCA2MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxnIGZpbGw9IndoaXRlIiBmaWxsLW9wYWNpdHk9Ii4wNSI+PGNpcmNsZSBjeD0iMzAiIGN5PSIzMCIgcj0iMiIvPjwvZz48L2c+PC9zdmc+')] opacity-50" />
        <div className="relative max-w-2xl mx-auto text-center">
          <AnimatedSection delay={100}>
            <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">
              {t('cta.courses.title')}
            </h2>
          </AnimatedSection>
          <AnimatedSection delay={200}>
            <p className="text-lg text-white/90 mb-8">
              {t('cta.courses.subtitle')}
            </p>
          </AnimatedSection>
          <AnimatedSection delay={300}>
            <Link
              to="/auth/register"
              className="inline-flex items-center gap-2 bg-white text-blue-600 px-8 py-4 rounded-xl font-bold text-lg hover:bg-blue-50 transition-all hover:scale-105 hover:shadow-xl shadow-lg"
            >
              {t('cta.courses.button')}
              <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M5 12h14M12 5l7 7-7 7" />
              </svg>
            </Link>
          </AnimatedSection>
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
      <div className="max-w-md mx-auto text-center bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-8 shadow-xl">
        <div className="w-20 h-20 mx-auto mb-6 bg-blue-100 dark:bg-blue-900/40 rounded-full flex items-center justify-center">
          <svg className="w-10 h-10 text-blue-600 dark:text-blue-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2" />
            <circle cx="12" cy="7" r="4" />
          </svg>
        </div>
        <h2 className="text-xl font-bold text-slate-900 dark:text-white mb-2">{t('courseApi.loginRequired.title')}</h2>
        <p className="text-sm text-slate-500 dark:text-slate-400 mb-6">{t('courseApi.loginRequired.description')}</p>
        <Link
          to="/auth/login"
          className="inline-flex items-center gap-2 px-5 py-3 bg-blue-600 text-white rounded-xl font-semibold hover:bg-blue-700 transition-all hover:shadow-lg shadow-blue-500/30"
        >
          {t('courseApi.loginRequired.action')}
          <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M5 12h14M12 5l7 7-7 7" />
          </svg>
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
      <div className="sticky top-16 z-30 bg-white/80 dark:bg-slate-800/80 backdrop-blur-lg border-b border-slate-200 dark:border-slate-700 py-4 px-6 shadow-sm">
        <div className="max-w-7xl mx-auto flex flex-wrap gap-4 items-center">
          <div className="flex-1 min-w-[250px] max-w-md">
            <div className="relative group">
              <svg className="absolute left-3.5 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400 group-focus-within:text-blue-500 transition-colors" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="11" cy="11" r="8" />
                <path d="M21 21l-4.35-4.35" />
              </svg>
              <input
                type="text"
                placeholder={t('common.search')}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-11 pr-4 py-3 text-sm border-2 border-slate-200 dark:border-slate-700 rounded-xl bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-white focus:outline-none focus:border-blue-500 focus:bg-white dark:focus:bg-slate-800 transition-all"
              />
            </div>
          </div>
          
          <div className="flex flex-wrap gap-2">
            <select
              value={activeCategory}
              onChange={(e) => setActiveCategory(e.target.value)}
              className="px-4 py-2.5 text-sm border-2 border-slate-200 dark:border-slate-700 rounded-xl bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 focus:outline-none focus:border-blue-500 cursor-pointer"
            >
              <option value="all">{t('courses.all')}</option>
              {categories.map(cat => (
                <option key={cat.id} value={cat.id}>{cat.name}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      <section className="py-12 px-6">
        <div className="max-w-7xl mx-auto">
          {/* Category pills */}
          <div className="flex flex-wrap gap-2 mb-10">
            {[{ id: 'all', name: t('courses.all') }, ...categories].map((cat) => (
              <button
                key={cat.id}
                onClick={() => setActiveCategory(cat.id)}
                className={`px-4 py-2 text-sm font-medium rounded-full border-2 transition-all ${
                  activeCategory === cat.id
                    ? 'bg-blue-600 border-blue-600 text-white shadow-lg shadow-blue-500/30'
                    : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:border-blue-300 hover:text-blue-600 hover:shadow-md'
                }`}
              >
                {cat.name}
              </button>
            ))}
          </div>

          {isLoading && (
            <div className="flex flex-col items-center justify-center py-20">
              <div className="w-12 h-12 border-3 border-blue-600 border-t-transparent rounded-full animate-spin mb-4" />
              <p className="text-slate-500 dark:text-slate-400">Đang tải khóa học...</p>
            </div>
          )}
          {isError && (
            <div className="text-center py-12 bg-red-50 dark:bg-red-900/20 rounded-2xl border border-red-200 dark:border-red-800">
              <svg className="w-12 h-12 mx-auto text-red-500 mb-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="12" cy="12" r="10" />
                <line x1="12" y1="8" x2="12" y2="12" />
                <line x1="12" y1="16" x2="12.01" y2="16" />
              </svg>
              <p className="text-red-600 dark:text-red-400 font-medium">{t('common.loadError')}</p>
            </div>
          )}

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {courses.map((course, index) => {
              const enrollments = courseStat(course, 'enrollments');
              return (
                <AnimatedSection key={course.id} delay={index * 50} className="h-full">
                  <div className="group h-full bg-white dark:bg-slate-800 rounded-2xl overflow-hidden border border-slate-200 dark:border-slate-700 hover:shadow-2xl hover:-translate-y-2 transition-all duration-300 flex flex-col">
                    {/* Thumbnail */}
                    <div className="h-48 relative overflow-hidden">
                      <div className="absolute inset-0 bg-gradient-to-br from-blue-600 to-cyan-500" />
                      {course.thumbnailUrl && (
                        <img src={course.thumbnailUrl} alt={course.title} loading="lazy" className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" />
                      )}
                      {course.difficultyLevel && (
                        <span className="absolute top-3 right-3 px-2.5 py-1 text-xs font-semibold bg-slate-900/80 text-white rounded-lg backdrop-blur-sm">
                          {t(`courseApi.level.${course.difficultyLevel}`)}
                        </span>
                      )}

                    </div>
                    
                    <div className="p-5 flex flex-col flex-1">
                      {/* Category & Language */}
                      <div className="flex items-center gap-2 text-xs font-semibold text-blue-600 dark:text-blue-400 mb-2">
                        <span className="w-2 h-2 bg-blue-500 rounded-full" />
                        {categoryName(course.categoryId)}
                        {course.language && course.language !== 'vi' && (
                          <span className="ml-auto px-2 py-0.5 bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 rounded uppercase text-[10px] font-bold">{course.language}</span>
                        )}
                      </div>
                      
                      {/* Title */}
                      <h3 className="text-base font-bold text-slate-900 dark:text-white mb-2 line-clamp-2 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                        {course.title}
                      </h3>
                      
                      {/* Description */}
                      {course.shortDescription && (
                        <p className="text-sm text-slate-500 dark:text-slate-400 mb-4 line-clamp-2 flex-1">
                          {course.shortDescription}
                        </p>
                      )}
                      
                      {/* Meta info */}
                      <div className="flex items-center gap-4 text-sm text-slate-500 dark:text-slate-400 mb-4">
                        {enrollments !== null && (
                          <span className="flex items-center gap-1.5">
                            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                              <path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2" />
                              <circle cx="9" cy="7" r="4" />
                            </svg>
                            {formatNumber(enrollments)}
                          </span>
                        )}
                        {course.durationHours ? (
                          <span className="flex items-center gap-1.5">
                            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                              <circle cx="12" cy="12" r="10" />
                              <polyline points="12 6 12 12 16 14" />
                            </svg>
                            {course.durationHours}h
                          </span>
                        ) : null}
                      </div>
                      
                      {/* Price & CTA */}
                      <div className="flex items-center justify-between pt-4 border-t border-slate-100 dark:border-slate-700 mt-auto">
                        <span className="text-lg font-bold text-slate-900 dark:text-white">
                          {formatCoursePrice(course, t('courses.free'))}
                        </span>
                        <Link
                          to={`/courses/${course.slug}`}
                          className="px-4 py-2 bg-blue-600 text-white text-sm font-semibold rounded-lg hover:bg-blue-700 transition-all hover:shadow-lg shadow-blue-500/30 hover:-translate-y-0.5 flex items-center gap-2"
                        >
                          {t('courses.viewDetail')}
                          <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M5 12h14M12 5l7 7-7 7" />
                          </svg>
                        </Link>
                      </div>
                    </div>
                  </div>
                </AnimatedSection>
              );
            })}
          </div>

          {!isLoading && !isError && courses.length === 0 && (
            <div className="text-center py-20 bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700">
              <svg className="w-20 h-20 mx-auto text-slate-300 dark:text-slate-600 mb-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                <path d="M4 19.5A2.5 2.5 0 016.5 17H20" />
                <path d="M6.5 2H20v20H6.5A2.5 2.5 0 014 19.5v-15A2.5 2.5 0 016.5 2z" />
              </svg>
              <h3 className="text-lg font-medium text-slate-600 dark:text-slate-400 mb-2">{t('courseApi.noCourses')}</h3>
              <p className="text-sm text-slate-500 dark:text-slate-500">Thử tìm kiếm với từ khóa khác</p>
            </div>
          )}
        </div>
      </section>

      {/* Pagination */}
      {data && data.meta.total > 0 && (
        <div className="py-8 px-6 bg-white dark:bg-slate-800 border-t border-slate-200 dark:border-slate-700">
          <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
            <span className="text-sm text-slate-500 dark:text-slate-400">
              Hiển thị {courses.length} trong tổng số {data.meta.total} khóa học
            </span>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setPage(p => Math.max(1, p - 1))}
                disabled={page <= 1}
                className="p-2.5 rounded-xl border-2 border-slate-200 dark:border-slate-700 text-slate-500 hover:bg-blue-50 hover:border-blue-300 hover:text-blue-600 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
              >
                <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M15 18l-6-6 6-6" />
                </svg>
              </button>
              {[...Array(Math.min(5, totalPages))].map((_, i) => {
                let n = i + 1;
                if (totalPages > 5 && page > 3) {
                  n = page - 2 + i;
                  if (n > totalPages) return null;
                }
                return (
                  <button
                    key={n}
                    onClick={() => setPage(n)}
                    className={`w-10 h-10 rounded-xl font-medium transition-all ${
                      n === page
                        ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/30'
                        : 'border-2 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-blue-50 hover:border-blue-300'
                    }`}
                  >
                    {n}
                  </button>
                );
              })}
              <button
                onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                disabled={page >= totalPages}
                className="p-2.5 rounded-xl border-2 border-slate-200 dark:border-slate-700 text-slate-500 hover:bg-blue-50 hover:border-blue-300 hover:text-blue-600 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
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
