import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import InstructorLayout from '@/components/layout/InstructorLayout';

type Section = 'general' | 'teaching' | 'notifications' | 'integrations' | 'billing';

const SECTIONS: Section[] = ['general', 'teaching', 'notifications', 'integrations', 'billing'];

const SettingsPage: React.FC = () => {
  const { t, i18n } = useTranslation();
  const [section, setSection] = useState<Section>('general');
  const [savedFlash, setSavedFlash] = useState(false);

  const flash = () => {
    setSavedFlash(true);
    setTimeout(() => setSavedFlash(false), 2000);
  };

  return (
    <InstructorLayout title={t('instructor.settings.title')} subtitle={t('instructor.settings.subtitle')}>
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Sidebar */}
        <aside className="lg:col-span-3">
          <nav className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-2 space-y-1">
            {SECTIONS.map((s) => (
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

        {/* Content */}
        <main className="lg:col-span-9 space-y-4">
          {savedFlash && (
            <div className="flex items-center gap-2 px-4 py-3 rounded-xl bg-emerald-50 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400 text-sm font-semibold border border-emerald-200 dark:border-emerald-800">
              <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="20 6 9 17 4 12" /></svg>
              {t('instructor.settings.saved')}
            </div>
          )}

          {section === 'general' && <GeneralSection t={t} i18nLang={i18n.language ?? 'vi'} flash={flash} />}
          {section === 'teaching' && <TeachingSection t={t} flash={flash} />}
          {section === 'notifications' && <NotificationsSection t={t} flash={flash} />}
          {section === 'integrations' && <IntegrationsSection t={t} flash={flash} />}
          {section === 'billing' && <BillingSection t={t} flash={flash} />}
        </main>
      </div>
    </InstructorLayout>
  );
};

type TFn = (key: string, opts?: Record<string, unknown>) => string;

interface SectionProps { t: TFn; flash: () => void; i18nLang?: string; }

const GeneralSection: React.FC<SectionProps> = ({ t, flash, i18nLang }) => {
  const [language, setLanguage] = useState(i18nLang?.startsWith('en') ? 'en' : 'vi');
  const [timezone, setTimezone] = useState('Asia/Ho_Chi_Minh');
  return (
    <article className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-6">
      <h2 className="text-base font-semibold mb-1">{t('instructor.settings.general.title')}</h2>
      <p className="text-xs text-slate-500 mb-5">{t('instructor.settings.general.desc')}</p>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">{t('instructor.settings.general.language')}</label>
          <select value={language} onChange={(e) => setLanguage(e.target.value)} className="w-full px-3 py-2.5 text-sm rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 focus:outline-none focus:border-blue-500">
            <option value="vi">Tiếng Việt</option>
            <option value="en">English</option>
          </select>
        </div>
        <div>
          <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">{t('instructor.settings.general.timezone')}</label>
          <select value={timezone} onChange={(e) => setTimezone(e.target.value)} className="w-full px-3 py-2.5 text-sm rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 focus:outline-none focus:border-blue-500">
            <option value="Asia/Ho_Chi_Minh">(GMT+7) Hà Nội / TP. HCM</option>
            <option value="Asia/Bangkok">(GMT+7) Bangkok</option>
            <option value="Asia/Tokyo">(GMT+9) Tokyo</option>
            <option value="UTC">(GMT+0) UTC</option>
          </select>
        </div>
      </div>

      <div className="mt-6 flex justify-end">
        <button onClick={flash} className="px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold shadow-sm transition-colors">
          {t('instructor.settings.save')}
        </button>
      </div>
    </article>
  );
};

const TeachingSection: React.FC<SectionProps> = ({ t, flash }) => {
  const [autoGrade, setAutoGrade] = useState(true);
  const [plagiarismCheck, setPlagiarismCheck] = useState(true);
  const [proctoring, setProctoring] = useState(false);
  const [passScore, setPassScore] = useState(70);
  return (
    <article className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-6">
      <h2 className="text-base font-semibold mb-1">{t('instructor.settings.teaching.title')}</h2>
      <p className="text-xs text-slate-500 mb-5">{t('instructor.settings.teaching.desc')}</p>

      <div className="space-y-1 divide-y divide-slate-100 dark:divide-slate-800">
        <ToggleRow title={t('instructor.settings.teaching.autoGrade')} desc={t('instructor.settings.teaching.autoGradeDesc')} checked={autoGrade} onChange={setAutoGrade} />
        <ToggleRow title={t('instructor.settings.teaching.plagiarism')} desc={t('instructor.settings.teaching.plagiarismDesc')} checked={plagiarismCheck} onChange={setPlagiarismCheck} />
        <ToggleRow title={t('instructor.settings.teaching.proctoring')} desc={t('instructor.settings.teaching.proctoringDesc')} checked={proctoring} onChange={setProctoring} />
      </div>

      <div className="mt-6">
        <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
          {t('instructor.settings.teaching.passScore')}: <span className="text-blue-600">{passScore}%</span>
        </label>
        <input
          type="range"
          min={50}
          max={100}
          value={passScore}
          onChange={(e) => setPassScore(Number(e.target.value))}
          className="w-full accent-blue-600"
        />
      </div>

      <div className="mt-6 flex justify-end">
        <button onClick={flash} className="px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold shadow-sm transition-colors">
          {t('instructor.settings.save')}
        </button>
      </div>
    </article>
  );
};

const NotificationsSection: React.FC<SectionProps> = ({ t, flash }) => {
  const channels = ['email', 'inApp', 'push'] as const;
  const events = ['enrollment', 'submission', 'review', 'system'] as const;
  const [matrix, setMatrix] = useState<Record<string, boolean>>({
    'email-enrollment': true, 'email-submission': true, 'email-review': false, 'email-system': false,
    'inApp-enrollment': true, 'inApp-submission': true, 'inApp-review': true, 'inApp-system': true,
    'push-enrollment': false, 'push-submission': true, 'push-review': false, 'push-system': false,
  });

  const toggle = (k: string) => setMatrix((p) => ({ ...p, [k]: !p[k] }));

  return (
    <article className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-6">
      <h2 className="text-base font-semibold mb-1">{t('instructor.settings.notifications.title')}</h2>
      <p className="text-xs text-slate-500 mb-5">{t('instructor.settings.notifications.desc')}</p>

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-xs text-slate-500 border-b border-slate-200 dark:border-slate-800">
              <th className="text-left py-2 font-semibold">{t('instructor.settings.notifications.event')}</th>
              {channels.map((c) => (
                <th key={c} className="text-center py-2 px-2 font-semibold">{t(`instructor.settings.notifications.${c}`)}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {events.map((e) => (
              <tr key={e} className="border-b border-slate-100 dark:border-slate-800 last:border-0">
                <td className="py-3 font-medium">{t(`instructor.settings.notifications.${e}`)}</td>
                {channels.map((c) => (
                  <td key={c} className="text-center py-3">
                    <input
                      type="checkbox"
                      checked={!!matrix[`${c}-${e}`]}
                      onChange={() => toggle(`${c}-${e}`)}
                      className="w-4 h-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                    />
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="mt-6 flex justify-end">
        <button onClick={flash} className="px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold shadow-sm transition-colors">
          {t('instructor.settings.save')}
        </button>
      </div>
    </article>
  );
};

const IntegrationsSection: React.FC<SectionProps> = ({ t, flash }) => {
  const items = [
    { key: 'zoom', name: 'Zoom', desc: t('instructor.settings.integrations.zoomDesc'), icon: 'Z' },
    { key: 'googleMeet', name: 'Google Meet', desc: t('instructor.settings.integrations.meetDesc'), icon: 'G' },
    { key: 'slack', name: 'Slack', desc: t('instructor.settings.integrations.slackDesc'), icon: 'S' },
    { key: 'gdrive', name: 'Google Drive', desc: t('instructor.settings.integrations.driveDesc'), icon: 'D' },
  ] as const;
  const [connected, setConnected] = useState<Record<string, boolean>>({ zoom: true, googleMeet: false, slack: false, gdrive: true });
  return (
    <article className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-6">
      <h2 className="text-base font-semibold mb-1">{t('instructor.settings.integrations.title')}</h2>
      <p className="text-xs text-slate-500 mb-5">{t('instructor.settings.integrations.desc')}</p>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {items.map((it) => (
          <div key={it.key} className="flex items-center gap-3 p-3 rounded-xl border border-slate-200 dark:border-slate-700">
            <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-blue-500 to-cyan-500 text-white font-bold flex items-center justify-center">{it.icon}</div>
            <div className="flex-1 min-w-0">
              <h4 className="text-sm font-semibold">{it.name}</h4>
              <p className="text-xs text-slate-500 truncate">{it.desc}</p>
            </div>
            <button
              onClick={() => { setConnected((p) => ({ ...p, [it.key]: !p[it.key] })); flash(); }}
              className={`px-3 py-1.5 text-xs font-semibold rounded-lg ${
                connected[it.key] ? 'border border-emerald-200 text-emerald-600' : 'bg-blue-600 text-white hover:bg-blue-700'
              }`}
            >
              {connected[it.key] ? t('instructor.settings.connected') : t('instructor.settings.connect')}
            </button>
          </div>
        ))}
      </div>
    </article>
  );
};

const BillingSection: React.FC<SectionProps> = ({ t, flash }) => {
  return (
    <article className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-6">
      <h2 className="text-base font-semibold mb-1">{t('instructor.settings.billing.title')}</h2>
      <p className="text-xs text-slate-500 mb-5">{t('instructor.settings.billing.desc')}</p>

      <div className="p-5 rounded-xl border-2 border-blue-500 bg-blue-50 dark:bg-blue-900/20 mb-4">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <div className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-xs font-bold bg-blue-600 text-white mb-2">
              {t('instructor.settings.billing.pro')}
            </div>
            <h3 className="text-lg font-bold">{t('instructor.settings.billing.proPlan')}</h3>
            <p className="text-sm text-slate-600 dark:text-slate-400">{t('instructor.settings.billing.renewsAt', { date: '15/09/2026' })}</p>
          </div>
          <div className="text-right">
            <div className="text-2xl font-bold">499.000 ₫</div>
            <div className="text-xs text-slate-500">{t('instructor.settings.billing.perMonth')}</div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <BillingStat label={t('instructor.settings.billing.tokensUsed')} value="1,456" sub={t('instructor.settings.billing.ofLimit', { limit: '5,000' })} />
        <BillingStat label={t('instructor.settings.billing.aiCalls')} value="248" sub={t('instructor.settings.billing.thisMonth')} />
        <BillingStat label={t('instructor.settings.billing.storage')} value="2.3 GB" sub={t('instructor.settings.billing.ofLimit', { limit: '10 GB' })} />
      </div>

      <div className="mt-5 flex gap-2">
        <button onClick={flash} className="px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold">
          {t('instructor.settings.billing.manage')}
        </button>
        <button className="px-4 py-2 rounded-lg border border-slate-200 dark:border-slate-700 hover:border-slate-300 text-sm font-semibold">
          {t('instructor.settings.billing.invoices')}
        </button>
      </div>
    </article>
  );
};

const BillingStat: React.FC<{ label: string; value: string; sub: string }> = ({ label, value, sub }) => (
  <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-700">
    <div className="text-xs text-slate-500 mb-1">{label}</div>
    <div className="text-xl font-bold tabular-nums mb-0.5">{value}</div>
    <div className="text-xs text-slate-500">{sub}</div>
  </div>
);

const ToggleRow: React.FC<{ title: string; desc: string; checked: boolean; onChange: (v: boolean) => void }> = ({ title, desc, checked, onChange }) => (
  <div className="flex items-center justify-between gap-4 py-3">
    <div className="flex-1 min-w-0">
      <h4 className="text-sm font-semibold mb-0.5">{title}</h4>
      <p className="text-xs text-slate-500">{desc}</p>
    </div>
    <button
      type="button"
      onClick={() => onChange(!checked)}
      className={`relative w-11 h-6 rounded-full transition-colors flex-shrink-0 ${checked ? 'bg-blue-600' : 'bg-slate-200 dark:bg-slate-700'}`}
      aria-pressed={checked}
    >
      <span className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform ${checked ? 'translate-x-5' : ''}`} />
    </button>
  </div>
);

export default SettingsPage;
