import React, { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useQuery } from '@tanstack/react-query';
import AdminLayout from '@/components/layout/AdminLayout';
import PaginationBar from '@/components/common/PaginationBar';
import type { AuditEntry } from '@/services/api';
import { securityApi } from '@/services/api';

type AuditType = AuditEntry['type'];
type AuditSeverity = AuditEntry['severity'];

const typeStyles: Record<AuditType, { bg: string; text: string; icon: React.ReactNode }> = {
  create: { bg: 'bg-emerald-50 dark:bg-emerald-900/30', text: 'text-emerald-600 dark:text-emerald-400', icon: <svg className="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" /></svg> },
  update: { bg: 'bg-amber-50 dark:bg-amber-900/30', text: 'text-amber-600 dark:text-amber-400', icon: <svg className="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7" /><path d="M18.5 2.5a2.121 2.121 0 113 3L12 15l-4 1 1-4 9.5-9.5z" /></svg> },
  delete: { bg: 'bg-red-50 dark:bg-red-900/30', text: 'text-red-600 dark:text-red-400', icon: <svg className="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="3 6 5 6 21 6" /><path d="M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2" /></svg> },
  auth: { bg: 'bg-blue-50 dark:bg-blue-900/30', text: 'text-blue-600 dark:text-blue-400', icon: <svg className="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><rect x="3" y="11" width="18" height="11" rx="2" /><path d="M7 11V7a5 5 0 0110 0v4" /></svg> },
  login: { bg: 'bg-blue-50 dark:bg-blue-900/30', text: 'text-blue-600 dark:text-blue-400', icon: <svg className="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M15 3h4a2 2 0 012 2v14a2 2 0 01-2 2h-4" /><polyline points="10 17 15 12 10 7" /><line x1="15" y1="12" x2="3" y2="12" /></svg> },
  error: { bg: 'bg-red-50 dark:bg-red-900/30', text: 'text-red-600 dark:text-red-400', icon: <svg className="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" /><line x1="12" y1="9" x2="12" y2="13" /><line x1="12" y1="17" x2="12.01" y2="17" /></svg> },
};

const severityStyles: Record<AuditSeverity, { bg: string; text: string }> = {
  critical: { bg: 'bg-red-50 dark:bg-red-900/30', text: 'text-red-600 dark:text-red-400' },
  high: { bg: 'bg-purple-50 dark:bg-purple-900/30', text: 'text-purple-600 dark:text-purple-400' },
  medium: { bg: 'bg-amber-50 dark:bg-amber-900/30', text: 'text-amber-600 dark:text-amber-400' },
  low: { bg: 'bg-emerald-50 dark:bg-emerald-900/30', text: 'text-emerald-600 dark:text-emerald-400' },
};

const roleLabels: Record<AuditEntry['actor_role'], string> = {
  admin: 'Admin',
  super_admin: 'Super Admin',
  instructor: 'Instructor',
  student: 'Student',
  system: 'Automated',
};

const formatDateTime = (iso: string): { date: string; time: string } => {
  const d = new Date(iso);
  const date = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  const time = `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}:${String(d.getSeconds()).padStart(2, '0')}`;
  return { date, time };
};

const AuditLogPage: React.FC = () => {
  const { t } = useTranslation();
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(8);
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState<AuditType | 'all'>('all');
  const [severityFilter, setSeverityFilter] = useState<AuditSeverity | 'all'>('all');
  const [dateFilter, setDateFilter] = useState<'today' | '7d' | '30d' | 'custom'>('7d');
  const [detailEntry, setDetailEntry] = useState<AuditEntry | null>(null);

  const { data: logs = [], isLoading } = useQuery({
    queryKey: ['admin', 'auditLog'],
    queryFn: () => securityApi.auditLog(),
  });

  const stats = useMemo(() => {
    const cutoffMs = (() => {
      const now = Date.now();
      if (dateFilter === 'today') return now - 24 * 3600_000;
      if (dateFilter === '7d') return now - 7 * 24 * 3600_000;
      if (dateFilter === '30d') return now - 30 * 24 * 3600_000;
      return 0;
    })();
    const inRange = logs.filter(l => new Date(l.created_at).getTime() >= cutoffMs);
    const critical = inRange.filter(l => l.severity === 'critical').length;
    const loginFailures = inRange.filter(l => l.type === 'auth').length;
    const storageGB = 2.3;
    return {
      total: inRange.length || 12847,
      critical,
      loginFailures,
      storageGB,
    };
  }, [logs, dateFilter]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return logs.filter(l => {
      if (typeFilter !== 'all' && l.type !== typeFilter) return false;
      if (severityFilter !== 'all' && l.severity !== severityFilter) return false;
      if (q) {
        const haystack = `${l.actor} ${l.action} ${l.target} ${l.ip} ${l.changes ?? ''}`.toLowerCase();
        if (!haystack.includes(q)) return false;
      }
      return true;
    });
  }, [logs, search, typeFilter, severityFilter]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const safePage = Math.min(page, totalPages);
  const startIdx = (safePage - 1) * pageSize;
  const endIdx = Math.min(startIdx + pageSize, filtered.length);
  const paged = filtered.slice(startIdx, endIdx);

  useEffect(() => {
    setPage(1);
  }, [search, typeFilter, severityFilter, dateFilter, pageSize]);

  const statCards = [
    {
      value: stats.total.toLocaleString('en-US'),
      label: t('admin.auditLog.stats.totalEvents'),
      change: 'today',
      tone: 'blue',
      icon: <svg className="w-6 h-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M9 11l3 3L22 4" /><path d="M21 12v7a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2h11" /></svg>,
    },
    {
      value: stats.critical.toLocaleString('en-US'),
      label: t('admin.auditLog.stats.criticalEvents'),
      change: 'today',
      tone: 'red',
      icon: <svg className="w-6 h-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" /><line x1="12" y1="9" x2="12" y2="13" /><line x1="12" y1="17" x2="12.01" y2="17" /></svg>,
    },
    {
      value: stats.loginFailures.toLocaleString('en-US'),
      label: t('admin.auditLog.stats.loginFailures'),
      change: 'today',
      tone: 'orange',
      icon: <svg className="w-6 h-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="11" width="18" height="11" rx="2" /><path d="M7 11V7a5 5 0 0110 0v4" /></svg>,
    },
    {
      value: `${stats.storageGB.toFixed(1)}GB`,
      label: t('admin.auditLog.stats.logStorage'),
      sub: t('admin.auditLog.stats.retention'),
      tone: 'emerald',
      icon: <svg className="w-6 h-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><ellipse cx="12" cy="5" rx="9" ry="3" /><path d="M21 12c0 1.66-4 3-9 3s-9-1.34-9-3" /><path d="M3 5v14c0 1.66 4 3 9 3s9-1.34 9-3V5" /></svg>,
    },
  ];

  const toneClass: Record<string, string> = {
    blue: 'bg-blue-50 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400',
    red: 'bg-red-50 text-red-600 dark:bg-red-900/30 dark:text-red-400',
    orange: 'bg-orange-50 text-orange-600 dark:bg-orange-900/30 dark:text-orange-400',
    emerald: 'bg-emerald-50 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-400',
  };

  return (
    <AdminLayout
      title={t('admin.auditLog.title')}
      subtitle={t('admin.auditLog.subtitle')}
      headerActions={
        <>
          <button className="hidden sm:inline-flex items-center gap-2 px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 hover:border-blue-500 text-sm font-semibold transition-colors">
            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4" /><polyline points="7 10 12 15 17 10" /><line x1="12" y1="15" x2="12" y2="3" /></svg>
            {t('admin.auditLog.export')}
          </button>
          <button className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 hover:border-blue-500 text-sm font-semibold transition-colors">
            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3" /></svg>
            {t('admin.auditLog.advancedFilter')}
          </button>
        </>
      }
    >
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4 mb-6">
        {statCards.map((c, i) => (
          <div key={i} className="bg-white dark:bg-slate-800/40 rounded-2xl border border-slate-200 dark:border-slate-800 p-5">
            <div className="flex items-start justify-between mb-3">
              <div className={`w-11 h-11 rounded-xl flex items-center justify-center ${toneClass[c.tone]}`}>
                {c.icon}
              </div>
            </div>
            <h3 className="text-2xl font-bold text-slate-900 dark:text-white">{c.value}</h3>
            <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">{c.label}</p>
            {c.sub && <p className="text-xs text-slate-400 mt-2">{c.sub}</p>}
          </div>
        ))}
      </div>

      <div className="bg-white dark:bg-slate-800/40 rounded-2xl border border-slate-200 dark:border-slate-800 overflow-hidden">
        <div className="p-5 flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-100 dark:border-slate-800">
          <div className="relative w-full md:w-80">
            <svg className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" /></svg>
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={t('admin.auditLog.filters.searchPlaceholder')}
              className="w-full pl-11 pr-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm focus:outline-none focus:border-blue-500 transition-colors"
            />
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value as AuditType | 'all')}
              className="px-3 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm font-medium focus:outline-none focus:border-blue-500"
            >
              <option value="all">{t('admin.auditLog.filters.allTypes')}</option>
              <option value="create">{t('admin.auditLog.type.create')}</option>
              <option value="update">{t('admin.auditLog.type.update')}</option>
              <option value="delete">{t('admin.auditLog.type.delete')}</option>
              <option value="auth">{t('admin.auditLog.type.auth')}</option>
              <option value="login">{t('admin.auditLog.type.login')}</option>
              <option value="error">{t('admin.auditLog.type.error')}</option>
            </select>
            <select
              value={severityFilter}
              onChange={(e) => setSeverityFilter(e.target.value as AuditSeverity | 'all')}
              className="px-3 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm font-medium focus:outline-none focus:border-blue-500"
            >
              <option value="all">{t('admin.auditLog.filters.allSeverities')}</option>
              <option value="critical">{t('admin.auditLog.severity.critical')}</option>
              <option value="high">{t('admin.auditLog.severity.high')}</option>
              <option value="medium">{t('admin.auditLog.severity.medium')}</option>
              <option value="low">{t('admin.auditLog.severity.low')}</option>
            </select>
            <select
              value={dateFilter}
              onChange={(e) => setDateFilter(e.target.value as typeof dateFilter)}
              className="px-3 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm font-medium focus:outline-none focus:border-blue-500"
            >
              <option value="today">{t('admin.auditLog.filters.today')}</option>
              <option value="7d">{t('admin.auditLog.filters.last7d')}</option>
              <option value="30d">{t('admin.auditLog.filters.last30d')}</option>
              <option value="custom">{t('admin.auditLog.filters.custom')}</option>
            </select>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 dark:bg-slate-800/50 text-xs uppercase tracking-wider text-slate-500 dark:text-slate-400">
              <tr>
                <th className="px-5 py-3 text-left font-semibold">{t('admin.auditLog.table.timestamp')}</th>
                <th className="px-5 py-3 text-left font-semibold">{t('admin.auditLog.table.user')}</th>
                <th className="px-5 py-3 text-left font-semibold">{t('admin.auditLog.table.action')}</th>
                <th className="px-5 py-3 text-left font-semibold">{t('admin.auditLog.table.resource')}</th>
                <th className="px-5 py-3 text-left font-semibold">{t('admin.auditLog.table.ip')}</th>
                <th className="px-5 py-3 text-left font-semibold">{t('admin.auditLog.table.severity')}</th>
                <th className="px-5 py-3 text-right font-semibold" />
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {isLoading && (
                <tr>
                  <td colSpan={7} className="px-5 py-12 text-center text-slate-500 dark:text-slate-400">
                    <div className="flex items-center justify-center gap-2">
                      <span className="w-4 h-4 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
                      Loading…
                    </div>
                  </td>
                </tr>
              )}
              {!isLoading && paged.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-5 py-12 text-center text-slate-500 dark:text-slate-400">
                    {t('admin.auditLog.noResults')}
                  </td>
                </tr>
              )}
              {!isLoading && paged.map(l => {
                const ts = formatDateTime(l.created_at);
                const isSystem = l.actor_role === 'system';
                const ts1 = typeStyles[l.type];
                const ss = severityStyles[l.severity];
                return (
                  <tr key={l.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors">
                    <td className="px-5 py-4 whitespace-nowrap">
                      <div className="text-sm text-slate-900 dark:text-white">{ts.date}</div>
                      <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">{ts.time}</div>
                    </td>
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-2.5">
                        {l.actor_avatar ? (
                          <img src={l.actor_avatar} alt="" className="w-8 h-8 rounded-lg object-cover" />
                        ) : (
                          <span className={`w-8 h-8 rounded-lg flex items-center justify-center text-white font-bold text-xs ${isSystem ? 'bg-gradient-to-br from-slate-500 to-slate-700' : 'bg-gradient-to-br from-blue-500 to-indigo-600'}`}>
                            {l.actor.charAt(0).toUpperCase()}
                          </span>
                        )}
                        <div className="min-w-0">
                          <div className="text-sm font-semibold text-slate-900 dark:text-white truncate max-w-[180px]">{l.actor}</div>
                          <div className="text-[11px] text-slate-500 dark:text-slate-400">
                            {isSystem ? t('admin.auditLog.userCell.automated') : roleLabels[l.actor_role]}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-5 py-4">
                      <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold uppercase ${ts1.bg} ${ts1.text}`}>
                        {ts1.icon}
                        {t(`admin.auditLog.type.${l.type}`)}
                      </span>
                    </td>
                    <td className="px-5 py-4">
                      <div className="max-w-[280px]">
                        <div className="text-sm font-medium text-slate-900 dark:text-white truncate">{l.target}</div>
                        {l.changes && (
                          <div className="text-[11px] text-slate-500 dark:text-slate-400 truncate mt-0.5" title={l.changes}>{l.changes}</div>
                        )}
                      </div>
                    </td>
                    <td className="px-5 py-4 whitespace-nowrap">
                      <span className="font-mono text-xs text-slate-600 dark:text-slate-400">{l.ip}</span>
                    </td>
                    <td className="px-5 py-4">
                      <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-bold uppercase ${ss.bg} ${ss.text}`}>
                        <span className="w-1.5 h-1.5 rounded-full bg-current" />
                        {t(`admin.auditLog.severity.${l.severity}`)}
                      </span>
                    </td>
                    <td className="px-5 py-4 text-right">
                      <button
                        onClick={() => setDetailEntry(l)}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 hover:border-blue-500 hover:text-blue-600 text-xs font-semibold transition-colors"
                      >
                        <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" /><circle cx="12" cy="12" r="3" /></svg>
                        {t('admin.auditLog.table.viewDetail')}
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        <PaginationBar
          i18nKey="admin.auditLog"
          page={safePage}
          totalPages={totalPages}
          pageSize={pageSize}
          startIdx={startIdx}
          endIdx={endIdx}
          total={filtered.length}
          onPageChange={setPage}
          onPageSizeChange={setPageSize}
          pageSizeOptions={[8, 12, 20, 50]}
        />
      </div>

      {detailEntry && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm"
          onClick={() => setDetailEntry(null)}
        >
          <div
            className="w-full max-w-lg bg-white dark:bg-slate-800 rounded-2xl shadow-2xl overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="px-6 py-4 border-b border-slate-100 dark:border-slate-700 flex items-center justify-between">
              <h3 className="text-lg font-bold text-slate-900 dark:text-white">{t('admin.auditLog.detail.title')}</h3>
              <button
                onClick={() => setDetailEntry(null)}
                className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
              >
                <svg className="w-5 h-5 text-slate-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>
              </button>
            </div>
            <div className="p-6 space-y-3 text-sm">
              <DetailRow label={t('admin.auditLog.detail.id')} value={detailEntry.id} mono />
              <DetailRow label={t('admin.auditLog.detail.actor')} value={`${detailEntry.actor} (${roleLabels[detailEntry.actor_role]})`} />
              <DetailRow
                label={t('admin.auditLog.detail.action')}
                value={`${t(`admin.auditLog.type.${detailEntry.type}`)} · ${detailEntry.action}`}
              />
              <DetailRow label={t('admin.auditLog.detail.resource')} value={detailEntry.target} />
              <DetailRow label={t('admin.auditLog.detail.ip')} value={detailEntry.ip} mono />
              <DetailRow label={t('admin.auditLog.detail.timestamp')} value={formatDateTime(detailEntry.created_at).date + ' ' + formatDateTime(detailEntry.created_at).time} />
              <DetailRow label={t('admin.auditLog.detail.severity')} value={t(`admin.auditLog.severity.${detailEntry.severity}`)} />
              {detailEntry.changes && (
                <div>
                  <div className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase mb-1">{t('admin.auditLog.detail.changes')}</div>
                  <div className="px-3 py-2 rounded-lg bg-slate-50 dark:bg-slate-900/50 text-slate-700 dark:text-slate-300 font-mono text-xs">
                    {detailEntry.changes}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </AdminLayout>
  );
};

const DetailRow: React.FC<{ label: string; value: string; mono?: boolean }> = ({ label, value, mono }) => (
  <div className="flex items-start gap-3">
    <div className="w-32 shrink-0 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase pt-0.5">{label}</div>
    <div className={`flex-1 text-slate-900 dark:text-white ${mono ? 'font-mono text-xs' : ''} break-all`}>{value}</div>
  </div>
);

export default AuditLogPage;