import React from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useQuery } from '@tanstack/react-query';
import StudentLayout from '@/components/layout/StudentLayout';
import { StatCard } from '@/components/common/StatCard';
import { Card, CardTitleWithIcon } from '@/components/common/Card';
import { studentApi, type StudentEnrolledCourse, type StudentExam } from '@/services/api';
import { useAuthStore } from '@/app/store/authStore';
import { formatRelative } from '@/utils/time';

const colorMap: Record<StudentEnrolledCourse['thumbnail_color'], string> = {
  blue: 'from-blue-500 to-cyan-500',
  purple: 'from-purple-500 to-fuchsia-500',
  emerald: 'from-emerald-500 to-teal-500',
  amber: 'from-amber-500 to-orange-500',
  rose: 'from-rose-500 to-pink-500',
  cyan: 'from-cyan-500 to-sky-500',
};

const examStatusStyles: Record<StudentExam['status'], { bg: string; text: string; label: string }> = {
  upcoming: { bg: 'bg-blue-50 dark:bg-blue-900/30', text: 'text-blue-600 dark:text-blue-400', label: 'student.exams.status.upcoming' },
  available: { bg: 'bg-emerald-50 dark:bg-emerald-900/30', text: 'text-emerald-600 dark:text-emerald-400', label: 'student.exams.status.available' },
  in_progress: { bg: 'bg-amber-50 dark:bg-amber-900/30', text: 'text-amber-600 dark:text-amber-400', label: 'student.exams.status.in_progress' },
  completed: { bg: 'bg-slate-100 dark:bg-slate-800', text: 'text-slate-600 dark:text-slate-400', label: 'student.exams.status.completed' },
  missed: { bg: 'bg-red-50 dark:bg-red-900/30', text: 'text-red-600 dark:text-red-400', label: 'student.exams.status.missed' },
};

