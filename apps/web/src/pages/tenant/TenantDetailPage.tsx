import React, { useEffect, useMemo } from 'react';
import { Link, Navigate, useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import Header from '@/components/public/Header';
import Footer from '@/components/public/Footer';
import { TENANTS, type TenantCardData } from './tenantData';

interface CourseHighlight {
  id: string;
  title: string;
  students: number;
  rating: number;
  category: string;
}

const HIGHLIGHT_COURSES: Record<string, CourseHighlight[]> = {
  'fpt-university': [
    { id: 'cs201', title: 'Advanced Machine Learning', students: 412, rating: 4.8, category: 'AI / ML' },
    { id: 'cs301', title: 'Cloud Architecture với AWS', students: 318, rating: 4.7, category: 'Cloud' },
    { id: 'bd201', title: 'Business Analytics Foundations', students: 256, rating: 4.6, category: 'Business' },
  ],
  'hcmus': [
    { id: 'mt101', title: 'Toán rời rạc nâng cao', students: 280, rating: 4.7, category: 'Math' },
    { id: 'olp', title: 'Olympic Tin học — Practice', students: 198, rating: 4.9, category: 'Competitive' },
  ],
};

const DEFAULT_COURSES: CourseHighlight[] = [];

const TenantDetailPage: React.FC = () => {
  const { tenantId } = useParams<{ tenantId: string }>();
  const { t } = useTranslation();

  // Scroll to top khi đổi tenantId
  useEffect(() => {
    window.scrollTo({ top: 0 });
  }, [tenantId]);

  const tenant = useMemo<TenantCardData | undefined>(
    () => TENANTS.find(tn => tn.id === tenantId),
    [tenantId]
  );

  if (!tenant) {
    return <Navigate to="/tenants" replace />;
  }

  const courses = HIGHLIGHT_COURSES[tenant.id] ?? DEFAULT_COURSES;

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950">
      <Header />

      <main className="pt-[72px]">
        {/* Breadcrumb */}
        <div className="max-w-7xl mx-auto px-6 pt-6">
          <nav className="flex items-center gap-2 text-sm text-slate-500 dark:text-slate-400">
            <Link to="/" className="hover:text-blue-600 transition-colors">{t('nav.home')}</Link>
            <span>/</span>
            <Link to="/tenants" className="hover:text-blue-600 transition-colors">{t('tenant.nav')}</Link>
            <span>/</span>
            <span className="text-slate-900 dark:text-white font-medium truncate">{tenant.name}</span>
          </nav>
        </div>

        {/* Hero (public - chỉ thông tin giới thiệu) */}
        <section className="max-w-7xl mx-auto px-6 mt-4">
          <div className={`relative overflow-hidden rounded-3xl bg-gradient-to-br ${tenant.logoGradient} p-8 md:p-10`}>
            <div className="absolute inset-0 opacity-20" style={{ backgroundImage: 'radial-gradient(circle at 1px 1px, white 1px, transparent 0)', backgroundSize: '32px 32px' }} />
            <div className="relative flex flex-col md:flex-row md:items-center gap-6">
              <div className="w-20 h-20 md:w-24 md:h-24 rounded-2xl bg-white/15 backdrop-blur-sm border border-white/20 flex items-center justify-center text-white font-extrabold text-2xl md:text-3xl shadow-lg">
                {tenant.logoText}
              </div>
              <div className="flex-1 min-w-0">
                <h1 className="text-2xl md:text-3xl lg:text-4xl font-extrabold text-white mb-2">
                  {tenant.name}
                </h1>
                <p className="text-white/90 text-sm md:text-base mb-1">{tenant.domain}</p>
                <p className="text-white/80 text-xs md:text-sm flex items-center gap-1">
                  <PinIcon /> {tenant.region}
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* About */}
        <section className="max-w-7xl mx-auto px-6 mt-10">
          <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-6">
            <h2 className="text-lg font-bold text-slate-900 dark:text-white mb-3 flex items-center gap-2">
              <BuildingIcon /> {t('tenant.detail.about')}
            </h2>
            <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed mb-6">
              {tenant.description}
            </p>
          </div>
        </section>

        {/* Highlight courses (chỉ phần public) */}
        {courses.length > 0 && (
          <section className="max-w-7xl mx-auto px-6 mt-10 pb-16">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <StarIcon /> {t('tenant.detail.featuredCourses')}
              </h2>
              <Link to="/courses" className="text-sm text-blue-600 dark:text-blue-400 font-semibold hover:underline">
                {t('tenant.detail.viewAll')}
              </Link>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
              {courses.map(c => (
                <div key={c.id} className="group p-5 rounded-2xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:border-blue-400 hover:shadow-md transition-all">
                  <div className="flex items-start justify-between mb-3">
                    <span className="px-2.5 py-1 rounded-full bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 text-[11px] font-bold uppercase tracking-wider">
                      {c.category}
                    </span>
                    <span className="flex items-center gap-1 text-xs font-bold text-amber-600 dark:text-amber-400">
                      <StarIcon /> {c.rating.toFixed(1)}
                    </span>
                  </div>
                  <h3 className="text-base font-bold text-slate-900 dark:text-white mb-3 line-clamp-2 group-hover:text-blue-600 transition-colors">{c.title}</h3>
                  <Link to={`/courses/${c.id}`} className="text-blue-600 dark:text-blue-400 font-semibold hover:underline text-sm">
                    {t('tenant.detail.view')} →
                  </Link>
                </div>
              ))}
            </div>
          </section>
        )}
      </main>

      <Footer />
    </div>
  );
};

/* Icons */
const BuildingIcon = () => (
  <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M3 21h18M5 21V7l8-4v18M19 21V11l-6-4" /><line x1="9" y1="9" x2="9" y2="9.01" /><line x1="9" y1="13" x2="9" y2="13.01" /><line x1="9" y1="17" x2="9" y2="17.01" /><path d="M14 13h.01M14 17h.01M14 9h.01" /></svg>
);
const PinIcon = () => (
  <svg className="w-3.5 h-3.5 inline" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0z" /><circle cx="12" cy="10" r="3" /></svg>
);
const StarIcon = () => (
  <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" /></svg>
);

export default TenantDetailPage;