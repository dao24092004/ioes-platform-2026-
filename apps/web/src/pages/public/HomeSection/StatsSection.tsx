import React from 'react';
import { useTranslation } from 'react-i18next';

const StatsSection: React.FC = () => {
  const { t } = useTranslation();

  return (
    <section className="py-8 bg-white dark:bg-slate-800 border-y border-slate-200 dark:border-slate-700">
      <div className="max-w-7xl mx-auto px-6">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-blue-100 dark:bg-blue-900/50 rounded-xl flex items-center justify-center">
              <svg className="w-6 h-6 text-blue-600 dark:text-blue-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2" />
                <circle cx="9" cy="7" r="4" />
                <path d="M23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75" />
              </svg>
            </div>
            <div>
              <div className="font-bold text-slate-900 dark:text-white">10,000+</div>
              <div className="text-sm text-slate-500 dark:text-slate-400">{t('stats.section.activeStudents')}</div>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-cyan-100 dark:bg-cyan-900/50 rounded-xl flex items-center justify-center">
              <svg className="w-6 h-6 text-cyan-600 dark:text-cyan-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
              </svg>
            </div>
            <div>
              <div className="font-bold text-slate-900 dark:text-white">500+</div>
              <div className="text-sm text-slate-500 dark:text-slate-400">{t('stats.section.qualityCourses')}</div>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-green-100 dark:bg-green-900/50 rounded-xl flex items-center justify-center">
              <svg className="w-6 h-6 text-green-600 dark:text-green-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <div>
              <div className="font-bold text-slate-900 dark:text-white">50,000+</div>
              <div className="text-sm text-slate-500 dark:text-slate-400">{t('stats.section.examsCompleted')}</div>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-orange-100 dark:bg-orange-900/50 rounded-xl flex items-center justify-center">
              <svg className="w-6 h-6 text-orange-600 dark:text-orange-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M12 15l-2 5l9-11h-6l9-11l-2 5H12z" />
              </svg>
            </div>
            <div>
              <div className="font-bold text-slate-900 dark:text-white">4.9/5</div>
              <div className="text-sm text-slate-500 dark:text-slate-400">{t('stats.section.avgRating')}</div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default StatsSection;
