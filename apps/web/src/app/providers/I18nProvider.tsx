import React from 'react';
import { I18nextProvider, initReactI18next } from 'react-i18next';
import i18n from 'i18next';

import viCommon from '@/locales/vi/common.json';
import enCommon from '@/locales/en/common.json';
import viQuestionBank from '@/locales/vi/questionBank.json';
import enQuestionBank from '@/locales/en/questionBank.json';
import viRecommendations from '@/locales/vi/recommendations.json';
import enRecommendations from '@/locales/en/recommendations.json';
import viLearningPath from '@/locales/vi/learningPath.json';
import enLearningPath from '@/locales/en/learningPath.json';

// Trang lớn dùng namespace riêng để tránh common.json phình ra và tránh xung đột
// khi nhiều người sửa cùng lúc: useTranslation('recommendations').
const resources = {
  vi: {
    common: viCommon,
    questionBank: viQuestionBank,
    recommendations: viRecommendations,
    learningPath: viLearningPath,
  },
  en: {
    common: enCommon,
    questionBank: enQuestionBank,
    recommendations: enRecommendations,
    learningPath: enLearningPath,
  },
};

// Resolve initial language: tests can pin the language by writing
// `localStorage.setItem('i18nextLng', 'en')` before the app boots.
// Production users get the default `vi` (the platform's primary audience).
const initialLng = (() => {
  if (typeof window === 'undefined') return 'vi';
  const stored = window.localStorage.getItem('i18nextLng');
  if (stored === 'en' || stored === 'vi') return stored;
  return 'vi';
})();

i18n
  .use(initReactI18next)
  .init({
    resources,
    lng: initialLng,
    fallbackLng: 'en',
    supportedLngs: ['en', 'vi'],
    ns: ['common', 'questionBank', 'recommendations', 'learningPath'],
    defaultNS: 'common',
    interpolation: {
      escapeValue: false,
    },
    react: {
      useSuspense: false,
    },
  });

interface I18nProviderProps {
  children: React.ReactNode;
}

const I18nProvider: React.FC<I18nProviderProps> = ({ children }) => {
  return <I18nextProvider i18n={i18n}>{children}</I18nextProvider>;
};

export default I18nProvider;
