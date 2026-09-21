import React from 'react';
import { useTranslation } from 'react-i18next';

const FeaturesSection: React.FC = () => {
  const { t } = useTranslation();

  const features = [
    {
      title: t('features.ai.title'),
      desc: t('features.ai.desc'),
      icon: 'M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z',
      highlight: true,
    },
    {
      title: t('features.proctoring.title'),
      desc: t('features.proctoring.desc'),
      icon: 'M15 12a3 3 0 11-6 0 3 3 0 016 0z M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z',
      highlight: false,
    },
    {
      title: t('features.certificate.title'),
      desc: t('features.certificate.desc'),
      icon: 'M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4',
      highlight: false,
    },
    {
      title: t('features.analytics.title'),
      desc: t('features.analytics.desc'),
      icon: 'M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z',
      highlight: false,
    },
    {
      title: t('features.anytime.title'),
      desc: t('features.anytime.desc'),
      icon: 'M12 15l-2 5l9-11h-6l9-11l-2 5H12z',
      highlight: false,
    },
    {
      title: t('features.security.title'),
      desc: t('features.security.desc'),
      icon: 'M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z',
      highlight: false,
    },
    {
      title: t('features.multilang.title'),
      desc: t('features.multilang.desc'),
      icon: 'M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064M21 12a9 9 0 11-18 0 9 9 0 0118 0z',
      highlight: false,
    },
    {
      title: t('features.virtualClass.title'),
      desc: t('features.virtualClass.desc'),
      icon: 'M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z',
      highlight: false,
    },
  ];

  return (
    <section id="features" className="py-24 bg-slate-50 dark:bg-slate-800/50">
      <div className="max-w-7xl mx-auto px-6">
        {/* Section Header */}
        <div className="text-center mb-16">
          <span className="inline-flex items-center gap-2 px-4 py-2 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 rounded-full text-sm font-semibold mb-6">
            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M13 10V3L4 14h7v7l9-11h-7z" />
            </svg>
            {t('features.section.highlight')}
          </span>
          <h2 className="text-3xl md:text-4xl font-bold text-slate-900 dark:text-white mb-4">
            {t('features.title')}
          </h2>
          <p className="text-lg text-slate-600 dark:text-slate-300 max-w-2xl mx-auto">
            {t('features.subtitle')}
          </p>
        </div>

        {/* Features Grid */}
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {features.map((feature, index) => (
            <div 
              key={index} 
              className={`group relative p-6 bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 hover:border-blue-200 dark:hover:border-blue-800 hover:shadow-lg hover:-translate-y-1 transition-all duration-300 ${
                feature.highlight ? 'ring-2 ring-blue-500 ring-offset-2 dark:ring-offset-slate-900' : ''
              }`}
            >
              {feature.highlight && (
                <div className="absolute -top-3 left-6 px-3 py-1 bg-blue-600 text-white text-xs font-bold rounded-full">
                  HOT
                </div>
              )}
              <div className="w-14 h-14 bg-gradient-to-br from-blue-100 to-indigo-100 dark:from-blue-900/40 dark:to-indigo-900/40 rounded-2xl flex items-center justify-center mb-5 group-hover:scale-110 transition-transform">
                <svg className="w-7 h-7 text-blue-600 dark:text-blue-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d={feature.icon} />
                </svg>
              </div>
              <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-2">{feature.title}</h3>
              <p className="text-slate-600 dark:text-slate-400 text-sm leading-relaxed">
                {feature.desc}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default FeaturesSection;
