import React, { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useQuery } from '@tanstack/react-query';
import Header from '../../components/public/Header';
import Footer from '../../components/public/Footer';
import AnimatedSection from '@/components/common/AnimatedSection';
import { useAuthStore } from '@/app/store/authStore';
import { contentApi, countLessons, courseStat, formatCoursePrice } from '@/services/api/content.api';

type TabKey = 'overview' | 'curriculum' | 'reviews';

const FloatingOrbs = () => (
  <div className="absolute inset-0 overflow-hidden pointer-events-none">
    <div className="absolute top-0 left-1/4 w-96 h-96 bg-blue-400/20 rounded-full blur-3xl animate-pulse" />
    <div className="absolute top-20 right-1/4 w-72 h-72 bg-cyan-400/20 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1s' }} />
  </div>
);

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

const CourseDetailPage: React.FC = () => {
  const { t } = useTranslation();
  const isAuthenticated = useAuthStore(s => s.isAuthenticated && !!s.accessToken);

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900">
      <Header />
      {isAuthenticated ? (
        <Detail />
      ) : (
        <div className="pt-24">
          <LoginRequired />
        </div>
      )}
      {!isAuthenticated && (
        <div className="text-center pb-16">
          <Link to="/courses" className="text-sm text-blue-600 hover:underline">{t('publicCourseDetail.notFound.back')}</Link>
        </div>
      )}
      <Footer />
    </div>
  );
};

