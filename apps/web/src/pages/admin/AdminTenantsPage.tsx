import React, { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import AdminLayout from '@/components/layout/AdminLayout';
import PaginationBar from '@/components/common/PaginationBar';
import { TENANTS, type TenantPlan, type TenantStatus } from '@/pages/tenant/tenantData';

/* Icons (phải đặt trước planTone để tránh TDZ) */
const StarIcon = () => (
  <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" /></svg>
);
const CrownIcon = () => (
  <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor"><path d="M2.5 19l2-12.5 5.5 5 3-8 3 8 5.5-5 2 12.5z" /></svg>
);
const HourglassIcon = () => (
  <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M5 22h14M5 2h14M17 22v-4.172a2 2 0 00-.586-1.414L12 12l-4.414 4.414A2 2 0 007 17.828V22M17 2v4.172a2 2 0 01-.586 1.414L12 12l-4.414-4.414A2 2 0 017 6.172V2" /></svg>
);
const BuildingIcon = () => (
  <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M3 21h18M5 21V7l8-4v18M19 21V11l-6-4" /><line x1="9" y1="9" x2="9" y2="9.01" /><line x1="9" y1="13" x2="9" y2="13.01" /><line x1="9" y1="17" x2="9" y2="17.01" /><path d="M14 13h.01M14 17h.01M14 9h.01" /></svg>
);
const CheckIcon = () => (
  <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M22 11.08V12a10 10 0 11-5.93-9.14" /><polyline points="22 4 12 14.01 9 11.01" /></svg>
);
const ClockIcon = () => (
  <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" /></svg>
);
const BanIcon = () => (
  <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10" /><line x1="4.93" y1="4.93" x2="19.07" y2="19.07" /></svg>
);
const DownloadIcon = () => (
  <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4" /><polyline points="7 10 12 15 17 10" /><line x1="12" y1="15" x2="12" y2="3" /></svg>
);
const PlusIcon = () => (
  <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" /></svg>
);

const planTone: Record<TenantPlan, { label: string; bg: string; text: string; icon: React.ReactNode }> = {
  free:        { label: 'Free',        bg: 'bg-slate-100 dark:bg-slate-700/50',   text: 'text-slate-600 dark:text-slate-300',  icon: null },
  basic:       { label: 'Basic',       bg: 'bg-slate-100 dark:bg-slate-700/50',   text: 'text-slate-700 dark:text-slate-200',  icon: null },
  professional:{ label: 'Professional',bg: 'bg-blue-50 dark:bg-blue-900/30',       text: 'text-blue-600 dark:text-blue-400',    icon: <StarIcon /> },
  enterprise:  { label: 'Enterprise',  bg: 'bg-amber-50 dark:bg-amber-900/30',     text: 'text-amber-600 dark:text-amber-400',  icon: <CrownIcon /> },
  trial:       { label: 'Trial',       bg: 'bg-amber-50 dark:bg-amber-900/30',     text: 'text-amber-600 dark:text-amber-400',  icon: <HourglassIcon /> },
};

const statusTone: Record<TenantStatus, { label: string; bg: string; text: string }> = {
  active:    { label: 'Active',    bg: 'bg-emerald-50 dark:bg-emerald-900/30',  text: 'text-emerald-600 dark:text-emerald-400' },
  trial:     { label: 'Trial',     bg: 'bg-amber-50 dark:bg-amber-900/30',      text: 'text-amber-600 dark:text-amber-400' },
  suspended: { label: 'Suspended', bg: 'bg-red-50 dark:bg-red-900/30',          text: 'text-red-600 dark:text-red-400' },
};

const formatNumber = (n: number): string => {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1000) return `${(n / 1000).toFixed(n >= 10_000 ? 0 : 1)}K`;
  return n.toLocaleString('en-US');
};

