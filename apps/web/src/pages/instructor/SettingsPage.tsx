import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import InstructorLayout from '@/components/layout/InstructorLayout';
import ComingSoon from '@/components/common/ComingSoon';

type Section = 'general' | 'teaching' | 'notifications' | 'integrations' | 'billing';

const SECTIONS: Section[] = ['general', 'teaching', 'notifications', 'integrations', 'billing'];

/**
 * Cài đặt giảng viên.
 *
 * Không service nào lưu cài đặt của giảng viên, nên nút "Lưu" cũ chỉ bật
 * thông báo đã lưu mà không gửi gì đi. Chỉ giữ lựa chọn ngôn ngữ vì nó áp
 * dụng ngay ở trình duyệt; các mục còn lại (chấm bài, thông báo, tích hợp,
 * thanh toán) hiện trạng thái chưa có backend.
 */
const SettingsPage: React.FC = () => {
  const { t, i18n } = useTranslation();
  const [section, setSection] = useState<Section>('general');

  const changeLanguage = (lang: 'vi' | 'en') => {
    i18n.changeLanguage(lang);
    try {
      localStorage.setItem('ioes-lang', lang);
    } catch {
      // Trình duyệt chặn storage thì ngôn ngữ chỉ giữ trong phiên hiện tại.
    }
  };

  return (
    <InstructorLayout title={t('instructor.settings.title')} subtitle={t('instructor.settings.subtitle')}>
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <aside className="lg:col-span-3">
          <nav className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-2 space-y-1">
            {SECTIONS.map(s => (
              <button
                key={s}
                onClick={() => setSection(s)}
                className={`w-full text-left px-3 py-2.5 text-sm font-semibold rounded-xl transition-all flex items-center gap-2 ${
                  section === s
                    ? 'bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400'
                    : 'text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800'
                }`}
              >
                {t(`instructor.settings.section.${s}`)}
              </button>
            ))}
          </nav>
        </aside>

        <main className="lg:col-span-9">
          {section === 'general' ? (
            <article className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-6">
              <h2 className="text-base font-semibold mb-1">{t('instructor.settings.general.title')}</h2>
              <p className="text-xs text-slate-500 mb-5">{t('examApi.settings.languageNote')}</p>
              <div className="max-w-sm">
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                  {t('instructor.settings.general.language')}
                </label>
                <select
                  value={i18n.language?.startsWith('en') ? 'en' : 'vi'}
                  onChange={e => changeLanguage(e.target.value as 'vi' | 'en')}
                  className="w-full px-3 py-2.5 text-sm rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 focus:outline-none focus:border-blue-500"
                >
                  <option value="vi">Tiếng Việt</option>
                  <option value="en">English</option>
                </select>
              </div>
            </article>
          ) : (
            <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800">
              <ComingSoon
                title={t(`instructor.settings.section.${section}`)}
                description={t('examApi.comingSoon.settings.description')}
                missing={t('examApi.comingSoon.settings.missing', { returnObjects: true }) as string[]}
              />
            </div>
          )}
        </main>
      </div>
    </InstructorLayout>
  );
};

export default SettingsPage;
