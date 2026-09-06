import React from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';

const ArenaSection: React.FC = () => {
  const { t } = useTranslation();

  return (
    <section id="arena" className="py-24 bg-slate-50 dark:bg-slate-900 relative overflow-hidden">
      <div className="max-w-6xl mx-auto px-6 relative z-10">
        <div className="text-center mb-12">
          <span className="inline-flex items-center gap-2 px-4 py-2 bg-purple-100 dark:bg-purple-900/50 text-purple-700 dark:text-purple-400 rounded-full text-sm font-medium mb-4">
            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
            </svg>
            {t('arena.title')}
          </span>
          <h2 className="text-3xl md:text-4xl font-bold text-slate-900 dark:text-white mb-4">{t('arena.competeTitle')}</h2>
          <p className="text-lg text-slate-600 dark:text-white/70 max-w-2xl mx-auto">{t('arena.competeDesc')}</p>
        </div>

        <div className="grid md:grid-cols-2 gap-8">
          {/* Leaderboard */}
          <div className="bg-white dark:bg-white/10 border border-slate-200 dark:border-white/10 rounded-3xl p-8">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-bold text-slate-900 dark:text-white">{t('arena.leaderboard')}</h3>
              <span className="px-3 py-1 bg-red-500 text-white text-xs font-semibold rounded-full animate-pulse flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 bg-white rounded-full"></span>
                {t('arena.live')}
              </span>
            </div>
            <div className="space-y-3">
              <div className="flex items-center gap-4 p-4 bg-amber-50 dark:bg-amber-500/10 rounded-2xl border border-amber-200 dark:border-amber-500/20">
                <div className="w-10 h-10 bg-amber-500 rounded-lg flex items-center justify-center">
                  <svg className="w-5 h-5 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
                  </svg>
                </div>
                <div className="flex-1">
                  <div className="text-slate-900 dark:text-white font-semibold">Nguyễn Văn A</div>
                  <div className="text-slate-500 dark:text-white/50 text-xs">{t('arena.points')} • {t('arena.streak')}</div>
                </div>
                <div className="text-amber-500 font-bold">#1</div>
              </div>
              <div className="flex items-center gap-4 p-4 bg-slate-50 dark:bg-white/5 rounded-2xl">
                <div className="w-10 h-10 bg-slate-400 rounded-lg flex items-center justify-center">
                  <svg className="w-5 h-5 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
                  </svg>
                </div>
                <div className="flex-1">
                  <div className="text-slate-900 dark:text-white font-semibold">Trần Thị Bình</div>
                  <div className="text-slate-500 dark:text-white/50 text-xs">{t('arena.points')} • {t('arena.streak')}</div>
                </div>
                <span className="text-slate-400 font-bold">#2</span>
              </div>
              <div className="flex items-center gap-4 p-4 bg-slate-50 dark:bg-white/5 rounded-2xl">
                <div className="w-10 h-10 bg-orange-500 rounded-lg flex items-center justify-center">
                  <svg className="w-5 h-5 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
                  </svg>
                </div>
                <div className="flex-1">
                  <div className="text-slate-900 dark:text-white font-semibold">Lê Hoàng Cường</div>
                  <div className="text-slate-500 dark:text-white/50 text-xs">{t('arena.points')} • {t('arena.streak')}</div>
                </div>
                <span className="text-slate-400 font-bold">#3</span>
              </div>
              <div className="flex items-center gap-4 p-3 bg-slate-50 dark:bg-white/5 rounded-xl">
                <span className="w-7 text-center text-slate-400 dark:text-white/50 font-bold">4</span>
                <div className="flex-1 text-slate-900 dark:text-white text-sm">Phạm Minh Đức</div>
                <span className="text-slate-400 text-sm">10,567</span>
              </div>
            </div>
          </div>

          {/* Challenges */}
          <div>
            <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-5">{t('arena.challenges')}</h3>
            <div className="space-y-4">
              <div className="bg-white dark:bg-white/5 border border-purple-200 dark:border-purple-500/20 rounded-2xl p-6 relative overflow-hidden">
                <div className="absolute top-0 right-0 w-24 h-24 bg-purple-100 dark:bg-purple-500/20 rounded-bl-full"></div>
                <div className="flex items-center gap-3 mb-3">
                  <span className="px-2 py-1 bg-purple-500 text-white text-xs font-bold rounded-lg">{t('courses.badge.pro')}</span>
                  <span className="text-purple-600 dark:text-purple-400 text-xs flex items-center gap-1">
                    <svg className="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <circle cx="12" cy="12" r="10" />
                      <polyline points="12 6 12 12 16 14" />
                    </svg>
                    {t('arena.challengeTime1')}
                  </span>
                </div>
                <h4 className="text-lg font-bold text-slate-900 dark:text-white mb-2">{t('arena.aiChallenge')}</h4>
                <p className="text-slate-600 dark:text-white/60 text-sm mb-4">{t('arena.aiChallengeDesc')}</p>
                <div className="flex items-center justify-between">
                  <span className="text-slate-500 dark:text-white/50 text-xs flex items-center gap-1">
                    <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2" />
                      <circle cx="9" cy="7" r="4" />
                      <path d="M23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75" />
                    </svg>
                    1,247 {t('arena.participants')}
                  </span>
                  <button className="px-4 py-2 bg-purple-600 text-white rounded-lg font-semibold text-sm">{t('arena.join')}</button>
                </div>
              </div>
              <div className="bg-white dark:bg-white/5 border border-green-200 dark:border-green-500/20 rounded-2xl p-6">
                <div className="flex items-center gap-3 mb-3">
                  <span className="px-2 py-1 bg-green-500 text-white text-xs font-bold rounded-lg">{t('courses.badge.free')}</span>
                  <span className="text-green-600 dark:text-green-400 text-xs flex items-center gap-1">
                    <svg className="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <circle cx="12" cy="12" r="10" />
                      <polyline points="12 6 12 12 16 14" />
                    </svg>
                    {t('arena.challengeTime2')}
                  </span>
                </div>
                <h4 className="text-lg font-bold text-slate-900 dark:text-white mb-2">Speed Math Marathon</h4>
                <p className="text-slate-600 dark:text-white/60 text-sm mb-4">{t('arena.mathChallengeDesc')}</p>
                <div className="flex items-center justify-between">
                  <span className="text-slate-500 dark:text-white/50 text-xs flex items-center gap-1">
                    <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2" />
                      <circle cx="9" cy="7" r="4" />
                      <path d="M23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75" />
                    </svg>
                    3,891 {t('arena.participants')}
                  </span>
                  <button className="px-4 py-2 bg-green-600 text-white rounded-lg font-semibold text-sm">{t('arena.join')}</button>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="text-center mt-10">
          <Link to="/auth/register" className="inline-flex items-center gap-2 px-6 py-3 bg-purple-600 text-white rounded-xl font-bold shadow-lg hover:bg-purple-700 transition-colors">
            {t('arena.joinNow')}
            <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M5 12h14M12 5l7 7-7 7" />
            </svg>
          </Link>
        </div>
      </div>
    </section>
  );
};

export default ArenaSection;