const AdminTenantsPage: React.FC = () => {
  const { t } = useTranslation();
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | TenantStatus>('all');
  const [planFilter, setPlanFilter] = useState<'all' | TenantPlan>('all');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(6);

  const stats = useMemo(() => ({
    total: TENANTS.length,
    active: TENANTS.filter(x => x.status === 'active').length,
    trial: TENANTS.filter(x => x.status === 'trial').length,
    enterprise: TENANTS.filter(x => x.plan === 'enterprise').length,
    suspended: TENANTS.filter(x => x.status === 'suspended').length,
  }), []);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return TENANTS.filter(x => {
      if (statusFilter !== 'all' && x.status !== statusFilter) return false;
      if (planFilter !== 'all' && x.plan !== planFilter) return false;
      if (q) {
        const hay = `${x.name} ${x.domain} ${x.region} ${x.description}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }, [search, statusFilter, planFilter]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const safePage = Math.min(page, totalPages);
  const startIdx = (safePage - 1) * pageSize;
  const endIdx = Math.min(startIdx + pageSize, filtered.length);
  const paged = filtered.slice(startIdx, endIdx);

  useEffect(() => {
    setPage(1);
  }, [search, statusFilter, planFilter, pageSize]);

  const statCards = [
    { value: stats.total,    label: t('admin.adminTenant.stats.total'),    tone: 'blue',    icon: <BuildingIcon /> },
    { value: stats.active,   label: t('admin.adminTenant.stats.active'),   tone: 'green',   icon: <CheckIcon /> },
    { value: stats.trial,    label: t('admin.adminTenant.stats.trial'),    tone: 'orange',  icon: <ClockIcon /> },
    { value: stats.enterprise,label: t('admin.adminTenant.stats.enterprise'),tone: 'purple',icon: <CrownIcon /> },
    { value: stats.suspended,label: t('admin.adminTenant.stats.suspended'),tone: 'red',     icon: <BanIcon /> },
  ];

  const toneClass: Record<string, string> = {
    blue: 'bg-blue-50 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400',
    green: 'bg-emerald-50 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-400',
    orange: 'bg-orange-50 text-orange-600 dark:bg-orange-900/30 dark:text-orange-400',
    purple: 'bg-purple-50 text-purple-600 dark:bg-purple-900/30 dark:text-purple-400',
    red: 'bg-red-50 text-red-600 dark:bg-red-900/30 dark:text-red-400',
  };

  return (
    <AdminLayout
      title={t('admin.adminTenant.title')}
      subtitle={t('admin.adminTenant.subtitle')}
      headerActions={
        <>
          <button className="inline-flex items-center gap-2 px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 hover:border-blue-500 text-sm font-medium transition-colors">
            <DownloadIcon /> {t('admin.adminTenant.actions.export')}
          </button>
          <button className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold transition-colors shadow-sm">
            <PlusIcon /> {t('admin.adminTenant.actions.add')}
          </button>
        </>
      }
    >
      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4 mb-6">
        {statCards.map((c, i) => (
          <div
            key={i}
            className="bg-white dark:bg-slate-800 rounded-2xl p-5 border border-slate-200 dark:border-slate-700"
          >
            <div className={`w-12 h-12 rounded-xl flex items-center justify-center mb-3 ${toneClass[c.tone]}`}>
              {c.icon}
            </div>
            <h3 className="text-3xl font-bold text-slate-900 dark:text-white">{c.value}</h3>
            <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">{c.label}</p>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-4 mb-6 flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div className="relative w-full md:w-80">
          <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" /></svg>
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={t('admin.adminTenant.filters.searchPlaceholder')}
            className="w-full pl-10 pr-4 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/40 text-sm focus:outline-none focus:border-blue-500"
          />
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as 'all' | TenantStatus)}
            className="px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/40 text-sm font-medium focus:outline-none focus:border-blue-500"
          >
            <option value="all">{t('admin.adminTenant.filters.allStatuses')}</option>
            <option value="active">{statusTone.active.label}</option>
            <option value="trial">{statusTone.trial.label}</option>
            <option value="suspended">{statusTone.suspended.label}</option>
          </select>
          <select
            value={planFilter}
            onChange={(e) => setPlanFilter(e.target.value as 'all' | TenantPlan)}
            className="px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/40 text-sm font-medium focus:outline-none focus:border-blue-500"
          >
            <option value="all">{t('admin.adminTenant.filters.allPlans')}</option>
            <option value="free">Free</option>
            <option value="basic">Basic</option>
            <option value="professional">Professional</option>
            <option value="enterprise">Enterprise</option>
            <option value="trial">Trial</option>
          </select>
        </div>
      </div>

      {/* Tenants grid */}
      {filtered.length === 0 ? (
        <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-16 text-center text-slate-500 dark:text-slate-400">
          {t('admin.adminTenant.noResults')}
        </div>
      ) : (
        <>
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
          {paged.map(tn => {
            const plan = planTone[tn.plan];
            const status = statusTone[tn.status];
            const primaryAction = tn.status === 'suspended' ? t('admin.adminTenant.actions.reactivate')
              : tn.plan === 'trial' ? t('admin.adminTenant.actions.upgrade')
              : t('admin.adminTenant.actions.manage');
            return (
              <article
                key={tn.id}
                className={`group bg-white dark:bg-slate-800 rounded-2xl border ${tn.highlight ? 'border-blue-300 dark:border-blue-500/50 ring-2 ring-blue-100 dark:ring-blue-900/40' : 'border-slate-200 dark:border-slate-700'} p-5 transition-all hover:shadow-lg hover:-translate-y-0.5 hover:border-blue-400`}
              >
                <header className="flex items-start gap-3 mb-4">
                  <div className={`w-12 h-12 rounded-xl flex items-center justify-center text-white font-extrabold bg-gradient-to-br ${tn.logoGradient} shadow-sm`}>
                    {tn.logoText}
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="text-base font-bold text-slate-900 dark:text-white truncate">{tn.name}</h3>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 truncate">{tn.domain}</p>
                  </div>
                  <span className={`shrink-0 px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${status.bg} ${status.text}`}>
                    {status.label}
                  </span>
                </header>

                <p className="text-xs text-slate-600 dark:text-slate-400 line-clamp-2 mb-4 leading-relaxed">
                  {tn.description}
                </p>

                <div className="grid grid-cols-3 gap-2 mb-4">
                  <Metric value={formatNumber(tn.users)} label={t('admin.adminTenant.metrics.users')} />
                  <Metric value={formatNumber(tn.courses)} label={t('admin.adminTenant.metrics.courses')} />
                  <Metric value={formatNumber(tn.exams)} label={t('admin.adminTenant.metrics.exams')} />
                </div>

                <div className="flex items-center justify-between p-2.5 rounded-lg bg-slate-50 dark:bg-slate-900/40 mb-4">
                  <div>
                    <div className={`text-sm font-bold flex items-center gap-1 ${plan.text}`}>
                      {plan.icon}
                      {plan.label}
                    </div>
                    <div className="text-[10px] text-slate-500 dark:text-slate-400 mt-0.5">
                      {tn.planExpire}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <Link
                    to={`/admin/tenants/${tn.id}`}
                    className="flex-1 px-3 py-2 text-sm font-semibold rounded-lg border border-slate-200 dark:border-slate-700 hover:border-blue-500 hover:text-blue-600 text-center transition-colors"
                  >
                    {t('admin.adminTenant.actions.dashboard')}
                  </Link>
                  <Link
                    to={`/admin/tenants/${tn.id}`}
                    className="flex-1 px-3 py-2 text-sm font-semibold rounded-lg bg-blue-600 text-white hover:bg-blue-700 text-center transition-colors shadow-sm"
                  >
                    {primaryAction}
                  </Link>
                </div>
              </article>
            );
          })}
        </div>

        <div className="mt-6 bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 overflow-hidden">
          <PaginationBar
            i18nKey="admin.adminTenant"
            page={safePage}
            totalPages={totalPages}
            pageSize={pageSize}
            startIdx={startIdx}
            endIdx={endIdx}
            total={filtered.length}
            onPageChange={setPage}
            onPageSizeChange={setPageSize}
            pageSizeOptions={[6, 9, 12, 24]}
          />
        </div>
        </>
      )}
    </AdminLayout>
  );
};

const Metric: React.FC<{ value: string; label: string }> = ({ value, label }) => (
  <div className="text-center py-2 rounded-lg bg-slate-50 dark:bg-slate-900/40">
    <div className="text-base font-extrabold text-slate-900 dark:text-white">{value}</div>
    <div className="text-[10px] uppercase tracking-wider text-slate-500 dark:text-slate-400 mt-0.5">{label}</div>
  </div>
);

export default AdminTenantsPage;