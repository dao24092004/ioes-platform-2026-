import React, { useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import StudentLayout from '@/components/layout/StudentLayout';
import { Card, CardTitleWithIcon } from '@/components/common/Card';
import ProgressBar from '@/components/common/ProgressBar';
import {
  contentApi,
  countLessons,
  courseStat,
  formatCoursePrice,
  isPaidCourse,
  type Chapter,
  type Course,
  type EnrollmentState,
} from '@/services/api/content.api';

type Tab = 'about' | 'curriculum' | 'reviews' | 'discussions';

const CourseDetailPage: React.FC = () => {
  const { t } = useTranslation();
  const { courseId = '' } = useParams<{ courseId: string }>();
  const [tab, setTab] = useState<Tab>('about');

  const { data: detail, isLoading, isError } = useQuery({
    queryKey: ['content', 'course', courseId, 'detail'],
    queryFn: () => contentApi.getCourseDetail(courseId),
    enabled: !!courseId,
  });

  const { data: categories = [] } = useQuery({
    queryKey: ['content', 'categories'],
    queryFn: () => contentApi.listCategories(),
    staleTime: 5 * 60_000,
  });

  const { data: enrollmentState } = useQuery({
    queryKey: ['content', 'enrollment', courseId],
    queryFn: () => contentApi.getEnrollmentState(courseId),
    enabled: !!courseId,
  });

  const course = detail?.course;
  const chapters = detail?.chapters ?? [];
  const categoryName = useMemo(
    () => categories.find(c => c.id === course?.categoryId)?.name ?? t('courseApi.uncategorized'),
    [categories, course, t],
  );

  const tabs: { id: Tab; label: string }[] = [
    { id: 'about', label: t('student.courseDetail.about') },
    { id: 'curriculum', label: t('student.courseDetail.curriculum') },
    { id: 'reviews', label: t('student.courseDetail.reviews') },
    { id: 'discussions', label: t('student.courseDetail.discussions') },
  ];

  if (isLoading) {
    return (
      <StudentLayout title={t('student.courses.title')}>
        <div className="p-12 text-center">
          <div className="inline-block w-8 h-8 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
        </div>
      </StudentLayout>
    );
  }

  // Backend không lọc theo trạng thái ở route chi tiết, nên tự chặn khoá chưa xuất bản.
  if (isError || !course || course.status !== 'published') {
    return (
      <StudentLayout title={t('student.courses.title')}>
        <div className="p-12 text-center bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800">
          <h2 className="text-lg font-bold text-slate-900 dark:text-white mb-2">{t('courseApi.notFound.title')}</h2>
          <p className="text-sm text-slate-500 dark:text-slate-400 mb-6">{t('courseApi.notFound.description')}</p>
          <Link to="/student/courses" className="inline-block px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold">
            {t('courseApi.notFound.back')}
          </Link>
        </div>
      </StudentLayout>
    );
  }

  const enrollments = courseStat(course, 'enrollments');
  const lessonsCount = countLessons(chapters);

  return (
    <StudentLayout title={t('student.courses.title')} subtitle={course.title}>
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        <div className="xl:col-span-2 space-y-6">
          <div className="relative h-64 rounded-2xl bg-gradient-to-br from-blue-600 via-cyan-500 to-emerald-500 overflow-hidden flex items-center justify-center">
            {course.thumbnailUrl && (
              <img src={course.thumbnailUrl} alt={course.title} className="absolute inset-0 w-full h-full object-cover" />
            )}
            <Link
              to={`/student/learn/${course.id}`}
              className="relative w-20 h-20 rounded-full bg-white/90 hover:bg-white flex items-center justify-center shadow-2xl hover:scale-105 transition-transform"
            >
              <svg className="w-8 h-8 text-blue-600 ml-1" viewBox="0 0 24 24" fill="currentColor"><polygon points="5 3 19 12 5 21 5 3" /></svg>
            </Link>
          </div>

          <Card padding="md">
            <div>
              <div className="flex items-center gap-2 mb-2">
                <span className="px-2 py-1 rounded-md bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 text-[10px] font-bold uppercase">
                  {categoryName}
                </span>
                {course.difficultyLevel && (
                  <span className="px-2 py-1 rounded-md bg-emerald-50 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400 text-[10px] font-bold uppercase">
                    {t(`courseApi.level.${course.difficultyLevel}`)}
                  </span>
                )}
              </div>
              <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-2">{course.title}</h2>
              {course.shortDescription && (
                <p className="text-sm text-slate-600 dark:text-slate-400">{course.shortDescription}</p>
              )}
              {enrollments !== null && (
                <div className="mt-3 text-xs text-slate-500 dark:text-slate-400">
                  {enrollments.toLocaleString('en-US')} {t('student.courseDetail.students')}
                </div>
              )}
            </div>
          </Card>

          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 overflow-hidden">
            <div className="border-b border-slate-200 dark:border-slate-800 flex overflow-x-auto">
              {tabs.map(tb => (
                <button
                  key={tb.id}
                  onClick={() => setTab(tb.id)}
                  className={`px-5 py-3.5 text-sm font-semibold whitespace-nowrap transition-colors ${
                    tab === tb.id
                      ? 'border-b-2 border-blue-600 text-blue-600 dark:text-blue-400'
                      : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                  }`}
                >
                  {tb.label}
                </button>
              ))}
            </div>
            <div className="p-6">
              {tab === 'about' && <AboutTab course={course} />}
              {tab === 'curriculum' && <CurriculumTab courseId={course.id} chapters={chapters} />}
              {tab === 'reviews' && (
                <p className="text-sm text-slate-500 dark:text-slate-400">{t('courseApi.reviewsUnavailable')}</p>
              )}
              {tab === 'discussions' && (
                <div className="text-sm text-slate-500 dark:text-slate-400">
                  <p className="font-semibold text-slate-700 dark:text-slate-300 mb-1">{t('comingSoon.badge')}</p>
                  <p>{t('comingSoon.discussion.description')}</p>
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="space-y-6">
          <EnrollCard course={course} totalLessons={lessonsCount} state={enrollmentState} />

          <Card
            title={
              <CardTitleWithIcon color="primary">
                <ClockIcon />
                <span>{t('student.courseDetail.duration')}</span>
              </CardTitleWithIcon>
            }
          >
            <ul className="space-y-3 text-sm">
              <InfoRow
                icon={<ClockIcon />}
                label={t('student.courseDetail.duration')}
                value={course.durationHours ? `${course.durationHours} ${t('student.courseDetail.hours')}` : undefined}
              />
              <InfoRow icon={<BookIcon />} label={t('student.courseDetail.lessonsCount', { count: lessonsCount })} />
              <InfoRow icon={<BookIcon />} label={t('courseApi.chaptersCount', { count: chapters.length })} />
              <InfoRow
                icon={<LevelIcon />}
                label={t('student.courseDetail.level')}
                value={course.difficultyLevel ? t(`courseApi.level.${course.difficultyLevel}`) : undefined}
              />
              <InfoRow icon={<LangIcon />} label={t('student.courseDetail.language')} value={course.language ?? undefined} />
              <InfoRow
                icon={<RefreshIcon />}
                label={t('student.courseDetail.lastUpdated')}
                value={new Date(course.updatedAt).toLocaleDateString('vi-VN')}
              />
            </ul>
          </Card>
        </div>
      </div>
    </StudentLayout>
  );
};

/**
 * Ghi danh / tiến độ / huỷ ghi danh. Khoá có giá không ghi danh được vì chưa có
 * thanh toán (backend trả 402), nên thay nút bằng thông báo.
 */
const EnrollCard: React.FC<{ course: Course; totalLessons: number; state?: EnrollmentState }> = ({
  course,
  totalLessons,
  state,
}) => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [confirmCancel, setConfirmCancel] = useState(false);

  const invalidate = () => {
    qc.invalidateQueries({ queryKey: ['content', 'enrollment', course.id] });
    qc.invalidateQueries({ queryKey: ['content', 'enrollments'] });
    qc.invalidateQueries({ queryKey: ['content', 'course', course.id] });
  };
  const enrollMut = useMutation({
    mutationFn: () => contentApi.enroll(course.id),
    onSuccess: () => {
      invalidate();
      navigate(`/student/learn/${course.id}`);
    },
  });
  const cancelMut = useMutation({
    mutationFn: () => contentApi.cancelEnrollment(course.id),
    onSuccess: () => {
      setConfirmCancel(false);
      invalidate();
    },
  });
  const error = (enrollMut.error ?? cancelMut.error) as Error | null;
  const enrollment = state?.enrolled ? state.enrollment : null;

  return (
    <Card>
      <div className="text-2xl font-bold text-slate-900 dark:text-white mb-4">
        {formatCoursePrice(course, t('courses.free'))}
      </div>

      {!state ? (
        <div className="py-3 text-center">
          <div className="inline-block w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : enrollment ? (
        <>
          <div className="mb-4">
            <div className="flex justify-between text-xs text-slate-500 dark:text-slate-400 mb-1.5">
              <span className="font-semibold text-slate-700 dark:text-slate-300">{t('enrollmentApi.progress')}</span>
              <span>
                {t('enrollmentApi.progressOf', { done: state.completedLessonIds.length, total: totalLessons })} ·{' '}
                {enrollment.progressPercent}%
              </span>
            </div>
            <ProgressBar value={enrollment.progressPercent} />
            {enrollment.status === 'completed' && (
              <p className="text-xs text-emerald-600 dark:text-emerald-400 mt-2">{t('enrollmentApi.courseCompleted')}</p>
            )}
          </div>
          <Link
            to={`/student/learn/${course.id}`}
            className="block w-full text-center py-3 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold transition-colors"
          >
            {state.completedLessonIds.length > 0 ? t('enrollmentApi.continue') : t('enrollmentApi.start')}
          </Link>
          {confirmCancel ? (
            <div className="mt-3 p-3 rounded-xl bg-red-50 dark:bg-red-900/20 text-xs text-red-700 dark:text-red-300">
              <p className="mb-2">{t('enrollmentApi.cancelConfirm')}</p>
              <div className="flex gap-2">
                <button
                  onClick={() => cancelMut.mutate()}
                  disabled={cancelMut.isPending}
                  className="flex-1 py-1.5 rounded-lg bg-red-600 hover:bg-red-700 text-white font-semibold disabled:opacity-50"
                >
                  {t('enrollmentApi.cancel')}
                </button>
                <button
                  onClick={() => setConfirmCancel(false)}
                  className="flex-1 py-1.5 rounded-lg border border-red-200 dark:border-red-800 font-semibold"
                >
                  {t('common.cancel')}
                </button>
              </div>
            </div>
          ) : (
            <button
              onClick={() => setConfirmCancel(true)}
              className="mt-3 w-full text-xs text-slate-500 dark:text-slate-400 hover:text-red-600 transition-colors"
            >
              {t('enrollmentApi.cancel')}
            </button>
          )}
        </>
      ) : isPaidCourse(course) ? (
        <div className="p-3 rounded-xl bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-900/50 text-amber-800 dark:text-amber-300">
          <p className="text-sm font-semibold">{t('enrollmentApi.paidTitle')}</p>
          <p className="text-xs mt-1">{t('enrollmentApi.paidNotice')}</p>
        </div>
      ) : (
        <button
          onClick={() => enrollMut.mutate()}
          disabled={enrollMut.isPending}
          className="block w-full text-center py-3 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold transition-colors disabled:opacity-50"
        >
          {enrollMut.isPending ? t('enrollmentApi.enrolling') : t('enrollmentApi.enroll')}
        </button>
      )}

      {error && <p className="mt-3 text-xs text-red-600 dark:text-red-400">{error.message}</p>}
    </Card>
  );
};

const AboutTab: React.FC<{ course: Course }> = ({ course }) => {
  const { t } = useTranslation();
  return (
    <div>
      <h3 className="text-base font-bold text-slate-900 dark:text-white mb-3">{t('student.courseDetail.about')}</h3>
      <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed whitespace-pre-line">
        {course.description || course.shortDescription || t('courseApi.noDescription')}
      </p>
    </div>
  );
};

const CurriculumTab: React.FC<{ courseId: string; chapters: Chapter[] }> = ({ courseId, chapters }) => {
  const { t } = useTranslation();
  const [openSection, setOpenSection] = useState<number | null>(0);

  if (chapters.length === 0) {
    return <p className="text-sm text-slate-500 dark:text-slate-400">{t('courseApi.noChapters')}</p>;
  }

  return (
    <div className="space-y-3">
      <div className="text-sm text-slate-500 dark:text-slate-400 mb-4">
        {t('student.courseDetail.lessonsCount', { count: countLessons(chapters) })} · {t('courseApi.chaptersCount', { count: chapters.length })}
      </div>
      {chapters.map((chapter, idx) => (
        <div key={chapter.id} className="border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden">
          <button
            onClick={() => setOpenSection(openSection === idx ? null : idx)}
            className="w-full px-5 py-4 flex items-center justify-between hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors"
          >
            <div className="text-left">
              <div className="text-sm font-bold text-slate-900 dark:text-white">
                {t('student.courseDetail.section')} {idx + 1}: {chapter.title}
              </div>
              <div className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                {t('student.courseDetail.lessonsCount', { count: chapter.lessons.length })}
              </div>
            </div>
            <svg
              className={`w-4 h-4 text-slate-400 transition-transform ${openSection === idx ? 'rotate-180' : ''}`}
              viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
            >
              <polyline points="6 9 12 15 18 9" />
            </svg>
          </button>
          {openSection === idx && (
            chapter.lessons.length === 0 ? (
              <p className="border-t border-slate-200 dark:border-slate-800 px-5 py-3 text-xs text-slate-500">{t('courseApi.noLessons')}</p>
            ) : (
              <ul className="border-t border-slate-200 dark:border-slate-800 divide-y divide-slate-100 dark:divide-slate-800">
                {chapter.lessons.map(l => (
                  <li key={l.id}>
                    <Link
                      to={`/student/learn/${courseId}?lesson=${l.id}`}
                      className="px-5 py-3 flex items-center gap-3 hover:bg-slate-50 dark:hover:bg-slate-800/30"
                    >
                      <PlayIcon />
                      <div className="flex-1 min-w-0">
                        <div className="text-sm text-slate-700 dark:text-slate-300">{l.title}</div>
                        <div className="text-xs text-slate-500 dark:text-slate-400">
                          {t(`courseApi.lessonType.${l.lessonType}`)}
                          {l.durationMinutes != null && ` · ${l.durationMinutes} ${t('student.courseDetail.minutes')}`}
                        </div>
                      </div>
                      {l.isPreview && (
                        <span className="text-[10px] font-bold uppercase text-blue-600 dark:text-blue-400">
                          {t('student.courseDetail.preview')}
                        </span>
                      )}
                    </Link>
                  </li>
                ))}
              </ul>
            )
          )}
        </div>
      ))}
    </div>
  );
};

const InfoRow: React.FC<{ icon: React.ReactNode; label: string; value?: string }> = ({ icon, label, value }) => (
  <li className="flex items-center justify-between">
    <span className="flex items-center gap-2 text-slate-500 dark:text-slate-400">
      <span className="w-4 h-4">{icon}</span> {label}
    </span>
    {value !== undefined && <span className="font-semibold text-slate-900 dark:text-white">{value || '—'}</span>}
  </li>
);

const ClockIcon = () => (
  <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" /></svg>
);
const BookIcon = () => (
  <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" /></svg>
);
const LevelIcon = () => (
  <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12" /></svg>
);
const LangIcon = () => (
  <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10" /><line x1="2" y1="12" x2="22" y2="12" /><path d="M12 2a15.3 15.3 0 014 10 15.3 15.3 0 01-4 10 15.3 15.3 0 01-4-10 15.3 15.3 0 014-10z" /></svg>
);
const RefreshIcon = () => (
  <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="23 4 23 10 17 10" /><polyline points="1 20 1 14 7 14" /><path d="M3.51 9a9 9 0 0114.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0020.49 15" /></svg>
);
const PlayIcon = () => (
  <svg className="w-4 h-4 text-blue-600 dark:text-blue-400" viewBox="0 0 24 24" fill="currentColor"><polygon points="5 3 19 12 5 21 5 3" /></svg>
);

export default CourseDetailPage;
