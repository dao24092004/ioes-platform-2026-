import React, { useMemo, useState } from 'react';
import { Link, useParams, useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import StudentLayout from '@/components/layout/StudentLayout';
import ProgressBar from '@/components/common/ProgressBar';
import { contentApi, isPaidCourse, type Lesson } from '@/services/api/content.api';

/**
 * Học một khoá: cây chương/bài học và nội dung bài học lấy từ content-service.
 *
 * Chưa ghi danh thì chỉ mở bài `isPreview`; bài khác hiện nút ghi danh (khoá có
 * giá thì báo chưa hỗ trợ thanh toán). Đã ghi danh thì đánh dấu hoàn thành từng
 * bài và tiến độ do backend tính lại. Nội dung bài học chính là `contentUrl`.
 */
const CourseLearnPage: React.FC = () => {
  const { t } = useTranslation();
  const { courseId = '' } = useParams<{ courseId: string }>();
  const [searchParams, setSearchParams] = useSearchParams();
  const [closedChapters, setClosedChapters] = useState<Set<string>>(() => new Set());

  const { data: detail, isLoading, isError } = useQuery({
    queryKey: ['content', 'course', courseId, 'detail'],
    queryFn: () => contentApi.getCourseDetail(courseId),
    enabled: !!courseId,
  });

  const qc = useQueryClient();
  const { data: enrollmentState } = useQuery({
    queryKey: ['content', 'enrollment', courseId],
    queryFn: () => contentApi.getEnrollmentState(courseId),
    enabled: !!courseId,
  });
  const enrolled = enrollmentState?.enrolled === true;
  const completedIds = useMemo(() => new Set(enrollmentState?.completedLessonIds ?? []), [enrollmentState]);

  const progressMut = useMutation({
    mutationFn: ({ lessonId, completed }: { lessonId: string; completed: boolean }) =>
      contentApi.setLessonCompleted(courseId, lessonId, completed),
    onSuccess: state => {
      qc.setQueryData(['content', 'enrollment', courseId], state);
      qc.invalidateQueries({ queryKey: ['content', 'enrollments'] });
    },
  });
  const enrollMut = useMutation({
    mutationFn: () => contentApi.enroll(courseId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['content', 'enrollment', courseId] });
      qc.invalidateQueries({ queryKey: ['content', 'enrollments'] });
      qc.invalidateQueries({ queryKey: ['content', 'course', courseId] });
    },
  });

  const course = detail?.course;
  const chapters = useMemo(() => detail?.chapters ?? [], [detail]);
  const allLessons = useMemo(() => chapters.flatMap(ch => ch.lessons), [chapters]);

  const activeLessonId = searchParams.get('lesson') ?? allLessons[0]?.id ?? null;
  const currentIdx = allLessons.findIndex(l => l.id === activeLessonId);
  const currentLesson: Lesson | undefined = allLessons[currentIdx];
  const nextLesson = currentIdx >= 0 ? allLessons[currentIdx + 1] : undefined;

  const selectLesson = (id: string) => setSearchParams({ lesson: id }, { replace: true });
  const canView = (lesson: Lesson) => enrolled || lesson.isPreview === true;
  const currentDone = currentLesson ? completedIds.has(currentLesson.id) : false;

  const toggleChapter = (id: string) => {
    setClosedChapters(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

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

  return (
    <StudentLayout
      title={course.title}
      subtitle={currentLesson ? `${t('student.learn.lesson')} ${currentIdx + 1} ${t('student.learn.of')} ${allLessons.length}` : ''}
      headerActions={
        <Link
          to={`/student/courses/${courseId}`}
          className="hidden sm:inline-flex items-center gap-2 px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 hover:border-blue-500 text-sm font-semibold transition-colors"
        >
          <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="15 18 9 12 15 6" /></svg>
          {t('student.learn.backToCourse')}
        </Link>
      }
    >
      <div className="flex flex-col lg:flex-row gap-6">
        {/* Sidebar: chương & bài học */}
        <aside className="lg:w-80 lg:flex-shrink-0">
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 overflow-hidden">
            <div className="px-5 py-4 border-b border-slate-200 dark:border-slate-800 flex items-center gap-3">
              <Link
                to={`/student/courses/${courseId}`}
                className="w-9 h-9 rounded-lg border border-slate-200 dark:border-slate-700 flex items-center justify-center hover:border-blue-500 text-slate-500 hover:text-blue-500 transition-colors"
              >
                <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="15 18 9 12 15 6" /></svg>
              </Link>
              <div className="flex-1 min-w-0">
                <h3 className="text-sm font-bold text-slate-900 dark:text-white truncate">{course.title}</h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  {t('student.courseDetail.lessonsCount', { count: allLessons.length })}
                </p>
              </div>
            </div>

            <div className="px-5 py-3 border-b border-slate-200 dark:border-slate-800 text-[11px] text-slate-500 dark:text-slate-400">
              {enrolled && enrollmentState?.enrollment ? (
                <>
                  <div className="flex justify-between mb-1.5">
                    <span>{t('enrollmentApi.progress')}</span>
                    <span>
                      {t('enrollmentApi.progressOf', { done: completedIds.size, total: allLessons.length })} ·{' '}
                      {enrollmentState.enrollment.progressPercent}%
                    </span>
                  </div>
                  <ProgressBar value={enrollmentState.enrollment.progressPercent} />
                </>
              ) : (
                t('enrollmentApi.lockedDescription')
              )}
            </div>

            <div className="max-h-[calc(100vh-300px)] overflow-y-auto p-3 space-y-3">
              {chapters.length === 0 && (
                <p className="px-3 py-2 text-xs text-slate-500">{t('courseApi.noChapters')}</p>
              )}
              {chapters.map((chapter, ci) => {
                const opened = !closedChapters.has(chapter.id);
                const minutes = chapter.lessons.reduce((s, l) => s + (l.durationMinutes ?? 0), 0);
                return (
                  <div key={chapter.id}>
                    <button
                      onClick={() => toggleChapter(chapter.id)}
                      className="w-full flex items-center justify-between px-3 py-2.5 rounded-lg bg-slate-50 dark:bg-slate-800/50 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors text-left"
                    >
                      <div className="flex items-center gap-2.5">
                        <span className="w-7 h-7 rounded-md bg-blue-600 text-white flex items-center justify-center text-xs font-bold">
                          {ci + 1}
                        </span>
                        <span className="text-xs font-semibold text-slate-700 dark:text-slate-200 line-clamp-2">{chapter.title}</span>
                      </div>
                      {minutes > 0 && (
                        <span className="text-xs text-slate-500 dark:text-slate-400 ml-2 shrink-0">
                          {minutes} {t('student.courseDetail.minutes')}
                        </span>
                      )}
                    </button>
                    <div className={`mt-1.5 space-y-0.5 ${opened ? 'block' : 'hidden'}`}>
                      {chapter.lessons.length === 0 && (
                        <p className="px-3 py-2 text-[11px] text-slate-500">{t('courseApi.noLessons')}</p>
                      )}
                      {chapter.lessons.map(lesson => {
                        const isActive = lesson.id === activeLessonId;
                        return (
                          <button
                            key={lesson.id}
                            onClick={() => selectLesson(lesson.id)}
                            className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors text-left ${
                              isActive
                                ? 'bg-blue-50 dark:bg-blue-900/20 border-l-[3px] border-blue-600'
                                : 'hover:bg-slate-50 dark:hover:bg-slate-800/40 border-l-[3px] border-transparent'
                            }`}
                          >
                            <div
                              className={`w-7 h-7 rounded-md flex items-center justify-center text-[10px] font-bold flex-shrink-0 ${
                                isActive
                                  ? 'bg-blue-600 text-white'
                                  : completedIds.has(lesson.id)
                                  ? 'bg-emerald-100 text-emerald-600 dark:bg-emerald-900/40 dark:text-emerald-400'
                                  : 'bg-slate-100 dark:bg-slate-800 text-slate-500'
                              }`}
                            >
                              {completedIds.has(lesson.id) ? (
                                <CheckIcon />
                              ) : canView(lesson) ? (
                                <svg className="w-3 h-3" viewBox="0 0 24 24" fill="currentColor"><polygon points="5 3 19 12 5 21 5 3" /></svg>
                              ) : (
                                <LockIcon />
                              )}
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="text-xs font-semibold text-slate-800 dark:text-white truncate">{lesson.title}</div>
                              <div className="text-[10px] text-slate-500 dark:text-slate-400 mt-0.5">
                                {t(`courseApi.lessonType.${lesson.lessonType}`)}
                                {lesson.durationMinutes != null && ` · ${lesson.durationMinutes} ${t('student.courseDetail.minutes')}`}
                                {isActive ? ` • ${t('student.learn.current')}` : ''}
                              </div>
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </aside>

        {/* Nội dung bài học */}
        <main className="flex-1 min-w-0 flex flex-col bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 overflow-hidden">
          {!currentLesson ? (
            <div className="p-12 text-center text-sm text-slate-500">
              {allLessons.length === 0 ? t('courseApi.noChapters') : t('courseApi.selectLesson')}
            </div>
          ) : (
            <>
              {canView(currentLesson) ? (
                <LessonContent lesson={currentLesson} />
              ) : (
                <div className="aspect-video bg-slate-900 flex flex-col items-center justify-center text-center p-6 gap-3">
                  <span className="text-white/80"><LockIcon large /></span>
                  <p className="text-white font-semibold">{t('enrollmentApi.lockedTitle')}</p>
                  {isPaidCourse(course) ? (
                    <p className="text-sm text-white/70 max-w-sm">{t('enrollmentApi.paidNotice')}</p>
                  ) : (
                    <button
                      onClick={() => enrollMut.mutate()}
                      disabled={enrollMut.isPending}
                      className="px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold disabled:opacity-50"
                    >
                      {enrollMut.isPending ? t('enrollmentApi.enrolling') : t('enrollmentApi.enroll')}
                    </button>
                  )}
                  {enrollMut.error && <p className="text-xs text-red-400">{(enrollMut.error as Error).message}</p>}
                </div>
              )}

              <div className="px-6 py-5 border-b border-slate-200 dark:border-slate-800">
                <div className="flex items-start justify-between gap-4 flex-wrap">
                  <div>
                    <h2 className="text-lg font-bold text-slate-900 dark:text-white mb-2">{currentLesson.title}</h2>
                    <div className="flex items-center flex-wrap gap-4 text-xs text-slate-500 dark:text-slate-400">
                      <span>{t(`courseApi.lessonType.${currentLesson.lessonType}`)}</span>
                      {currentLesson.durationMinutes != null && (
                        <span className="flex items-center gap-1.5">
                          <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" /></svg>
                          {currentLesson.durationMinutes} {t('student.courseDetail.minutes')}
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2 flex-wrap">
                    {enrolled && (
                      <button
                        onClick={() => progressMut.mutate({ lessonId: currentLesson.id, completed: !currentDone })}
                        disabled={progressMut.isPending}
                        className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold transition-colors disabled:opacity-50 ${
                          currentDone
                            ? 'bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-100 dark:bg-emerald-900/30 dark:text-emerald-300 dark:border-emerald-800'
                            : 'border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800'
                        }`}
                      >
                        <CheckIcon />
                        {currentDone ? t('enrollmentApi.completedLesson') : t('enrollmentApi.markComplete')}
                      </button>
                    )}
                    {nextLesson && (
                      <button
                        onClick={() => selectLesson(nextLesson.id)}
                        className="flex items-center gap-2 px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold transition-colors shadow-sm"
                      >
                        {t('student.learn.actions.nextLesson')}
                        <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="5" y1="12" x2="19" y2="12" /><polyline points="12 5 19 12 12 19" /></svg>
                      </button>
                    )}
                  </div>
                </div>
                {progressMut.error && (
                  <p className="mt-2 text-xs text-red-600 dark:text-red-400">{(progressMut.error as Error).message}</p>
                )}
              </div>

              {currentLesson.description && (
                <div className="p-6 text-sm leading-relaxed text-slate-600 dark:text-slate-300 whitespace-pre-line">
                  {currentLesson.description}
                </div>
              )}
            </>
          )}
        </main>
      </div>
    </StudentLayout>
  );
};

const LessonContent: React.FC<{ lesson: Lesson }> = ({ lesson }) => {
  const { t } = useTranslation();

  if (lesson.lessonType === 'video' && lesson.contentUrl) {
    return (
      <div className="relative aspect-video bg-black">
        <video key={lesson.id} src={lesson.contentUrl} controls className="w-full h-full" />
      </div>
    );
  }

  return (
    <div className="aspect-video bg-slate-900 flex items-center justify-center text-center p-6">
      {lesson.contentUrl ? (
        <a
          href={lesson.contentUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-2 px-5 py-3 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold"
        >
          {t('courseApi.openContent')}
          <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 13v6a2 2 0 01-2 2H5a2 2 0 01-2-2V8a2 2 0 012-2h6M15 3h6v6M10 14L21 3" /></svg>
        </a>
      ) : (
        <p className="text-sm text-white/70">{t('courseApi.noContentUrl')}</p>
      )}
    </div>
  );
};

const CheckIcon = () => (
  <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><polyline points="20 6 9 17 4 12" /></svg>
);

const LockIcon: React.FC<{ large?: boolean }> = ({ large }) => (
  <svg className={large ? 'w-10 h-10' : 'w-3 h-3'} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
    <path d="M7 11V7a5 5 0 0110 0v4" />
  </svg>
);

export default CourseLearnPage;
