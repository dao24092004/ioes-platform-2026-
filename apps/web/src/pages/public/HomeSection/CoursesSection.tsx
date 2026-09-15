import React from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useQuery } from '@tanstack/react-query';
import { Button } from '@/components/common';
import { useAuthStore } from '@/app/store/authStore';
import { contentApi, courseStat, formatCoursePrice } from '@/services/api/content.api';

const FEATURED_COUNT = 3;

const formatNumber = (num: number): string => (num >= 1000 ? `${(num / 1000).toFixed(1)}K` : num.toString());

/**
 * Khoá học mới nhất trên trang chủ.
 *
 * Route khoá học cần token (gateway không mở cho khách), nên khách chưa đăng
 * nhập thấy lời mời đăng nhập thay cho các thẻ khoá học bịa trước đây.
 */
const CoursesSection: React.FC = () => {
  const { t } = useTranslation();
  const isAuthenticated = useAuthStore(s => s.isAuthenticated && !!s.accessToken);

  const { data, isLoading, isError } = useQuery({
    queryKey: ['content', 'courses', 'home', FEATURED_COUNT],
    // Backend không tự lọc theo vai trò: phải truyền status=published.
    queryFn: () => contentApi.listCourses({ status: 'published', perPage: FEATURED_COUNT }),
    enabled: isAuthenticated,
  });
  const courses = data?.data ?? [];

  const { data: categories = [] } = useQuery({
    queryKey: ['content', 'categories'],
    queryFn: () => contentApi.listCategories(),
    staleTime: 5 * 60_000,
    enabled: isAuthenticated,
  });
  const categoryName = (id: string | null) =>
    categories.find(c => c.id === id)?.name ?? t('courseApi.uncategorized');

  return (
    <section id="courses" className="py-24 bg-white dark:bg-slate-900">
      <div className="max-w-7xl mx-auto px-6">
        <div className="text-center mb-16">
          <span className="inline-flex items-center gap-2 px-4 py-2 bg-blue-100 dark:bg-blue-900/50 text-blue-700 dark:text-blue-300 rounded-full text-sm font-medium mb-4">
            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
            </svg>
            {t('courses.section.featured')}
          </span>
          <h2 className="text-3xl md:text-4xl font-bold text-slate-900 dark:text-white mb-4">
            {t('courses.section.explore')}
          </h2>
        </div>

        {!isAuthenticated ? (
          <div className="max-w-md mx-auto text-center bg-slate-50 dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-8">
            <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-2">{t('courseApi.loginRequired.title')}</h3>
            <p className="text-sm text-slate-500 dark:text-slate-400 mb-6">{t('courseApi.loginRequired.description')}</p>
            <Button as={Link} to="/auth/login" size="sm">
              {t('courseApi.loginRequired.action')}
            </Button>
          </div>
        ) : isLoading ? (
          <div className="text-center py-12">
            <div className="inline-block w-8 h-8 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : isError ? (
          <div className="text-center py-12 text-sm text-red-600">{t('common.loadError')}</div>
        ) : courses.length === 0 ? (
          <div className="text-center py-12 text-sm text-slate-500">{t('courseApi.noCourses')}</div>
        ) : (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {courses.map((course) => {
              const enrollments = courseStat(course, 'enrollments');
              return (
                <div key={course.id} className="bg-white dark:bg-slate-800 rounded-2xl overflow-hidden border border-slate-200 dark:border-slate-700 hover:shadow-xl hover:-translate-y-1 transition-all duration-300">
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
                    <span className="text-xs font-semibold text-blue-600 dark:text-blue-400 mb-2 block">
                      {categoryName(course.categoryId)}
                    </span>
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
                      <Button as={Link} to={`/courses/${course.slug}`} variant="secondary" size="sm">
                        {t('courses.viewDetail')}
                      </Button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        <div className="text-center mt-12">
          <Button as={Link} to="/courses" size="lg">
            {t('courses.section.viewAll')}
            <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M5 12h14M12 5l7 7-7 7" />
            </svg>
          </Button>
        </div>
      </div>
    </section>
  );
};

export default CoursesSection;
