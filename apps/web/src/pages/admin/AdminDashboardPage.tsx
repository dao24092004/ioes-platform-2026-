import React from 'react';
import { useTranslation } from 'react-i18next';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import AdminLayout from '@/components/layout/AdminLayout';
import { usersApi, type AdminUser } from '@/services/api/users.api';
import { analyticsApi } from '@/services/api/analytics.api';

/** Cửa sổ tính "người dùng hoạt động" trên thẻ tổng quan. */
const ACTIVE_WINDOW_DAYS = 30;

/**
 * Tổng quan admin.
 *
 * - Người dùng: `GET /api/auth/users/stats` và 4 người mới nhất.
 * - Người hoạt động, lượt thi, tỷ lệ đạt: `GET /api/analytics/admin/kpi`.
 * - Số khoá học (content-service), token (blockchain), uptime và hoạt động gần
 *   đây chưa có nguồn cho trang này: thẻ số giả bị bỏ, hai khung bên phải hiện
 *   trạng thái chưa có nguồn dữ liệu. Các % xu hướng cũ là số bịa nên cũng bỏ.
 */
const AdminDashboardPage: React.FC = () => {
  const { t } = useTranslation();

  const { data: userStats } = useQuery({ queryKey: ['users', 'stats'], queryFn: () => usersApi.stats() });
  const { data: kpi } = useQuery({
    queryKey: ['analytics', 'admin', 'kpi', ACTIVE_WINDOW_DAYS],
    queryFn: () => analyticsApi.getAdminKpi(ACTIVE_WINDOW_DAYS),
  });
  const { data: recentUsersData, isLoading: isRecentLoading } = useQuery({
    queryKey: ['users', 'list', 'recent'],
    queryFn: () => usersApi.list({ page: 1, perPage: 4, sort: 'newest' }),
  });

  const recentUsers = recentUsersData?.data ?? [];
  const none = t('shared.none');

  const getInitials = (name: string) =>
    name.split(' ').filter(Boolean).map(s => s.charAt(0)).slice(0, 2).join('').toUpperCase();

  const roleBadge = (role: string) => {
    const map: Record<string, string> = {
      super_admin: 'bg-purple-50 text-purple-600 dark:bg-purple-900/30 dark:text-purple-400',
      admin: 'bg-blue-50 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400',
      instructor: 'bg-amber-50 text-amber-600 dark:bg-amber-900/30 dark:text-amber-400',
      student: 'bg-cyan-50 text-cyan-600 dark:bg-cyan-900/30 dark:text-cyan-400',
      guest: 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400',
    };
    return <span className={`inline-flex items-center gap-1 px-3 py-1 rounded-lg text-xs font-semibold transition-transform hover:scale-105 ${map[role] ?? map.student}`}>{t(`admin.role.${role === 'super_admin' ? 'superAdmin' : role}`)}</span>;
  };

  const statusBadge = (status: string) => {
    const map: Record<string, { cls: string; dot: string; label: string }> = {
      active: { cls: 'bg-emerald-50 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-400', dot: 'bg-emerald-500', label: t('admin.status.active') },
      pending: { cls: 'bg-amber-50 text-amber-600 dark:bg-amber-900/30 dark:text-amber-400', dot: 'bg-amber-500', label: t('admin.status.pending') },
      suspended: { cls: 'bg-red-50 text-red-600 dark:bg-red-900/30 dark:text-red-400', dot: 'bg-red-500', label: t('admin.status.suspended') },
      deleted: { cls: 'bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-500', dot: 'bg-slate-400', label: t('admin.status.deleted') },
    };
    const s = map[status] ?? map.active;
    return (
      <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-semibold transition-transform hover:scale-105 ${s.cls}`}>
        <span className={`w-1.5 h-1.5 rounded-full ${s.dot}`} />{s.label}
      </span>
    );
  };

  const statCards = [
    { value: userStats ? userStats.total.toLocaleString() : none, label: t('admin.stats.users'), color: 'blue', icon: <svg className="w-6 h-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75" /></svg> },
    { value: kpi ? kpi.activeUsers.toLocaleString() : none, label: t('analytics.kpi.activeUsers'), color: 'teal', icon: <svg className="w-6 h-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2" /><circle cx="12" cy="7" r="4" /></svg> },
    { value: kpi ? kpi.examAttempts.toLocaleString() : none, label: t('analytics.kpi.examSubmits'), color: 'green', icon: <svg className="w-6 h-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" /></svg> },
    { value: kpi ? `${kpi.passRate}%` : none, label: t('admin.analyticsKpi.passRate'), color: 'orange', icon: <svg className="w-6 h-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M22 11.08V12a10 10 0 11-5.93-9.14" /><polyline points="22 4 12 14.01 9 11.01" /></svg> },
  ];

  const colorClasses: Record<string, string> = {
    blue: 'bg-blue-50 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400',
    teal: 'bg-cyan-50 text-cyan-600 dark:bg-cyan-900/30 dark:text-cyan-400',
    green: 'bg-emerald-50 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-400',
    orange: 'bg-amber-50 text-amber-600 dark:bg-amber-900/30 dark:text-amber-400',
  };

  return (
    <AdminLayout title={t('admin.dashboard.title')} subtitle={t('admin.dashboard.subtitle')}>
      {/* Stats grid */}
      <div className="grid grid-cols-2 xl:grid-cols-4 gap-5 mb-8">
        {statCards.map((s, i) => (
          <div key={i} className="group relative overflow-hidden bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-6 transition-all hover:-translate-y-1 hover:shadow-xl hover:shadow-blue-500/5 hover:border-blue-200 dark:hover:border-blue-800 opacity-0 animate-[fadeInUp_1s_ease-out_forwards]" style={{ animationDelay: `${(i + 1) * 0.1}s` }}>
            <div className="absolute top-0 left-0 w-full h-full bg-gradient-to-r from-transparent via-blue-500/5 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000" />
            <div className="relative flex items-start justify-between mb-4">
              <div className={`w-12 h-12 rounded-xl flex items-center justify-center transition-all group-hover:rotate-[10deg] group-hover:scale-110 ${colorClasses[s.color]}`}>
                {s.icon}
              </div>
            </div>
            <div className="relative text-3xl font-bold mb-1 transition-all group-hover:text-blue-600 group-hover:scale-105 origin-left animate-[countUp_.8s_ease_forwards]">
              {s.value}
            </div>
            <div className="relative text-sm text-slate-500 dark:text-slate-400">{s.label}</div>
          </div>
        ))}
      </div>

      {/* Main grid */}
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-6">
        {/* Recent users */}
        <div className="xl:col-span-8 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 overflow-hidden opacity-0 animate-[fadeInUp_1s_ease-out_forwards] [animation-delay:.2s] hover:shadow-xl hover:shadow-blue-500/5 hover:-translate-y-1 transition-all duration-300">
          <div className="px-6 py-5 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
            <h2 className="flex items-center gap-2.5 text-base font-semibold">
              <span className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400 flex items-center justify-center transition-transform hover:rotate-[10deg] hover:scale-110">
                <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2" /><circle cx="9" cy="7" r="4" /></svg>
              </span>
              {t('admin.dashboard.recentUsers')}
            </h2>
            <Link to="/admin/users" className="group flex items-center gap-1 text-sm font-medium text-blue-600 hover:text-blue-700 hover:translate-x-1 transition-all">
              {t('admin.dashboard.viewAll')}
              <svg className="w-4 h-4 transition-transform group-hover:translate-x-1" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M9 5l7 7-7 7" /></svg>
            </Link>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-slate-50 dark:bg-slate-800/50 text-xs uppercase tracking-wider text-slate-500">
                  <th className="text-left px-6 py-3 font-semibold">{t('admin.table.user')}</th>
                  <th className="text-left px-6 py-3 font-semibold">{t('admin.table.role')}</th>
                  <th className="text-left px-6 py-3 font-semibold">{t('admin.table.status')}</th>
                  <th className="text-left px-6 py-3 font-semibold">{t('admin.table.joined')}</th>
                  <th className="px-6 py-3"></th>
                </tr>
              </thead>
              <tbody>
                {!isRecentLoading && recentUsers.length === 0 && (
                  <tr><td colSpan={5} className="text-center py-8 text-slate-500 text-sm">{t('admin.users.noResults')}</td></tr>
                )}
                {recentUsers.map((u: AdminUser) => (
                  <tr key={u.id} className="border-t border-slate-100 dark:border-slate-800 transition-all hover:bg-blue-50/50 dark:hover:bg-blue-900/10 group">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        {u.avatarUrl ? (
                          <img src={u.avatarUrl} alt={u.fullName} className="w-10 h-10 rounded-xl object-cover transition-all group-hover:scale-110 group-hover:rotate-[5deg] group-hover:shadow-lg group-hover:shadow-blue-500/30" />
                        ) : (
                          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-cyan-500 text-white flex items-center justify-center font-semibold text-sm transition-all group-hover:scale-110 group-hover:rotate-[5deg] group-hover:shadow-lg group-hover:shadow-blue-500/30">
                            {getInitials(u.fullName)}
                          </div>
                        )}
                        <div className="min-w-0">
                          <div className="font-semibold text-sm">{u.fullName}</div>
                          <div className="text-xs text-slate-500 dark:text-slate-400 truncate">{u.email}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">{roleBadge(u.role)}</td>
                    <td className="px-6 py-4">{statusBadge(u.status)}</td>
                    <td className="px-6 py-4 text-sm text-slate-500 dark:text-slate-400">
                      {new Date(u.createdAt).toLocaleDateString('vi-VN')}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <Link to="/admin/users" className="p-2 rounded-lg bg-slate-50 dark:bg-slate-800 hover:bg-blue-50 dark:hover:bg-blue-900/30 hover:text-blue-600 hover:scale-110 transition-all inline-flex">
                        <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <circle cx="12" cy="12" r="1" /><circle cx="19" cy="12" r="1" /><circle cx="5" cy="12" r="1" />
                        </svg>
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Right column */}
        <div className="xl:col-span-4 space-y-6">
          {/* Quick actions */}
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 overflow-hidden opacity-0 animate-[fadeInUp_1s_ease-out_forwards] [animation-delay:.3s] hover:shadow-xl hover:shadow-blue-500/5 hover:-translate-y-1 transition-all">
            <div className="px-6 py-5 border-b border-slate-200 dark:border-slate-800">
              <h2 className="text-base font-semibold">{t('admin.dashboard.quickActions')}</h2>
            </div>
            <div className="p-6 grid grid-cols-2 gap-3">
              {[
                { label: t('admin.quick.addUser'), color: 'blue', link: '/admin/users', icon: <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M16 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2" /><circle cx="8.5" cy="7" r="4" /><line x1="20" y1="8" x2="20" y2="14" /><line x1="23" y1="11" x2="17" y2="11" /></svg> },
                { label: t('admin.quick.createCourse'), color: 'teal', link: '/admin/courses/approval', icon: <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253" /></svg> },
                { label: t('admin.quick.createExam'), color: 'green', link: '/admin/courses/approval', icon: <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2" /></svg> },
                { label: t('admin.quick.deployToken'), color: 'orange', link: '/admin', icon: <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M10 20l4-16m4 4 4 4-4 4M6 16l-4-4 4-4" /></svg> },
              ].map((qa, i) => {
                const map: Record<string, string> = {
                  blue: 'bg-blue-50 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400',
                  teal: 'bg-cyan-50 text-cyan-600 dark:bg-cyan-900/30 dark:text-cyan-400',
                  green: 'bg-emerald-50 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-400',
                  orange: 'bg-amber-50 text-amber-600 dark:bg-amber-900/30 dark:text-amber-400',
                };
                return (
                  <Link
                    key={i}
                    to={qa.link}
                    className="group relative overflow-hidden flex flex-col items-center gap-2 p-5 bg-slate-50 dark:bg-slate-800/50 rounded-xl transition-all hover:-translate-y-1 hover:bg-blue-50 dark:hover:bg-blue-900/20 hover:shadow-lg hover:shadow-blue-500/10"
                  >
                    <div className="absolute top-0 left-0 w-full h-full bg-gradient-to-r from-transparent via-blue-500/10 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000" />
                    <div className={`relative w-11 h-11 rounded-xl flex items-center justify-center transition-all group-hover:scale-110 group-hover:rotate-[10deg] ${map[qa.color]}`}>
                      {qa.icon}
                    </div>
                    <span className="relative text-xs font-semibold">{qa.label}</span>
                  </Link>
                );
              })}
            </div>
          </div>

          {/* Recent activity — chưa service nào công bố luồng hoạt động */}
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 overflow-hidden opacity-0 animate-[fadeInUp_1s_ease-out_forwards] [animation-delay:.35s]">
            <div className="px-6 py-5 border-b border-slate-200 dark:border-slate-800">
              <h2 className="flex items-center gap-2.5 text-base font-semibold">
                <span className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400 flex items-center justify-center">
                  <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5" /></svg>
                </span>
                {t('admin.dashboard.recentActivity')}
              </h2>
            </div>
            <div className="p-6 text-center text-sm text-slate-500 dark:text-slate-400">{t('admin.noDataSource')}</div>
          </div>

          {/* System status — chưa có endpoint tổng hợp health các service */}
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 overflow-hidden opacity-0 animate-[fadeInUp_1s_ease-out_forwards] [animation-delay:.4s]">
            <div className="px-6 py-5 border-b border-slate-200 dark:border-slate-800">
              <h2 className="flex items-center gap-2.5 text-base font-semibold">
                <span className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-400 flex items-center justify-center">
                  <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M5 13l4 4L19 7" /></svg>
                </span>
                {t('admin.dashboard.systemStatus')}
              </h2>
            </div>
            <div className="p-6 text-center text-sm text-slate-500 dark:text-slate-400">{t('admin.noDataSource')}</div>
          </div>
        </div>
      </div>
    </AdminLayout>
  );
};

export default AdminDashboardPage;
