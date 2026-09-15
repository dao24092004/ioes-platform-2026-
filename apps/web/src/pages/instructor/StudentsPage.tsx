import React, { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useQuery } from '@tanstack/react-query';
import InstructorLayout from '@/components/layout/InstructorLayout';
import { StatCard } from '@/components/common/StatCard';
import ProgressBar from '@/components/common/ProgressBar';
import { contentApi, type EnrollmentStatus } from '@/services/api/content.api';

const statusStyles: Record<EnrollmentStatus, string> = {
  active: 'bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300',
  completed: 'bg-emerald-50 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300',
  cancelled: 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400',
  expired: 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400',
};

/**
 * Học viên đã ghi danh vào các khoá của giảng viên (`GET /api/v1/courses/students`).
 *
 * Tên và email là bản chụp lúc học viên ghi danh: giảng viên không có quyền đọc
 * danh sách người dùng của auth-service, nên content-service tự lưu lại.
 */
const StudentsPage: React.FC = () => {
  const { t } = useTranslation();
  const [courseId, setCourseId] = useState('');

  const { data: coursesPage } = useQuery({
    queryKey: ['content', 'courses', 'mine', 'all'],
    queryFn: () => contentApi.listCourses({ mine: true, perPage: 100 }),
  });
  const courses = coursesPage?.data ?? [];

  const { data: students = [], isLoading, isError } = useQuery({
    queryKey: ['content', 'students', courseId || 'all'],
    queryFn: () => contentApi.listStudents(courseId || undefined),
  });

  const stats = useMemo(() => {
    const total = students.length;
    const completed = students.filter(s => s.enrollment.status === 'completed').length;
    const avg = total ? Math.round(students.reduce((sum, s) => sum + s.enrollment.progressPercent, 0) / total) : 0;
    return { total, completed, avg };
  }, [students]);

  return (
    <InstructorLayout title={t('instructor.students.title')} subtitle={t('instructor.students.subtitle')}>
      <section className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
        <StatCard color="blue" icon={<UsersIcon />} value={stats.total} label={t('enrollmentApi.students.total')} />
        <StatCard color="purple" icon={<CheckIcon />} value={stats.completed} label={t('enrollmentApi.students.completed')} />
        <StatCard color="amber" icon={<ChartIcon />} value={`${stats.avg}%`} label={t('enrollmentApi.students.avgProgress')} />
      </section>

      <section className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-800 flex flex-wrap items-center justify-between gap-3">
          <label className="text-sm font-semibold text-slate-700 dark:text-slate-300">{t('enrollmentApi.students.course')}</label>
          <select
            value={courseId}
            onChange={e => setCourseId(e.target.value)}
            className="px-3 py-2 text-sm rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 min-w-[240px]"
          >
            <option value="">{t('enrollmentApi.students.allCourses')}</option>
            {courses.map(c => (
              <option key={c.id} value={c.id}>
                {c.title}
              </option>
            ))}
          </select>
        </div>

        {isLoading ? (
          <div className="p-12 text-center">
            <div className="inline-block w-8 h-8 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : isError ? (
          <div className="p-12 text-center text-sm text-red-600">{t('common.loadError')}</div>
        ) : students.length === 0 ? (
          <div className="p-12 text-center text-sm text-slate-500 dark:text-slate-400">{t('enrollmentApi.students.empty')}</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 dark:bg-slate-800/50 text-xs uppercase text-slate-500 dark:text-slate-400">
                <tr>
                  <th className="px-6 py-3 text-left font-semibold">{t('enrollmentApi.students.student')}</th>
                  <th className="px-6 py-3 text-left font-semibold">{t('enrollmentApi.students.course')}</th>
                  <th className="px-6 py-3 text-left font-semibold">{t('enrollmentApi.progress')}</th>
                  <th className="px-6 py-3 text-left font-semibold">{t('student.enrollment.status')}</th>
                  <th className="px-6 py-3 text-left font-semibold">{t('enrollmentApi.enrolledAt')}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {students.map(s => (
                  <tr key={s.enrollment.id}>
                    <td className="px-6 py-4">
                      <div className="font-semibold text-slate-900 dark:text-white">
                        {s.studentName || t('enrollmentApi.students.unknownName')}
                      </div>
                      {s.studentEmail && <div className="text-xs text-slate-500 dark:text-slate-400">{s.studentEmail}</div>}
                    </td>
                    <td className="px-6 py-4 text-slate-700 dark:text-slate-300">{s.courseTitle}</td>
                    <td className="px-6 py-4 min-w-[160px]">
                      <div className="text-xs text-slate-500 dark:text-slate-400 mb-1">{s.enrollment.progressPercent}%</div>
                      <ProgressBar value={s.enrollment.progressPercent} />
                    </td>
                    <td className="px-6 py-4">
                      <span className={`px-2.5 py-1 rounded-full text-xs font-semibold ${statusStyles[s.enrollment.status]}`}>
                        {t(`enrollmentApi.status.${s.enrollment.status}`)}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-slate-600 dark:text-slate-400">
                      {new Date(s.enrollment.enrolledAt).toLocaleDateString('vi-VN')}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </InstructorLayout>
  );
};

const UsersIcon = () => (
  <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75" /></svg>
);
const CheckIcon = () => (
  <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="20 6 9 17 4 12" /></svg>
);
const ChartIcon = () => (
  <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="20" x2="18" y2="10" /><line x1="12" y1="20" x2="12" y2="4" /><line x1="6" y1="20" x2="6" y2="14" /></svg>
);

export default StudentsPage;
