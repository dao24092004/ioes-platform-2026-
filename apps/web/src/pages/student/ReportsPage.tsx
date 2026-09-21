import React, { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useQueries, useQuery } from '@tanstack/react-query';
import StudentLayout from '@/components/layout/StudentLayout';
import { StatCard } from '@/components/common/StatCard';
import { Card, CardTitleWithIcon } from '@/components/common/Card';
import ProgressBar from '@/components/common/ProgressBar';
import { useAuthStore } from '@/app/store/authStore';
import { analyticsApi } from '@/services/api/analytics.api';
import { contentApi } from '@/services/api/content.api';
import { examApi, type ExamAttempt } from '@/services/api/exam.api';

/** Số lượt thi gần nhất vẽ trên biểu đồ điểm. */
const RECENT_EXAMS = 10;

const toTime = (iso: string | null) => (iso ? new Date(iso).getTime() : 0);

const Spinner = () => (
  <div className="p-8 text-center">
    <div className="inline-block w-8 h-8 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
  </div>
);

/**
 * Báo cáo học tập của học viên, chỉ dùng số liệu thật:
 * - Ghi danh và tiến độ: content-service (`GET /api/v1/courses/enrollments/me`).
 * - Điểm thi: exam-suite (`GET /api/attempts`), tiêu đề nạp theo từng exam.
 * - Chuỗi ngày học: analytics-service (`GET /api/analytics/users/:id`).
 *
 * Trước đây trang vẽ biểu đồ hình sin và các số cố định ("142h", "5/8"...).
 * Chưa có API chuỗi thời gian học theo ngày, và `totalStudyMinutes` chưa
 * được backend ghi, nên phần thời gian học chỉ hiện trạng thái trống.
 */
