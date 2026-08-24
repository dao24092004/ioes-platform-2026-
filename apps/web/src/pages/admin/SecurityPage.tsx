import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useQuery } from '@tanstack/react-query';
import AdminLayout from '@/components/layout/AdminLayout';
import { securityApi, type Severity, type SecurityEvent, type AuditEntry } from '@/services/api';
import { formatRelative } from '@/utils/time';
import { ANIMATION, TEST_IDS } from '@/constants/ui';

const severityStyles: Record<Severity, { bg: string; text: string; border: string; bar: string; pulse: boolean }> = {
  critical: { bg: 'bg-red-50 dark:bg-red-900/30', text: 'text-red-600 dark:text-red-400', border: 'border-l-red-500', bar: 'bg-red-500', pulse: true },
  high: { bg: 'bg-orange-50 dark:bg-orange-900/30', text: 'text-orange-600 dark:text-orange-400', border: 'border-l-orange-500', bar: 'bg-orange-500', pulse: false },
  medium: { bg: 'bg-amber-50 dark:bg-amber-900/30', text: 'text-amber-600 dark:text-amber-400', border: 'border-l-amber-500', bar: 'bg-amber-500', pulse: false },
  low: { bg: 'bg-blue-50 dark:bg-blue-900/30', text: 'text-blue-600 dark:text-blue-400', border: 'border-l-blue-500', bar: 'bg-blue-500', pulse: false },
  info: { bg: 'bg-slate-50 dark:bg-slate-800/50', text: 'text-slate-600 dark:text-slate-400', border: 'border-l-slate-400', bar: 'bg-slate-400', pulse: false },
};

