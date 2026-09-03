import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import AdminLayout from '@/components/layout/AdminLayout';
import { usersApi } from '@/services/api';
import type { User, UserRole, UserStatus } from '@/types/db';

const getInitials = (name: string) =>
  name.split(' ').filter(Boolean).map(s => s.charAt(0)).slice(0, 2).join('').toUpperCase();

const formatDate = (iso: string | null | undefined) => {
  if (!iso) return '—';
  const d = new Date(iso);
  return `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear()}`;
};

const UserManagementPage: React.FC = () => {
  const { t } = useTranslation();
  const qc = useQueryClient();
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState<UserRole | 'all'>('all');
  const [statusFilter, setStatusFilter] = useState<UserStatus | 'all'>('all');
  const [sortBy, setSortBy] = useState<'newest' | 'name_asc'>('newest');
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [showModal, setShowModal] = useState(false);
  const [page, setPage] = useState(1);
  const perPage = 6;

  const { data: stats } = useQuery({
    queryKey: ['users', 'stats'],
    queryFn: () => usersApi.stats(),
  });

  const { data: listData, isLoading, isFetching } = useQuery({
    queryKey: ['users', 'list', { search, roleFilter, statusFilter, sortBy, page }],
    queryFn: () => usersApi.list({
      page,
      per_page: perPage,
      search: search || undefined,
      role: roleFilter,
      status: statusFilter,
      sort: sortBy,
    }),
  });

  const updateStatus = useMutation({
    mutationFn: ({ id, status }: { id: string; status: UserStatus }) => usersApi.updateStatus(id, status),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['users'] });
    },
  });

  const updateRole = useMutation({
    mutationFn: ({ id, role }: { id: string; role: UserRole }) => usersApi.updateRole(id, role),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['users'] });
    },
  });

  const deleteUser = useMutation({
    mutationFn: (id: string) => usersApi.delete(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['users'] });
    },
  });

  const users = listData?.data ?? [];
  const total = listData?.meta.total ?? 0;
  const totalPages = listData?.meta.total_pages ?? 1;

  const toggleRow = (id: string) => {
    const next = new Set(selected);
    if (next.has(id)) next.delete(id); else next.add(id);
    setSelected(next);
  };

  const toggleAll = () => {
    if (users.every((u: User) => selected.has(u.id))) {
      const next = new Set(selected);
      users.forEach((u: User) => next.delete(u.id));
      setSelected(next);
    } else {
      const next = new Set(selected);
      users.forEach((u: User) => next.add(u.id));
      setSelected(next);
    }
  };

  const roleBadge = (role: UserRole) => {
    const map: Record<UserRole, string> = {
      super_admin: 'bg-purple-50 text-purple-600 dark:bg-purple-900/30 dark:text-purple-400',
      admin: 'bg-blue-50 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400',
      instructor: 'bg-amber-50 text-amber-600 dark:bg-amber-900/30 dark:text-amber-400',
      student: 'bg-emerald-50 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-400',
      guest: 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400',
    };
    return (
      <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-semibold transition-transform hover:scale-105 ${map[role] ?? map.student}`}>
        {t(`admin.role.${role === 'super_admin' ? 'superAdmin' : role}`)}
      </span>
    );
  };

  const statusBadge = (status: UserStatus) => {
    // DB statuses: pending | active | suspended | deleted
    const map: Record<UserStatus, { cls: string; dot: string }> = {
      active: { cls: 'bg-emerald-50 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-400', dot: 'bg-emerald-500' },
      pending: { cls: 'bg-amber-50 text-amber-600 dark:bg-amber-900/30 dark:text-amber-400', dot: 'bg-amber-500' },
      suspended: { cls: 'bg-red-50 text-red-600 dark:bg-red-900/30 dark:text-red-400', dot: 'bg-red-500' },
      deleted: { cls: 'bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-500', dot: 'bg-slate-400' },
    };
    const s = map[status] ?? map.active;
    return (
      <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium transition-transform hover:scale-105 ${s.cls}`}>
        <span className={`w-1.5 h-1.5 rounded-full ${s.dot}`} />{t(`admin.status.${status}`)}
      </span>
    );
  };

  const statsCards = [
    { value: stats?.total ?? 0, label: t('admin.stats.allUsers'), color: 'blue', key: 'all' as const, filterTo: 'all' as UserStatus | 'all', icon: <svg className="w-6 h-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75" /></svg> },
    { value: stats?.students ?? 0, label: t('admin.stats.students'), color: 'green', key: 'student' as const, filterTo: 'all' as UserStatus | 'all', icon: <svg className="w-6 h-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M22 10v6M2 10l10-5 10 5-10 5z" /><path d="M6 12v5c3 3 9 3 12 0v-5" /></svg> },
    { value: stats?.instructors ?? 0, label: t('admin.stats.instructors'), color: 'orange', key: 'instructor' as const, filterTo: 'all' as UserStatus | 'all', icon: <svg className="w-6 h-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M2 3h6a4 4 0 014 4v14a3 3 0 00-3-3H2zM22 3h-6a4 4 0 00-4 4v14a3 3 0 013-3h7z" /></svg> },
    { value: (stats?.admins ?? 0) + (stats?.super_admins ?? 0), label: t('admin.stats.admins'), color: 'purple', key: 'admin' as const, filterTo: 'all' as UserStatus | 'all', icon: <svg className="w-6 h-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 2l3 7h7l-5.5 4 2 7-6.5-4-6.5 4 2-7L2 9h7z" /></svg> },
    { value: stats?.suspended ?? 0, label: t('admin.stats.suspended'), color: 'red', key: 'suspended' as const, filterTo: 'suspended' as UserStatus | 'all', icon: <svg className="w-6 h-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10" /><line x1="4.93" y1="4.93" x2="19.07" y2="19.07" /></svg> },
  ];

  return (
    <AdminLayout
      title={t('admin.users.title')}
      subtitle={t('admin.users.subtitle')}
      headerActions={
        <>
          <button className="hidden sm:inline-flex items-center gap-2 px-4 py-2 text-sm font-semibold rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 transition-all hover:-translate-y-0.5">
            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M7 10l5 5 5-5M12 15V3" /></svg>
            {t('admin.users.export')}
          </button>
          <button
            onClick={() => setShowModal(true)}
            className="inline-flex items-center gap-2 px-4 py-2 text-sm font-semibold rounded-xl bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white shadow-lg shadow-blue-500/30 hover:shadow-blue-500/50 hover:-translate-y-0.5 transition-all"
          >
            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" /></svg>
            {t('admin.users.addUser')}
          </button>
        </>
      }
    >
      {/* Stats grid */}
      <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-5 gap-4 mb-6">
        {statsCards.map((s, i) => {
          const map = {
            blue: 'bg-blue-50 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400',
            green: 'bg-emerald-50 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-400',
            orange: 'bg-amber-50 text-amber-600 dark:bg-amber-900/30 dark:text-amber-400',
            purple: 'bg-purple-50 text-purple-600 dark:bg-purple-900/30 dark:text-purple-400',
            red: 'bg-red-50 text-red-600 dark:bg-red-900/30 dark:text-red-400',
          };
          const active = (s.key === 'all' && statusFilter === 'all' && roleFilter === 'all')
            || (s.key === 'student' && roleFilter === 'student')
            || (s.key === 'instructor' && roleFilter === 'instructor')
            || (s.key === 'admin' && (roleFilter === 'admin' || roleFilter === 'super_admin'))
            || (s.key === 'suspended' && statusFilter === 'suspended');
          return (
            <button
              key={s.key}
              onClick={() => {
                setPage(1);
                if (s.key === 'all') { setRoleFilter('all'); setStatusFilter('all'); }
                else if (s.key === 'student') { setRoleFilter('student'); setStatusFilter('all'); }
                else if (s.key === 'instructor') { setRoleFilter('instructor'); setStatusFilter('all'); }
                else if (s.key === 'admin') { setRoleFilter('admin'); setStatusFilter('all'); }
                else if (s.key === 'suspended') { setRoleFilter('all'); setStatusFilter('suspended'); }
              }}
              className={`group text-left bg-white dark:bg-slate-900 rounded-2xl border p-5 transition-all hover:-translate-y-1 hover:shadow-lg hover:shadow-blue-500/5 opacity-0 animate-[fadeInUp_.6s_ease-out_forwards] ${
                active ? 'border-blue-500 ring-2 ring-blue-500/20' : 'border-slate-200 dark:border-slate-800 hover:border-blue-200 dark:hover:border-blue-800'
              }`}
              style={{ animationDelay: `${(i + 1) * 0.1}s` }}
            >
              <div className={`w-12 h-12 rounded-xl flex items-center justify-center mb-3 transition-all group-hover:rotate-[10deg] group-hover:scale-110 ${map[s.color as keyof typeof map]}`}>
                {s.icon}
              </div>
              <div className="text-3xl font-bold mb-1 animate-[countUp_.5s_ease_forwards]">{s.value}</div>
              <div className="text-sm text-slate-500 dark:text-slate-400">{s.label}</div>
            </button>
          );
        })}
      </div>

      {/* Bulk actions bar */}
      {selected.size > 0 && (
        <div className="mb-4 px-5 py-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-xl flex items-center gap-3 animate-[fadeInUp_.3s_ease-out]">
          <span className="text-sm font-semibold text-blue-700 dark:text-blue-300">
            {selected.size} {t('admin.users.selected')}
          </span>
          <div className="ml-auto flex items-center gap-2">
            <button
              onClick={() => {
                selected.forEach(id => updateRole.mutate({ id, role: 'instructor' }));
                setSelected(new Set());
              }}
              className="px-3 py-1.5 text-xs font-semibold rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 transition-all hover:-translate-y-0.5"
            >
              {t('admin.users.changeRole')}
            </button>
            <button
              onClick={() => {
                selected.forEach(id => updateStatus.mutate({ id, status: 'suspended' }));
                setSelected(new Set());
              }}
              className="px-3 py-1.5 text-xs font-semibold rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 transition-all hover:-translate-y-0.5"
            >
              {t('admin.users.lock')}
            </button>
            <button
              onClick={() => {
                if (confirm('Delete selected users?')) {
                  selected.forEach(id => deleteUser.mutate(id));
                  setSelected(new Set());
                }
              }}
              className="px-3 py-1.5 text-xs font-semibold rounded-lg border border-red-300 text-red-600 bg-white hover:bg-red-50 transition-all hover:-translate-y-0.5"
            >
              {t('admin.users.delete')}
            </button>
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="flex flex-col md:flex-row gap-3 mb-4">
        <div className="relative flex-1 md:max-w-xs">
          <svg className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="8" /><path d="M21 21l-4.35-4.35" /></svg>
          <input
            type="text"
            placeholder={t('admin.users.searchPlaceholder')}
            value={search}
            onChange={e => { setSearch(e.target.value); setPage(1); }}
            className="w-full pl-11 pr-4 py-2.5 text-sm bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all"
          />
        </div>
        <div className="flex flex-wrap gap-2">
          <select
            value={roleFilter}
            onChange={e => { setRoleFilter(e.target.value as UserRole | 'all'); setPage(1); }}
            className="px-4 py-2.5 text-sm bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all cursor-pointer"
          >
            <option value="all">{t('admin.users.allRoles')}</option>
            <option value="super_admin">{t('admin.role.superAdmin')}</option>
            <option value="admin">{t('admin.role.admin')}</option>
            <option value="instructor">{t('admin.role.instructor')}</option>
            <option value="student">{t('admin.role.student')}</option>
            <option value="guest">{t('admin.role.guest')}</option>
          </select>
          <select
            value={statusFilter}
            onChange={e => { setStatusFilter(e.target.value as UserStatus | 'all'); setPage(1); }}
            className="px-4 py-2.5 text-sm bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all cursor-pointer"
          >
            <option value="all">{t('admin.users.allStatus')}</option>
            <option value="active">{t('admin.status.active')}</option>
            <option value="pending">{t('admin.status.pending')}</option>
            <option value="suspended">{t('admin.status.suspended')}</option>
            <option value="deleted">{t('admin.status.deleted')}</option>
          </select>
          <select
            value={sortBy}
            onChange={e => setSortBy(e.target.value as 'newest' | 'name_asc')}
            className="px-4 py-2.5 text-sm bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all cursor-pointer"
          >
            <option value="newest">{t('admin.users.newest')}</option>
            <option value="name_asc">{t('admin.users.nameAZ')}</option>
          </select>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 overflow-hidden opacity-0 animate-[fadeInUp_.6s_ease-out_forwards] [animation-delay:.2s]">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-slate-50 dark:bg-slate-800/50 text-xs uppercase tracking-wider text-slate-500">
                <th className="w-12 px-4 py-4">
                  <button
                    onClick={toggleAll}
                    disabled={users.length === 0}
                    className={`w-5 h-5 rounded-md border-2 transition-all flex items-center justify-center ${
                      users.length > 0 && users.every((u: User) => selected.has(u.id))
                        ? 'bg-blue-600 border-blue-600'
                        : 'border-slate-300 dark:border-slate-600 hover:border-blue-500'
                    }`}
                  >
                    {users.length > 0 && users.every((u: User) => selected.has(u.id)) && (
                      <svg className="w-3 h-3 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><polyline points="20 6 9 17 4 12" /></svg>
                    )}
                  </button>
                </th>
                <th className="text-left px-4 py-4 font-semibold">{t('admin.table.user')}</th>
                <th className="text-left px-4 py-4 font-semibold">{t('admin.table.role')}</th>
                <th className="text-left px-4 py-4 font-semibold">{t('admin.table.department')}</th>
                <th className="text-left px-4 py-4 font-semibold">{t('admin.table.joined')}</th>
                <th className="text-left px-4 py-4 font-semibold">{t('admin.table.status')}</th>
                <th className="text-left px-4 py-4 font-semibold">{t('admin.table.actions')}</th>
              </tr>
            </thead>
            <tbody>
              {isLoading && (
                <tr><td colSpan={7} className="text-center py-12 text-slate-500">
                  <div className="inline-block w-8 h-8 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
                </td></tr>
              )}
              {!isLoading && users.length === 0 && (
                <tr><td colSpan={7} className="text-center py-12 text-slate-500">{t('admin.users.noResults')}</td></tr>
              )}
              {users.map((u: User) => (
                <tr key={u.id} className="border-t border-slate-100 dark:border-slate-800 transition-all hover:bg-blue-50/50 dark:hover:bg-blue-900/10 group">
                  <td className="px-4 py-4">
                    <button
                      onClick={() => toggleRow(u.id)}
                      className={`w-5 h-5 rounded-md border-2 transition-all flex items-center justify-center ${
                        selected.has(u.id) ? 'bg-blue-600 border-blue-600' : 'border-slate-300 dark:border-slate-600 hover:border-blue-500'
                      }`}
                    >
                      {selected.has(u.id) && <svg className="w-3 h-3 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><polyline points="20 6 9 17 4 12" /></svg>}
                    </button>
                  </td>
                  <td className="px-4 py-4">
                    <div className="flex items-center gap-3">
                      {u.avatar_url ? (
                        <img src={u.avatar_url} alt={u.full_name} className="w-10 h-10 rounded-xl object-cover transition-all group-hover:scale-110 group-hover:rotate-[5deg] group-hover:shadow-lg group-hover:shadow-blue-500/30" />
                      ) : (
                        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-cyan-500 text-white flex items-center justify-center font-semibold text-sm transition-all group-hover:scale-110 group-hover:rotate-[5deg] group-hover:shadow-lg group-hover:shadow-blue-500/30">
                          {getInitials(u.full_name)}
                        </div>
                      )}
                      <div className="min-w-0">
                        <div className="font-semibold text-sm flex items-center gap-1.5">
                          {u.full_name}
                          {u.email_verified && (
                            <svg className="w-3.5 h-3.5 text-emerald-500" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z" /></svg>
                          )}
                          {u.mfa_enabled && (
                            <svg className="w-3.5 h-3.5 text-blue-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="11" width="18" height="11" rx="2" /><path d="M7 11V7a5 5 0 0110 0v4" /></svg>
                          )}
                        </div>
                        <div className="text-xs text-slate-500 dark:text-slate-400 truncate">{u.email}</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-4">{roleBadge(u.role)}</td>
                  <td className="px-4 py-4 text-sm text-slate-600 dark:text-slate-400">
                    {u.metadata?.department ? String(u.metadata.department) : '—'}
                  </td>
                  <td className="px-4 py-4 text-sm text-slate-500 dark:text-slate-400">{formatDate(u.created_at)}</td>
                  <td className="px-4 py-4">{statusBadge(u.status)}</td>
                  <td className="px-4 py-4">
                    <div className="flex items-center gap-1.5">
                      <button className="w-8 h-8 rounded-lg border border-slate-200 dark:border-slate-700 hover:border-blue-500 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-all flex items-center justify-center">
                        <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7" /><path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z" /></svg>
                      </button>
                      {u.status === 'suspended' || u.status === 'deleted' ? (
                        <button
                          onClick={() => updateStatus.mutate({ id: u.id, status: 'active' })}
                          className="w-8 h-8 rounded-lg border border-slate-200 dark:border-slate-700 hover:border-emerald-500 hover:text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-900/20 transition-all flex items-center justify-center"
                          title={t('admin.users.unlock')}
                        >
                          <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="11" width="18" height="11" rx="2" /><path d="M7 11V7a5 5 0 0110 0v4" /></svg>
                        </button>
                      ) : (
                        <button
                          onClick={() => updateStatus.mutate({ id: u.id, status: 'suspended' })}
                          className="w-8 h-8 rounded-lg border border-slate-200 dark:border-slate-700 hover:border-red-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 transition-all flex items-center justify-center"
                          title={t('admin.users.lock')}
                        >
                          <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="5" y="11" width="14" height="11" rx="2" /><path d="M7 11V7a5 5 0 0110 0v4" /></svg>
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 px-5 py-4 border-t border-slate-100 dark:border-slate-800">
          <div className="text-sm text-slate-500 dark:text-slate-400">
            {t('admin.users.showing')} {users.length === 0 ? 0 : (page - 1) * perPage + 1}-{Math.min(page * perPage, total)} {t('admin.users.of')} {total} {t('admin.users.users')}
            {isFetching && !isLoading && <span className="ml-2 inline-block w-3 h-3 border-2 border-blue-600 border-t-transparent rounded-full animate-spin align-middle" />}
          </div>
          <div className="flex items-center gap-1">
            <button
              disabled={page === 1}
              onClick={() => setPage(p => Math.max(1, p - 1))}
              className="w-9 h-9 rounded-lg border border-slate-200 dark:border-slate-700 flex items-center justify-center disabled:opacity-40 disabled:cursor-not-allowed hover:border-blue-500 hover:text-blue-600 transition-all"
            >
              <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="15 18 9 12 15 6" /></svg>
            </button>
            {Array.from({ length: totalPages }, (_, i) => i + 1).map(n => (
              <button
                key={n}
                onClick={() => setPage(n)}
                className={`w-9 h-9 rounded-lg text-sm font-medium transition-all ${
                  page === n ? 'bg-blue-600 text-white border border-blue-600' : 'border border-slate-200 dark:border-slate-700 hover:border-blue-500 hover:text-blue-600'
                }`}
              >
                {n}
              </button>
            ))}
            <button
              disabled={page === totalPages}
              onClick={() => setPage(p => Math.min(totalPages, p + 1))}
              className="w-9 h-9 rounded-lg border border-slate-200 dark:border-slate-700 flex items-center justify-center disabled:opacity-40 disabled:cursor-not-allowed hover:border-blue-500 hover:text-blue-600 transition-all"
            >
              <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="9 18 15 12 9 6" /></svg>
            </button>
          </div>
        </div>
      </div>

      {/* Add user modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-[fadeIn_.2s_ease-out]">
          <div className="w-full max-w-lg bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden animate-[fadeInUp_.3s_ease-out]">
            <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
              <h2 className="text-lg font-bold">{t('admin.users.addNew')}</h2>
              <button onClick={() => setShowModal(false)} className="w-8 h-8 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 flex items-center justify-center transition-all">
                <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-semibold mb-1.5">{t('admin.users.fullName')}</label>
                <input type="text" placeholder="Nguyễn Văn A" className="w-full px-4 py-2.5 text-sm bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all" />
              </div>
              <div>
                <label className="block text-sm font-semibold mb-1.5">{t('admin.users.email')}</label>
                <input type="email" placeholder="email@fpt.edu.vn" className="w-full px-4 py-2.5 text-sm bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all" />
              </div>
              <div>
                <label className="block text-sm font-semibold mb-1.5">{t('admin.table.role')}</label>
                <select className="w-full px-4 py-2.5 text-sm bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all">
                  <option value="">{t('admin.users.chooseRole')}</option>
                  <option value="student">{t('admin.role.student')}</option>
                  <option value="instructor">{t('admin.role.instructor')}</option>
                  <option value="admin">{t('admin.role.admin')}</option>
                  <option value="guest">{t('admin.role.guest')}</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-semibold mb-1.5">{t('admin.table.department')}</label>
                <select className="w-full px-4 py-2.5 text-sm bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all">
                  <option value="">{t('admin.users.chooseDept')}</option>
                  <option>Khoa Công nghệ thông tin</option>
                  <option>Khoa Toán</option>
                  <option>Khoa Kinh tế</option>
                  <option>Khoa Ngoại ngữ</option>
                  <option>Phòng CNTT</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-semibold mb-1.5">{t('admin.table.status')}</label>
                <select className="w-full px-4 py-2.5 text-sm bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all">
                  <option value="active">{t('admin.status.active')}</option>
                  <option value="pending">{t('admin.status.pending')}</option>
                  <option value="suspended">{t('admin.status.suspended')}</option>
                </select>
              </div>
            </div>
            <div className="px-6 py-4 border-t border-slate-200 dark:border-slate-800 flex items-center justify-end gap-2 bg-slate-50 dark:bg-slate-800/30">
              <button onClick={() => setShowModal(false)} className="px-4 py-2 text-sm font-semibold rounded-xl border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 transition-all">
                {t('common.cancel')}
              </button>
              <button className="inline-flex items-center gap-2 px-4 py-2 text-sm font-semibold rounded-xl bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white shadow-lg shadow-blue-500/30 hover:shadow-blue-500/50 transition-all">
                <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M19 21H5a2 2 0 01-2-2V5a2 2 0 012-2h11l5 5v11a2 2 0 01-2 2z" /><polyline points="17 21 17 13 7 13 7 21" /><polyline points="7 3 7 8 15 8" /></svg>
                {t('common.save')}
              </button>
            </div>
          </div>
        </div>
      )}
    </AdminLayout>
  );
};

export default UserManagementPage;