import React, { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import Header from '@/components/public/Header';
import Footer from '@/components/public/Footer';
import { TENANTS, type TenantCardData } from './tenantData';

export type { TenantCardData };

/* Icons */
const BuildingIcon = () => (
  <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M3 21h18M5 21V7l8-4v18M19 21V11l-6-4" /><line x1="9" y1="9" x2="9" y2="9.01" /><line x1="9" y1="13" x2="9" y2="13.01" /><line x1="9" y1="17" x2="9" y2="17.01" /><path d="M14 13h.01M14 17h.01M14 9h.01" /></svg>
);
const ExamIcon = () => (
  <svg className="w-6 h-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" /></svg>
);
const ShieldIcon = () => (
  <svg className="w-6 h-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" /></svg>
);
const PinIcon = () => (
  <svg className="w-3 h-3 inline" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0z" /><circle cx="12" cy="10" r="3" /></svg>
);
const PaletteIcon = () => (
  <svg className="w-6 h-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="13.5" cy="6.5" r="1.5" /><circle cx="17.5" cy="10.5" r="1.5" /><circle cx="8.5" cy="7.5" r="1.5" /><circle cx="6.5" cy="12.5" r="1.5" /><path d="M12 2C6.5 2 2 6.5 2 12s4.5 10 10 10c.926 0 1.648-.746 1.648-1.673 0-.43-.18-.83-.473-1.108A1.99 1.99 0 0112 17c-2.761 0-5-2.239-5-5s2.239-5 5-5c1.326 0 2.4.5 3.236 1.18a1 1 0 001.414-.18 1 1 0 00-.182-1.398A6.97 6.97 0 0012 2z" /></svg>
);
const ChartIcon = () => (
  <svg className="w-6 h-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="20" x2="18" y2="10" /><line x1="12" y1="20" x2="12" y2="4" /><line x1="6" y1="20" x2="6" y2="14" /></svg>
);
const UsersIcon = () => (
  <svg className="w-6 h-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75" /></svg>
);

const TenantsPage: React.FC = () => {
  const { t } = useTranslation();
  const [search, setSearch] = useState('');

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return TENANTS.filter(x => {
      if (q) {
        const hay = `${x.name} ${x.domain} ${x.region} ${x.description}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }, [search]);

  // Marketing stats (aggregated, không lộ nội bộ từng tenant)
  const heroStats = [
    { value: `${TENANTS.length}+`,    label: t('tenant.marketing.partners'),     icon: <BuildingIcon />, tone: 'blue' as const },
    { value: '50K+',                  label: t('tenant.marketing.learners'),     icon: <UsersIcon />,    tone: 'green' as const },
    { value: '200+',                  label: t('tenant.marketing.examsMonthly'), icon: <ExamIcon />,    tone: 'purple' as const },
    { value: '99.9%',                 label: t('tenant.marketing.uptime'),       icon: <ShieldIcon />,  tone: 'orange' as const },
  ];

  const statToneClass: Record<string, string> = {
    blue: 'bg-blue-50 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400',
    green: 'bg-emerald-50 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-400',
    orange: 'bg-orange-50 text-orange-600 dark:bg-orange-900/30 dark:text-orange-400',
    purple: 'bg-purple-50 text-purple-600 dark:bg-purple-900/30 dark:text-purple-400',
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950">
      <Header />

      <main className="pt-[72px]">
        {/* Hero */}
        <section className="relative overflow-hidden bg-gradient-to-br from-blue-600 via-blue-700 to-cyan-600">
          <div className="absolute inset-0 opacity-30" style={{ backgroundImage: 'radial-gradient(circle at 1px 1px, white 1px, transparent 0)', backgroundSize: '40px 40px' }} />
          <div className="relative max-w-7xl mx-auto px-6 py-20 text-center">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/15 backdrop-blur-sm border border-white/20 text-white text-sm font-semibold mb-6">
              <BuildingIcon />
              <span>{t('tenant.hero.badge')}</span>
            </div>
            <h1 className="text-4xl md:text-5xl lg:text-6xl font-extrabold text-white tracking-tight mb-5">
              {t('tenant.hero.title')}
            </h1>
            <p className="text-lg md:text-xl text-blue-100 max-w-3xl mx-auto mb-10">
              {t('tenant.hero.subtitle')}
            </p>
            <div className="flex flex-wrap justify-center gap-4">
              <a
                href="#tenants"
                className="px-7 py-3.5 bg-white text-blue-700 font-semibold rounded-xl hover:bg-blue-50 transition-colors shadow-lg"
              >
                {t('tenant.hero.ctaExplore')}
              </a>
              <Link
                to="/contact"
                className="px-7 py-3.5 bg-white/10 backdrop-blur-sm border border-white/30 text-white font-semibold rounded-xl hover:bg-white/20 transition-colors"
              >
                {t('tenant.hero.ctaBecome')}
              </Link>
            </div>
          </div>
        </section>

        {/* Marketing stats (chỉ số tổng hợp, không lộ nội bộ từng tenant) */}
        <section className="max-w-7xl mx-auto px-6 -mt-12 relative z-10">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {heroStats.map((c, i) => (
              <div
                key={i}
                className="bg-white dark:bg-slate-800 rounded-2xl p-5 border border-slate-200 dark:border-slate-700 shadow-sm hover:shadow-md transition-shadow text-center"
              >
                <div className={`w-12 h-12 rounded-xl flex items-center justify-center mx-auto mb-3 ${statToneClass[c.tone]}`}>
                  {c.icon}
                </div>
                <h3 className="text-2xl md:text-3xl font-bold text-slate-900 dark:text-white">{c.value}</h3>
                <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">{c.label}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Search bar */}
        <section className="max-w-7xl mx-auto px-6 mt-12" id="tenants">
          <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-5 flex items-center justify-between gap-4">
            <div className="relative w-full">
              <svg className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="11" cy="11" r="8" />
                <line x1="21" y1="21" x2="16.65" y2="16.65" />
              </svg>
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder={t('tenant.filters.searchPlaceholder')}
                className="w-full pl-11 pr-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/40 text-sm focus:outline-none focus:border-blue-500"
              />
            </div>
          </div>
        </section>

        {/* Tenants grid */}
        <section className="max-w-7xl mx-auto px-6 mt-8 pb-16">
          {filtered.length === 0 ? (
            <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-16 text-center text-slate-500 dark:text-slate-400">
              {t('tenant.noResults')}
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
              {filtered.map(tn => (
                <article
                  key={tn.id}
                  className={`group relative bg-white dark:bg-slate-800 rounded-2xl border ${tn.highlight ? 'border-blue-300 dark:border-blue-500/50 ring-2 ring-blue-100 dark:ring-blue-900/40' : 'border-slate-200 dark:border-slate-700'} p-6 transition-all hover:shadow-xl hover:-translate-y-1 hover:border-blue-400`}
                >
                  {tn.highlight && (
                    <div className="absolute -top-3 left-6 px-3 py-1 bg-blue-600 text-white text-[11px] font-bold rounded-full uppercase tracking-wider">
                      {t('tenant.flags.featured')}
                    </div>
                  )}
                  <header className="flex items-start gap-4 mb-5">
                    <div className={`w-14 h-14 rounded-2xl flex items-center justify-center text-white font-extrabold text-lg bg-gradient-to-br ${tn.logoGradient} shadow-md group-hover:scale-110 transition-transform`}>
                      {tn.logoText}
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="text-lg font-bold text-slate-900 dark:text-white truncate">{tn.name}</h3>
                      <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 truncate">{tn.domain}</p>
                      <p className="text-[11px] text-slate-400 dark:text-slate-500 mt-0.5 flex items-center gap-1">
                        <PinIcon /> {tn.region}
                      </p>
                    </div>
                  </header>

                  <p className="text-sm text-slate-600 dark:text-slate-400 line-clamp-3 mb-6 leading-relaxed">
                    {tn.description}
                  </p>

                  <Link
                    to={`/tenants/${tn.id}`}
                    className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-semibold rounded-xl bg-blue-600 text-white hover:bg-blue-700 transition-colors shadow-sm"
                  >
                    {t('tenant.actions.viewDetail')}
                    <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="5" y1="12" x2="19" y2="12" /><polyline points="12 5 19 12 12 19" /></svg>
                  </Link>
                </article>
              ))}
            </div>
          )}
        </section>

        {/* Why IOES */}
        <section className="bg-white dark:bg-slate-900/40 border-t border-slate-200 dark:border-slate-800 py-16">
          <div className="max-w-7xl mx-auto px-6">
            <div className="text-center mb-10">
              <h2 className="text-3xl md:text-4xl font-extrabold text-slate-900 dark:text-white mb-3">
                {t('tenant.why.title')}
              </h2>
              <p className="text-slate-600 dark:text-slate-400 max-w-2xl mx-auto">
                {t('tenant.why.subtitle')}
              </p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <FeatureCard
                tone="blue"
                icon={<ShieldIcon />}
                title={t('tenant.why.isolation.title')}
                desc={t('tenant.why.isolation.desc')}
              />
              <FeatureCard
                tone="emerald"
                icon={<PaletteIcon />}
                title={t('tenant.why.branding.title')}
                desc={t('tenant.why.branding.desc')}
              />
              <FeatureCard
                tone="purple"
                icon={<ChartIcon />}
                title={t('tenant.why.analytics.title')}
                desc={t('tenant.why.analytics.desc')}
              />
            </div>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
};

const FeatureCard: React.FC<{ tone: string; icon: React.ReactNode; title: string; desc: string }> = ({ tone, icon, title, desc }) => {
  const tones: Record<string, string> = {
    blue: 'bg-blue-50 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400',
    emerald: 'bg-emerald-50 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-400',
    purple: 'bg-purple-50 text-purple-600 dark:bg-purple-900/30 dark:text-purple-400',
  };
  return (
    <div className="p-6 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 hover:shadow-md transition-shadow">
      <div className={`w-12 h-12 rounded-xl flex items-center justify-center mb-4 ${tones[tone]}`}>
        {icon}
      </div>
      <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-2">{title}</h3>
      <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed">{desc}</p>
    </div>
  );
};

export default TenantsPage;