import React from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useQuery } from '@tanstack/react-query';
import InstructorLayout from '@/components/layout/InstructorLayout';
import { instructorApi, type InstructorCourseRow, type InstructorExamRow, type InstructorTopStudent, type InstructorActivityRow } from '@/services/api';
import { useAuthStore } from '@/app/store/authStore';
import { formatRelative } from '@/utils/time';

const DashboardPage: React.FC = () => {
  const { t } = useTranslation();
  const { user } = useAuthStore();

  const { data: stats } = useQuery({
    queryKey: ['instructor', 'dashboard', 'stats'],
    queryFn: () => instructorApi.dashboardStats(),
  });

  const { data: courses = [] } = useQuery({
    queryKey: ['instructor', 'dashboard', 'courses'],
    queryFn: () => instructorApi.myCourses(),
  });

  const { data: exams = [] } = useQuery({
    queryKey: ['instructor', 'dashboard', 'exams'],
    queryFn: () => instructorApi.upcomingExams(),
  });

  const { data: topStudents = [] } = useQuery({
    queryKey: ['instructor', 'dashboard', 'top-students'],
    queryFn: () => instructorApi.topStudents(),
  });

  const { data: activity = [] } = useQuery({
    queryKey: ['instructor', 'dashboard', 'activity'],
    queryFn: () => instructorApi.activity(),
  });

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
        <StatCard
          color="blue"
          icon={<BookIcon />}
          value={stats?.courses ?? 0}
          label={t('instructor.dashboard.stats.courses')}
          change={`+${stats?.monthly_growth.courses ?? 0}`}
        />
        <StatCard
          color="teal"
          icon={<UsersIcon />}
          value={(stats?.students ?? 0).toLocaleString('en-US')}
          label={t('instructor.dashboard.stats.students')}
          change={`+${stats?.monthly_growth.students ?? 0}`}
        />
        <StatCard
          color="orange"
          icon={<ExamIcon />}
          value={stats?.exams ?? 0}
          label={t('instructor.dashboard.stats.exams')}
          change={`+${stats?.monthly_growth.exams ?? 0}`}
        />
        <StatCard
          color="green"
          icon={<StarIcon />}
          value={stats?.rating?.toFixed(1) ?? '0.0'}
          label={t('instructor.dashboard.stats.rating')}
          change={`+${stats?.monthly_growth.rating ?? 0}`}
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
            action={
              <Link
                to="/instructor/courses"
                className="text-sm font-medium text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1"
              >
                {t('instructor.dashboard.viewAll')}
                <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M9 5l7 7-7 7" />
                </svg>
              </Link>
            }
          >
            <ul className="divide-y divide-slate-100 dark:divide-slate-800">
              {courses.slice(0, 4).map((course: InstructorCourseRow) => (
                <li key={course.id} className="py-3 flex items-center gap-4">
                  <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-500 to-cyan-500 flex items-center justify-center text-white flex-shrink-0">
                    <svg className="w-6 h-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                    </svg>
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="text-sm font-semibold text-slate-900 dark:text-white truncate">{course.title}</h3>
                    <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400 mt-1">
                      <span>
                        {course.lessons_count} {t('instructor.dashboard.courseUnit')}
                      </span>
                      <span>•</span>
                      <span>{formatRelative(course.updated_at)}</span>
                    </div>
                  </div>
                  <div className="flex flex-col items-end gap-1 min-w-[120px]">
                    <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                      {course.enrollments} {t('instructor.dashboard.studentsUnit')}
                    </span>
                    <div className="w-full h-1.5 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-gradient-to-r from-blue-500 to-cyan-500 rounded-full"
                        style={{ width: `${course.progress}%` }}
                      />
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          </Card>

          <Card
            title={
              <CardTitleWithIcon color="warning">
                <ExamIcon />
                <span>{t('instructor.dashboard.upcomingExams')}</span>
              </CardTitleWithIcon>
            }
            action={
              <Link
                to="/instructor/grading"
                className="text-sm font-medium text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1"
              >
                {t('instructor.dashboard.viewAll')}
                <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M9 5l7 7-7 7" />
                </svg>
              </Link>
            }
          >
            <ul className="space-y-3">
              {exams.map((exam: InstructorExamRow) => {
                const isPending = exam.pending_grading > 0;
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
                        <span>
                          {exam.participants} {t('instructor.dashboard.studentsUnit')}
                        </span>
                        <span>•</span>
                        <span>
                          {exam.pending_grading > 0
                            ? `${t('instructor.dashboard.pendingGrading')}: ${exam.pending_grading} ${t('instructor.dashboard.courseUnit')}`
                            : exam.expires_at
                            ? `${t('instructor.dashboard.expiringSoon')}: ${formatRelative(exam.expires_at)}`
                            : t('instructor.dashboard.waiting')}
                        </span>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <button className="px-3 py-1.5 text-xs font-semibold rounded-lg bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 transition-colors">
                        {t('instructor.dashboard.monitors')}
                      </button>
                      <button
                        className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors ${
                          isPending
                            ? 'bg-blue-600 text-white hover:bg-blue-700'
                            : 'bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600'
                        }`}
                      >
                        {isPending ? t('instructor.dashboard.gradeNow') : t('instructor.dashboard.results')}
                      </button>
                    </div>
                  </li>
                );
              })}
            </ul>
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
              <QuickAction color="teal" icon={<DocumentIcon />} href="/instructor/exams/create">
                {t('instructor.nav.createExam')}
              </QuickAction>
              <QuickAction color="orange" icon={<SparklesIcon />} href="/instructor/ai-question">
                {t('instructor.dashboard.aiQuestion')}
              </QuickAction>
              <QuickAction color="green" icon={<ChartIcon />} href="/instructor/analytics">
                {t('instructor.dashboard.export')}
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
            <ul className="space-y-3">
              {topStudents.map((student: InstructorTopStudent) => (
                <li key={student.id} className="flex items-center gap-3">
                  <div
                    className={`w-8 h-8 rounded-lg flex items-center justify-center text-xs font-bold flex-shrink-0 ${
                      student.rank === 1
                        ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300'
                        : student.rank === 2
                        ? 'bg-slate-200 text-slate-700 dark:bg-slate-700 dark:text-slate-200'
                        : student.rank === 3
                        ? 'bg-orange-100 text-orange-700 dark:bg-orange-900/40 dark:text-orange-300'
                        : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400'
                    }`}
                  >
                    {student.rank}
                  </div>
                  <div className="w-9 h-9 rounded-full bg-gradient-to-br from-blue-500 to-cyan-500 flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
                    {getInitials(student.full_name)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-semibold text-slate-900 dark:text-white truncate">
                      {student.full_name}
                    </div>
                    <div className="text-xs text-slate-500 dark:text-slate-400">{student.course}</div>
                  </div>
                  <div className="text-base font-bold text-blue-600 dark:text-blue-400">{student.score}</div>
                </li>
              ))}
            </ul>
          </Card>

          <Card
            title={
              <CardTitleWithIcon color="accent">
                <BellIcon />
                <span>{t('instructor.dashboard.recentActivity')}</span>
              </CardTitleWithIcon>
            }
          >
            <ul className="space-y-3">
              {activity.map((item: InstructorActivityRow) => (
                <li key={item.id} className="flex items-start gap-3">
                  <div className={`mt-1 w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${activityColor(item.type)}`}>
                    {activityIcon(item.type)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p
                      className="text-sm text-slate-700 dark:text-slate-300 leading-snug"
                      dangerouslySetInnerHTML={{
                        __html: item.message.replace(
                          /\*\*(.+?)\*\*/g,
                          '<strong class="font-semibold text-slate-900 dark:text-white">$1</strong>',
                        ),
                      }}
                    />
                    <span className="text-xs text-slate-500 dark:text-slate-400">{formatRelative(item.created_at)}</span>
                  </div>
                </li>
              ))}
            </ul>
          </Card>
        </div>
      </div>
    </InstructorLayout>
  );
};

interface StatCardProps {
  color: 'blue' | 'teal' | 'orange' | 'green';
  icon: React.ReactNode;
  value: string | number;
  label: string;
  change: string;
}

const StatCard: React.FC<StatCardProps> = ({ color, icon, value, label, change }) => {
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
          <div className="flex items-center gap-1 text-xs font-semibold text-emerald-600 dark:text-emerald-400 mt-2">
            <svg className="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
              <path d="M5 10l7-7m0 0l7 7m-7-7v18" />
            </svg>
            {change}
          </div>
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

const activityColor = (type: 'enrollment' | 'submission' | 'graded' | 'review') => {
  switch (type) {
    case 'enrollment':
      return 'bg-blue-100 text-blue-600 dark:bg-blue-900/40 dark:text-blue-300';
    case 'submission':
      return 'bg-amber-100 text-amber-600 dark:bg-amber-900/40 dark:text-amber-300';
    case 'graded':
      return 'bg-emerald-100 text-emerald-600 dark:bg-emerald-900/40 dark:text-emerald-300';
    case 'review':
      return 'bg-purple-100 text-purple-600 dark:bg-purple-900/40 dark:text-purple-300';
  }
};

const activityIcon = (type: 'enrollment' | 'submission' | 'graded' | 'review') => {
  switch (type) {
    case 'enrollment':
      return (
        <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
        </svg>
      );
    case 'submission':
      return (
        <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
        </svg>
      );
    case 'graded':
      return (
        <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      );
    case 'review':
      return (
        <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
        </svg>
      );
  }
};

const getInitials = (name: string) =>
  name.split(' ').filter(Boolean).map(s => s.charAt(0)).slice(0, 2).join('').toUpperCase();

const BookIcon = () => (
  <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
  </svg>
);

const UsersIcon = () => (
  <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2" />
    <circle cx="9" cy="7" r="4" />
    <path d="M23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75" />
  </svg>
);

const ExamIcon = () => (
  <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
  </svg>
);

const StarIcon = () => (
  <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
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
