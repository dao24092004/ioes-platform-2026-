import React, { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useQuery } from '@tanstack/react-query';
import StudentLayout from '@/components/layout/StudentLayout';
import { StatCard } from '@/components/common/StatCard';
import { Card, CardTitleWithIcon } from '@/components/common/Card';
import { examApi, toStudentExamView, type StudentExamView } from '@/services/api/exam.api';
import { analyticsApi } from '@/services/api/analytics.api';
import { contentApi } from '@/services/api/content.api';
import ProgressBar from '@/components/common/ProgressBar';
import { useAuthStore } from '@/app/store/authStore';

const examStatusStyles: Record<StudentExamView['status'], { bg: string; text: string; label: string }> = {
  available: { bg: 'bg-emerald-50 dark:bg-emerald-900/30', text: 'text-emerald-600 dark:text-emerald-400', label: 'student.exams.status.available' },
  in_progress: { bg: 'bg-amber-50 dark:bg-amber-900/30', text: 'text-amber-600 dark:text-amber-400', label: 'student.exams.status.in_progress' },
  completed: { bg: 'bg-slate-100 dark:bg-slate-800', text: 'text-slate-600 dark:text-slate-400', label: 'student.exams.status.completed' },
};

/**
 * Tổng quan học viên.
 *
 * Số liệu từ analytics (`GET /analytics/users/{id}`, `/leaderboard/me`),
 * exam-suite (`GET /exams`, `/attempts`) và content-service (khoá đã ghi danh
 * kèm tiến độ). Giờ học theo ngày trong tuần chưa có API nên vẫn là trạng thái
 * trống. Huy hiệu chỉ sáng khi số liệu thật đạt ngưỡng;
 * "Học nhanh" không có tiêu chí đo được nên đã bỏ.
 */
