import React, { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import Header from '@/components/public/Header';
import Footer from '@/components/public/Footer';

type LegalTab = 'privacy' | 'terms';

const PRIVACY_SECTIONS = ['s1', 's2', 's3', 's4', 's5', 's6', 's7', 's8'] as const;
const TERMS_SECTIONS = ['s1', 's2', 's3', 's4', 's5', 's6', 's7', 's8', 's9', 's10'] as const;

const LegalPage: React.FC = () => {
  const { t } = useTranslation();
  const [searchParams, setSearchParams] = useSearchParams();
  const initialTab = (searchParams.get('tab') === 'terms' ? 'terms' : 'privacy') as LegalTab;
  const [tab, setTab] = useState<LegalTab>(initialTab);

  useEffect(() => {
    const current = searchParams.get('tab');
    if (current !== tab) {
      const next = new URLSearchParams(searchParams);
      next.set('tab', tab);
      setSearchParams(next, { replace: true });
    }
    window.scrollTo({ top: 0, behavior: 'instant' as ScrollBehavior });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tab]);

  const privacySections = useMemo(() => PRIVACY_SECTIONS, []);
  const termsSections = useMemo(() => TERMS_SECTIONS, []);

  const scrollToSection = (id: string) => {
    const el = document.getElementById(id);
    if (el) {
      const offset = 100;
      const y = el.getBoundingClientRect().top + window.scrollY - offset;
      window.scrollTo({ top: y, behavior: 'smooth' });
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-slate-100">
      <Header />

      <section className="pt-32 pb-12 bg-gradient-to-br from-slate-100 via-white to-blue-50 dark:from-slate-900 dark:via-slate-900 dark:to-slate-800 border-b border-slate-200 dark:border-slate-800">
        <div className="max-w-6xl mx-auto px-6">
          <div className="flex flex-wrap items-end justify-between gap-4 mb-6">
            <div>
              <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300 text-xs font-semibold uppercase tracking-wider mb-3">
                <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
                </svg>
                {t('public.legal.header.badge')}
              </span>
              <h1 className="text-3xl md:text-4xl font-bold text-slate-900 dark:text-white">
                {tab === 'privacy'
                  ? t('public.legal.privacy.title')
                  : t('public.legal.terms.title')}
              </h1>
              <p className="text-sm text-slate-500 dark:text-slate-400 mt-2">
                {tab === 'privacy'
                  ? t('public.legal.privacy.intro')
                  : t('public.legal.terms.intro')}
              </p>
            </div>
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-sm">
              <svg className="w-4 h-4 text-slate-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <rect x="3" y="4" width="18" height="18" rx="2" />
                <line x1="16" y1="2" x2="16" y2="6" />
                <line x1="8" y1="2" x2="8" y2="6" />
                <line x1="3" y1="10" x2="21" y2="10" />
              </svg>
              <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                {t('public.legal.header.lastUpdated')}
              </span>
            </div>
          </div>

          <div className="inline-flex rounded-2xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 p-1 shadow-sm">
            <button
              onClick={() => setTab('privacy')}
              className={`px-5 py-2.5 rounded-xl text-sm font-bold transition-colors ${
                tab === 'privacy'
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              {t('public.legal.tabs.privacy')}
            </button>
            <button
              onClick={() => setTab('terms')}
              className={`px-5 py-2.5 rounded-xl text-sm font-bold transition-colors ${
                tab === 'terms'
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              {t('public.legal.tabs.terms')}
            </button>
          </div>
        </div>
      </section>

      <section className="py-12">
        <div className="max-w-6xl mx-auto px-6 grid lg:grid-cols-12 gap-8">
          <main className="lg:col-span-8 space-y-8">
            {tab === 'privacy' &&
              privacySections.map(s => (
                <PrivacySection
                  key={s}
                  id={`privacy-${s}`}
                  t={t}
                  s={s}
                />
              ))}

            {tab === 'terms' &&
              termsSections.map(s => (
                <TermsSection
                  key={s}
                  id={`terms-${s}`}
                  t={t}
                  s={s}
                />
              ))}

            <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-2xl p-6">
              <div className="flex items-start gap-4">
                <div className="w-10 h-10 rounded-xl bg-blue-600 text-white flex items-center justify-center shrink-0">
                  <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z" />
                  </svg>
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900 dark:text-white mb-1">
                    {t('public.legal.contactBox.title')}
                  </h3>
                  <p className="text-sm text-slate-600 dark:text-slate-300">
                    {t('public.legal.contactBox.desc')}
                  </p>
                  <p className="text-sm font-semibold text-blue-700 dark:text-blue-400 mt-2">
                    privacy@ioes.edu.vn · dpo@ioes.edu.vn
                  </p>
                </div>
              </div>
            </div>
          </main>

          <aside className="lg:col-span-4">
            <div className="lg:sticky lg:top-28">
              <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 overflow-hidden">
                <div className="px-5 py-4 border-b border-slate-100 dark:border-slate-700">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                    {t('public.legal.toc.title')}
                  </h3>
                </div>
                <ul className="p-3 max-h-[480px] overflow-y-auto">
                  {(tab === 'privacy' ? privacySections : termsSections).map(s => (
                    <li key={s}>
                      <button
                        onClick={() => scrollToSection(`${tab}-${s}`)}
                        className="w-full flex items-start gap-3 px-3 py-2.5 rounded-xl text-left hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors group"
                      >
                        <span className="w-6 h-6 rounded-lg bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 text-[10px] font-bold flex items-center justify-center shrink-0 group-hover:bg-blue-600 group-hover:text-white transition-colors">
                          {t(`public.legal.${tab}.${s}.number`)}
                        </span>
                        <span className="text-xs font-medium text-slate-700 dark:text-slate-300 group-hover:text-blue-600 dark:group-hover:text-blue-400 leading-snug">
                          {t(`public.legal.${tab}.${s}.heading`)}
                        </span>
                      </button>
                    </li>
                  ))}
                </ul>
              </div>

              <div className="mt-4 bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-5">
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-3">
                  {t('public.legal.relatedDocs.title')}
                </h3>
                <ul className="space-y-2">
                  <li>
                    <a href="#" className="text-xs font-semibold text-blue-600 dark:text-blue-400 hover:underline">
                      {t('public.legal.relatedDocs.cookies')}
                    </a>
                  </li>
                  <li>
                    <a href="#" className="text-xs font-semibold text-blue-600 dark:text-blue-400 hover:underline">
                      {t('public.legal.relatedDocs.dpa')}
                    </a>
                  </li>
                  <li>
                    <a href="#" className="text-xs font-semibold text-blue-600 dark:text-blue-400 hover:underline">
                      {t('public.legal.relatedDocs.imprint')}
                    </a>
                  </li>
                </ul>
              </div>
            </div>
          </aside>
        </div>
      </section>

      <Footer />
    </div>
  );
};

interface SectionProps {
  id: string;
  s: string;
  t: (k: string) => string;
}

const PrivacySection: React.FC<SectionProps> = ({ id, s, t }) => (
  <article id={id} className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-6 scroll-mt-28">
    <div className="flex items-start gap-4 mb-3">
      <div className="w-9 h-9 rounded-xl bg-blue-100 dark:bg-blue-900/40 text-blue-600 dark:text-blue-400 flex items-center justify-center text-xs font-bold shrink-0">
        {t(`public.legal.privacy.${s}.number`)}
      </div>
      <div className="flex-1">
        <h2 className="text-xl font-bold text-slate-900 dark:text-white">
          {t(`public.legal.privacy.${s}.heading`)}
        </h2>
      </div>
    </div>
    <div className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed space-y-3 pl-13">
      <p>{t(`public.legal.privacy.${s}.body1`)}</p>
      <p>{t(`public.legal.privacy.${s}.body2`)}</p>
    </div>
  </article>
);

const TermsSection: React.FC<SectionProps> = ({ id, s, t }) => (
  <article id={id} className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-6 scroll-mt-28">
    <div className="flex items-start gap-4 mb-3">
      <div className="w-9 h-9 rounded-xl bg-blue-100 dark:bg-blue-900/40 text-blue-600 dark:text-blue-400 flex items-center justify-center text-xs font-bold shrink-0">
        {t(`public.legal.terms.${s}.number`)}
      </div>
      <div className="flex-1">
        <h2 className="text-xl font-bold text-slate-900 dark:text-white">
          {t(`public.legal.terms.${s}.heading`)}
        </h2>
      </div>
    </div>
    <div className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed space-y-3 pl-13">
      <p>{t(`public.legal.terms.${s}.body1`)}</p>
      <p>{t(`public.legal.terms.${s}.body2`)}</p>
    </div>
  </article>
);

export default LegalPage;
