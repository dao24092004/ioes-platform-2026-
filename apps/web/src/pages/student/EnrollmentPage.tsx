import React, { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useQuery } from '@tanstack/react-query';
import StudentLayout from '@/components/layout/StudentLayout';
import PaginationBar from '@/components/common/PaginationBar';
import { studentApi } from '@/services/api';

type Filter = 'all' | 'active' | 'pending' | 'expired';

const statusStyles = {
  active: 'bg-emerald-50 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400',
  pending: 'bg-amber-50 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400',
  expired: 'bg-red-50 dark:bg-red-900/30 text-red-600 dark:text-red-400',
};

const paymentIcons = {
  free: '🆓',
  voucher: '🎟️',
  token: '🪙',
};

const EnrollmentPage: React.FC = () => {
  const { t } = useTranslation();
  const [filter, setFilter] = useState<Filter>('all');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  const { data: enrollments = [] } = useQuery({ queryKey: ['student', 'enrollments'], queryFn: () => studentApi.enrollments() });
  const { data: courses = [] } = useQuery({ queryKey: ['student', 'courses', 'list'], queryFn: () => studentApi.myCourses() });

  const rows = useMemo(() => {
    return enrollments.map((e: any) => ({
      ...e,
      course: courses.find((c: any) => c.id === e.course_id),
    }));
  }, [enrollments, courses]);

  const filtered = useMemo(() => {
    if (filter === 'all') return rows;
    return rows.filter((r: any) => r.status === filter);
  }, [rows, filter]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const safePage = Math.min(page, totalPages);
  const startIdx = (safePage - 1) * pageSize;
  const endIdx = Math.min(startIdx + pageSize, filtered.length);
  const paged = filtered.slice(startIdx, endIdx);

  React.useEffect(() => {
    setPage(1);
  }, [filter, pageSize]);

  return (
    <StudentLayout title={t('student.enrollment.title')} subtitle={t('student.enrollment.subtitle')}>
      <div className="flex flex-wrap gap-2 mb-6">
        {(['all', 'active', 'pending', 'expired'] as Filter[]).map(f => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-all ${
              filter === f
                ? 'bg-blue-600 text-white shadow-sm'
                : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
            }`}
          >
            {t(`student.enrollment.filter.${f}`)}
          </button>
        ))}
      </div>

      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-slate-50 dark:bg-slate-800/50 text-xs uppercase tracking-wider text-slate-500">
                <th className="text-left px-6 py-3 font-semibold">{t('student.enrollment.course')}</th>
                <th className="text-left px-6 py-3 font-semibold">{t('student.enrollment.enrolledAt')}</th>
                <th className="text-left px-6 py-3 font-semibold">{t('student.enrollment.expiresAt')}</th>
                <th className="text-left px-6 py-3 font-semibold">{t('student.enrollment.payment')}</th>
                <th className="text-left px-6 py-3 font-semibold">{t('student.enrollment.status')}</th>
              </tr>
            </thead>
            <tbody>
              {paged.map((r: any) => {
                const ss = statusStyles[r.status as keyof typeof statusStyles];
                return (
                  <tr key={r.course_id} className="border-t border-slate-100 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/40">
                    <td className="px-6 py-4">
                      <div className="font-semibold text-sm">{r.course?.title || r.course_id}</div>
                      <div className="text-xs text-slate-500 dark:text-slate-400">{r.course?.instructor}</div>
                    </td>
                    <td className="px-6 py-4 text-sm text-slate-600 dark:text-slate-400">
                      {new Date(r.enrolled_at).toLocaleDateString('vi-VN')}
                    </td>
                    <td className="px-6 py-4 text-sm text-slate-600 dark:text-slate-400">
                      {r.expires_at ? new Date(r.expires_at).toLocaleDateString('vi-VN') : t('student.enrollment.noExpiry')}
                    </td>
                    <td className="px-6 py-4">
                      <span className="inline-flex items-center gap-1 text-sm">
                        <span>{paymentIcons[r.payment_method as keyof typeof paymentIcons]}</span>
                        {t(`student.enrollment.payment${r.payment_method.charAt(0).toUpperCase()}${r.payment_method.slice(1)}`)}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`px-2 py-0.5 rounded text-xs font-bold ${ss}`}>
                        {t(`student.enrollment.status${r.status.charAt(0).toUpperCase()}${r.status.slice(1)}`)}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {filtered.length > 0 && (
          <PaginationBar
            i18nKey="student.courses"
            page={safePage}
            totalPages={totalPages}
            pageSize={pageSize}
            startIdx={startIdx}
            endIdx={endIdx}
            total={filtered.length}
            onPageChange={setPage}
            onPageSizeChange={setPageSize}
          />
        )}
      </div>
    </StudentLayout>
  );
};

export default EnrollmentPage;