const ReportsPage: React.FC = () => {
  const { t, i18n } = useTranslation();
  const userId = useAuthStore((st) => st.user?.id);

  const enrollmentsQuery = useQuery({
    queryKey: ['content', 'enrollments', 'me'],
    queryFn: () => contentApi.listMyEnrollments(),
  });
  const attemptsQuery = useQuery({
    queryKey: ['student', 'attempts'],
    queryFn: () => examApi.listAttempts(),
  });
  const analyticsQuery = useQuery({
    queryKey: ['analytics', 'user', userId],
    queryFn: () => analyticsApi.getUserAnalytics(userId as string),
    enabled: Boolean(userId),
  });

  const formatDate = (iso: string | null) =>
    iso ? new Date(iso).toLocaleDateString(i18n.language) : '—';

  const courses = useMemo(() => {
    const list = [...(enrollmentsQuery.data ?? [])].sort(
      (a, b) =>
        toTime(b.enrollment.lastAccessedAt ?? b.enrollment.enrolledAt) -
        toTime(a.enrollment.lastAccessedAt ?? a.enrollment.enrolledAt),
    );
    const completed = list.filter((e) => e.enrollment.status === 'completed').length;
    const avgProgress =
      list.length > 0
        ? Math.round(list.reduce((sum, e) => sum + e.enrollment.progressPercent, 0) / list.length)
        : null;
    return { list, completed, avgProgress };
  }, [enrollmentsQuery.data]);

  const exams = useMemo(() => {
    const submitted = (attemptsQuery.data ?? [])
      .filter((a) => a.submittedAt !== null)
      .sort((a, b) => toTime(b.submittedAt) - toTime(a.submittedAt));
    const scored = submitted.filter(
      (a): a is ExamAttempt & { percentageScore: number } => a.percentageScore !== null,
    );
    const judged = submitted.filter((a) => a.passed !== null);
    const passed = judged.filter((a) => a.passed === true).length;
    return {
      submitted,
      passed,
      avgScore:
        scored.length > 0
          ? Math.round(scored.reduce((sum, a) => sum + a.percentageScore, 0) / scored.length)
          : null,
      bestScore: scored.length > 0 ? Math.round(Math.max(...scored.map((a) => a.percentageScore))) : null,
      passRate: judged.length > 0 ? Math.round((passed / judged.length) * 100) : null,
      // Cũ nhất bên trái để biểu đồ đọc theo thời gian.
      recent: scored.slice(0, RECENT_EXAMS).reverse(),
    };
  }, [attemptsQuery.data]);

  // Attempt chỉ mang examId; nạp tiêu đề cho những exam thật sự hiển thị.
  const shownExamIds = [
    ...new Set([...exams.recent, ...exams.submitted.slice(0, 1)].map((a) => a.examId)),
  ];
  const examQueries = useQueries({
    queries: shownExamIds.map((examId) => ({
      queryKey: ['exam', examId],
      queryFn: () => examApi.getExam(examId),
    })),
  });
  const examTitle = (examId: string) =>
    examQueries.find((q) => q.data?.id === examId)?.data?.title ?? '—';

  const coursesReady = enrollmentsQuery.isSuccess;
  const examsReady = attemptsQuery.isSuccess;
  const pct = (v: number | null) => (v === null ? '—' : `${v}%`);
  const outOf100 = (v: number | null) => (v === null ? '—' : `${v}/100`);

  const latestCourse = courses.list[0];
  const latestExam = exams.submitted[0];
  const analytics = analyticsQuery.data;

  return (
    <StudentLayout title={t('student.reports.title')} subtitle={t('student.reports.subtitle')}>
      <section className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <StatCard
          color="blue"
          icon={<BookIcon />}
          value={coursesReady ? courses.list.length : '—'}
          label={t('student.reports.stats.enrolled')}
        />
        <StatCard
          color="emerald"
          icon={<CheckIcon />}
          value={coursesReady ? courses.completed : '—'}
          label={t('student.reports.stats.completed')}
        />
        <StatCard
          color="amber"
          icon={<ExamIcon />}
          value={examsReady ? outOf100(exams.avgScore) : '—'}
          label={t('student.reports.stats.avgScore')}
        />
        <StatCard
          color="purple"
          icon={<TrophyIcon />}
          value={examsReady ? pct(exams.passRate) : '—'}
          label={t('student.reports.stats.passRate')}
        />
      </section>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card
          title={<CardTitleWithIcon color="primary"><BookIcon /><span>{t('student.reports.courseProgress.title')}</span></CardTitleWithIcon>}
          action={
            coursesReady && courses.avgProgress !== null ? (
              <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 whitespace-nowrap">
                {t('student.reports.courseProgress.avg', { value: courses.avgProgress })}
              </span>
            ) : undefined
          }
        >
          {enrollmentsQuery.isLoading ? (
            <Spinner />
          ) : enrollmentsQuery.isError ? (
            <div className="p-8 text-center text-sm text-red-600 dark:text-red-400">{t('common.loadError')}</div>
          ) : courses.list.length === 0 ? (
            <div className="p-8 text-center text-sm text-slate-500 dark:text-slate-400">
              {t('student.reports.courseProgress.empty')}{' '}
              <Link to="/student/courses" className="text-blue-600 dark:text-blue-400 hover:underline">
                {t('student.reports.courseProgress.browse')}
              </Link>
            </div>
          ) : (
            <ul className="space-y-4 max-h-96 overflow-y-auto pr-1">
              {courses.list.map(({ enrollment, course }) => (
                <li key={enrollment.id}>
                  <div className="flex items-center justify-between gap-3 mb-1.5">
                    <Link
                      to={`/student/courses/${course.id}`}
                      className="text-sm font-semibold text-slate-900 dark:text-white hover:text-blue-600 truncate"
                    >
                      {course.title}
                    </Link>
                    <span className="text-xs font-bold text-slate-700 dark:text-slate-300 shrink-0">
                      {enrollment.progressPercent}%
                    </span>
                  </div>
                  <ProgressBar value={enrollment.progressPercent} />
                  <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">
                    {enrollment.status === 'completed'
                      ? `${t('student.reports.courseProgress.completed')} · ${formatDate(enrollment.completedAt)}`
                      : enrollment.lastAccessedAt
                        ? t('student.reports.courseProgress.lastAccessed', { date: formatDate(enrollment.lastAccessedAt) })
                        : t('student.reports.courseProgress.enrolledAt', { date: formatDate(enrollment.enrolledAt) })}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </Card>

        <Card
          title={<CardTitleWithIcon color="success"><ChartIcon /><span>{t('student.reports.examScores.title')}</span></CardTitleWithIcon>}
          action={
            exams.recent.length > 0 ? (
              <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 whitespace-nowrap">
                {t('student.reports.examScores.recent', { n: exams.recent.length })}
              </span>
            ) : undefined
          }
        >
          {attemptsQuery.isLoading ? (
            <Spinner />
          ) : attemptsQuery.isError ? (
            <div className="p-8 text-center text-sm text-red-600 dark:text-red-400">{t('common.loadError')}</div>
          ) : exams.submitted.length === 0 ? (
            <div className="p-8 text-center text-sm text-slate-500 dark:text-slate-400">
              {t('student.reports.examScores.empty')}{' '}
              <Link to="/student/exams" className="text-blue-600 dark:text-blue-400 hover:underline">
                {t('student.reports.examScores.browse')}
              </Link>
            </div>
          ) : (
            <>
              <div className="grid grid-cols-3 gap-3 mb-5">
                {[
                  { label: t('student.reports.examScores.taken'), value: exams.submitted.length },
                  { label: t('student.reports.examScores.passed'), value: exams.passed },
                  { label: t('student.reports.examScores.best'), value: outOf100(exams.bestScore) },
                ].map((s) => (
                  <div key={s.label} className="text-center p-3 rounded-xl bg-slate-50 dark:bg-slate-800/50">
                    <div className="text-xl font-bold text-slate-900 dark:text-white">{s.value}</div>
                    <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">{s.label}</div>
                  </div>
                ))}
              </div>
              {exams.recent.length === 0 ? (
                <div className="p-6 text-center text-sm text-slate-500 dark:text-slate-400">
                  {t('student.reports.examScores.noGraded')}
                </div>
              ) : (
                <div className="flex items-end gap-2 h-48">
                  {exams.recent.map((a) => {
                    const score = Math.round(a.percentageScore);
                    const barColor =
                      a.passed === true
                        ? 'from-emerald-500 to-teal-400'
                        : a.passed === false
                          ? 'from-red-500 to-rose-400'
                          : 'from-blue-500 to-cyan-400';
                    return (
                      <Link
                        key={a.id}
                        to={`/student/exams/${a.examId}/result`}
                        className="flex-1 min-w-0 h-full flex flex-col items-center gap-1 group"
                        title={`${examTitle(a.examId)} · ${score}/100 · ${formatDate(a.submittedAt)}`}
                      >
                        <span className="text-[10px] font-bold text-slate-700 dark:text-slate-300">{score}</span>
                        <div className="flex-1 w-full flex items-end">
                          <div
                            className={`w-full rounded-t-md bg-gradient-to-t ${barColor} group-hover:opacity-80 transition-opacity`}
                            style={{ height: `${Math.max(0, Math.min(100, score))}%`, minHeight: 4 }}
                          />
                        </div>
                        <span className="text-[10px] text-slate-500 dark:text-slate-400 truncate max-w-full">
                          {a.submittedAt ? new Date(a.submittedAt).toLocaleDateString(i18n.language, { day: '2-digit', month: '2-digit' }) : '—'}
                        </span>
                      </Link>
                    );
                  })}
                </div>
              )}
            </>
          )}
        </Card>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-6">
        <Card padding="md">
          <h3 className="font-bold text-sm text-slate-900 dark:text-white mb-2">{t('student.reports.recentCourse.title')}</h3>
          {enrollmentsQuery.isLoading ? (
            <div className="text-2xl font-bold text-slate-400">—</div>
          ) : enrollmentsQuery.isError ? (
            <div className="text-sm text-red-600 dark:text-red-400">{t('common.loadError')}</div>
          ) : latestCourse ? (
            <>
              <Link
                to={`/student/courses/${latestCourse.course.id}`}
                className="block text-xl font-bold text-blue-600 dark:text-blue-400 truncate hover:underline"
              >
                {latestCourse.course.title}
              </Link>
              <div className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                {t('student.reports.recentCourse.progress', { value: latestCourse.enrollment.progressPercent })}
              </div>
            </>
          ) : (
            <div className="text-sm text-slate-500 dark:text-slate-400">{t('student.reports.recentCourse.empty')}</div>
          )}
        </Card>

        <Card padding="md">
          <h3 className="font-bold text-sm text-slate-900 dark:text-white mb-2">{t('student.reports.recentExam.title')}</h3>
          {attemptsQuery.isLoading ? (
            <div className="text-2xl font-bold text-slate-400">—</div>
          ) : attemptsQuery.isError ? (
            <div className="text-sm text-red-600 dark:text-red-400">{t('common.loadError')}</div>
          ) : latestExam ? (
            <>
              <div className={`text-2xl font-bold ${
                latestExam.passed === false ? 'text-red-600 dark:text-red-400' : 'text-emerald-600 dark:text-emerald-400'
              }`}>
                {latestExam.percentageScore !== null
                  ? `${Math.round(latestExam.percentageScore)}/100`
                  : t('student.reports.recentExam.pending')}
              </div>
              <div className="text-xs text-slate-500 dark:text-slate-400 mt-1 truncate">
                {examTitle(latestExam.examId)} · {formatDate(latestExam.submittedAt)}
              </div>
            </>
          ) : (
            <div className="text-sm text-slate-500 dark:text-slate-400">{t('student.reports.recentExam.empty')}</div>
          )}
        </Card>

        <Card padding="md">
          <h3 className="font-bold text-sm text-slate-900 dark:text-white mb-2">{t('student.reports.streak.title')}</h3>
          {analyticsQuery.isError ? (
            <div className="text-sm text-red-600 dark:text-red-400">{t('common.loadError')}</div>
          ) : (
            <>
              <div className="text-2xl font-bold text-amber-600 dark:text-amber-400">
                {analytics ? `${analytics.currentStreak} ${t('student.reports.streak.days')}` : '—'}
              </div>
              {analytics && (
                <div className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                  {t('student.reports.streak.longest', { n: analytics.longestStreak })}
                </div>
              )}
            </>
          )}
        </Card>
      </div>

      <div className="mt-6 p-4 rounded-2xl border border-dashed border-slate-300 dark:border-slate-700 flex items-start gap-3">
        <span className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0 bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400">
          <ClockIcon />
        </span>
        <div>
          <div className="text-sm font-semibold text-slate-700 dark:text-slate-200">{t('student.reports.studyTime.title')}</div>
          <div className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">{t('student.reports.studyTime.empty')}</div>
        </div>
      </div>
    </StudentLayout>
  );
};

const ClockIcon = () => (<svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" /></svg>);
const ExamIcon = () => (<svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" /></svg>);
const TrophyIcon = () => (<svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M8 21h8M12 17v4M17 4H7l1 7a5 5 0 0010 0l-1-7zM3 4h4v3a3 3 0 01-3 3V4zM21 4h-4v3a3 3 0 003-3V4z" /></svg>);
const BookIcon = () => (<svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253" /></svg>);
const CheckIcon = () => (<svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M22 11.08V12a10 10 0 11-5.93-9.14" /><polyline points="22 4 12 14.01 9 11.01" /></svg>);
const ChartIcon = () => (<svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" /></svg>);

export default ReportsPage;
