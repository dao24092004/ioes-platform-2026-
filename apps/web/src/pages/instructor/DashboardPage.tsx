import React, { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useQuery } from '@tanstack/react-query';
import InstructorLayout from '@/components/layout/InstructorLayout';
import { examApi } from '@/services/api/exam.api';
import { analyticsApi } from '@/services/api/analytics.api';
import { useAuthStore } from '@/app/store/authStore';
import { formatRelative } from '@/utils/time';

/**
 * Tổng quan giảng viên.
 *
 * Số thật: đề của giảng viên (`GET /exams`), hàng đợi chấm (`/exams/grading/*`)
 * và bảng xếp hạng tuần (analytics — toàn nền tảng, chưa lọc theo học viên của
 * giảng viên). Khoá học, số học viên, đánh giá và hoạt động gần đây chưa có
 * API nên hiện trạng thái trống thay vì số tự bịa.
 */
const DashboardPage: React.FC = () => {
  const { t } = useTranslation();
  const { user } = useAuthStore();

  const { data: exams = [], isLoading: examsLoading, isError: examsError } = useQuery({
    queryKey: ['instructor', 'exams', 'list'],
    queryFn: () => examApi.listExams(),
  });
  const { data: gradingStats } = useQuery({
    queryKey: ['exams', 'grading', 'stats'],
    queryFn: () => examApi.getGradingStats(),
  });
  const { data: queue = [] } = useQuery({
    queryKey: ['exams', 'grading', 'queue'],
    queryFn: () => examApi.getGradingQueue(),
  });
  const { data: leaderboard = [], isError: leaderboardError } = useQuery({
    queryKey: ['analytics', 'leaderboard', 'WEEKLY', 5],
    queryFn: () => analyticsApi.getLeaderboard('WEEKLY', 5),
  });

  const pendingByExam = useMemo(() => {
    const map = new Map<string, number>();
    for (const item of queue) map.set(item.examId, (map.get(item.examId) ?? 0) + 1);
    return map;
  }, [queue]);

  const greetingHour = new Date().getHours();
  const greetingKey = greetingHour < 12 ? 'instructor.dashboard.welcomeGreeting' : 'instructor.dashboard.welcomeTitle';

  return (
    <InstructorLayout
      title={t('instructor.dashboard.title')}
      subtitle={t('instructor.dashboard.subtitle')}
      headerActions={
        <Link
          to="/instructor/courses/create"
          className="hidden sm:inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold shadow-sm transition-colors"
        >
          <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <path d="M12 5v14M5 12h14" />
          </svg>
          {t('instructor.course.create')}
        </Link>
      }
    >
      <section className="mb-6">
        <p className="text-sm text-slate-500 dark:text-slate-400">{t(greetingKey)},</p>
        <h2 className="text-2xl font-bold text-slate-900 dark:text-white">
          {user?.full_name || 'Instructor'}
        </h2>
      </section>

      <section className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4 mb-6">
        <StatCard color="blue" icon={<ExamIcon />} value={examsLoading ? '—' : exams.length} label={t('instructor.dashboard.stats.exams')} />
        <StatCard color="orange" icon={<ClockIcon />} value={gradingStats?.pending ?? '—'} label={t('examApi.instructorDashboard.stats.pending')} />
        <StatCard color="green" icon={<CheckIcon />} value={gradingStats?.graded ?? '—'} label={t('examApi.instructorDashboard.stats.graded')} />
        <StatCard
          color="teal"
          icon={<ShieldIcon />}
          value={examsLoading ? '—' : exams.filter(e => e.isProctored).length}
          label={t('examApi.instructorDashboard.stats.proctored')}
        />
      </section>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        <div className="xl:col-span-2 space-y-6">
          <Card
            title={
              <CardTitleWithIcon color="primary">
                <BookIcon />
                <span>{t('instructor.dashboard.myCourses')}</span>
              </CardTitleWithIcon>
            }
          >
            <EmptyState text={t('examApi.instructorDashboard.noCourseApi')} />
          </Card>

          <Card
            title={
              <CardTitleWithIcon color="warning">
                <ExamIcon />
                <span>{t('examApi.instructorDashboard.myExams')}</span>
              </CardTitleWithIcon>
            }
            action={
              <Link
                to="/instructor/exams"
                className="text-sm font-medium text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1"
              >
                {t('instructor.dashboard.viewAll')}
                <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M9 5l7 7-7 7" />
                </svg>
              </Link>
            }
          >
            {examsError ? (
              <EmptyState text={t('common.loadError')} tone="error" />
            ) : examsLoading ? (
              <Spinner />
            ) : exams.length === 0 ? (
              <EmptyState text={t('examApi.instructorDashboard.noExams')} />
            ) : (
              <ul className="space-y-3">
                {exams.slice(0, 5).map(exam => {
                  const pending = pendingByExam.get(exam.id) ?? 0;
                  return (
                    <li
                      key={exam.id}
                      className="flex items-center gap-4 p-3 rounded-xl bg-slate-50 dark:bg-slate-800/40 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                    >
                      <div className="w-10 h-10 rounded-lg bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center text-amber-600 dark:text-amber-400 flex-shrink-0">
                        <DocumentIcon />
                      </div>
                      <div className="flex-1 min-w-0">
                        <h3 className="text-sm font-semibold text-slate-900 dark:text-white truncate">{exam.title}</h3>
                        <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                          <span>{t(`student.exams.type.${exam.examType}`)}</span>
                          <span>•</span>
                          <span>
                            {exam.timeLimitMinutes !== null
                              ? `${exam.timeLimitMinutes} ${t('shared.durationUnit')}`
                              : t('shared.none')}
                          </span>
                          <span>•</span>
                          <span>{formatRelative(exam.updatedAt)}</span>
                        </div>
                      </div>
                      {pending > 0 ? (
                        <Link
                          to="/instructor/grading"
                          className="px-3 py-1.5 text-xs font-semibold rounded-lg bg-blue-600 text-white hover:bg-blue-700 transition-colors flex-shrink-0"
                        >
                          {t('examApi.instructorDashboard.pendingCount', { count: pending })}
                        </Link>
                      ) : (
                        <span className="text-xs text-slate-500 dark:text-slate-400 flex-shrink-0">
                          {t('examApi.instructorDashboard.noPending')}
                        </span>
                      )}
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
              <h2 className="text-base font-bold text-slate-900 dark:text-white">
                {t('instructor.dashboard.quickActions')}
              </h2>
            }
          >
            <div className="grid grid-cols-2 gap-3">
              <QuickAction color="purple" icon={<BookIcon />} href="/instructor/courses/create">
                {t('instructor.nav.createCourse')}
              </QuickAction>
              <QuickAction color="teal" icon={<DocumentIcon />} href="/instructor/grading">
                {t('instructor.grading.title')}
              </QuickAction>
              <QuickAction color="orange" icon={<SparklesIcon />} href="/instructor/ai-question">
                {t('instructor.dashboard.aiQuestion')}
              </QuickAction>
              <QuickAction color="green" icon={<ChartIcon />} href="/instructor/analytics">
                {t('instructor.analytics.title')}
              </QuickAction>
            </div>
          </Card>

          <Card
            title={
              <CardTitleWithIcon color="success">
                <TrophyIcon />
                <span>{t('instructor.dashboard.topStudents')}</span>
              </CardTitleWithIcon>
            }
          >
            <p className="text-xs text-slate-500 dark:text-slate-400 mb-3">{t('examApi.instructorDashboard.leaderboardScope')}</p>
            {leaderboardError ? (
              <EmptyState text={t('common.loadError')} tone="error" />
            ) : leaderboard.length === 0 ? (
              <EmptyState text={t('common.noData')} />
            ) : (
              <ul className="space-y-3">
                {leaderboard.map(entry => {
                  const name = entry.displayName ?? entry.userId.slice(0, 8);
                  return (
                    <li key={entry.userId} className="flex items-center gap-3">
                      <div
                        className={`w-8 h-8 rounded-lg flex items-center justify-center text-xs font-bold flex-shrink-0 ${
                          entry.rank === 1
                            ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300'
                            : entry.rank === 2
                            ? 'bg-slate-200 text-slate-700 dark:bg-slate-700 dark:text-slate-200'
                            : entry.rank === 3
                            ? 'bg-orange-100 text-orange-700 dark:bg-orange-900/40 dark:text-orange-300'
                            : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400'
                        }`}
                      >
                        {entry.rank}
                      </div>
                      <div className="w-9 h-9 rounded-full bg-gradient-to-br from-blue-500 to-cyan-500 flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
                        {getInitials(name)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-semibold text-slate-900 dark:text-white truncate">{name}</div>
                        <div className="text-xs text-slate-500 dark:text-slate-400">
                          {t('examApi.instructorDashboard.examsCompleted', { count: entry.examsCompleted })}
                        </div>
                      </div>
                      <div className="text-base font-bold text-blue-600 dark:text-blue-400">{entry.score}</div>
                    </li>
                  );
                })}
              </ul>
            )}
          </Card>

          <Card
            title={
              <CardTitleWithIcon color="accent">
                <BellIcon />
                <span>{t('instructor.dashboard.recentActivity')}</span>
              </CardTitleWithIcon>
            }
          >
            <EmptyState text={t('examApi.instructorDashboard.noActivityApi')} />
          </Card>
        </div>
      </div>
    </InstructorLayout>
  );
};

const EmptyState: React.FC<{ text: string; tone?: 'muted' | 'error' }> = ({ text, tone = 'muted' }) => (
  <div
    className={`py-6 text-center text-sm ${
      tone === 'error' ? 'text-red-600 dark:text-red-400' : 'text-slate-500 dark:text-slate-400'
    }`}
  >
    {text}
  </div>
);

const Spinner: React.FC = () => (
  <div className="py-6 text-center">
    <div className="inline-block w-8 h-8 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
  </div>
);

interface StatCardProps {
  color: 'blue' | 'teal' | 'orange' | 'green';
  icon: React.ReactNode;
  value: string | number;
  label: string;
}

const StatCard: React.FC<StatCardProps> = ({ color, icon, value, label }) => {
  const colorMap: Record<StatCardProps['color'], string> = {
    blue: 'from-blue-500 to-cyan-500',
    teal: 'from-teal-500 to-emerald-500',
    orange: 'from-amber-500 to-orange-500',
    green: 'from-emerald-500 to-green-500',
  };
  return (
    <div className="bg-white dark:bg-slate-900 rounded-2xl p-5 border border-slate-200 dark:border-slate-800 hover:shadow-lg transition-shadow">
      <div className="flex items-start gap-4">
        <div
          className={`w-12 h-12 rounded-xl bg-gradient-to-br ${colorMap[color]} flex items-center justify-center text-white flex-shrink-0`}
        >
          {icon}
        </div>
        <div className="flex-1 min-w-0">
          <div className="text-2xl font-bold text-slate-900 dark:text-white">{value}</div>
          <div className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">{label}</div>
        </div>
      </div>
    </div>
  );
};

interface CardProps {
  title: React.ReactNode;
  action?: React.ReactNode;
  children: React.ReactNode;
}

const Card: React.FC<CardProps> = ({ title, action, children }) => (
  <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 overflow-hidden">
    <div className="px-5 py-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between gap-4">
      {title}
      {action}
    </div>
    <div className="p-5">{children}</div>
  </div>
);

interface CardTitleWithIconProps {
  color: 'primary' | 'warning' | 'success' | 'accent';
  children: React.ReactNode;
}

const CardTitleWithIcon: React.FC<CardTitleWithIconProps> = ({ color, children }) => {
  const colorMap: Record<CardTitleWithIconProps['color'], string> = {
    primary: 'bg-blue-100 text-blue-600 dark:bg-blue-900/40 dark:text-blue-300',
    warning: 'bg-amber-100 text-amber-600 dark:bg-amber-900/40 dark:text-amber-300',
    success: 'bg-emerald-100 text-emerald-600 dark:bg-emerald-900/40 dark:text-emerald-300',
    accent: 'bg-cyan-100 text-cyan-600 dark:bg-cyan-900/40 dark:text-cyan-300',
  };
  const [icon, label] = React.Children.toArray(children);
  return (
    <h2 className="flex items-center gap-3 text-base font-bold text-slate-900 dark:text-white">
      <span className={`w-8 h-8 rounded-lg flex items-center justify-center ${colorMap[color]}`}>{icon}</span>
      {label}
    </h2>
  );
};

interface QuickActionProps {
  color: 'purple' | 'teal' | 'orange' | 'green';
  icon: React.ReactNode;
  href: string;
  children: React.ReactNode;
}

const QuickAction: React.FC<QuickActionProps> = ({ color, icon, href, children }) => {
  const colorMap: Record<QuickActionProps['color'], string> = {
    purple: 'bg-purple-100 text-purple-600 dark:bg-purple-900/40 dark:text-purple-300',
    teal: 'bg-cyan-100 text-cyan-600 dark:bg-cyan-900/40 dark:text-cyan-300',
    orange: 'bg-amber-100 text-amber-600 dark:bg-amber-900/40 dark:text-amber-300',
    green: 'bg-emerald-100 text-emerald-600 dark:bg-emerald-900/40 dark:text-emerald-300',
  };
  return (
    <Link
      to={href}
      className="flex flex-col items-center gap-2 p-4 rounded-xl border border-slate-200 dark:border-slate-800 hover:border-blue-300 dark:hover:border-blue-700 hover:shadow-md transition-all"
    >
      <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${colorMap[color]}`}>{icon}</div>
      <span className="text-xs font-semibold text-center text-slate-700 dark:text-slate-300 leading-tight">
        {children}
      </span>
    </Link>
  );
};

const getInitials = (name: string) =>
  name.split(' ').filter(Boolean).map(s => s.charAt(0)).slice(0, 2).join('').toUpperCase();

const BookIcon = () => (
  <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
  </svg>
);

const ExamIcon = () => (
  <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
  </svg>
);

const ClockIcon = () => (
  <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <circle cx="12" cy="12" r="10" />
    <polyline points="12 6 12 12 16 14" />
  </svg>
);

const CheckIcon = () => (
  <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
  </svg>
);

const ShieldIcon = () => (
  <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
  </svg>
);

const DocumentIcon = () => (
  <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
  </svg>
);

const ChartIcon = () => (
  <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
  </svg>
);

const SparklesIcon = () => (
  <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
  </svg>
);

const TrophyIcon = () => (
  <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M6 9H4.5a2.5 2.5 0 010-5H6m12 5h1.5a2.5 2.5 0 000-5H18M6 9v10a1 1 0 001 1h3m4 0H7a1 1 0 01-1-1v-2m12-2v5a1 1 0 01-1 1h-3m-4 0H8a1 1 0 01-1-1v-2" />
    <path d="M9 9h6v6H9z" />
  </svg>
);

const BellIcon = () => (
  <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
  </svg>
);

export default DashboardPage;
