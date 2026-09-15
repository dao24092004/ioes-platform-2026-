import React, { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useQuery } from '@tanstack/react-query';
import Header from '../../components/public/Header';
import Footer from '../../components/public/Footer';
import { useAuthStore } from '@/app/store/authStore';
import { contentApi, countLessons, courseStat, formatCoursePrice } from '@/services/api/content.api';

type TabKey = 'overview' | 'curriculum' | 'reviews';

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

/**
 * Trang chi tiết khoá học công khai, theo slug.
 *
 * Backend không có route tra theo slug nên tìm qua danh sách đã xuất bản rồi
 * lấy cây chương bằng id (`findCourseBySlug` + `getCourseDetail`). Cả hai đều
 * cần token vì gateway không mở route khoá học cho khách.
 *
 * Đánh giá, thông tin giảng viên, thẻ và "quyền lợi" khoá học không có trong
 * backend nên không còn hiển thị.
 */
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
          <Link to="/courses" className="text-sm text-blue-600 hover:underline">{t('courseApi.notFound.back')}</Link>
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

  if (findingCourse || (found && loadingDetail)) {
    return (
      <div className="pt-32 pb-20 text-center">
        <div className="inline-block w-8 h-8 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (findError || !found || !detail) {
    return (
      <div className="pt-32 pb-20 px-6">
        <div className="max-w-md mx-auto text-center">
          <div className="w-20 h-20 mx-auto mb-6 bg-slate-100 dark:bg-slate-800 rounded-full flex items-center justify-center">
            <svg className="w-10 h-10 text-slate-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="12" cy="12" r="10" />
              <line x1="12" y1="8" x2="12" y2="12" />
              <line x1="12" y1="16" x2="12.01" y2="16" />
            </svg>
          </div>
          <h1 className="text-2xl font-bold mb-2">{t('publicCourseDetail.notFound.title')}</h1>
          <p className="text-slate-500 dark:text-slate-400 mb-6">{t('publicCourseDetail.notFound.desc')}</p>
          <Link
            to="/courses"
            className="inline-flex items-center gap-2 px-5 py-3 bg-blue-600 text-white rounded-xl font-semibold hover:bg-blue-700"
          >
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
      <header className="pt-20 pb-10 px-6 bg-gradient-to-br from-blue-600 via-blue-600 to-cyan-500 text-white">
        <div className="max-w-7xl mx-auto grid lg:grid-cols-[1fr_400px] gap-10">
          <div>
            <Link to="/courses" className="inline-flex items-center gap-2 text-sm text-white/80 hover:text-white mb-4">
              <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M15 18l-6-6 6-6" />
              </svg>
              {t('publicCourseDetail.notFound.back')}
            </Link>

            <div className="flex flex-wrap items-center gap-x-5 gap-y-2 mb-4 text-sm opacity-90">
              {categoryName && <span className="px-3 py-1 bg-white/20 rounded-full text-xs font-medium">{categoryName}</span>}
              {enrollments !== null && (
                <span>{t('publicCourseDetail.studentsCount', { count: enrollments })}</span>
              )}
              {course.durationHours ? (
                <span>{t('publicCourseDetail.hoursCount', { count: course.durationHours })}</span>
              ) : null}
              <span>{t('publicCourseDetail.lessonsCount', { count: lessonsCount })}</span>
              {course.difficultyLevel && <span>{t(`courseApi.level.${course.difficultyLevel}`)}</span>}
            </div>

            <h1 className="text-3xl lg:text-4xl font-bold mb-4">{course.title}</h1>
            {course.shortDescription && (
              <p className="text-white/90 leading-relaxed mb-5 max-w-2xl">{course.shortDescription}</p>
            )}
          </div>

          {/* Thẻ bên phải */}
          <aside className="bg-white dark:bg-slate-800 rounded-2xl p-6 text-slate-900 dark:text-white shadow-2xl self-start lg:sticky lg:top-24">
            <div className="h-44 rounded-xl bg-gradient-to-br from-blue-600 to-cyan-500 overflow-hidden mb-5">
              {course.thumbnailUrl && (
                <img src={course.thumbnailUrl} alt={course.title} className="w-full h-full object-cover" />
              )}
            </div>

            <div className="text-center mb-5">
              {(course.price ?? 0) === 0 ? (
                <div className="text-3xl font-extrabold text-emerald-600 dark:text-emerald-400">{t('courses.free')}</div>
              ) : (
                <div className="text-4xl font-extrabold text-blue-600 dark:text-blue-400">{formatCoursePrice(course, t('courses.free'))}</div>
              )}
            </div>

            {/* Chưa có ghi danh hay thanh toán: dẫn thẳng vào trang học trong khu học viên. */}
            <Link
              to={`/student/learn/${course.id}`}
              className="w-full block text-center py-3.5 bg-gradient-to-r from-blue-600 to-cyan-500 text-white rounded-xl font-semibold hover:shadow-lg hover:shadow-blue-500/30 hover:-translate-y-0.5 transition-all"
            >
              {t('student.courses.startBtn')}
            </Link>
          </aside>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-6 py-10 grid lg:grid-cols-[1fr_400px] gap-10">
        <div>
          <div className="flex flex-wrap gap-2 mb-6 border-b border-slate-200 dark:border-slate-700 pb-4">
            {(['overview', 'curriculum', 'reviews'] as const).map((key) => (
              <button
                key={key}
                onClick={() => setActiveTab(key)}
                className={`px-5 py-2.5 text-sm font-medium rounded-xl transition-all ${
                  activeTab === key
                    ? 'bg-blue-600 text-white'
                    : 'text-slate-500 dark:text-slate-400 hover:text-blue-600 hover:bg-slate-100 dark:hover:bg-slate-800'
                }`}
              >
                {t(`publicCourseDetail.tabs.${key}`)}
              </button>
            ))}
          </div>

          {activeTab === 'overview' && (
            <section className="bg-white dark:bg-slate-800 rounded-2xl p-6 border border-slate-200 dark:border-slate-700">
              <h2 className="text-lg font-bold mb-3">{t('publicCourseDetail.tabs.overview')}</h2>
              <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed whitespace-pre-line">
                {course.description || course.shortDescription || t('courseApi.noDescription')}
              </p>
            </section>
          )}

          {activeTab === 'curriculum' && (
            <section className="bg-white dark:bg-slate-800 rounded-2xl p-6 border border-slate-200 dark:border-slate-700">
              <h2 className="text-lg font-bold mb-4">{t('publicCourseDetail.tabs.curriculum')}</h2>
              {chapters.length === 0 ? (
                <p className="text-sm text-slate-500 dark:text-slate-400">{t('courseApi.noChapters')}</p>
              ) : (
                <div className="space-y-2">
                  {chapters.map((chapter, i) => {
                    const minutes = chapter.lessons.reduce((s, l) => s + (l.durationMinutes ?? 0), 0);
                    return (
                      <div
                        key={chapter.id}
                        className="p-4 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700"
                      >
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-lg bg-blue-100 dark:bg-blue-900/40 text-blue-600 dark:text-blue-400 flex items-center justify-center font-bold text-sm">
                            {i + 1}
                          </div>
                          <div>
                            <div className="text-sm font-semibold">{chapter.title}</div>
                            <div className="text-xs text-slate-500 dark:text-slate-400">
                              {t('publicCourseDetail.lessonsCount', { count: chapter.lessons.length })}
                              {minutes > 0 && ` • ${minutes.toLocaleString(locale)} ${t('student.courseDetail.minutes')}`}
                            </div>
                          </div>
                        </div>
                        {chapter.lessons.length > 0 && (
                          <ul className="mt-3 ml-12 space-y-1">
                            {chapter.lessons.map(l => (
                              <li key={l.id} className="text-xs text-slate-600 dark:text-slate-300 flex justify-between gap-3">
                                <span>{l.title}</span>
                                <span className="text-slate-400 shrink-0">
                                  {t(`courseApi.lessonType.${l.lessonType}`)}
                                  {l.durationMinutes != null && ` · ${l.durationMinutes} ${t('student.courseDetail.minutes')}`}
                                </span>
                              </li>
                            ))}
                          </ul>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </section>
          )}

          {activeTab === 'reviews' && (
            <section className="bg-white dark:bg-slate-800 rounded-2xl p-6 border border-slate-200 dark:border-slate-700">
              <h2 className="text-xl font-bold mb-3">{t('publicCourseDetail.reviewsTitle')}</h2>
              <p className="text-sm text-slate-500 dark:text-slate-400">{t('courseApi.reviewsUnavailable')}</p>
            </section>
          )}
        </div>

        <aside className="hidden lg:block" aria-hidden />
      </main>
    </>
  );
};

export default CourseDetailPage;
