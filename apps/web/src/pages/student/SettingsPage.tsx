import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import StudentLayout from '@/components/layout/StudentLayout';

type Tab = 'general' | 'notifications' | 'privacy' | 'language';

const SettingsPage: React.FC = () => {
  const { t, i18n } = useTranslation();
  const [tab, setTab] = useState<Tab>('general');

  const [theme, setTheme] = useState<'light' | 'dark' | 'auto'>('auto');
  const [language, setLanguage] = useState<'vi' | 'en'>(
    i18n.language?.startsWith('vi') ? 'vi' : 'en'
  );

  const [emailNotif, setEmailNotif] = useState(true);
  const [pushNotif, setPushNotif] = useState(true);
  const [courseUpdates, setCourseUpdates] = useState(true);
  const [examReminders, setExamReminders] = useState(true);
  const [weeklyReport, setWeeklyReport] = useState(false);
  const [promotions, setPromotions] = useState(false);

  const [profilePublic, setProfilePublic] = useState(true);
  const [showProgress, setShowProgress] = useState(true);
  const [showActivity, setShowActivity] = useState(false);

  const tabs: { id: Tab; label: string; icon: React.ReactNode }[] = [
    { id: 'general', label: t('student.settings.tabs.general'), icon: <GearIcon /> },
    { id: 'notifications', label: t('student.settings.tabs.notifications'), icon: <BellIcon /> },
    { id: 'privacy', label: t('student.settings.tabs.privacy'), icon: <LockIcon /> },
    { id: 'language', label: t('student.settings.tabs.language'), icon: <LangIcon /> },
  ];

  const Switch: React.FC<{ checked: boolean; onChange: (v: boolean) => void }> = ({ checked, onChange }) => (
    <button
      onClick={() => onChange(!checked)}
      className={`relative w-11 h-6 rounded-full transition-colors flex-shrink-0 overflow-hidden ${checked ? 'bg-blue-600' : 'bg-slate-300 dark:bg-slate-700'}`}
      role="switch"
      aria-checked={checked}
    >
      <span className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform duration-200 ${checked ? 'translate-x-5' : 'translate-x-0'}`} />
    </button>
  );

  return (
    <StudentLayout title={t('student.settings.title')} subtitle={t('student.settings.subtitle')}>
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        <aside className="lg:col-span-1">
          <nav className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-2 space-y-1">
            {tabs.map(tb => (
              <button
                key={tb.id}
                onClick={() => setTab(tb.id)}
                className={`w-full px-4 py-2.5 rounded-xl flex items-center gap-3 text-sm font-semibold transition-colors ${
                  tab === tb.id
                    ? 'bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400'
                    : 'text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800/40'
                }`}
              >
                <span className="w-5 h-5">{tb.icon}</span>
                {tb.label}
              </button>
            ))}
          </nav>
        </aside>

        <div className="lg:col-span-3 space-y-6">
          {tab === 'general' && (
            <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-6">
              <h2 className="text-base font-bold text-slate-900 dark:text-white mb-4">{t('student.settings.theme')}</h2>
              <div className="grid grid-cols-3 gap-3">
                {(['light', 'dark', 'auto'] as const).map(th => (
                  <button
                    key={th}
                    onClick={() => {
                      setTheme(th);
                      if (th === 'dark') document.documentElement.classList.add('dark');
                      else if (th === 'light') document.documentElement.classList.remove('dark');
                      else {
                        const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
                        document.documentElement.classList.toggle('dark', prefersDark);
                      }
                    }}
                    className={`p-4 rounded-xl border-2 transition-colors ${
                      theme === th
                        ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                        : 'border-slate-200 dark:border-slate-700 hover:border-blue-300'
                    }`}
                  >
                    <div className="text-2xl mb-2">{th === 'light' ? '☀️' : th === 'dark' ? '🌙' : '💻'}</div>
                    <div className="text-sm font-semibold">{t(`student.settings.theme${th.charAt(0).toUpperCase()}${th.slice(1)}`)}</div>
                  </button>
                ))}
              </div>
            </div>
          )}

          {tab === 'notifications' && (
            <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 divide-y divide-slate-100 dark:divide-slate-800">
              <Row label={t('student.settings.emailNotif')} desc="Nhận thông báo qua email" checked={emailNotif} onChange={setEmailNotif} Switch={Switch} />
              <Row label={t('student.settings.pushNotif')} desc="Thông báo đẩy trên trình duyệt" checked={pushNotif} onChange={setPushNotif} Switch={Switch} />
              <Row label={t('student.settings.courseUpdates')} desc="Khi có bài học mới hoặc cập nhật" checked={courseUpdates} onChange={setCourseUpdates} Switch={Switch} />
              <Row label={t('student.settings.examReminders')} desc="Nhắc nhở trước khi bài thi bắ đầu" checked={examReminders} onChange={setExamReminders} Switch={Switch} />
              <Row label={t('student.settings.weeklyReport')} desc="Báo cáo tiến độ mỗi tuần" checked={weeklyReport} onChange={setWeeklyReport} Switch={Switch} />
              <Row label={t('student.settings.promotions')} desc="Khuyến mãi và ưu đãi mới" checked={promotions} onChange={setPromotions} Switch={Switch} />
            </div>
          )}

          {tab === 'privacy' && (
            <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 divide-y divide-slate-100 dark:divide-slate-800">
              <Row label="Hồ sơ công khai" desc="Cho phép người khác xem hồ sơ" checked={profilePublic} onChange={setProfilePublic} Switch={Switch} />
              <Row label="Hiển thị tiến độ học" desc="Hiển thị trên bảng xếp hạng" checked={showProgress} onChange={setShowProgress} Switch={Switch} />
              <Row label="Hiển thị hoạt động" desc="Cho phép bạn học thấy hoạt động của bạn" checked={showActivity} onChange={setShowActivity} Switch={Switch} />
            </div>
          )}

          {tab === 'language' && (
            <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-6">
              <h2 className="text-base font-bold text-slate-900 dark:text-white mb-4">{t('student.settings.language')}</h2>
              <div className="grid grid-cols-2 gap-3">
                {(['vi', 'en'] as const).map(lang => (
                  <button
                    key={lang}
                    onClick={() => {
                      setLanguage(lang);
                      i18n.changeLanguage(lang);
                    }}
                    className={`p-4 rounded-xl border-2 transition-colors flex items-center gap-3 ${
                      language === lang
                        ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                        : 'border-slate-200 dark:border-slate-700 hover:border-blue-300'
                    }`}
                  >
                    <span className="text-3xl">{lang === 'vi' ? '🇻🇳' : '🇬🇧'}</span>
                    <div className="text-left">
                      <div className="font-semibold">{t(`student.settings.language${lang.toUpperCase()}`)}</div>
                      <div className="text-xs text-slate-500 dark:text-slate-400">{lang === 'vi' ? 'Tiếng Việt' : 'English'}</div>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </StudentLayout>
  );
};

const Row: React.FC<{
  label: string;
  desc?: string;
  checked: boolean;
  onChange: (v: boolean) => void;
  Switch: React.FC<{ checked: boolean; onChange: (v: boolean) => void }>;
}> = ({ label, desc, checked, onChange, Switch }) => (
  <div className="px-6 py-4 flex items-center justify-between gap-4">
    <div>
      <div className="font-semibold text-sm text-slate-900 dark:text-white">{label}</div>
      {desc && <div className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">{desc}</div>}
    </div>
    <Switch checked={checked} onChange={onChange} />
  </div>
);

const GearIcon = () => (
  <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="3" /><path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-2 2 2 2 0 01-2-2v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83 0 2 2 0 010-2.83l.06-.06a1.65 1.65 0 00.33-1.82 1.65 1.65 0 00-1.51-1H3a2 2 0 01-2-2 2 2 0 012-2h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 010-2.83 2 2 0 012.83 0l.06.06a1.65 1.65 0 001.82.33H9a1.65 1.65 0 001-1.51V3a2 2 0 012-2 2 2 0 012 2v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 0 2 2 0 010 2.83l-.06.06a1.65 1.65 0 00-.33 1.82V9a1.65 1.65 0 001.51 1H21a2 2 0 012 2 2 2 0 01-2 2h-.09a1.65 1.65 0 00-1.51 1z" /></svg>
);
const BellIcon = () => (
  <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" /></svg>
);
const LockIcon = () => (
  <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="11" width="18" height="11" rx="2" /><path d="M7 11V7a5 5 0 0110 0v4" /></svg>
);
const LangIcon = () => (
  <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10" /><line x1="2" y1="12" x2="22" y2="12" /><path d="M12 2a15.3 15.3 0 014 10 15.3 15.3 0 01-4 10 15.3 15.3 0 01-4-10 15.3 15.3 0 014-10z" /></svg>
);

export default SettingsPage;