const DashboardPage: React.FC = () => {
  const { t } = useTranslation();
  const { user } = useAuthStore();
  const userId = user?.id;

  const { data: analytics, isError: analyticsError } = useQuery({
    queryKey: ['analytics', 'user', userId],
    queryFn: () => analyticsApi.getUserAnalytics(userId as string),
    enabled: Boolean(userId),
  });
  const { data: myRank } = useQuery({
    queryKey: ['analytics', 'leaderboard', 'me', 'ALL_TIME'],
    queryFn: () => analyticsApi.getMyRank('ALL_TIME'),
  });
  // Đếm từ content-service: analytics chưa nhận sự kiện ghi danh nên totalCoursesEnrolled không tăng.
  const { data: myEnrollments } = useQuery({
    queryKey: ['content', 'enrollments', 'me'],
    queryFn: () => contentApi.listMyEnrollments(),
  });
  const continueLearning = (myEnrollments ?? []).filter(e => e.enrollment.status !== 'completed').slice(0, 3);
  const {
    data: examList = [],
    isLoading: examListLoading,
    error: examListError,
  } = useQuery({ queryKey: ['student', 'exams', 'list'], queryFn: () => examApi.listExams() });
  const {
    data: attempts = [],
    isLoading: attemptsLoading,
    error: attemptsError,
  } = useQuery({ queryKey: ['student', 'attempts'], queryFn: () => examApi.listAttempts() });
  const examsLoading = examListLoading || attemptsLoading;
  const examsError = examListError ?? attemptsError;
  const exams = useMemo(() => examList.map(e => toStudentExamView(e, attempts)), [examList, attempts]);

  const greetingHour = new Date().getHours();
  const greetingKey = greetingHour < 12 ? 'student.dashboard.welcomeGreeting' : 'student.dashboard.welcomeTitle';

  const upcomingExams = exams.filter(e => e.status === 'available' || e.status === 'in_progress').slice(0, 4);
  const studyHours = analytics ? (analytics.totalStudyMinutes / 60).toFixed(1) : null;

  const achievements = [
    { id: 'first_course', icon: '🎓', unlocked: (analytics?.totalCoursesCompleted ?? 0) > 0 },
    { id: 'streak_7', icon: '🔥', unlocked: (analytics?.longestStreak ?? 0) >= 7 },
    { id: 'streak_30', icon: '⚡', unlocked: (analytics?.longestStreak ?? 0) >= 30 },
    { id: 'top_10', icon: '🏆', unlocked: myRank !== null && myRank !== undefined && myRank.rank <= 10 },
    { id: 'perfect_score', icon: '💯', unlocked: (analytics?.highestScore ?? 0) >= 100 },
  ];

  return (
    <StudentLayout
      title={t('student.dashboard.title')}
      subtitle={t('student.dashboard.subtitle')}
      headerActions={
        <Link
          to="/student/exams"
          className="hidden sm:inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold shadow-sm transition-colors"
        >
          {t('student.exams.title')}
        </Link>
      }
    >
      <section className="mb-6">
        <p className="text-sm text-slate-500 dark:text-slate-400">{t(greetingKey)},</p>
        <h2 className="text-2xl font-bold text-slate-900 dark:text-white">
          {user?.full_name || 'Student'}
        </h2>
      </section>

      {analyticsError && (
        <div className="mb-4 p-3 rounded-xl bg-red-50 dark:bg-red-900/20 text-sm text-red-600 dark:text-red-400">
          {t('common.loadError')}
        </div>
      )}

      <section className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-5 gap-4 mb-6">
        <StatCard color="blue" icon={<BookIcon />} value={myEnrollments?.length ?? '—'} label={t('student.dashboard.stats.enrolled')} />
        <StatCard color="emerald" icon={<CheckIcon />} value={analytics?.totalCoursesCompleted ?? '—'} label={t('student.dashboard.stats.completed')} />
        <StatCard color="purple" icon={<ExamIcon />} value={analytics?.totalExamsPassed ?? '—'} label={t('examApi.studentDashboard.stats.examsPassed')} />
        <StatCard color="amber" icon={<BoltIcon />} value={analytics?.currentStreak ?? '—'} label={t('examApi.studentDashboard.stats.streak')} />
        <StatCard color="cyan" icon={<ClockIcon />} value={studyHours !== null ? `${studyHours}h` : '—'} label={t('student.dashboard.stats.studyHours')} />
      </section>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        <div className="xl:col-span-2 space-y-6">
          <Card
            title={
              <CardTitleWithIcon color="primary">
                <BookIcon /><span>{t('student.dashboard.continueWhereLeft')}</span>
              </CardTitleWithIcon>
            }
          >
            {continueLearning.length === 0 ? (
              <div className="p-6 text-center text-sm text-slate-500 dark:text-slate-400">
                {myEnrollments && myEnrollments.length > 0 ? t('enrollmentApi.allCompleted') : t('enrollmentApi.noEnrollments')}{' '}
                <Link to="/student/courses" className="text-blue-600 dark:text-blue-400 hover:underline">
                  {t('enrollmentApi.browseCourses')}
                </Link>
              </div>
            ) : (
              <ul className="divide-y divide-slate-100 dark:divide-slate-800">
                {continueLearning.map(({ enrollment, course }) => (
                  <li key={enrollment.id}>
                    <Link
                      to={`/student/learn/${course.id}`}
                      className="flex items-center gap-4 p-4 hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors"
                    >
                      <div className="w-16 h-12 rounded-lg bg-gradient-to-br from-blue-500 to-cyan-500 overflow-hidden flex-shrink-0">
                        {course.thumbnailUrl && (
                          <img src={course.thumbnailUrl} alt={course.title} className="w-full h-full object-cover" />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-semibold text-slate-900 dark:text-white truncate">{course.title}</div>
                        <ProgressBar value={enrollment.progressPercent} className="mt-2" />
                      </div>
                      <span className="text-xs font-semibold text-slate-600 dark:text-slate-300 w-10 text-right">
                        {enrollment.progressPercent}%
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </Card>

          <Card
            title={
              <CardTitleWithIcon color="warning">
                <ExamIcon /><span>{t('student.dashboard.upcomingExams')}</span>
              </CardTitleWithIcon>
            }
            action={
              <Link to="/student/exams" className="text-sm font-medium text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1">
                {t('student.dashboard.viewAll')}
                <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M9 5l7 7-7 7" />
                </svg>
              </Link>
            }
          >
            {examsError ? (
              <div className="p-6 text-center text-sm text-red-600 dark:text-red-400">{t('common.loadError')}</div>
            ) : examsLoading ? (
              <div className="p-6 text-center"><div className="inline-block w-8 h-8 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" /></div>
            ) : upcomingExams.length === 0 ? (
              <div className="p-6 text-center text-sm text-slate-500">{t('student.exams.empty')}</div>
            ) : (
              <ul className="space-y-3">
                {upcomingExams.map((exam: StudentExamView) => {
                  const ss = examStatusStyles[exam.status];
                  return (
                    <li key={exam.id} className="flex items-center gap-4 p-3 rounded-xl bg-slate-50 dark:bg-slate-800/40 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors">
                      <div className="w-10 h-10 rounded-lg bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center text-amber-600 dark:text-amber-400 flex-shrink-0">
                        <ExamIcon />
                      </div>
                      <div className="flex-1 min-w-0">
                        <h3 className="text-sm font-semibold text-slate-900 dark:text-white truncate">{exam.title}</h3>
                        <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                          <span>{exam.timeLimitMinutes ?? '—'} {t('student.exams.duration')}</span>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 flex-shrink-0">
                        <span className={`px-2 py-1 rounded-md text-xs font-semibold ${ss.bg} ${ss.text}`}>
                          {t(ss.label)}
                        </span>
                        <Link
                          to={`/student/exams/${exam.id}/take`}
                          className="px-3 py-1.5 text-xs font-semibold rounded-lg bg-blue-600 text-white hover:bg-blue-700 transition-colors"
                        >
                          {exam.status === 'in_progress' ? t('student.exams.resumeBtn') : t('student.exams.startBtn')}
                        </Link>
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
          </Card>
        </div>

        <div className="space-y-6">
          <Card
            title={
              <CardTitleWithIcon color="accent">
                <ChartIcon /><span>{t('examApi.studentDashboard.summaryTitle')}</span>
              </CardTitleWithIcon>
            }
          >
            {analytics ? (
              <dl className="grid grid-cols-2 gap-4">
                <Summary label={t('examApi.studentDashboard.summary.attempted')} value={String(analytics.totalExamsAttempted)} />
                <Summary label={t('examApi.studentDashboard.summary.passRate')} value={`${analytics.passRate.toFixed(1)}%`} />
                <Summary label={t('examApi.studentDashboard.summary.avgScore')} value={analytics.avgScore.toFixed(1)} />
                <Summary label={t('examApi.studentDashboard.summary.longestStreak')} value={String(analytics.longestStreak)} />
              </dl>
            ) : (
              <div className="py-6 text-center text-sm text-slate-500 dark:text-slate-400">{t('common.noData')}</div>
            )}
          </Card>

          <Card
            title={
              <CardTitleWithIcon color="purple">
                <AwardIcon /><span>{t('student.dashboard.achievements')}</span>
              </CardTitleWithIcon>
            }
          >
            <div className="grid grid-cols-3 gap-3">
              {achievements.map(a => (
                <div
                  key={a.id}
                  title={a.unlocked ? undefined : t('examApi.studentDashboard.locked')}
                  className={`flex flex-col items-center gap-2 p-3 rounded-xl bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-800 dark:to-slate-800/50 ${
                    a.unlocked ? '' : 'opacity-40 grayscale'
                  }`}
                >
                  <div className="text-3xl">{a.icon}</div>
                  <div className="text-[10px] font-semibold text-center text-slate-700 dark:text-slate-300 leading-tight">
                    {t(`student.profile.achievements.${a.id}`)}
                  </div>
                </div>
              ))}
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-3">{t('examApi.studentDashboard.achievementsHint')}</p>
          </Card>
        </div>
      </div>
    </StudentLayout>
  );
};

const Summary: React.FC<{ label: string; value: string }> = ({ label, value }) => (
  <div>
    <dt className="text-xs text-slate-500 dark:text-slate-400">{label}</dt>
    <dd className="text-xl font-bold text-slate-900 dark:text-white">{value}</dd>
  </div>
);

const BookIcon = () => (
  <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
  </svg>
);
const BoltIcon = () => (
  <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
  </svg>
);
const CheckIcon = () => (
  <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <polyline points="20 6 9 17 4 12" />
  </svg>
);
const AwardIcon = () => (
  <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <circle cx="12" cy="8" r="7" />
    <polyline points="8.21 13.89 7 23 12 20 17 23 15.79 13.88" />
  </svg>
);
const ClockIcon = () => (
  <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <circle cx="12" cy="12" r="10" />
    <polyline points="12 6 12 12 16 14" />
  </svg>
);
const ExamIcon = () => (
  <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
  </svg>
);
const ChartIcon = () => (
  <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
  </svg>
);

export default DashboardPage;
