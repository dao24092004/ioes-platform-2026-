import React from 'react';
import { useTranslation } from 'react-i18next';

const SkillTreeSection: React.FC = () => {
  const { t } = useTranslation();

  const achievements = [
    { name: 'First Blood', desc: t('skillTree.achievements.firstBlood'), icon: 'circle-target' },
    { name: '7-Day Streak', desc: t('skillTree.achievements.streak7'), icon: 'lightning' },
    { name: 'Speed Demon', desc: t('skillTree.achievements.speedDemon'), icon: 'zap' },
    { name: 'Perfect Score', desc: t('skillTree.achievements.perfectScore'), icon: 'star' },
    { name: '???', desc: t('skillTree.locked'), icon: 'lock', locked: true },
  ];

  const getIcon = (icon: string) => {
    switch (icon) {
      case 'circle-target':
        return (
          <svg className="w-6 h-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="12" cy="12" r="10" />
            <circle cx="12" cy="12" r="6" />
            <circle cx="12" cy="12" r="2" />
          </svg>
        );
      case 'lightning':
        return (
          <svg className="w-6 h-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83" />
          </svg>
        );
      case 'zap':
        return (
          <svg className="w-6 h-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" />
          </svg>
        );
      case 'star':
        return (
          <svg className="w-6 h-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
          </svg>
        );
      case 'lock':
        return (
          <svg className="w-6 h-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
            <path d="M7 11V7a5 5 0 0110 0v4" />
          </svg>
        );
      default:
        return null;
    }
  };

  return (
    <section id="skilltree" className="py-24 bg-slate-50 dark:bg-slate-800">
      <div className="max-w-5xl mx-auto px-6">
        <div className="text-center mb-12">
          <span className="inline-flex items-center gap-2 px-4 py-2 bg-green-100 dark:bg-green-900/50 text-green-700 dark:text-green-400 rounded-full text-sm font-medium mb-4">
            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
            </svg>
            {t('skillTree.title')}
          </span>
          <h2 className="text-3xl md:text-4xl font-bold text-slate-900 dark:text-white mb-4">{t('skillTree.buildTitle')}</h2>
          <p className="text-lg text-slate-600 dark:text-slate-300 max-w-2xl mx-auto">{t('skillTree.buildDesc')}</p>
        </div>

        <div className="relative">
          <div className="absolute left-1/2 top-0 bottom-0 w-1 bg-blue-500 transform -translate-x-1/2 rounded-full hidden md:block"></div>

          <div className="flex justify-center mb-16">
            <div className="w-28 h-28 bg-blue-600 rounded-full flex flex-col items-center justify-center text-white shadow-xl border-4 border-white z-10">
              <svg className="w-8 h-8" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M12 14l9-5-9-5-9 5 9 5z" />
              </svg>
              <span className="text-xs font-bold mt-1">{t('skillTree.starter')}</span>
            </div>
          </div>

          <div className="grid md:grid-cols-3 gap-8 mb-16 relative">
            <div className="flex flex-col items-center text-center">
              <div className="w-20 h-20 bg-green-500 rounded-full flex items-center justify-center text-white border-3 border-white z-10">
                <svg className="w-8 h-8" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <path d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <div className="mt-3">
                <div className="font-semibold text-slate-900 dark:text-white">HTML/CSS</div>
                <div className="text-xs text-green-600 dark:text-green-400">{t('skillTree.completed')}</div>
              </div>
            </div>
            <div className="flex flex-col items-center text-center">
              <div className="w-20 h-20 bg-cyan-500 rounded-full flex items-center justify-center text-white border-3 border-white z-10">
                <svg className="w-8 h-8" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <path d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <div className="mt-3">
                <div className="font-semibold text-slate-900 dark:text-white">JavaScript</div>
                <div className="text-xs text-cyan-600 dark:text-cyan-400">{t('skillTree.completed')}</div>
              </div>
            </div>
            <div className="flex flex-col items-center text-center">
              <div className="w-20 h-20 bg-slate-200 dark:bg-slate-700 rounded-full flex items-center justify-center text-slate-400 border-2 border-dashed border-slate-300 dark:border-slate-600 z-10">
                <svg className="w-7 h-7" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                  <path d="M7 11V7a5 5 0 0110 0v4" />
                </svg>
              </div>
              <div className="mt-3">
                <div className="font-semibold text-slate-400">React.js</div>
                <div className="text-xs text-slate-400">{t('skillTree.locked')}</div>
              </div>
            </div>
          </div>

          <div className="flex justify-center gap-24 mb-12">
            <div className="flex flex-col items-center text-center">
              <div className="w-20 h-20 bg-blue-500 rounded-full flex items-center justify-center text-white border-3 border-blue-500 relative">
                <svg className="w-9 h-9" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <circle cx="12" cy="12" r="10" />
                  <polyline points="12 6 12 12 16 14" />
                </svg>
              </div>
              <div className="mt-3">
                <div className="font-semibold text-slate-900 dark:text-white">Node.js</div>
                <div className="text-xs text-blue-600 dark:text-blue-400">{t('skillTree.inProgress')}</div>
              </div>
            </div>
            <div className="flex flex-col items-center text-center">
              <div className="w-20 h-20 bg-slate-200 dark:bg-slate-700 rounded-full flex items-center justify-center text-slate-400 border-2 border-dashed border-slate-300 dark:border-slate-600">
                <svg className="w-7 h-7" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                  <path d="M7 11V7a5 5 0 0110 0v4" />
                </svg>
              </div>
              <div className="mt-3">
                <div className="font-semibold text-slate-400">Python AI</div>
                <div className="text-xs text-slate-400">{t('skillTree.locked')}</div>
              </div>
            </div>
          </div>

          <div className="flex justify-center">
            <div className="flex flex-col items-center text-center">
              <div className="w-24 h-24 bg-amber-500 rounded-full flex flex-col items-center justify-center text-white shadow-xl border-4 border-amber-400">
                <svg className="w-8 h-8" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
                </svg>
                <span className="text-xs font-bold">{t('skillTree.expert')}</span>
              </div>
              <div className="mt-3">
                <div className="font-bold text-amber-600 dark:text-amber-400">{t('skillTree.fullStackMaster')}</div>
                <div className="text-xs text-slate-500">{t('skillTree.legendaryTitle')}</div>
              </div>
            </div>
          </div>
        </div>

        <div className="mt-16 p-8 bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-700">
          <h4 className="text-center text-xl font-bold text-slate-900 dark:text-white mb-6">{t('skillTree.achievements.title')}</h4>
          <div className="flex justify-center gap-6 flex-wrap">
            {achievements.map((achievement, index) => (
              <div key={index} className={`text-center p-4 bg-slate-50 dark:bg-slate-800 rounded-2xl min-w-[100px] ${achievement.locked ? 'opacity-50' : ''}`}>
                <div className={`w-12 h-12 ${achievement.locked ? 'bg-slate-200 dark:bg-slate-700' : 'bg-red-100 dark:bg-red-900/30'} rounded-xl flex items-center justify-center mx-auto mb-2 ${achievement.locked ? 'text-slate-400' : 'text-red-600 dark:text-red-400'}`}>
                  {getIcon(achievement.icon)}
                </div>
                <div className="text-sm font-semibold text-slate-900 dark:text-white">{achievement.name}</div>
                <div className="text-xs text-slate-500">{achievement.desc}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
};

export default SkillTreeSection;