const Detail: React.FC = () => {
  const { t, i18n } = useTranslation();
  const { slug = '' } = useParams<{ slug: string }>();
  const [activeTab, setActiveTab] = useState<TabKey>('overview');
  const [expandedChapters, setExpandedChapters] = useState<Set<string>>(new Set());
  const locale = i18n.language?.startsWith('vi') ? 'vi' : 'en';

  const { data: found, isLoading: findingCourse, isError: findError } = useQuery({
    queryKey: ['content', 'courses', 'by-slug', slug],
    queryFn: () => contentApi.findCourseBySlug(slug),
    enabled: !!slug,
  });

  const { data: detail, isLoading: loadingDetail } = useQuery({
    queryKey: ['content', 'course', found?.id, 'detail'],
    queryFn: () => contentApi.getCourseDetail(found!.id),
    enabled: !!found,
  });

  const { data: categories = [] } = useQuery({
    queryKey: ['content', 'categories'],
    queryFn: () => contentApi.listCategories(),
    staleTime: 5 * 60_000,
  });

  const toggleChapter = (id: string) => {
    setExpandedChapters(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  if (findingCourse || (found && loadingDetail)) {
    return (
      <div className="pt-40 pb-20 text-center">
        <div className="w-12 h-12 border-3 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
        <p className="text-slate-500 dark:text-slate-400">Đang tải thông tin khóa học...</p>
      </div>
    );
  }

  if (findError || !found || !detail) {
    return (
      <div className="pt-32 pb-20 px-6">
        <div className="max-w-md mx-auto text-center">
          <div className="w-24 h-24 mx-auto mb-6 bg-slate-100 dark:bg-slate-800 rounded-full flex items-center justify-center">
            <svg className="w-12 h-12 text-slate-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="12" cy="12" r="10" />
              <line x1="12" y1="8" x2="12" y2="12" />
              <line x1="12" y1="16" x2="12.01" y2="16" />
            </svg>
          </div>
          <h1 className="text-2xl font-bold mb-2 text-slate-900 dark:text-white">{t('publicCourseDetail.notFound.title')}</h1>
          <p className="text-slate-500 dark:text-slate-400 mb-6">{t('publicCourseDetail.notFound.desc')}</p>
          <Link
            to="/courses"
            className="inline-flex items-center gap-2 px-5 py-3 bg-blue-600 text-white rounded-xl font-semibold hover:bg-blue-700 transition-all hover:shadow-lg shadow-blue-500/30"
          >
            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M15 18l-6-6 6-6" />
            </svg>
            {t('publicCourseDetail.notFound.back')}
          </Link>
        </div>
      </div>
    );
  }

  const { course, chapters } = detail;
  const enrollments = courseStat(course, 'enrollments');
  const lessonsCount = countLessons(chapters);
  const categoryName = categories.find(c => c.id === course.categoryId)?.name;

  return (
    <>
      {/* Hero */}
      <header className="relative pt-20 pb-24 px-6 overflow-hidden bg-gradient-to-br from-blue-600 via-blue-700 to-cyan-600 text-white">
        <FloatingOrbs />
        
        <div className="relative max-w-7xl mx-auto grid lg:grid-cols-[1fr_380px] gap-10 z-10">
          <div>
            <AnimatedSection delay={100}>
              <Link to="/courses" className="inline-flex items-center gap-2 text-sm text-white/80 hover:text-white mb-6 transition-colors">
                <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M15 18l-6-6 6-6" />
                </svg>
                Quay lại danh sách khóa học
              </Link>
            </AnimatedSection>

            <AnimatedSection delay={200}>
              <div className="flex flex-wrap items-center gap-3 mb-4">
                {categoryName && (
                  <span className="px-3 py-1 bg-white/20 backdrop-blur-sm rounded-full text-xs font-semibold">{categoryName}</span>
                )}
                {course.difficultyLevel && (
                  <span className="px-3 py-1 bg-amber-500/80 backdrop-blur-sm rounded-full text-xs font-semibold text-white">
                    {t(`courseApi.level.${course.difficultyLevel}`)}
                  </span>
                )}
                {course.isFeatured && (
                  <span className="px-3 py-1 bg-amber-500 backdrop-blur-sm rounded-full text-xs font-semibold text-white flex items-center gap-1">
                    <svg className="w-3 h-3" viewBox="0 0 24 24" fill="currentColor"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>
                    Khóa học nổi bật
                  </span>
                )}
              </div>
            </AnimatedSection>

            <AnimatedSection delay={300}>
              <h1 className="text-3xl lg:text-4xl xl:text-5xl font-bold mb-4 leading-tight">{course.title}</h1>
            </AnimatedSection>

            <AnimatedSection delay={400}>
              {course.shortDescription && (
                <p className="text-white/90 leading-relaxed mb-6 max-w-2xl text-lg">{course.shortDescription}</p>
              )}
            </AnimatedSection>

            <AnimatedSection delay={500}>
              <div className="flex flex-wrap items-center gap-x-6 gap-y-3 text-sm">
                {enrollments !== null && (
                  <span className="flex items-center gap-2 text-white/90">
                    <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2" />
                      <circle cx="9" cy="7" r="4" />
                      <path d="M23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75" />
                    </svg>
                    {enrollments.toLocaleString(locale)} học viên
                  </span>
                )}
                {course.durationHours ? (
                  <span className="flex items-center gap-2 text-white/90">
                    <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <circle cx="12" cy="12" r="10" />
                      <polyline points="12 6 12 12 16 14" />
                    </svg>
                    {course.durationHours} giờ học
                  </span>
                ) : null}
                <span className="flex items-center gap-2 text-white/90">
                  <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M4 19.5A2.5 2.5 0 016.5 17H20" />
                    <path d="M6.5 2H20v20H6.5A2.5 2.5 0 014 19.5v-15A2.5 2.5 0 016.5 2z" />
                  </svg>
                  {lessonsCount} bài học
                </span>
              </div>
            </AnimatedSection>
          </div>

          {/* Course Card */}
          <AnimatedSection delay={300} direction="left">
            <aside className="bg-white dark:bg-slate-800 rounded-2xl p-6 text-slate-900 dark:text-white shadow-2xl self-start lg:sticky lg:top-24">
              {/* Thumbnail */}
              <div className="h-48 rounded-xl overflow-hidden mb-5 relative group">
                <div className="absolute inset-0 bg-gradient-to-br from-blue-600 to-cyan-500" />
                {course.thumbnailUrl && (
                  <img src={course.thumbnailUrl} alt={course.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                )}
                <div className="absolute inset-0 bg-black/20 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                  <span className="text-white font-medium">Xem trước</span>
                </div>
              </div>

              {/* Price */}
              <div className="text-center mb-5">
                {(course.price ?? 0) === 0 ? (
                  <div className="text-4xl font-extrabold text-emerald-600 dark:text-emerald-400">
                    Miễn phí
                    <span className="block text-sm font-normal text-slate-500 dark:text-slate-400 mt-1">Truy cập trọn đời</span>
                  </div>
                ) : (
                  <div className="text-4xl font-extrabold text-blue-600 dark:text-blue-400">
                    {formatCoursePrice(course, t('courses.free'))}
                    {course.originalPrice && course.originalPrice > (course.price ?? 0) && (
                      <span className="block text-lg font-normal text-slate-400 line-through mt-1">
                        {formatCoursePrice({ ...course, price: course.originalPrice }, '')}
                      </span>
                    )}
                  </div>
                )}
              </div>

              {/* CTA Button */}
              <Link
                to={`/student/learn/${course.id}`}
                className="w-full block text-center py-4 bg-gradient-to-r from-blue-600 to-cyan-500 text-white rounded-xl font-bold hover:shadow-xl hover:shadow-blue-500/30 hover:-translate-y-0.5 transition-all text-lg"
              >
                {t('student.courses.startBtn')}
              </Link>

              {/* Features */}
              <div className="mt-5 space-y-3">
                <div className="flex items-center gap-3 text-sm text-slate-600 dark:text-slate-300">
                  <svg className="w-5 h-5 text-emerald-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M22 11.08V12a10 10 0 11-5.93-9.14" />
                    <polyline points="22 4 12 14.01 9 11.01" />
                  </svg>
                  Học mọi lúc, mọi nơi
                </div>
                <div className="flex items-center gap-3 text-sm text-slate-600 dark:text-slate-300">
                  <svg className="w-5 h-5 text-emerald-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M22 11.08V12a10 10 0 11-5.93-9.14" />
                    <polyline points="22 4 12 14.01 9 11.01" />
                  </svg>
                  Cập nhật nội dung mới
                </div>
                <div className="flex items-center gap-3 text-sm text-slate-600 dark:text-slate-300">
                  <svg className="w-5 h-5 text-emerald-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M22 11.08V12a10 10 0 11-5.93-9.14" />
                    <polyline points="22 4 12 14.01 9 11.01" />
                  </svg>
                  Chứng chỉ hoàn thành
                </div>
              </div>
            </aside>
          </AnimatedSection>
        </div>
      </header>

      {/* Wave separator */}
      <div className="h-16 -mt-1">
        <svg viewBox="0 0 1440 60" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full h-full">
          <path d="M0 0L60 5C120 10 240 20 360 25C480 30 600 30 720 27.5C840 25 960 20 1080 17.5C1200 15 1320 15 1380 15L1440 15V60H1380C1320 60 1200 60 1080 60C960 60 840 60 720 60C600 60 480 60 360 60C240 60 120 60 60 60H0V0Z" className="fill-white dark:fill-slate-900"/>
        </svg>
      </div>

      {/* Content */}
      <main className="max-w-7xl mx-auto px-6 py-10">
        <div className="grid lg:grid-cols-[1fr_380px] gap-10">
          <div>
            {/* Tabs */}
            <AnimatedSection delay={100}>
              <div className="flex flex-wrap gap-2 mb-8 border-b border-slate-200 dark:border-slate-700 pb-4">
                {(['overview', 'curriculum', 'reviews'] as const).map((key) => (
                  <button
                    key={key}
                    onClick={() => setActiveTab(key)}
                    className={`px-6 py-3 text-sm font-semibold rounded-xl transition-all ${
                      activeTab === key
                        ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/30'
                        : 'text-slate-500 dark:text-slate-400 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-slate-800'
                    }`}
                  >
                    {key === 'overview' && 'Tổng quan'}
                    {key === 'curriculum' && 'Nội dung khóa học'}
                    {key === 'reviews' && 'Đánh giá'}
                  </button>
                ))}
              </div>
            </AnimatedSection>

            {activeTab === 'overview' && (
              <AnimatedSection delay={200}>
                <section className="bg-white dark:bg-slate-800 rounded-2xl p-8 border border-slate-200 dark:border-slate-700 shadow-sm">
                  <h2 className="text-xl font-bold mb-4 text-slate-900 dark:text-white">Mô tả khóa học</h2>
                  <div className="prose prose-slate dark:prose-invert max-w-none">
                    <p className="text-slate-600 dark:text-slate-300 leading-relaxed whitespace-pre-line">
                      {course.description || course.shortDescription || t('courseApi.noDescription')}
                    </p>
                  </div>
                  
                  {/* Stats cards */}
                  <div className="grid grid-cols-3 gap-4 mt-8">
                    <div className="text-center p-4 bg-blue-50 dark:bg-blue-900/20 rounded-xl">
                      <div className="text-3xl font-bold text-blue-600 dark:text-blue-400">{lessonsCount}</div>
                      <div className="text-sm text-slate-500 dark:text-slate-400">Bài học</div>
                    </div>
                    <div className="text-center p-4 bg-emerald-50 dark:bg-emerald-900/20 rounded-xl">
                      <div className="text-3xl font-bold text-emerald-600 dark:text-emerald-400">{course.durationHours || 0}h</div>
                      <div className="text-sm text-slate-500 dark:text-slate-400">Tổng thời lượng</div>
                    </div>
                    <div className="text-center p-4 bg-amber-50 dark:bg-amber-900/20 rounded-xl">
                      <div className="text-3xl font-bold text-amber-600 dark:text-amber-400">{enrollments || 0}</div>
                      <div className="text-sm text-slate-500 dark:text-slate-400">Học viên</div>
                    </div>
                  </div>
                </section>
              </AnimatedSection>
            )}

            {activeTab === 'curriculum' && (
              <AnimatedSection delay={200}>
                <section className="bg-white dark:bg-slate-800 rounded-2xl p-8 border border-slate-200 dark:border-slate-700 shadow-sm">
                  <div className="flex items-center justify-between mb-6">
                    <h2 className="text-xl font-bold text-slate-900 dark:text-white">Nội dung khóa học</h2>
                    <span className="text-sm text-slate-500 dark:text-slate-400">{chapters.length} chương • {lessonsCount} bài</span>
                  </div>
                  
                  {chapters.length === 0 ? (
                    <p className="text-sm text-slate-500 dark:text-slate-400 text-center py-8">{t('courseApi.noChapters')}</p>
                  ) : (
                    <div className="space-y-3">
                      {chapters.map((chapter, i) => {
                        const minutes = chapter.lessons.reduce((s, l) => s + (l.durationMinutes ?? 0), 0);
                        const isExpanded = expandedChapters.has(chapter.id);
                        
                        return (
                          <div
                            key={chapter.id}
                            className="rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 overflow-hidden transition-all"
                          >
                            <button
                              onClick={() => toggleChapter(chapter.id)}
                              className="w-full p-4 flex items-center gap-4 text-left hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                            >
                              <div className="w-10 h-10 rounded-lg bg-blue-100 dark:bg-blue-900/40 text-blue-600 dark:text-blue-400 flex items-center justify-center font-bold text-sm shrink-0">
                                {i + 1}
                              </div>
                              <div className="flex-1 min-w-0">
                                <div className="font-semibold text-slate-900 dark:text-white truncate">{chapter.title}</div>
                                <div className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                                  {chapter.lessons.length} bài học
                                  {minutes > 0 && ` • ${minutes} phút`}
                                </div>
                              </div>
                              <svg 
                                className={`w-5 h-5 text-slate-400 transition-transform ${isExpanded ? 'rotate-180' : ''}`} 
                                viewBox="0 0 24 24" 
                                fill="none" 
                                stroke="currentColor" 
                                strokeWidth="2"
                              >
                                <polyline points="6 9 12 15 18 9" />
                              </svg>
                            </button>
                            
                            {isExpanded && chapter.lessons.length > 0 && (
                              <div className="border-t border-slate-200 dark:border-slate-700">
                                <ul className="divide-y divide-slate-100 dark:divide-slate-800">
                                  {chapter.lessons.map((lesson, j) => (
                                    <li key={lesson.id} className="flex items-center gap-4 px-4 py-3 pl-16 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors">
                                      <span className="w-6 h-6 rounded-full bg-slate-200 dark:bg-slate-700 flex items-center justify-center text-xs text-slate-500 dark:text-slate-400 shrink-0">
                                        {j + 1}
                                      </span>
                                      <span className="flex-1 text-sm text-slate-700 dark:text-slate-300 truncate">{lesson.title}</span>
                                      <span className="text-xs text-slate-400 dark:text-slate-500 shrink-0">
                                        {t(`courseApi.lessonType.${lesson.lessonType}`)}
                                        {lesson.durationMinutes != null && ` • ${lesson.durationMinutes}p`}
                                      </span>
                                    </li>
                                  ))}
                                </ul>
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </section>
              </AnimatedSection>
            )}

            {activeTab === 'reviews' && (
              <AnimatedSection delay={200}>
                <section className="bg-white dark:bg-slate-800 rounded-2xl p-8 border border-slate-200 dark:border-slate-700 shadow-sm">
                  <h2 className="text-xl font-bold mb-4 text-slate-900 dark:text-white">Đánh giá từ học viên</h2>
                  <div className="text-center py-12">
                    <div className="w-16 h-16 mx-auto mb-4 bg-slate-100 dark:bg-slate-700 rounded-full flex items-center justify-center">
                      <svg className="w-8 h-8 text-slate-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z" />
                      </svg>
                    </div>
                    <p className="text-slate-500 dark:text-slate-400">{t('courseApi.reviewsUnavailable')}</p>
                  </div>
                </section>
              </AnimatedSection>
            )}
          </div>

          {/* Mobile CTA */}
          <div className="lg:hidden">
            <aside className="bg-white dark:bg-slate-800 rounded-2xl p-6 border border-slate-200 dark:border-slate-700 shadow-lg sticky top-24">
              <div className="text-center mb-4">
                {(course.price ?? 0) === 0 ? (
                  <div className="text-3xl font-extrabold text-emerald-600 dark:text-emerald-400">Miễn phí</div>
                ) : (
                  <div className="text-3xl font-extrabold text-blue-600 dark:text-blue-400">{formatCoursePrice(course, t('courses.free'))}</div>
                )}
              </div>
              <Link
                to={`/student/learn/${course.id}`}
                className="w-full block text-center py-3.5 bg-gradient-to-r from-blue-600 to-cyan-500 text-white rounded-xl font-semibold hover:shadow-lg hover:shadow-blue-500/30 transition-all"
              >
                {t('student.courses.startBtn')}
              </Link>
            </aside>
          </div>
        </div>
      </main>
    </>
  );
};

export default CourseDetailPage;
