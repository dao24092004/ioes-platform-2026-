import React from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';

const AiMentorSection: React.FC = () => {
  const { t } = useTranslation();

  return (
    <section id="aitutor" className="py-24 bg-white dark:bg-slate-800 relative overflow-hidden">
      <div className="max-w-4xl mx-auto px-6 relative z-10">
        <div className="text-center mb-12">
          <span className="inline-flex items-center gap-2 px-4 py-2 bg-blue-100 dark:bg-blue-900/50 text-blue-700 dark:text-blue-400 rounded-full text-sm font-medium mb-4">
            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z" />
            </svg>
            {t('aiMentor.title')}
          </span>
          <h2 className="text-3xl md:text-4xl font-bold text-slate-900 dark:text-white mb-4">{t('aiMentor.chatTitle')}</h2>
          <p className="text-lg text-slate-600 dark:text-white/70 max-w-2xl mx-auto">{t('aiMentor.chatDesc')}</p>
        </div>

        <div className="bg-white dark:bg-slate-700 border border-slate-200 dark:border-white/10 rounded-3xl overflow-hidden">
          <div className="flex items-center gap-4 p-5 bg-slate-50 dark:bg-white/5 border-b border-slate-200 dark:border-white/10">
            <div className="w-12 h-12 bg-blue-600 rounded-full flex items-center justify-center">
              <svg className="w-6 h-6 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z" />
              </svg>
            </div>
            <div>
              <div className="text-slate-900 dark:text-white font-bold">AI Mentor - Emma</div>
              <div className="flex items-center gap-1.5">
                <span className="w-2 h-2 bg-green-500 rounded-full"></span>
                <span className="text-slate-500 dark:text-white/50 text-xs">{t('aiMentor.online')}</span>
              </div>
            </div>
          </div>

          <div className="p-6 min-h-[300px] max-h-[350px] overflow-y-auto space-y-5">
            <div className="flex gap-3">
              <div className="w-9 h-9 bg-blue-600 rounded-full flex items-center justify-center flex-shrink-0">
                <svg className="w-4 h-4 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z" />
                </svg>
              </div>
              <div className="flex-1">
                <div className="bg-slate-100 dark:bg-white/10 p-4 rounded-2xl rounded-tl-md max-w-[85%]">
                  <p className="text-slate-900 dark:text-white text-sm leading-relaxed">{t('aiMentor.welcomeMsg')}</p>
                </div>
                <span className="text-slate-400 dark:text-white/40 text-xs mt-1 block">{t('aiMentor.justNow')}</span>
              </div>
            </div>

            <div className="flex gap-3 justify-end">
              <div className="flex-1 flex flex-col items-end">
                <div className="bg-blue-500 p-4 rounded-2xl rounded-tr-md max-w-[85%]">
                  <p className="text-white text-sm leading-relaxed">{t('aiMentor.userQuestion')}</p>
                </div>
                <span className="text-slate-400 dark:text-white/40 text-xs mt-1">{t('aiMentor.justNow')}</span>
              </div>
            </div>

            <div className="flex gap-3">
              <div className="w-9 h-9 bg-blue-600 rounded-full flex items-center justify-center flex-shrink-0">
                <svg className="w-4 h-4 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z" />
                </svg>
              </div>
              <div className="flex-1">
                <div className="bg-slate-100 dark:bg-white/10 p-4 rounded-2xl rounded-tl-md max-w-[85%]">
                  <p className="text-slate-900 dark:text-white text-sm leading-relaxed mb-2">{t('aiMentor.aiResponse1')}</p>
                  <ul className="text-slate-900 dark:text-white text-sm space-y-1 ml-4">
                    <li>• <strong>{t('aiMentor.neuron')}:</strong> {t('aiMentor.neuronDesc')}</li>
                    <li>• <strong>{t('aiMentor.layers')}:</strong> {t('aiMentor.layersDesc')}</li>
                    <li>• <strong>{t('aiMentor.weights')}:</strong> {t('aiMentor.weightsDesc')}</li>
                  </ul>
                  <p className="text-slate-900 dark:text-white text-sm leading-relaxed mt-2">{t('aiMentor.aiResponse2')}</p>
                </div>
                <span className="text-slate-400 dark:text-white/40 text-xs mt-1 block">{t('aiMentor.typing')}</span>
              </div>
            </div>
          </div>

          <div className="flex gap-2.5 p-4 flex-wrap border-t border-slate-200 dark:border-white/10">
            <button className="px-4 py-2 bg-blue-100 dark:bg-blue-500/20 text-blue-600 dark:text-blue-400 border border-blue-200 dark:border-blue-500/30 rounded-full text-xs cursor-pointer flex items-center gap-1.5">
              <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M9 11l3 3L22 4" />
                <path d="M21 12v7a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2h11" />
              </svg>
              {t('aiMentor.createQuiz')}
            </button>
            <button className="px-4 py-2 bg-purple-100 dark:bg-purple-500/20 text-purple-600 dark:text-purple-400 border border-purple-200 dark:border-purple-500/30 rounded-full text-xs cursor-pointer flex items-center gap-1.5">
              <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="12" cy="12" r="10" />
                <path d="M9.09 9a3 3 0 015.83 1c0 2-3 3-3 3" />
                <path d="M12 17h.01" />
              </svg>
              {t('aiMentor.explain')}
            </button>
            <button className="px-4 py-2 bg-green-100 dark:bg-green-500/20 text-green-600 dark:text-green-400 border border-green-200 dark:border-green-500/30 rounded-full text-xs cursor-pointer flex items-center gap-1.5">
              <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M3 3v18h18" />
                <path d="M18.7 8l-5.1 5.2-2.8-2.7L7 14.3" />
              </svg>
              {t('aiMentor.analyze')}
            </button>
            <button className="px-4 py-2 bg-pink-100 dark:bg-pink-500/20 text-pink-600 dark:text-pink-400 border border-pink-200 dark:border-pink-500/30 rounded-full text-xs cursor-pointer flex items-center gap-1.5">
              <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="12" cy="12" r="10" />
                <path d="M12 8v4l3 3" />
              </svg>
              {t('aiMentor.review')}
            </button>
          </div>

          <div className="p-5 bg-slate-50 dark:bg-white/5 flex gap-3">
            <input type="text" placeholder={t('aiMentor.placeholder')} className="flex-1 p-4 bg-white dark:bg-slate-600 border border-slate-200 dark:border-white/20 rounded-xl text-slate-900 dark:text-white text-sm placeholder-slate-400" disabled />
            <button className="px-6 py-4 bg-blue-600 text-white rounded-xl font-semibold flex items-center gap-2">
              <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <line x1="22" y1="2" x2="11" y2="13" />
                <polygon points="22 2 15 22 11 13 2 9 22 2" />
              </svg>
              {t('aiMentor.send')}
            </button>
          </div>
        </div>

        <div className="text-center mt-10">
          <Link to="/auth/register" className="inline-flex items-center gap-2 px-6 py-4 bg-blue-600 text-white rounded-xl font-bold text-sm">
            {t('aiMentor.tryNow')}
            <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M5 12h14M12 5l7 7-7 7" />
            </svg>
          </Link>
        </div>
      </div>
    </section>
  );
};

export default AiMentorSection;
