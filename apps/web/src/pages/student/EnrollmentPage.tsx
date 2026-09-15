import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import StudentLayout from '@/components/layout/StudentLayout';
import ProgressBar from '@/components/common/ProgressBar';
import { contentApi, type EnrollmentStatus } from '@/services/api/content.api';

type Filter = 'all' | Extract<EnrollmentStatus, 'active' | 'completed'>;

const statusStyles: Record<EnrollmentStatus, string> = {
  active: 'bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300',
  completed: 'bg-emerald-50 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300',
  cancelled: 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400',
  expired: 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400',
};

const formatDate = (iso: string | null) => (iso ? new Date(iso).toLocaleDateString('vi-VN') : '—');

/**
 * Các khoá học viên đã ghi danh (`GET /api/v1/courses/enrollments/me`).
 *
 * Huỷ ghi danh xoá luôn tiến độ, nên cần bấm xác nhận lần hai ngay trên dòng.
 */
const EnrollmentPage: React.FC = () => {
  const { t } = useTranslation();
  const qc = useQueryClient();
  const [filter, setFilter] = useState<Filter>('all');
  const [confirmingId, setConfirmingId] = useState<string | null>(null);

  const { data: enrollments = [], isLoading, isError } = useQuery({
    queryKey: ['content', 'enrollments', 'me'],
    queryFn: () => contentApi.listMyEnrollments(),
  });

  const cancelMut = useMutation({
    mutationFn: (courseId: string) => contentApi.cancelEnrollment(courseId),
    onSuccess: (_data, courseId) => {
      setConfirmingId(null);
      qc.invalidateQueries({ queryKey: ['content', 'enrollments'] });
      qc.invalidateQueries({ queryKey: ['content', 'enrollment', courseId] });
      qc.invalidateQueries({ queryKey: ['content', 'course', courseId] });
    },
  });

  const visible = filter === 'all' ? enrollments : enrollments.filter(e => e.enrollment.status === filter);
  const filters: Filter[] = ['all', 'active', 'completed'];

  return (
    <StudentLayout title={t('student.enrollment.title')} subtitle={t('student.enrollment.subtitle')}>
      <section className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-800 flex flex-wrap items-center gap-2">
          {filters.map(f => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-3 py-1.5 rounded-lg text-sm font-semibold transition-colors ${
                filter === f
                  ? 'bg-blue-600 text-white'
                  : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
              }`}
            >
              {t(`enrollmentApi.filter.${f}`)}
              {f === 'all' ? ` (${enrollments.length})` : ` (${enrollments.filter(e => e.enrollment.status === f).length})`}
            </button>
          ))}
        </div>

        {isLoading ? (
          <div className="p-12 text-center">
            <div className="inline-block w-8 h-8 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : isError ? (
          <div className="p-12 text-center text-sm text-red-600">{t('common.loadError')}</div>
        ) : visible.length === 0 ? (
          <div className="p-12 text-center text-sm text-slate-500 dark:text-slate-400">
            {t('enrollmentApi.noEnrollments')}{' '}
            <Link to="/student/courses" className="text-blue-600 dark:text-blue-400 hover:underline">
              {t('enrollmentApi.browseCourses')}
            </Link>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 dark:bg-slate-800/50 text-xs uppercase text-slate-500 dark:text-slate-400">
                <tr>
                  <th className="px-6 py-3 text-left font-semibold">{t('student.enrollment.course')}</th>
                  <th className="px-6 py-3 text-left font-semibold">{t('enrollmentApi.progress')}</th>
                  <th className="px-6 py-3 text-left font-semibold">{t('student.enrollment.status')}</th>
                  <th className="px-6 py-3 text-left font-semibold">{t('enrollmentApi.enrolledAt')}</th>
                  <th className="px-6 py-3 text-left font-semibold">{t('enrollmentApi.lastAccessed')}</th>
                  <th className="px-6 py-3" />
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {visible.map(({ enrollment, course }) => (
                  <tr key={enrollment.id} className="align-middle">
                    <td className="px-6 py-4">
                      <Link to={`/student/courses/${course.id}`} className="flex items-center gap-3 group">
                        <div className="w-16 h-11 rounded-lg bg-gradient-to-br from-blue-500 to-cyan-500 overflow-hidden flex-shrink-0">
                          {course.thumbnailUrl && (
                            <img src={course.thumbnailUrl} alt={course.title} className="w-full h-full object-cover" />
                          )}
                        </div>
                        <span className="font-semibold text-slate-900 dark:text-white group-hover:text-blue-600 line-clamp-2">
                          {course.title}
                        </span>
                      </Link>
                    </td>
                    <td className="px-6 py-4 min-w-[160px]">
                      <div className="text-xs text-slate-500 dark:text-slate-400 mb-1">{enrollment.progressPercent}%</div>
                      <ProgressBar value={enrollment.progressPercent} />
                    </td>
                    <td className="px-6 py-4">
                      <span className={`px-2.5 py-1 rounded-full text-xs font-semibold ${statusStyles[enrollment.status]}`}>
                        {t(`enrollmentApi.status.${enrollment.status}`)}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-slate-600 dark:text-slate-400">{formatDate(enrollment.enrolledAt)}</td>
                    <td className="px-6 py-4 text-slate-600 dark:text-slate-400">{formatDate(enrollment.lastAccessedAt)}</td>
                    <td className="px-6 py-4 text-right whitespace-nowrap">
                      {confirmingId === course.id ? (
                        <div className="inline-flex flex-col items-end gap-2">
                          <span className="text-xs text-red-600 dark:text-red-400 max-w-[220px] text-right">
                            {t('enrollmentApi.cancelConfirm')}
                          </span>
                          <div className="flex gap-2">
                            <button
                              onClick={() => cancelMut.mutate(course.id)}
                              disabled={cancelMut.isPending}
                              className="px-3 py-1.5 rounded-lg bg-red-600 hover:bg-red-700 text-white text-xs font-semibold disabled:opacity-50"
                            >
                              {t('enrollmentApi.cancel')}
                            </button>
                            <button
                              onClick={() => setConfirmingId(null)}
                              className="px-3 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 text-xs font-semibold"
                            >
                              {t('common.cancel')}
                            </button>
                          </div>
                        </div>
                      ) : (
                        <div className="inline-flex gap-2">
                          <Link
                            to={`/student/learn/${course.id}`}
                            className="px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold"
                          >
                            {t('enrollmentApi.continue')}
                          </Link>
                          <button
                            onClick={() => setConfirmingId(course.id)}
                            className="px-3 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:text-red-600 text-xs font-semibold"
                          >
                            {t('enrollmentApi.cancel')}
                          </button>
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        {cancelMut.error && (
          <div className="px-6 py-3 border-t border-slate-200 dark:border-slate-800 text-sm text-red-600">
            {(cancelMut.error as Error).message}
          </div>
        )}
      </section>
    </StudentLayout>
  );
};

export default EnrollmentPage;