const SecurityPage: React.FC = () => {
  const { t } = useTranslation();
  const [filter, setFilter] = useState<Severity | 'all'>('all');

  const { data: stats } = useQuery({ queryKey: ['sec', 'stats'], queryFn: () => securityApi.stats() });
  const { data: events } = useQuery({ queryKey: ['sec', 'events'], queryFn: () => securityApi.events() });
  const { data: audits } = useQuery({ queryKey: ['sec', 'audit'], queryFn: () => securityApi.auditLog() });

  const filtered = (events ?? []).filter((e: SecurityEvent) => filter === 'all' || e.severity === filter);

  const statCards = [
    { value: stats?.threats ?? 0, label: t('security.stats.threats'), color: 'red', icon: <svg className="w-6 h-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" /><line x1="12" y1="9" x2="12" y2="13" /><line x1="12" y1="17" x2="12.01" y2="17" /></svg> },
    { value: stats?.blockedIPs ?? 0, label: t('security.stats.blockedIPs'), color: 'amber', icon: <svg className="w-6 h-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10" /><line x1="4.93" y1="4.93" x2="19.07" y2="19.07" /></svg> },
    { value: stats?.failedLogins ?? 0, label: t('security.stats.failedLogins'), color: 'orange', icon: <svg className="w-6 h-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="11" width="18" height="11" rx="2" /><path d="M7 11V7a5 5 0 0110 0v4" /></svg> },
    { value: stats?.activeSessions ?? 0, label: t('security.stats.activeSessions'), color: 'emerald', icon: <svg className="w-6 h-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2" /><circle cx="12" cy="7" r="4" /></svg> },
  ];

  const colorMap: Record<string, string> = {
    red: 'bg-red-50 text-red-600 dark:bg-red-900/30 dark:text-red-400',
    amber: 'bg-amber-50 text-amber-600 dark:bg-amber-900/30 dark:text-amber-400',
    orange: 'bg-orange-50 text-orange-600 dark:bg-orange-900/30 dark:text-orange-400',
    emerald: 'bg-emerald-50 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-400',
  };

  const severities: Array<Severity | 'all'> = ['all', 'critical', 'high', 'medium', 'low', 'info'];

  const eventTypeIcons: Record<string, React.ReactNode> = {
    login_failed: <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2" /><circle cx="12" cy="7" r="4" /></svg>,
    brute_force: <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12" /></svg>,
    suspicious_ip: <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" /></svg>,
    mfa_disabled: <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="11" width="18" height="11" rx="2" /><path d="M7 11V7a5 5 0 0110 0v4" /></svg>,
    permission_escalation: <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="18 15 12 9 6 15" /></svg>,
    data_export: <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4" /><polyline points="7 10 12 15 17 10" /><line x1="12" y1="15" x2="12" y2="3" /></svg>,
    rate_limit: <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" /></svg>,
  };

  return (
    <AdminLayout title={t('security.title')} subtitle={t('security.subtitle')}>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        {statCards.map((s, i) => (
          <div
            key={i}
            data-testid={TEST_IDS.ANALYTICS_KPI}
            className="group relative overflow-hidden bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-5 transition-all hover:-translate-y-1 hover:shadow-lg hover:shadow-blue-500/5 opacity-0 animate-[fadeInUp_.6s_ease-out_forwards]"
            style={{ animationDelay: `${(i + 1) * ANIMATION.STAGGER_DURATION_S}s` }}
          >
            <div className={`w-11 h-11 rounded-xl flex items-center justify-center mb-3 transition-all group-hover:scale-110 group-hover:rotate-[10deg] ${colorMap[s.color]}`}>
              {s.icon}
            </div>
            <div className="text-2xl font-bold tabular-nums mb-1">{s.value}</div>
            <div className="text-xs text-slate-500 dark:text-slate-400">{s.label}</div>
            {s.color === 'red' && s.value > 0 && (
              <span className="absolute top-3 right-3 w-2 h-2 bg-red-500 rounded-full animate-pulse" />
            )}
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-12 gap-6">
        <div
          data-testid={TEST_IDS.EVENT_ROW}
          className="xl:col-span-8 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 overflow-hidden opacity-0 animate-[fadeInUp_.6s_ease-out_forwards]"
          style={{ animationDelay: `${2 * ANIMATION.STAGGER_DURATION_S}s` }}
        >
          <div className="px-6 py-5 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between flex-wrap gap-3">
            <h2 className="flex items-center gap-2.5 text-base font-semibold">
              <span className="w-8 h-8 rounded-lg bg-red-50 text-red-600 dark:bg-red-900/30 dark:text-red-400 flex items-center justify-center">
                <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 9v2m0 4h.01M5 19h14a2 2 0 001.74-3l-7-12a2 2 0 00-3.48 0l-7 12A2 2 0 005 19z" /></svg>
              </span>
              {t('security.events.title')}
            </h2>
            <div className="flex flex-wrap gap-1.5" role="group" aria-label={t('aria.filterSeverity')}>
              {severities.map(s => (
                <button
                  key={s}
                  data-testid={TEST_IDS.SEVERITY_FILTER}
                  onClick={() => setFilter(s)}
                  aria-pressed={filter === s}
                  className={`px-3 py-1 text-xs font-medium rounded-lg transition-all ${
                    filter === s
                      ? severityStyles[s === 'all' ? 'info' : s].bg + ' ' + severityStyles[s === 'all' ? 'info' : s].text
                      : 'text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-800/50'
                  }`}
                >
                  {s === 'all' ? t('shared.all') : t(`security.severity.${s}`)}
                </button>
              ))}
            </div>
          </div>
          <div className="divide-y divide-slate-100 dark:divide-slate-800">
            {filtered.map((ev: SecurityEvent) => {
              const st = severityStyles[ev.severity];
              return (
                <div
                  key={ev.id}
                  className={`group relative pl-5 pr-6 py-4 transition-all hover:bg-slate-50 dark:hover:bg-slate-800/30 border-l-4 ${st.border}`}
                >
                  {st.pulse && <span className="absolute left-1.5 top-5 w-2 h-2 bg-red-500 rounded-full animate-pulse" />}
                  <div className="flex items-start gap-4">
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${st.bg} ${st.text} transition-all group-hover:scale-110 group-hover:rotate-[10deg]`}>
                      {eventTypeIcons[ev.type]}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${st.bg} ${st.text}`}>
                          {t(`security.severity.${ev.severity}`)}
                        </span>
                        <span className="text-sm font-semibold">{t(`security.eventType.${ev.type}`)}</span>
                      </div>
                      <div className="text-sm text-slate-600 dark:text-slate-400 mb-1.5">{ev.description}</div>
                      <div className="flex items-center gap-3 text-xs text-slate-500">
                        <span className="inline-flex items-center gap-1">
                          <svg className="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2" /><circle cx="12" cy="7" r="4" /></svg>
                          {ev.user}
                        </span>
                        <span className="inline-flex items-center gap-1">
                          <svg className="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10" /><line x1="2" y1="12" x2="22" y2="12" /><path d="M12 2a15 15 0 014 10 15 15 0 01-4 10 15 15 0 01-4-10 15 15 0 014-10z" /></svg>
                          <code className="font-mono">{ev.source_ip}</code>
                        </span>
                        <span className="inline-flex items-center gap-1">
                          <svg className="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" /></svg>
                          {formatRelative(ev.created_at)}
                        </span>
                      </div>
                    </div>
                    <div className="flex flex-col gap-1.5 flex-shrink-0">
                      {ev.severity === 'critical' || ev.severity === 'high' ? (
                        <button
                          aria-label={t('aria.blockIp')}
                          className="px-3 py-1 text-xs font-semibold rounded-lg bg-red-600 hover:bg-red-700 text-white transition-all hover:-translate-y-0.5 hover:shadow-md hover:shadow-red-500/30"
                        >
                          {t('security.actions.block')}
                        </button>
                      ) : (
                        <button
                          aria-label={t('aria.investigate')}
                          className="px-3 py-1 text-xs font-semibold rounded-lg border border-slate-200 dark:border-slate-700 hover:border-blue-500 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-all hover:-translate-y-0.5"
                        >
                          {t('security.actions.investigate')}
                        </button>
                      )}
                      <button
                        aria-label={t('aria.dismiss')}
                        className="px-3 py-1 text-xs font-medium text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 transition-all"
                      >
                        {t('security.actions.dismiss')}
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <div
          data-testid={TEST_IDS.AUDIT_ROW}
          className="xl:col-span-4 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 overflow-hidden opacity-0 animate-[fadeInUp_.6s_ease-out_forwards]"
          style={{ animationDelay: `${2.5 * ANIMATION.STAGGER_DURATION_S}s` }}
        >
          <div className="px-6 py-5 border-b border-slate-200 dark:border-slate-800">
            <h2 className="flex items-center gap-2.5 text-base font-semibold">
              <span className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400 flex items-center justify-center">
                <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" /><polyline points="14 2 14 8 20 8" /><line x1="16" y1="13" x2="8" y2="13" /><line x1="16" y1="17" x2="8" y2="17" /></svg>
              </span>
              {t('security.audit.title')}
            </h2>
          </div>
          <div className="p-4 space-y-2 max-h-[600px] overflow-y-auto">
            {(audits ?? []).map((a: AuditEntry) => (
              <div key={a.id} className="group flex items-start gap-3 p-3 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-800/50 hover:translate-x-1 transition-all">
                <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-500 to-cyan-500 text-white flex items-center justify-center text-xs font-bold flex-shrink-0 transition-transform group-hover:scale-110 group-hover:rotate-[5deg]">
                  {a.actor.split('@')[0].charAt(0).toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-sm">
                    <span className="font-semibold">{a.actor}</span>
                    <span className="text-slate-500"> · </span>
                    <code className="text-xs font-mono px-1.5 py-0.5 bg-slate-100 dark:bg-slate-800 rounded text-blue-600 dark:text-blue-400">{a.action}</code>
                  </div>
                  <div className="text-xs text-slate-500 mt-0.5 truncate">{a.target}</div>
                  <div className="flex items-center gap-2 text-[10px] text-slate-400 mt-1">
                    <code className="font-mono">{a.ip}</code>
                    <span>·</span>
                    <span>{formatRelative(a.created_at)}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </AdminLayout>
  );
};

export default SecurityPage;