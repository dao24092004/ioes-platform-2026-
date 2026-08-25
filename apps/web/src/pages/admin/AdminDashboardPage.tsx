import React from 'react';
import { useTranslation } from 'react-i18next';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import AdminLayout from '@/components/layout/AdminLayout';
import { usersApi, coursesApi, systemApi, activityApi } from '@/services/api';

const formatRelative = (iso: string) => {
  const diff = Date.now() - new Date(iso).getTime();
  const minutes = Math.floor(diff / 60000);
  if (minutes < 1) return 'just now';
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
};

const AdminDashboardPage: React.FC = () => {
  const { t } = useTranslation();

  const { data: userStats } = useQuery({ queryKey: ['users', 'stats'], queryFn: () => usersApi.stats() });
  const { data: courseStats } = useQuery({ queryKey: ['courses', 'stats'], queryFn: () => coursesApi.stats() });
  const { data: recentUsersData } = useQuery({
    queryKey: ['users', 'list', 'recent'],
    queryFn: () => usersApi.list({ page: 1, per_page: 4, sort: 'newest' }),
  });
  const { data: services } = useQuery({ queryKey: ['system', 'services'], queryFn: () => systemApi.services() });
  const { data: activities } = useQuery({ queryKey: ['activity', 'recent'], queryFn: () => activityApi.recent(8) });

  const tokensIssued = 5421; // (placeholder - từ blockchain-service schema nếu có)
  const uptime = services ? (services.reduce((acc: number, s: { uptime_ms: number }) => acc + s.uptime_ms, 0) / services.length).toFixed(2) + '%' : '—';

  const recentUsers = recentUsersData?.data ?? [];

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
    const s = map[status];
    return (
      <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-semibold transition-transform hover:scale-105 ${s.cls}`}>
        <span className={`w-1.5 h-1.5 rounded-full ${s.dot}`} />{s.label}
      </span>
    );
  };

  const activityIcon = (type: string) => {
    const map: Record<string, { bg: string; svg: React.ReactNode }> = {
      course_submitted: {
        bg: 'bg-amber-50 text-amber-600 dark:bg-amber-900/30 dark:text-amber-400',
        svg: <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" /></svg>,
      },
      user_registered: {
        bg: 'bg-blue-50 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400',
        svg: <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M16 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2" /><circle cx="8.5" cy="7" r="4" /><line x1="20" y1="8" x2="20" y2="14" /><line x1="23" y1="11" x2="17" y2="11" /></svg>,
      },
      course_approved: {
        bg: 'bg-emerald-50 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-400',
        svg: <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M22 11.08V12a10 10 0 11-5.93-9.14" /><polyline points="22 4 12 14.01 9 11.01" /></svg>,
      },
      system_alert: {
        bg: 'bg-red-50 text-red-600 dark:bg-red-900/30 dark:text-red-400',
        svg: <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" /><line x1="12" y1="9" x2="12" y2="13" /><line x1="12" y1="17" x2="12.01" y2="17" /></svg>,
      },
    };
    const cfg = map[type] ?? map.course_submitted;
    return <div className={`w-10 h-10 rounded-lg flex items-center justify-center transition-transform hover:scale-110 hover:rotate-[10deg] ${cfg.bg}`}>{cfg.svg}</div>;
  };

  return (
    <AdminLayout title={t('admin.dashboard.title')} subtitle={t('admin.dashboard.subtitle')}>
      {/* Stats grid */}
      <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-5 gap-5 mb-8">
        {[
          { value: userStats?.total ?? 0, label: t('admin.stats.users'), trend: { up: true, value: '+12%' }, color: 'blue', icon: <svg className="w-6 h-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75" /></svg> },
          { value: courseStats?.total ?? 0, label: t('admin.stats.courses'), trend: { up: true, value: '+8%' }, color: 'teal', icon: <svg className="w-6 h-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M4 19.5A2.5 2.5 0 016.5 17H20M6.5 2H20v20H6.5A2.5 2.5 0 014 19.5v-15A2.5 2.5 0 016.5 2z" /></svg> },
          { value: 1847, label: t('admin.stats.exams'), trend: { up: true, value: '+15%' }, color: 'green', icon: <svg className="w-6 h-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" /></svg> },
          { value: tokensIssued, label: t('admin.stats.tokens'), trend: { up: false, value: '-3%' }, color: 'orange', icon: <svg className="w-6 h-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" /></svg> },
          { value: uptime, label: t('admin.stats.uptime'), trend: { up: true, value: '1.2ms' }, color: 'red', icon: <svg className="w-6 h-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg> },
        ].map((s, i) => {
          const colorClasses: Record<string, string> = {
            blue: 'bg-blue-50 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400',
            teal: 'bg-cyan-50 text-cyan-600 dark:bg-cyan-900/30 dark:text-cyan-400',
            green: 'bg-emerald-50 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-400',
            orange: 'bg-amber-50 text-amber-600 dark:bg-amber-900/30 dark:text-amber-400',
            red: 'bg-red-50 text-red-600 dark:bg-red-900/30 dark:text-red-400',
          };
          return (
            <div key={i} className="group relative overflow-hidden bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-6 transition-all hover:-translate-y-1 hover:shadow-xl hover:shadow-blue-500/5 hover:border-blue-200 dark:hover:border-blue-800 opacity-0 animate-[fadeInUp_.6s_ease-out_forwards]" style={{ animationDelay: `${(i + 1) * 0.1}s` }}>
              <div className="absolute top-0 left-0 w-full h-full bg-gradient-to-r from-transparent via-blue-500/5 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-700" />
              <div className="relative flex items-start justify-between mb-4">
                <div className={`w-12 h-12 rounded-xl flex items-center justify-center transition-all group-hover:rotate-[10deg] group-hover:scale-110 ${colorClasses[s.color]}`}>
                  {s.icon}
                </div>
                <span className={`flex items-center gap-1 text-xs font-semibold px-2 py-1 rounded-md transition-all group-hover:scale-105 ${
                  s.trend.up ? 'bg-emerald-50 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-400' : 'bg-red-50 text-red-600 dark:bg-red-900/30 dark:text-red-400'
                }`}>
                  <svg className="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                    <path d={s.trend.up ? 'M5 10l7-7m0 0l7 7m-7-7v18' : 'M19 14l-7 7m0 0l-7-7m7 7V3'} />
                  </svg>
                  {s.trend.value}
                </span>
              </div>
              <div className="relative text-3xl font-bold mb-1 transition-all group-hover:text-blue-600 group-hover:scale-105 origin-left animate-[countUp_.5s_ease_forwards]">
                {s.value}
              </div>
              <div className="relative text-sm text-slate-500 dark:text-slate-400">{s.label}</div>
            </div>
          );
        })}
      </div>

      {/* Main grid */}
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-6">
        {/* Recent users */}
        <div className="xl:col-span-8 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 overflow-hidden opacity-0 animate-[fadeInUp_.6s_ease-out_forwards] [animation-delay:.2s] hover:shadow-xl hover:shadow-blue-500/5 hover:-translate-y-1 transition-all duration-300">
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
                {recentUsers.length === 0 && (
                  <tr><td colSpan={5} className="text-center py-8 text-slate-500 text-sm">—</td></tr>
                )}
                {recentUsers.map((u: { id: string; avatar_url?: string | null; full_name: string; email: string; role: string; status: string; created_at: string }) => (
                  <tr key={u.id} className="border-t border-slate-100 dark:border-slate-800 transition-all hover:bg-blue-50/50 dark:hover:bg-blue-900/10 group">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        {u.avatar_url ? (
                          <img src={u.avatar_url} alt={u.full_name} className="w-10 h-10 rounded-xl object-cover transition-all group-hover:scale-110 group-hover:rotate-[5deg] group-hover:shadow-lg group-hover:shadow-blue-500/30" />
                        ) : (
                          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-cyan-500 text-white flex items-center justify-center font-semibold text-sm transition-all group-hover:scale-110 group-hover:rotate-[5deg] group-hover:shadow-lg group-hover:shadow-blue-500/30">
                            {getInitials(u.full_name)}
                          </div>
                        )}
                        <div className="min-w-0">
                          <div className="font-semibold text-sm">{u.full_name}</div>
                          <div className="text-xs text-slate-500 dark:text-slate-400 truncate">{u.email}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">{roleBadge(u.role)}</td>
                    <td className="px-6 py-4">{statusBadge(u.status)}</td>
                    <td className="px-6 py-4 text-sm text-slate-500 dark:text-slate-400">
                      {new Date(u.created_at).toLocaleDateString('vi-VN')}
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
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 overflow-hidden opacity-0 animate-[fadeInUp_.6s_ease-out_forwards] [animation-delay:.3s] hover:shadow-xl hover:shadow-blue-500/5 hover:-translate-y-1 transition-all">
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
                    <div className="absolute top-0 left-0 w-full h-full bg-gradient-to-r from-transparent via-blue-500/10 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-700" />
                    <div className={`relative w-11 h-11 rounded-xl flex items-center justify-center transition-all group-hover:scale-110 group-hover:rotate-[10deg] ${map[qa.color]}`}>
                      {qa.icon}
                    </div>
                    <span className="relative text-xs font-semibold">{qa.label}</span>
                  </Link>
                );
              })}
            </div>
          </div>

          {/* Recent activity */}
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 overflow-hidden opacity-0 animate-[fadeInUp_.6s_ease-out_forwards] [animation-delay:.35s] hover:shadow-xl hover:shadow-blue-500/5 hover:-translate-y-1 transition-all">
            <div className="px-6 py-5 border-b border-slate-200 dark:border-slate-800">
              <h2 className="flex items-center gap-2.5 text-base font-semibold">
                <span className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400 flex items-center justify-center transition-transform hover:rotate-[10deg] hover:scale-110">
                  <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5" /></svg>
                </span>
                {t('admin.dashboard.recentActivity')}
              </h2>
            </div>
            <div className="p-4 space-y-2 max-h-[400px] overflow-y-auto">
              {(activities ?? []).map((a: { id: string; type: string; title: string; description: string; created_at: string }) => (
                <div key={a.id} className="group flex items-start gap-3 p-3 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-800/50 hover:translate-x-1 transition-all">
                  {activityIcon(a.type)}
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-semibold">{a.title}</div>
                    <div className="text-xs text-slate-500 dark:text-slate-400 line-clamp-2">{a.description}</div>
                  </div>
                  <div className="text-xs text-slate-400 whitespace-nowrap">{formatRelative(a.created_at)}</div>
                </div>
              ))}
            </div>
          </div>

          {/* System status */}
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 overflow-hidden opacity-0 animate-[fadeInUp_.6s_ease-out_forwards] [animation-delay:.4s] hover:shadow-xl hover:shadow-blue-500/5 hover:-translate-y-1 transition-all">
            <div className="px-6 py-5 border-b border-slate-200 dark:border-slate-800">
              <h2 className="flex items-center gap-2.5 text-base font-semibold">
                <span className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-400 flex items-center justify-center transition-transform hover:rotate-[10deg] hover:scale-110">
                  <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M5 13l4 4L19 7" /></svg>
                </span>
                {t('admin.dashboard.systemStatus')}
              </h2>
            </div>
            <div className="p-6 space-y-1">
              {(services ?? []).map((sys: { name: string; version: string; status: string; uptime_ms: number }) => (
                <div key={sys.name} className="group flex items-center justify-between py-3 px-2 -mx-2 rounded-lg transition-all hover:bg-slate-50 dark:hover:bg-slate-800/50 hover:pl-4">
                  <div className="flex items-center gap-3">
                    <span className={`w-2.5 h-2.5 rounded-full transition-all group-hover:scale-150 ${
                      sys.status === 'healthy' ? 'bg-emerald-500 animate-[pulse_2s_infinite]' : sys.status === 'warning' ? 'bg-amber-500 animate-[pulse_1s_infinite]' : 'bg-red-500'
                    }`} />
                    <div>
                      <div className="text-sm font-medium">{sys.name}</div>
                      <div className="text-xs text-slate-500 dark:text-slate-400">{sys.version} • {sys.uptime_ms.toFixed(2)}%</div>
                    </div>
                  </div>
                  {sys.status === 'healthy' ? (
                    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-semibold bg-emerald-50 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-400 transition-transform hover:scale-105">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />{t('admin.status.healthy')}
                    </span>
                  ) : sys.status === 'warning' ? (
                    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-semibold bg-amber-50 text-amber-600 dark:bg-amber-900/30 dark:text-amber-400 transition-transform hover:scale-105">
                      <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />{t('admin.status.highLoad')}
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-semibold bg-red-50 text-red-600 dark:bg-red-900/30 dark:text-red-400 transition-transform hover:scale-105">
                      <span className="w-1.5 h-1.5 rounded-full bg-red-500" />{t('admin.status.rejected')}
                    </span>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </AdminLayout>
  );
};

export default AdminDashboardPage;