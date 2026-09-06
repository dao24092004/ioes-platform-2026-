import React, { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import Header from '@/components/public/Header';
import Footer from '@/components/public/Footer';

interface Category {
  id: 'gettingStarted' | 'account' | 'courses' | 'exams' | 'payments' | 'technical';
  count: number;
  icon: React.ReactNode;
  tone: 'blue' | 'emerald' | 'purple' | 'amber' | 'cyan' | 'red';
  iconBg: string;
}

const CATEGORIES: Category[] = [
  {
    id: 'gettingStarted',
    count: 24,
    tone: 'blue',
    iconBg: 'bg-blue-100 dark:bg-blue-900/40 text-blue-600 dark:text-blue-400',
    icon: (
      <svg className="w-6 h-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <polyline points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
      </svg>
    ),
  },
  {
    id: 'account',
    count: 18,
    tone: 'emerald',
    iconBg: 'bg-emerald-100 dark:bg-emerald-900/40 text-emerald-600 dark:text-emerald-400',
    icon: (
      <svg className="w-6 h-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2" />
        <circle cx="12" cy="7" r="4" />
      </svg>
    ),
  },
  {
    id: 'courses',
    count: 32,
    tone: 'purple',
    iconBg: 'bg-purple-100 dark:bg-purple-900/40 text-purple-600 dark:text-purple-400',
    icon: (
      <svg className="w-6 h-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M4 19.5A2.5 2.5 0 016.5 17H20" />
        <path d="M6.5 2H20v20H6.5A2.5 2.5 0 014 19.5v-15A2.5 2.5 0 016.5 2z" />
      </svg>
    ),
  },
  {
    id: 'exams',
    count: 27,
    tone: 'amber',
    iconBg: 'bg-amber-100 dark:bg-amber-900/40 text-amber-600 dark:text-amber-400',
    icon: (
      <svg className="w-6 h-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2" />
        <rect x="9" y="3" width="6" height="4" rx="1" />
        <line x1="9" y1="12" x2="15" y2="12" />
        <line x1="9" y1="16" x2="13" y2="16" />
      </svg>
    ),
  },
  {
    id: 'payments',
    count: 15,
    tone: 'cyan',
    iconBg: 'bg-cyan-100 dark:bg-cyan-900/40 text-cyan-600 dark:text-cyan-400',
    icon: (
      <svg className="w-6 h-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <rect x="1" y="4" width="22" height="16" rx="2" />
        <line x1="1" y1="10" x2="23" y2="10" />
      </svg>
    ),
  },
  {
    id: 'technical',
    count: 21,
    tone: 'red',
    iconBg: 'bg-red-100 dark:bg-red-900/40 text-red-600 dark:text-red-400',
    icon: (
      <svg className="w-6 h-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M14.7 6.3a1 1 0 000 1.4l1.6 1.6a1 1 0 001.4 0l3.77-3.77a6 6 0 01-7.94 7.94l-6.91 6.91a2.12 2.12 0 01-3-3l6.91-6.91a6 6 0 017.94-7.94l-3.76 3.76z" />
      </svg>
    ),
  },
];

interface ContactCard {
  id: 'email' | 'liveChat' | 'phone' | 'community';
  icon: React.ReactNode;
  tone: 'blue' | 'emerald' | 'amber' | 'purple';
}

const CONTACT_CARDS: ContactCard[] = [
  {
    id: 'email',
    tone: 'blue',
    icon: (
      <svg className="w-6 h-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
        <polyline points="22 6 12 13 2 6" />
      </svg>
    ),
  },
  {
    id: 'liveChat',
    tone: 'emerald',
    icon: (
      <svg className="w-6 h-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z" />
      </svg>
    ),
  },
  {
    id: 'phone',
    tone: 'amber',
    icon: (
      <svg className="w-6 h-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M22 16.92v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07 19.5 19.5 0 01-6-6 19.79 19.79 0 01-3.07-8.67A2 2 0 014.11 2h3a2 2 0 012 1.72 12.84 12.84 0 00.7 2.81 2 2 0 01-.45 2.11L8.09 9.91a16 16 0 006 6l1.27-1.27a2 2 0 012.11-.45 12.84 12.84 0 002.81.7A2 2 0 0122 16.92z" />
      </svg>
    ),
  },
  {
    id: 'community',
    tone: 'purple',
    icon: (
      <svg className="w-6 h-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2" />
        <circle cx="9" cy="7" r="4" />
        <path d="M23 21v-2a4 4 0 00-3-3.87" />
        <path d="M16 3.13a4 4 0 010 7.75" />
      </svg>
    ),
  },
];

const contactToneClass: Record<ContactCard['tone'], string> = {
  blue: 'bg-blue-100 dark:bg-blue-900/40 text-blue-600 dark:text-blue-400',
  emerald: 'bg-emerald-100 dark:bg-emerald-900/40 text-emerald-600 dark:text-emerald-400',
  amber: 'bg-amber-100 dark:bg-amber-900/40 text-amber-600 dark:text-amber-400',
  purple: 'bg-purple-100 dark:bg-purple-900/40 text-purple-600 dark:text-purple-400',
};

const POPULAR_ARTICLES = [
  { key: 'a1', tagKey: 'tagGettingStarted' },
  { key: 'a2', tagKey: 'tagCourses' },
  { key: 'a3', tagKey: 'tagExams' },
  { key: 'a4', tagKey: 'tagAccount' },
  { key: 'a5', tagKey: 'tagPayments' },
  { key: 'a6', tagKey: 'tagTechnical' },
  { key: 'a7', tagKey: 'tagExams' },
  { key: 'a8', tagKey: 'tagCourses' },
] as const;

const FAQS = ['q1', 'q2', 'q3', 'q4', 'q5', 'q6', 'q7', 'q8', 'q9', 'q10'] as const;

const HelpCenterPage: React.FC = () => {
  const { t } = useTranslation();
  const [search, setSearch] = useState('');
  const [openFaq, setOpenFaq] = useState<string | null>('q1');

  const filteredArticles = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return POPULAR_ARTICLES;
    return POPULAR_ARTICLES.filter(a =>
      `${t(`public.helpCenter.articles.${a.key}.title`)} ${t(`public.helpCenter.articles.${a.key}.desc`)}`
        .toLowerCase()
        .includes(q),
    );
  }, [search, t]);

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-slate-100">
      <Header />

      <section className="relative pt-32 pb-20 bg-gradient-to-br from-slate-100 via-white to-blue-50 dark:from-slate-900 dark:via-slate-900 dark:to-slate-800 border-b border-slate-200 dark:border-slate-800 overflow-hidden">
        <div className="absolute inset-0 opacity-30">
          <svg className="w-full h-full" viewBox="0 0 1000 600" preserveAspectRatio="none">
            <defs>
              <pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse">
                <path d="M 40 0 L 0 0 0 40" fill="none" stroke="rgb(148 163 184)" strokeWidth="0.5" />
              </pattern>
            </defs>
            <rect width="100%" height="100%" fill="url(#grid)" />
          </svg>
        </div>
        <div className="relative max-w-4xl mx-auto px-6 text-center">
          <span className="inline-flex items-center gap-2 px-4 py-1.5 bg-blue-50 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300 rounded-full text-xs font-semibold uppercase tracking-wider mb-5 border border-blue-200 dark:border-blue-800">
            <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <circle cx="12" cy="12" r="10" />
              <path d="M9.09 9a3 3 0 015.83 1c0 2-3 3-3 3" />
              <line x1="12" y1="17" x2="12.01" y2="17" />
            </svg>
            {t('public.helpCenter.hero.badge')}
          </span>
          <h1 className="text-4xl md:text-5xl font-bold text-slate-900 dark:text-white mb-4">
            {t('public.helpCenter.hero.title')}
          </h1>
          <p className="text-lg text-slate-600 dark:text-slate-400 mb-8 max-w-2xl mx-auto">
            {t('public.helpCenter.hero.desc')}
          </p>
          <div className="relative max-w-2xl mx-auto">
            <svg
              className="absolute left-5 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            >
              <circle cx="11" cy="11" r="8" />
              <line x1="21" y1="21" x2="16.65" y2="16.65" />
            </svg>
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={t('public.helpCenter.hero.searchPlaceholder')}
              className="w-full pl-14 pr-5 py-4 rounded-2xl bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-sm font-medium shadow-xl border border-slate-200 dark:border-slate-700 focus:outline-none focus:ring-4 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
            />
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-4">
            {t('public.helpCenter.hero.suggestionLabel')}{' '}
            <span className="font-semibold text-slate-700 dark:text-slate-300">exam</span>,{' '}
            <span className="font-semibold text-slate-700 dark:text-slate-300">refund</span>,{' '}
            <span className="font-semibold text-slate-700 dark:text-slate-300">certificate</span>
          </p>
        </div>
      </section>

      <section className="py-16 -mt-10">
        <div className="max-w-7xl mx-auto px-6">
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
            {CATEGORIES.map(cat => (
              <button
                key={cat.id}
                onClick={() => setSearch('')}
                className="group bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-5 text-left hover:shadow-lg hover:border-blue-500 hover:-translate-y-0.5 transition-all"
              >
                <div className={`w-12 h-12 rounded-xl flex items-center justify-center mb-3 ${cat.iconBg}`}>
                  {cat.icon}
                </div>
                <h3 className="text-sm font-bold text-slate-900 dark:text-white mb-1">
                  {t(`public.helpCenter.categories.${cat.id}.title`)}
                </h3>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed">
                  {t(`public.helpCenter.categories.${cat.id}.desc`)}
                </p>
                <div className="mt-3 text-[11px] font-semibold text-blue-600 dark:text-blue-400">
                  {t('public.helpCenter.articleCount', { count: cat.count })}
                </div>
              </button>
            ))}
          </div>
        </div>
      </section>

      <section className="py-12">
        <div className="max-w-7xl mx-auto px-6">
          <div className="flex items-end justify-between mb-6">
            <div>
              <h2 className="text-2xl font-bold text-slate-900 dark:text-white">
                {t('public.helpCenter.popular.title')}
              </h2>
              <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
                {t('public.helpCenter.popular.subtitle')}
              </p>
            </div>
            <Link
              to="#"
              className="text-sm font-semibold text-blue-600 dark:text-blue-400 hover:underline"
            >
              {t('public.helpCenter.popular.viewAll')}
            </Link>
          </div>
          {filteredArticles.length === 0 ? (
            <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-12 text-center">
              <p className="text-sm text-slate-500 dark:text-slate-400">
                {t('public.helpCenter.popular.empty')}
              </p>
            </div>
          ) : (
            <div className="grid md:grid-cols-2 gap-4">
              {filteredArticles.map(a => (
                <Link
                  key={a.key}
                  to="#"
                  className="group bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-5 hover:border-blue-500 hover:shadow-md transition-all"
                >
                  <div className="flex items-start gap-4">
                    <div className="w-10 h-10 rounded-xl bg-blue-100 dark:bg-blue-900/40 text-blue-600 dark:text-blue-400 flex items-center justify-center shrink-0">
                      <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" />
                        <polyline points="14 2 14 8 20 8" />
                      </svg>
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1.5">
                        <span className="px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 text-[10px] font-bold uppercase">
                          {t(`public.helpCenter.popular.tags.${a.tagKey}`)}
                        </span>
                        <span className="text-[10px] text-slate-400">·</span>
                        <span className="text-[10px] text-slate-400">
                          {t(`public.helpCenter.popular.readTime.${a.key}`)}
                        </span>
                      </div>
                      <h3 className="text-base font-bold text-slate-900 dark:text-white mb-1 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                        {t(`public.helpCenter.articles.${a.key}.title`)}
                      </h3>
                      <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                        {t(`public.helpCenter.articles.${a.key}.desc`)}
                      </p>
                    </div>
                    <svg
                      className="w-4 h-4 text-slate-400 group-hover:text-blue-500 group-hover:translate-x-0.5 transition-all shrink-0"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                    >
                      <polyline points="9 18 15 12 9 6" />
                    </svg>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>
      </section>

      <section className="py-12 bg-white dark:bg-slate-800/40 border-y border-slate-200 dark:border-slate-800">
        <div className="max-w-4xl mx-auto px-6">
          <div className="text-center mb-8">
            <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-2">
              {t('public.helpCenter.faq.title')}
            </h2>
            <p className="text-sm text-slate-500 dark:text-slate-400">
              {t('public.helpCenter.faq.subtitle')}
            </p>
          </div>
          <div className="space-y-3">
            {FAQS.map(q => {
              const open = openFaq === q;
              return (
                <div
                  key={q}
                  className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 overflow-hidden"
                >
                  <button
                    onClick={() => setOpenFaq(open ? null : q)}
                    className="w-full flex items-center justify-between gap-4 px-5 py-4 text-left"
                  >
                    <span className="text-sm font-semibold text-slate-900 dark:text-white">
                      {t(`public.helpCenter.faq.${q}.question`)}
                    </span>
                    <svg
                      className={`w-5 h-5 text-slate-500 transition-transform shrink-0 ${open ? 'rotate-180' : ''}`}
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                    >
                      <polyline points="6 9 12 15 18 9" />
                    </svg>
                  </button>
                  {open && (
                    <div className="px-5 pb-5 text-sm text-slate-600 dark:text-slate-300 leading-relaxed border-t border-slate-100 dark:border-slate-700 pt-4">
                      {t(`public.helpCenter.faq.${q}.answer`)}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </section>

      <section className="py-16">
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center mb-8">
            <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-2">
              {t('public.helpCenter.contact.title')}
            </h2>
            <p className="text-sm text-slate-500 dark:text-slate-400 max-w-2xl mx-auto">
              {t('public.helpCenter.contact.subtitle')}
            </p>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {CONTACT_CARDS.map(c => (
              <div
                key={c.id}
                className="group bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-6 hover:shadow-lg hover:border-blue-500 transition-all"
              >
                <div className={`w-12 h-12 rounded-xl flex items-center justify-center mb-4 ${contactToneClass[c.tone]}`}>
                  {c.icon}
                </div>
                <h3 className="text-base font-bold text-slate-900 dark:text-white mb-1">
                  {t(`public.helpCenter.contact.${c.id}.title`)}
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 mb-3">
                  {t(`public.helpCenter.contact.${c.id}.desc`)}
                </p>
                <p className="text-sm font-semibold text-blue-600 dark:text-blue-400">
                  {t(`public.helpCenter.contact.${c.id}.value`)}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="py-16 bg-gradient-to-br from-slate-100 via-white to-blue-50 dark:from-slate-900 dark:via-slate-900 dark:to-slate-800 border-y border-slate-200 dark:border-slate-800">
        <div className="max-w-4xl mx-auto px-6 text-center">
          <h2 className="text-3xl md:text-4xl font-bold text-slate-900 dark:text-white mb-4">
            {t('public.helpCenter.cta.title')}
          </h2>
          <p className="text-base text-slate-600 dark:text-slate-400 mb-8 max-w-2xl mx-auto">
            {t('public.helpCenter.cta.desc')}
          </p>
          <div className="flex flex-wrap items-center justify-center gap-3">
            <Link
              to="/contact"
              className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-sm font-bold transition-colors shadow-lg shadow-blue-500/30"
            >
              <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z" />
              </svg>
              {t('public.helpCenter.cta.contactSupport')}
            </Link>
            <Link
              to="/contact"
              className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 text-sm font-bold border border-slate-300 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors"
            >
              {t('public.helpCenter.cta.submitTicket')}
            </Link>
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
};

export default HelpCenterPage;
