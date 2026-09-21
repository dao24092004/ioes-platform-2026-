import React from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useQuery } from '@tanstack/react-query';
import { Button } from '@/components/common';
import { useAuthStore } from '@/app/store/authStore';
import { contentApi, courseStat, formatCoursePrice } from '@/services/api/content.api';

const FEATURED_COUNT = 3;

const formatNumber = (num: number): string => (num >= 1000 ? `${(num / 1000).toFixed(1)}K` : num.toString());

const CoursesSection: React.FC = () => {
  const { t } = useTranslation();
  const isAuthenticated = useAuthStore(s => s.isAuthenticated && !!s.accessToken);

  const { data, isLoading, isError } = useQuery({
    queryKey: ['content', 'courses', 'home', FEATURED_COUNT],
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

  const placeholderCourses = [
    {
      id: '1',
      title: 'Introduction to AI & Machine Learning',
      category: 'Technology',
      level: 'Beginner',
      students: '2.5K',
      hours: '8',
      rating: 4.8,
      image: 'https://images.unsplash.com/photo-1677442136019-21780ecad995?w=600&h=400&fit=crop',
    },
    {
      id: '2',
      title: 'Web Development Fundamentals',
      category: 'Programming',
      level: 'Intermediate',
      students: '1.8K',
      hours: '12',
      rating: 4.9,
      image: 'https://images.unsplash.com/photo-1461749280684-dccba630e2f6?w=600&h=400&fit=crop',
    },
    {
      id: '3',
      title: 'Data Science Essentials',
      category: 'Data',
      level: 'Advanced',
      students: '1.2K',
      hours: '16',
      rating: 4.7,
      image: 'https://images.unsplash.com/photo-1551288049-bebda4e38f71?w=600&h=400&fit=crop',
    },
  ];

  return (
    <section id="courses" className="py-24 bg-white dark:bg-slate-900 relative overflow-hidden">
      {/* Background decoration */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-20 right-0 w-96 h-96 bg-blue-50 dark:bg-blue-900/10 rounded-full blur-3xl" />
        <div className="absolute bottom-20 left-0 w-96 h-96 bg-indigo-50 dark:bg-indigo-900/10 rounded-full blur-3xl" />
      </div>

      <div className="relative max-w-7xl mx-auto px-6">
        {/* Section Header */}
        <div className="flex flex-col md:flex-row md:items-end justify-between mb-12 gap-4">
          <div>
            <span className="inline-flex items-center gap-2 px-4 py-2 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 rounded-full text-sm font-semibold mb-4">
              <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
              </svg>
              {t('courses.section.featured')}
            </span>
            <h2 className="text-3xl md:text-4xl font-bold text-slate-900 dark:text-white">
              {t('courses.section.explore')}
            </h2>
          </div>
          <Button as={Link} to="/courses" variant="secondary" className="self-start md:self-auto">
            {t('courses.section.viewAll')}
            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M5 12h14M12 5l7 7-7 7" />
            </svg>
          </Button>
        </div>

        {!isAuthenticated ? (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            {placeholderCourses.map((course) => (
              <div key={course.id} className="group bg-white dark:bg-slate-800 rounded-2xl overflow-hidden border border-slate-200 dark:border-slate-700 hover:border-blue-200 dark:hover:border-blue-800 hover:shadow-xl hover:-translate-y-2 transition-all duration-300">
                <div className="relative h-48 overflow-hidden">
                  <img 
                    src={course.image} 
                    alt={course.title}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                    loading="lazy"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
                  <div className="absolute top-3 left-3 flex gap-2">
                    <span className="px-2 py-1 text-xs font-medium bg-white/90 text-slate-900 rounded-md">
                      {course.category}
                    </span>
                    <span className="px-2 py-1 text-xs font-medium bg-blue-600 text-white rounded-md">
                      {course.level}
                    </span>
                  </div>
                  <div className="absolute bottom-3 left-3 right-3 flex items-center justify-between">
                    <div className="flex items-center gap-1 text-white">
                      <svg className="w-4 h-4 text-amber-400" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
                      </svg>
                      <span className="text-sm font-medium">{course.rating}</span>
                    </div>
                  </div>
                </div>
                <div className="p-5">
                  <h3 className="text-base font-semibold text-slate-900 dark:text-white mb-2 line-clamp-2 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                    {course.title}
                  </h3>
                  <div className="flex items-center gap-4 text-sm text-slate-500 dark:text-slate-400 mb-4">
                    <span className="flex items-center gap-1">
                      <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2" />
                        <circle cx="9" cy="7" r="4" />
                      </svg>
                      {course.students}
                    </span>
                    <span className="flex items-center gap-1">
                      <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <circle cx="12" cy="12" r="10" />
                        <polyline points="12 6 12 12 16 14" />
                      </svg>
                      {course.hours}h
                    </span>
                  </div>
                  <div className="flex items-center justify-between pt-4 border-t border-slate-100 dark:border-slate-700">
                    <span className="text-lg font-bold text-slate-900 dark:text-white">{t('courses.free')}</span>
                    <Button as={Link} to="/auth/login" variant="primary" size="sm">
                      {t('courses.viewDetail')}
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : isLoading ? (
          <div className="flex items-center justify-center py-12">
            <div className="w-10 h-10 border-3 border-blue-600 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : isError ? (
          <div className="text-center py-12 text-sm text-red-600 dark:text-red-400">{t('common.loadError')}</div>
        ) : courses.length === 0 ? (
          <div className="text-center py-12 text-sm text-slate-500 dark:text-slate-400">{t('courseApi.noCourses')}</div>
        ) : (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            {courses.map((course) => {
              const enrollments = courseStat(course, 'enrollments');
              return (
                <div key={course.id} className="group bg-white dark:bg-slate-800 rounded-2xl overflow-hidden border border-slate-200 dark:border-slate-700 hover:border-blue-200 dark:hover:border-blue-800 hover:shadow-xl hover:-translate-y-2 transition-all duration-300">
                  <div className="relative h-48 overflow-hidden bg-slate-100 dark:bg-slate-700">
                    {course.thumbnailUrl && (
                      <img 
                        src={course.thumbnailUrl} 
                        alt={course.title} 
                        loading="lazy" 
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" 
                      />
                    )}
                    {course.difficultyLevel && (
                      <span className="absolute top-3 right-3 px-2 py-1 text-xs font-medium bg-white/90 text-slate-900 rounded-md">
                        {t(`courseApi.level.${course.difficultyLevel}`)}
                      </span>
                    )}
                  </div>
                  <div className="p-5">
                    <span className="text-xs font-semibold text-blue-600 dark:text-blue-400 mb-2 block">
                      {categoryName(course.categoryId)}
                    </span>
                    <h3 className="text-base font-semibold text-slate-900 dark:text-white mb-2 line-clamp-2 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
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
                      <Button as={Link} to={`/courses/${course.slug}`} variant="primary" size="sm">
                        {t('courses.viewDetail')}
                      </Button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </section>
  );
};

export default CoursesSection;
