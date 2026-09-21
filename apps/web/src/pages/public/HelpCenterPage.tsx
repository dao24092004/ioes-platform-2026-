import React, { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import Header from '@/components/public/Header';
import Footer from '@/components/public/Footer';
import AnimatedSection from '@/components/common/AnimatedSection';

interface Category {
  id: 'gettingStarted' | 'account' | 'courses' | 'exams' | 'payments' | 'technical';
  count: number;
  icon: React.ReactNode;
  tone: 'blue' | 'emerald' | 'purple' | 'amber' | 'cyan' | 'red';
  iconBg: string;
  gradient: string;
}

const CATEGORIES: Category[] = [
  {
    id: 'gettingStarted',
    count: 24,
    tone: 'blue',
    gradient: 'from-blue-500 to-blue-600',
    iconBg: 'bg-blue-100 dark:bg-blue-900/40 text-blue-600 dark:text-blue-400',
    icon: (
      <svg className="w-7 h-7" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <polyline points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
      </svg>
    ),
  },
  {
    id: 'account',
    count: 18,
    tone: 'emerald',
    gradient: 'from-emerald-500 to-emerald-600',
    iconBg: 'bg-emerald-100 dark:bg-emerald-900/40 text-emerald-600 dark:text-emerald-400',
    icon: (
      <svg className="w-7 h-7" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2" />
        <circle cx="12" cy="7" r="4" />
      </svg>
    ),
  },
  {
    id: 'courses',
    count: 32,
    tone: 'purple',
    gradient: 'from-purple-500 to-purple-600',
    iconBg: 'bg-purple-100 dark:bg-purple-900/40 text-purple-600 dark:text-purple-400',
    icon: (
      <svg className="w-7 h-7" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M4 19.5A2.5 2.5 0 016.5 17H20" />
        <path d="M6.5 2H20v20H6.5A2.5 2.5 0 014 19.5v-15A2.5 2.5 0 016.5 2z" />
      </svg>
    ),
  },
  {
    id: 'exams',
    count: 27,
    tone: 'amber',
    gradient: 'from-amber-500 to-amber-600',
    iconBg: 'bg-amber-100 dark:bg-amber-900/40 text-amber-600 dark:text-amber-400',
    icon: (
      <svg className="w-7 h-7" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
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
    gradient: 'from-cyan-500 to-cyan-600',
    iconBg: 'bg-cyan-100 dark:bg-cyan-900/40 text-cyan-600 dark:text-cyan-400',
    icon: (
      <svg className="w-7 h-7" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <rect x="1" y="4" width="22" height="16" rx="2" />
        <line x1="1" y1="10" x2="23" y2="10" />
      </svg>
    ),
  },
  {
    id: 'technical',
    count: 21,
    tone: 'red',
    gradient: 'from-red-500 to-red-600',
    iconBg: 'bg-red-100 dark:bg-red-900/40 text-red-600 dark:text-red-400',
    icon: (
      <svg className="w-7 h-7" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M14.7 6.3a1 1 0 000 1.4l1.6 1.6a1 1 0 001.4 0l3.77-3.77a6 6 0 01-7.94 7.94l-6.91 6.91a2.12 2.12 0 01-3-3l6.91-6.91a6 6 0 017.94-7.94l-3.76 3.76z" />
      </svg>
    ),
  },
];

interface ContactCard {
  id: 'email' | 'liveChat' | 'phone' | 'community';
  icon: React.ReactNode;
  tone: 'blue' | 'emerald' | 'amber' | 'purple';
  gradient: string;
}

const CONTACT_CARDS: ContactCard[] = [
  {
    id: 'email',
    tone: 'blue',
    gradient: 'from-blue-500 to-blue-600',
    icon: (
      <svg className="w-7 h-7" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
        <polyline points="22 6 12 13 2 6" />
      </svg>
    ),
  },
  {
    id: 'liveChat',
    tone: 'emerald',
    gradient: 'from-emerald-500 to-emerald-600',
    icon: (
      <svg className="w-7 h-7" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z" />
      </svg>
    ),
  },
  {
    id: 'phone',
    tone: 'amber',
    gradient: 'from-amber-500 to-amber-600',
    icon: (
      <svg className="w-7 h-7" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M22 16.92v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07 19.5 19.5 0 01-6-6 19.79 19.79 0 01-3.07-8.67A2 2 0 014.11 2h3a2 2 0 012 1.72 12.84 12.84 0 00.7 2.81 2 2 0 01-.45 2.11L8.09 9.91a16 16 0 006 6l1.27-1.27a2 2 0 012.11-.45 12.84 12.84 0 002.81.7A2 2 0 0122 16.92z" />
      </svg>
    ),
  },
  {
    id: 'community',
    tone: 'purple',
    gradient: 'from-purple-500 to-purple-600',
    icon: (
      <svg className="w-7 h-7" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2" />
        <circle cx="9" cy="7" r="4" />
        <path d="M23 21v-2a4 4 0 00-3-3.87" />
        <path d="M16 3.13a4 4 0 010 7.75" />
      </svg>
    ),
  },
];


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

const FloatingOrbs = () => (
  <div className="absolute inset-0 overflow-hidden pointer-events-none">
    <div className="absolute top-20 left-1/4 w-96 h-96 bg-blue-400/20 rounded-full blur-3xl animate-pulse" />
    <div className="absolute bottom-20 right-1/4 w-72 h-72 bg-purple-400/20 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1s' }} />
  </div>
);

const FloatingParticles = () => (
  <div className="absolute inset-0 overflow-hidden pointer-events-none">
    {[...Array(20)].map((_, i) => (
      <div
        key={i}
        className="absolute w-1.5 h-1.5 bg-slate-400/30 rounded-full animate-float"
        style={{
          left: `${Math.random() * 100}%`,
          top: `${Math.random() * 100}%`,
          animationDelay: `${Math.random() * 5}s`,
          animationDuration: `${3 + Math.random() * 4}s`,
        }}
      />
    ))}
  </div>
);

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

      {/* Hero */}
      <section className="relative pt-32 pb-24 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-blue-50 via-white to-purple-50 dark:from-slate-900 dark:via-slate-900 dark:to-slate-800" />
        <FloatingOrbs />
        <FloatingParticles />
        
        {/* Grid pattern overlay */}
        <div className="absolute inset-0 opacity-20">
          <svg className="w-full h-full" viewBox="0 0 1000 600" preserveAspectRatio="none">
            <defs>
              <pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse">
                <path d="M 40 0 L 0 0 0 40" fill="none" stroke="currentColor" className="text-slate-300 dark:text-slate-700" strokeWidth="0.5" />
              </pattern>
            </defs>
            <rect width="100%" height="100%" fill="url(#grid)" />
          </svg>
        </div>
        
        <div className="relative max-w-4xl mx-auto px-6 text-center z-10">
          <AnimatedSection delay={100}>
            <span className="inline-flex items-center gap-2 px-5 py-2 bg-blue-100 dark:bg-blue-900/50 text-blue-700 dark:text-blue-400 rounded-full text-sm font-semibold mb-6 shadow-lg shadow-blue-500/10">
              <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <circle cx="12" cy="12" r="10" />
                <path d="M9.09 9a3 3 0 015.83 1c0 2-3 3-3 3" />
                <line x1="12" y1="17" x2="12.01" y2="17" />
              </svg>
              {t('public.helpCenter.hero.badge')}
            </span>
          </AnimatedSection>
          
          <AnimatedSection delay={200}>
            <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold text-slate-900 dark:text-white mb-4 leading-tight">
              {t('public.helpCenter.hero.title')}
            </h1>
          </AnimatedSection>
          
          <AnimatedSection delay={300}>
            <p className="text-lg text-slate-600 dark:text-slate-400 mb-10 max-w-2xl mx-auto">
              {t('public.helpCenter.hero.desc')}
            </p>
          </AnimatedSection>
          
          <AnimatedSection delay={400}>
            <div className="relative max-w-2xl mx-auto">
              <svg
                className="absolute left-5 top-1/2 -translate-y-1/2 w-6 h-6 text-slate-400"
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
                className="w-full pl-14 pr-5 py-4.5 rounded-2xl bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-base shadow-xl border border-slate-200 dark:border-slate-700 focus:outline-none focus:ring-4 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
              />
            </div>
          </AnimatedSection>
          
          <AnimatedSection delay={500}>
            <div className="flex flex-wrap items-center justify-center gap-2 mt-5">
              <span className="text-sm text-slate-500 dark:text-slate-400">Gợi ý:</span>
              {['exam', 'refund', 'certificate', 'account'].map(tag => (
                <button
                  key={tag}
                  onClick={() => setSearch(tag)}
                  className="px-3 py-1 text-sm font-medium text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/30 rounded-full hover:bg-blue-100 dark:hover:bg-blue-900/50 transition-colors capitalize"
                >
                  {tag}
                </button>
              ))}
            </div>
          </AnimatedSection>
        </div>
        
        {/* Wave separator */}
        <div className="absolute -bottom-1 left-0 right-0 h-16">
          <svg viewBox="0 0 1440 60" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full h-full">
            <path d="M0 0L60 5C120 10 240 20 360 25C480 30 600 30 720 27.5C840 25 960 20 1080 17.5C1200 15 1320 15 1380 15L1440 15V60H1380C1320 60 1200 60 1080 60C960 60 840 60 720 60C600 60 480 60 360 60C240 60 120 60 60 60H0V0Z" className="fill-white dark:fill-slate-900"/>
          </svg>
        </div>
      </section>

      {/* Categories */}
      <section className="py-12 -mt-6">
        <div className="max-w-7xl mx-auto px-6">
          <AnimatedSection delay={100}>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
              {CATEGORIES.map((cat, i) => (
                <AnimatedSection key={cat.id} delay={100 + i * 50}>
                  <button
                    onClick={() => setSearch('')}
                    className="group h-full bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-5 text-left hover:shadow-xl hover:border-transparent transition-all duration-300 hover:-translate-y-1"
                  >
                    <div className={`w-14 h-14 rounded-2xl bg-gradient-to-br ${cat.gradient} flex items-center justify-center mb-4 shadow-lg group-hover:scale-110 transition-transform`}>
                      <div className="text-white">
                        {cat.icon}
                      </div>
                    </div>
                    <h3 className="text-sm font-bold text-slate-900 dark:text-white mb-1 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                      {t(`public.helpCenter.categories.${cat.id}.title`)}
                    </h3>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed line-clamp-2">
                      {t(`public.helpCenter.categories.${cat.id}.desc`)}
                    </p>
                    <div className="mt-3 text-[11px] font-bold text-blue-600 dark:text-blue-400">
                      {cat.count} bài viết
                    </div>
                  </button>
                </AnimatedSection>
              ))}
            </div>
          </AnimatedSection>
        </div>
      </section>

      {/* Popular Articles */}
      <section className="py-12">
        <div className="max-w-7xl mx-auto px-6">
          <AnimatedSection delay={100}>
            <div className="flex items-end justify-between mb-8">
              <div>
                <h2 className="text-2xl md:text-3xl font-bold text-slate-900 dark:text-white">
                  Bài viết phổ biến
                </h2>
                <p className="text-sm text-slate-500 dark:text-slate-400 mt-2">
                  Những câu hỏi thường gặp nhất
                </p>
              </div>
              <Link
                to="#"
                className="hidden sm:flex items-center gap-2 text-sm font-semibold text-blue-600 dark:text-blue-400 hover:underline"
              >
                Xem tất cả
                <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M5 12h14M12 5l7 7-7 7" />
                </svg>
              </Link>
            </div>
          </AnimatedSection>
          
          {filteredArticles.length === 0 ? (
            <AnimatedSection delay={200}>
              <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-16 text-center">
                <svg className="w-16 h-16 mx-auto text-slate-300 dark:text-slate-600 mb-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                  <circle cx="11" cy="11" r="8" />
                  <path d="M21 21l-4.35-4.35" />
                </svg>
                <p className="text-slate-500 dark:text-slate-400">Không tìm thấy kết quả phù hợp</p>
              </div>
            </AnimatedSection>
          ) : (
            <div className="grid md:grid-cols-2 gap-4">
              {filteredArticles.map((a, i) => (
                <AnimatedSection key={a.key} delay={200 + i * 50}>
                  <Link
                    to="#"
                    className="group bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-6 hover:border-blue-500 hover:shadow-xl transition-all duration-300 flex items-start gap-4"
                  >
                    <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center shrink-0 shadow-lg group-hover:scale-110 transition-transform">
                      <svg className="w-6 h-6 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" />
                        <polyline points="14 2 14 8 20 8" />
                        <line x1="16" y1="13" x2="8" y2="13" />
                        <line x1="16" y1="17" x2="8" y2="17" />
                      </svg>
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex flex-wrap items-center gap-2 mb-2">
                        <span className="px-2.5 py-1 rounded-full bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 text-[10px] font-bold uppercase">
                          {t(`public.helpCenter.popular.tags.${a.tagKey}`)}
                        </span>
                        <span className="text-[10px] text-slate-400">·</span>
                        <span className="text-[10px] text-slate-400">
                          {t(`public.helpCenter.popular.readTime.${a.key}`)}
                        </span>
                      </div>
                      <h3 className="text-base font-bold text-slate-900 dark:text-white mb-2 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                        {t(`public.helpCenter.articles.${a.key}.title`)}
                      </h3>
                      <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed line-clamp-2">
                        {t(`public.helpCenter.articles.${a.key}.desc`)}
                      </p>
                    </div>
                    <svg
                      className="w-5 h-5 text-slate-400 group-hover:text-blue-500 group-hover:translate-x-1 transition-all shrink-0 mt-1"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                    >
                      <polyline points="9 18 15 12 9 6" />
                    </svg>
                  </Link>
                </AnimatedSection>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* FAQ Section */}
      <section className="py-12 bg-white dark:bg-slate-800/50">
        <div className="max-w-4xl mx-auto px-6">
          <AnimatedSection delay={100}>
            <div className="text-center mb-10">
              <h2 className="text-2xl md:text-3xl font-bold text-slate-900 dark:text-white mb-3">
                Câu hỏi thường gặp
              </h2>
              <p className="text-sm text-slate-500 dark:text-slate-400">
                Tìm nhanh câu trả lời cho những thắc mắc phổ biến
              </p>
            </div>
          </AnimatedSection>
          
          <div className="space-y-3">
            {FAQS.map((q, i) => {
              const open = openFaq === q;
              return (
                <AnimatedSection key={q} delay={150 + i * 50}>
                  <div className={`bg-white dark:bg-slate-800 rounded-2xl border transition-all overflow-hidden ${
                    open 
                      ? 'border-blue-500 shadow-lg shadow-blue-500/10' 
                      : 'border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600'
                  }`}>
                    <button
                      onClick={() => setOpenFaq(open ? null : q)}
                      className="w-full flex items-center justify-between gap-4 px-6 py-5 text-left"
                    >
                      <span className="text-sm font-semibold text-slate-900 dark:text-white pr-4">
                        {t(`public.helpCenter.faq.${q}.question`)}
                      </span>
                      <svg
                        className={`w-5 h-5 text-blue-600 dark:text-blue-400 transition-transform duration-300 shrink-0 ${open ? 'rotate-180' : ''}`}
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                      >
                        <polyline points="6 9 12 15 18 9" />
                      </svg>
                    </button>
                    {open && (
                      <div className="px-6 pb-6 text-sm text-slate-600 dark:text-slate-300 leading-relaxed border-t border-slate-100 dark:border-slate-700 pt-4 animate-fadeIn">
                        {t(`public.helpCenter.faq.${q}.answer`)}
                      </div>
                    )}
                  </div>
                </AnimatedSection>
              );
            })}
          </div>
        </div>
      </section>

      {/* Contact Cards */}
      <section className="py-16">
        <div className="max-w-7xl mx-auto px-6">
          <AnimatedSection delay={100}>
            <div className="text-center mb-10">
              <h2 className="text-2xl md:text-3xl font-bold text-slate-900 dark:text-white mb-3">
                Liên hệ hỗ trợ
              </h2>
              <p className="text-sm text-slate-500 dark:text-slate-400 max-w-2xl mx-auto">
                Chúng tôi luôn sẵn sàng hỗ trợ bạn qua nhiều kênh khác nhau
              </p>
            </div>
          </AnimatedSection>
          
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {CONTACT_CARDS.map((c, i) => (
              <AnimatedSection key={c.id} delay={150 + i * 75}>
                <div className="group bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-6 hover:shadow-xl hover:-translate-y-1 transition-all duration-300">
                  <div className={`w-14 h-14 rounded-2xl bg-gradient-to-br ${c.gradient} flex items-center justify-center mb-5 shadow-lg group-hover:scale-110 transition-transform`}>
                    <div className="text-white">
                      {c.icon}
                    </div>
                  </div>
                  <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-2">
                    {t(`public.helpCenter.contact.${c.id}.title`)}
                  </h3>
                  <p className="text-sm text-slate-500 dark:text-slate-400 mb-4 leading-relaxed">
                    {t(`public.helpCenter.contact.${c.id}.desc`)}
                  </p>
                  <p className="text-base font-bold text-blue-600 dark:text-blue-400">
                    {t(`public.helpCenter.contact.${c.id}.value`)}
                  </p>
                </div>
              </AnimatedSection>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="relative py-20 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-blue-50 via-white to-purple-50 dark:from-slate-900 dark:via-slate-900 dark:to-slate-800" />
        <div className="absolute inset-0">
          <svg className="w-full h-full" viewBox="0 0 1000 400" preserveAspectRatio="none">
            <defs>
              <pattern id="grid2" width="40" height="40" patternUnits="userSpaceOnUse">
                <path d="M 40 0 L 0 0 0 40" fill="none" stroke="currentColor" className="text-slate-200 dark:text-slate-800" strokeWidth="0.5" />
              </pattern>
            </defs>
            <rect width="100%" height="100%" fill="url(#grid2)" />
          </svg>
        </div>
        
        <div className="relative max-w-4xl mx-auto px-6 text-center z-10">
          <AnimatedSection delay={100}>
            <div className="w-20 h-20 mx-auto mb-8 bg-gradient-to-br from-blue-500 to-blue-600 rounded-3xl flex items-center justify-center shadow-xl shadow-blue-500/30">
              <svg className="w-10 h-10 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z" />
              </svg>
            </div>
          </AnimatedSection>
          
          <AnimatedSection delay={200}>
            <h2 className="text-3xl md:text-4xl font-bold text-slate-900 dark:text-white mb-4">
              {t('public.helpCenter.cta.title')}
            </h2>
          </AnimatedSection>
          
          <AnimatedSection delay={300}>
            <p className="text-base text-slate-600 dark:text-slate-400 mb-10 max-w-2xl mx-auto">
              {t('public.helpCenter.cta.desc')}
            </p>
          </AnimatedSection>
          
          <AnimatedSection delay={400}>
            <div className="flex flex-wrap items-center justify-center gap-4">
              <Link
                to="/contact"
                className="inline-flex items-center gap-2 px-8 py-4 rounded-xl bg-gradient-to-r from-blue-600 to-cyan-500 text-white text-sm font-bold transition-all hover:shadow-xl hover:shadow-blue-500/30 hover:-translate-y-0.5"
              >
                <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z" />
                </svg>
                {t('public.helpCenter.cta.contactSupport')}
              </Link>
              <Link
                to="/contact"
                className="inline-flex items-center gap-2 px-8 py-4 rounded-xl bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 text-sm font-bold border-2 border-slate-200 dark:border-slate-700 hover:border-blue-500 hover:bg-blue-50 dark:hover:bg-slate-700 transition-all"
              >
                <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" />
                  <polyline points="14 2 14 8 20 8" />
                  <line x1="12" y1="18" x2="12" y2="12" />
                  <line x1="9" y1="15" x2="15" y2="15" />
                </svg>
                {t('public.helpCenter.cta.submitTicket')}
              </Link>
            </div>
          </AnimatedSection>
        </div>
      </section>

      <Footer />
    </div>
  );
};

export default HelpCenterPage;