const DashboardPage: React.FC = () => {
  const { t } = useTranslation();
  const { user } = useAuthStore();

  const { data: stats } = useQuery({ queryKey: ['student', 'dashboard', 'stats'], queryFn: () => studentApi.dashboardStats() });
  const { data: courses = [] } = useQuery({ queryKey: ['student', 'dashboard', 'courses'], queryFn: () => studentApi.myCourses() });
  const { data: exams = [] } = useQuery({ queryKey: ['student', 'dashboard', 'exams'], queryFn: () => studentApi.upcomingExams() });

  const greetingHour = new Date().getHours();
  const greetingKey = greetingHour < 12 ? 'student.dashboard.welcomeGreeting' : 'student.dashboard.welcomeTitle';

  const inProgress = courses.filter((c: StudentEnrolledCourse) => c.status === 'in_progress').slice(0, 4);
  const upcomingExams = exams.filter((e: StudentExam) => e.status === 'available' || e.status === 'upcoming' || e.status === 'in_progress').slice(0, 4);
  const weeklyHours: Array<{ day: string; value: number }> = stats?.weeklyHours ?? [];

  const maxHours = Math.max(...weeklyHours.map(h => h.value), 1);

  return (
    <StudentLayout
      title={t('student.dashboard.title')}
      subtitle={t('student.dashboard.subtitle')}
      headerActions={
        <Link
          to="/student/courses"
          className="hidden sm:inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold shadow-sm transition-colors"
        >
          {t('student.dashboard.continueLearning')}
        </Link>
      }
    >
      <section className="mb-6">
        <p className="text-sm text-slate-500 dark:text-slate-400">{t(greetingKey)},</p>
        <h2 className="text-2xl font-bold text-slate-900 dark:text-white">
          {user?.full_name || 'Student'}
        </h2>
      </section>

      <section className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-5 gap-4 mb-6">
        <StatCard color="blue" icon={<BookIcon />} value={stats?.enrolledCourses ?? 0} label={t('student.dashboard.stats.enrolled')} />
        <StatCard color="amber" icon={<BoltIcon />} value={stats?.inProgress ?? 0} label={t('student.dashboard.stats.inProgress')} />
        <StatCard color="emerald" icon={<CheckIcon />} value={stats?.completed ?? 0} label={t('student.dashboard.stats.completed')} />
        <StatCard color="purple" icon={<AwardIcon />} value={stats?.certificates ?? 0} label={t('student.dashboard.stats.certificates')} />
        <StatCard color="cyan" icon={<ClockIcon />} value={`${stats?.studyHours ?? 0}h`} label={t('student.dashboard.stats.studyHours')} />
      </section>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        <div className="xl:col-span-2 space-y-6">
          <Card
            title={
              <CardTitleWithIcon color="primary">
                <BookIcon /><span>{t('student.dashboard.continueWhereLeft')}</span>
              </CardTitleWithIcon>
            }
            action={
              <Link to="/student/courses" className="text-sm font-medium text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1">
                {t('student.dashboard.viewAll')}
                <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M9 5l7 7-7 7" />
                </svg>
              </Link>
            }
          >
            <ul className="divide-y divide-slate-100 dark:divide-slate-800">
              {inProgress.map((course: StudentEnrolledCourse) => (
                <li key={course.id} className="py-3 flex items-center gap-4">
                  <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${colorMap[course.thumbnail_color]} flex items-center justify-center text-white flex-shrink-0`}>
                    <BookIcon />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="text-sm font-semibold text-slate-900 dark:text-white truncate">{course.title}</h3>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 truncate">
                      {course.next_lesson || t('student.dashboard.noNextLesson')}
                    </p>
                    <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400 mt-1">
                      <span>{course.lessons_done}/{course.lessons_total} {t('student.dashboard.lessons')}</span>
                      <span>•</span>
                      <span>{formatRelative(course.last_accessed)}</span>
                    </div>
                  </div>
                  <div className="flex flex-col items-end gap-1 min-w-[120px]">
                    <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">{course.progress}%</span>
                    <div className="w-full h-1.5 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                      <div className="h-full bg-gradient-to-r from-blue-500 to-cyan-500" style={{ width: `${course.progress}%` }} />
                    </div>
                  </div>
                </li>
              ))}
            </ul>
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
            <ul className="space-y-3">
              {upcomingExams.map((exam: StudentExam) => {
                const ss = examStatusStyles[exam.status];
                return (
                  <li key={exam.id} className="flex items-center gap-4 p-3 rounded-xl bg-slate-50 dark:bg-slate-800/40 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors">
                    <div className="w-10 h-10 rounded-lg bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center text-amber-600 dark:text-amber-400 flex-shrink-0">
                      <ExamIcon />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="text-sm font-semibold text-slate-900 dark:text-white truncate">{exam.title}</h3>
                      <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                        <span>{exam.course}</span>
                        <span>•</span>
                        <span>{exam.duration_min} min · {exam.questions} {t('student.dashboard.lessons')}</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <span className={`px-2 py-1 rounded-md text-xs font-semibold ${ss.bg} ${ss.text}`}>
                        {t(ss.label)}
                      </span>
                      <Link
                        to={`/student/exams/${exam.id}`}
                        className="px-3 py-1.5 text-xs font-semibold rounded-lg bg-blue-600 text-white hover:bg-blue-700 transition-colors"
                      >
                        {exam.status === 'in_progress' ? t('student.exams.resumeBtn') : t('student.exams.startBtn')}
                      </Link>
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
              <CardTitleWithIcon color="accent">
                <ChartIcon /><span>{t('student.dashboard.weeklyStudy')}</span>
              </CardTitleWithIcon>
            }
          >
            <div className="flex items-end justify-between gap-2 h-40">
              {weeklyHours.map((d: { day: string; value: number }, i: number) => (
                <div key={i} className="flex flex-col items-center flex-1 gap-2">
                  <div className="flex-1 w-full flex items-end">
                    <div
                      className="w-full rounded-t-md bg-gradient-to-t from-blue-500 to-cyan-400"
                      style={{ height: `${(d.value / maxHours) * 100}%`, minHeight: 6 }}
                      title={`${d.day}: ${d.value}h`}
                    />
                  </div>
                  <span className="text-[10px] font-semibold text-slate-500 dark:text-slate-400">{d.day}</span>
                </div>
              ))}
            </div>
            <div className="mt-4 pt-4 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
              <div>
                <div className="text-xs text-slate-500 dark:text-slate-400">{t('student.dashboard.weeklyStudy')}</div>
                <div className="text-xl font-bold text-slate-900 dark:text-white">
                  {weeklyHours.reduce((s: number, h: { day: string; value: number }) => s + h.value, 0).toFixed(1)}h
                </div>
              </div>
              <div className="text-right">
                <div className="text-xs text-emerald-600 dark:text-emerald-400 font-semibold">+12%</div>
                <div className="text-xs text-slate-500 dark:text-slate-400">vs tuần trước</div>
              </div>
            </div>
          </Card>

          <Card
            title={
              <CardTitleWithIcon color="purple">
                <AwardIcon /><span>{t('student.dashboard.achievements')}</span>
              </CardTitleWithIcon>
            }
          >
            <div className="grid grid-cols-3 gap-3">
              {ACHIEVEMENTS.map(a => (
                <div
                  key={a.id}
                  className="flex flex-col items-center gap-2 p-3 rounded-xl bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-800 dark:to-slate-800/50 hover:scale-105 transition-transform"
                >
                  <div className="text-3xl">{a.icon}</div>
                  <div className="text-[10px] font-semibold text-center text-slate-700 dark:text-slate-300 leading-tight">
                    {t(`student.profile.achievements.${a.id}`)}
                  </div>
                </div>
              ))}
            </div>
          </Card>
        </div>
      </div>
    </StudentLayout>
  );
};

const ACHIEVEMENTS = [
  { id: 'first_course', icon: '🎓' },
  { id: 'streak_7', icon: '🔥' },
  { id: 'streak_30', icon: '⚡' },
  { id: 'top_10', icon: '🏆' },
  { id: 'perfect_score', icon: '💯' },
  { id: 'fast_learner', icon: '🚀' },
];

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
