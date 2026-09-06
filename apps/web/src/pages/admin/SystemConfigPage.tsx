import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import AdminLayout from '@/components/layout/AdminLayout';
import { TEST_IDS, ARIA_LABELS } from '@/constants/ui';

type SectionKey = 'general' | 'security' | 'exam' | 'notification' | 'blockchain' | 'backup';

interface ToggleRowProps {
  label: string;
  description?: string;
  value: boolean;
  onChange: (v: boolean) => void;
}

const ToggleRow: React.FC<ToggleRowProps> = ({ label, description, value, onChange }) => (
  <div className="flex items-center justify-between gap-4 py-3 px-4 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors group">
    <div className="flex-1 min-w-0">
      <div className="text-sm font-semibold">{label}</div>
      {description && <div className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">{description}</div>}
    </div>
    <button
      type="button"
      onClick={() => onChange(!value)}
      role="switch"
      aria-checked={value}
      aria-label={ARIA_LABELS.TOGGLE}
      className={`relative w-11 h-6 rounded-full transition-all flex-shrink-0 ${
        value ? 'bg-blue-600' : 'bg-slate-300 dark:bg-slate-700'
      }`}
    >
      <span
        className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${
          value ? 'translate-x-5' : ''
        }`}
      />
    </button>
  </div>
);

interface InputRowProps {
  label: string;
  value: string;
  type?: string;
  placeholder?: string;
  onChange: (v: string) => void;
}

const InputRow: React.FC<InputRowProps> = ({ label, value, type = 'text', placeholder, onChange }) => (
  <div className="py-3">
    <label className="block text-sm font-semibold mb-1.5">{label}</label>
    <input
      type={type}
      value={value}
      placeholder={placeholder}
      onChange={e => onChange(e.target.value)}
      className="w-full px-4 py-2.5 text-sm bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all"
    />
  </div>
);

interface NumberRowProps {
  label: string;
  value: number;
  min?: number;
  max?: number;
  onChange: (v: number) => void;
}

const NumberRow: React.FC<NumberRowProps> = ({ label, value, min, max, onChange }) => (
  <div className="py-3">
    <label className="block text-sm font-semibold mb-1.5">{label}</label>
    <input
      type="number"
      value={value}
      min={min}
      max={max}
      onChange={e => onChange(parseInt(e.target.value, 10) || 0)}
      className="w-full px-4 py-2.5 text-sm bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all"
    />
  </div>
);

interface SelectRowProps {
  label: string;
  value: string;
  options: Array<{ value: string; label: string }>;
  onChange: (v: string) => void;
  ariaLabel?: string;
}

const SelectRow: React.FC<SelectRowProps> = ({ label, value, options, onChange, ariaLabel }) => (
  <div className="py-3">
    <label className="block text-sm font-semibold mb-1.5">{label}</label>
    <select
      value={value}
      onChange={e => onChange(e.target.value)}
      aria-label={ariaLabel ?? label}
      className="w-full px-4 py-2.5 text-sm bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all cursor-pointer"
    >
      {options.map(o => (
        <option key={o.value} value={o.value}>
          {o.label}
        </option>
      ))}
    </select>
  </div>
);

const SectionCard: React.FC<{ title: string; children: React.ReactNode; icon: React.ReactNode }> = ({
  title,
  children,
  icon,
}) => (
  <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 overflow-hidden opacity-0 animate-[fadeInUp_.6s_ease-out_forwards] hover:shadow-lg hover:shadow-blue-500/5 transition-all">
    <div className="px-6 py-5 border-b border-slate-200 dark:border-slate-800 flex items-center gap-3">
      <span className="w-9 h-9 rounded-xl bg-blue-50 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400 flex items-center justify-center">
        {icon}
      </span>
      <h2 className="text-base font-semibold">{title}</h2>
    </div>
    <div className="p-6 divide-y divide-slate-100 dark:divide-slate-800">{children}</div>
  </div>
);

const SystemConfigPage: React.FC = () => {
  const { t } = useTranslation();
  const [active, setActive] = useState<SectionKey>('general');
  const [savedAt, setSavedAt] = useState<string | null>(null);

  // General
  const [platformName, setPlatformName] = useState('IOES Platform');
  const [tagline, setTagline] = useState('Intelligent Online Examination System');
  const [supportEmail, setSupportEmail] = useState('support@ioes.vn');
  const [defaultLang, setDefaultLang] = useState('vi');
  const [timezone, setTimezone] = useState('Asia/Ho_Chi_Minh');
  const [maintenance, setMaintenance] = useState(false);

  // Security
  const [minLength, setMinLength] = useState(8);
  const [requireUpper, setRequireUpper] = useState(true);
  const [requireNumber, setRequireNumber] = useState(true);
  const [requireSpecial, setRequireSpecial] = useState(false);
  const [sessionTimeout, setSessionTimeout] = useState(60);
  const [mfaRequired, setMfaRequired] = useState(true);
  const [loginThrottle, setLoginThrottle] = useState(5);

  // Exam
  const [defaultDuration, setDefaultDuration] = useState(60);
  const [maxQuestions, setMaxQuestions] = useState(100);
  const [proctoring, setProctoring] = useState(true);
  const [shuffle, setShuffle] = useState(true);
  const [antiCheat, setAntiCheat] = useState(true);
  const [gradingScale, setGradingScale] = useState(50);

  // Notification
  const [emailCh, setEmailCh] = useState(true);
  const [pushCh, setPushCh] = useState(true);
  const [smsCh, setSmsCh] = useState(false);
  const [newUserAlert, setNewUserAlert] = useState(true);
  const [courseSubmittedAlert, setCourseSubmittedAlert] = useState(true);
  const [examGradedAlert, setExamGradedAlert] = useState(true);

  // Blockchain
  const [network, setNetwork] = useState('polygon-amoy');
  const [contract, setContract] = useState('0xAbC123...789');
  const [tokenSymbol, setTokenSymbol] = useState('IOES');
  const [mintPerExam, setMintPerExam] = useState(10);

  // Backup
  const [autoBackup, setAutoBackup] = useState(true);
  const [retentionDays, setRetentionDays] = useState(30);
  const [targetStorage, setTargetStorage] = useState('s3-ioes-prod');
  const [backingUp, setBackingUp] = useState(false);

  const sections: Array<{ key: SectionKey; label: string; icon: React.ReactNode }> = [
    {
      key: 'general',
      label: t('systemConfig.sections.general'),
      icon: <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="3" /><path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-2 2 2 2 0 01-2-2v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83 0 2 2 0 010-2.83l.06-.06a1.65 1.65 0 00.33-1.82 1.65 1.65 0 00-1.51-1H3a2 2 0 01-2-2 2 2 0 012-2h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 010-2.83 2 2 0 012.83 0l.06.06a1.65 1.65 0 001.82.33H9a1.65 1.65 0 001-1.51V3a2 2 0 012-2 2 2 0 012 2v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 0 2 2 0 010 2.83l-.06.06a1.65 1.65 0 00-.33 1.82V9a1.65 1.65 0 001.51 1H21a2 2 0 012 2 2 2 0 01-2 2h-.09a1.65 1.65 0 00-1.51 1z" /></svg>,
    },
    {
      key: 'security',
      label: t('systemConfig.sections.security'),
      icon: <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" /></svg>,
    },
    {
      key: 'exam',
      label: t('systemConfig.sections.exam'),
      icon: <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2" /><path d="M9 14l2 2 4-4" /></svg>,
    },
    {
      key: 'notification',
      label: t('systemConfig.sections.notification'),
      icon: <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M15 17h5l-1.4-1.4A2 2 0 0118 14.2V11a6 6 0 00-4-5.7V5a2 2 0 10-4 0v.3C7.7 6.2 6 8.4 6 11v3.2c0 .5-.2 1-.6 1.4L4 17h5m6 0v1a3 3 0 11-6 0v-1" /></svg>,
    },
    {
      key: 'blockchain',
      label: t('systemConfig.sections.blockchain'),
      icon: <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" /></svg>,
    },
    {
      key: 'backup',
      label: t('systemConfig.sections.backup'),
      icon: <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><ellipse cx="12" cy="5" rx="9" ry="3" /><path d="M21 12c0 1.66-4 3-9 3s-9-1.34-9-3" /><path d="M3 5v14c0 1.66 4 3 9 3s9-1.34 9-3V5" /></svg>,
    },
  ];

  const handleSave = () => {
    setBackingUp(true);
    setTimeout(() => {
      setBackingUp(false);
      setSavedAt(new Date().toLocaleTimeString('vi-VN'));
    }, 800);
  };

  return (
    <AdminLayout
      title={t('systemConfig.title')}
      subtitle={t('systemConfig.subtitle')}
      headerActions={
        <div className="flex items-center gap-2">
          {savedAt && (
            <span className="text-xs text-emerald-600 dark:text-emerald-400 font-medium hidden sm:inline-flex items-center gap-1.5">
              <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="20 6 9 17 4 12" /></svg>
              {t('systemConfig.savedAt', { time: savedAt })}
            </span>
          )}
          <button
            onClick={handleSave}
            disabled={backingUp}
            aria-label={t('aria.saveConfig')}
            data-testid={TEST_IDS.CONFIG_SAVE}
            className="inline-flex items-center gap-2 px-4 py-2 text-sm font-semibold rounded-xl bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white shadow-lg shadow-blue-500/30 hover:shadow-blue-500/50 hover:-translate-y-0.5 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {backingUp ? (
              <>
                <svg className="w-4 h-4 animate-spin" viewBox="0 0 24 24" fill="none">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
                {t('common.loading')}
              </>
            ) : (
              <>
                <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M19 21H5a2 2 0 01-2-2V5a2 2 0 012-2h11l5 5v11a2 2 0 01-2 2z" /><polyline points="17 21 17 13 7 13 7 21" /><polyline points="7 3 7 8 15 8" /></svg>
                {t('common.save')}
              </>
            )}
          </button>
        </div>
      }
    >
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Sidebar nav */}
        <aside className="lg:col-span-3">
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-2 sticky top-24 opacity-0 animate-[fadeInUp_.6s_ease-out_forwards]">
            {sections.map(s => (
              <button
                key={s.key}
                onClick={() => setActive(s.key)}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all text-left ${
                  active === s.key
                    ? 'bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 shadow-sm'
                    : 'text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800/50 hover:translate-x-1'
                }`}
              >
                <span className="flex-shrink-0">{s.icon}</span>
                <span className="flex-1">{s.label}</span>
                {active === s.key && (
                  <span className="w-1.5 h-1.5 rounded-full bg-blue-600 animate-pulse" />
                )}
              </button>
            ))}
          </div>
        </aside>

        {/* Content */}
        <main className="lg:col-span-9 space-y-6">
          {active === 'general' && (
            <SectionCard title={t('systemConfig.sections.general')} icon={<svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="3" /><path d="M12 1v6m0 10v6m11-11h-6m-10 0H1" /></svg>}>
              <InputRow label={t('systemConfig.general.platformName')} value={platformName} onChange={setPlatformName} />
              <InputRow label={t('systemConfig.general.tagline')} value={tagline} onChange={setTagline} />
              <InputRow label={t('systemConfig.general.supportEmail')} value={supportEmail} type="email" onChange={setSupportEmail} />
              <SelectRow
                label={t('systemConfig.general.defaultLang')}
                value={defaultLang}
                ariaLabel={t('aria.selectLanguage')}
                options={[
                  { value: 'vi', label: `🇻🇳 ${t('shared.language.vi')}` },
                  { value: 'en', label: `🇺🇸 ${t('shared.language.en')}` },
                ]}
                onChange={setDefaultLang}
              />
              <SelectRow
                label={t('systemConfig.general.timezone')}
                value={timezone}
                ariaLabel={t('aria.selectTimezone')}
                options={[
                  { value: 'Asia/Ho_Chi_Minh', label: t('shared.timezone.hn') },
                  { value: 'Asia/Bangkok', label: t('shared.timezone.bkk') },
                  { value: 'Asia/Singapore', label: t('shared.timezone.sg') },
                  { value: 'UTC', label: t('shared.timezone.utc') },
                ]}
                onChange={setTimezone}
              />
              <ToggleRow
                label={t('systemConfig.general.maintenance')}
                description="Tạm dừng truy cập cho người dùng ngoại trừ super admin"
                value={maintenance}
                onChange={setMaintenance}
              />
            </SectionCard>
          )}

          {active === 'security' && (
            <SectionCard title={t('systemConfig.sections.security')} icon={<svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" /></svg>}>
              <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-500 mb-2 px-4">{t('systemConfig.security.passwordPolicy')}</h3>
              <div className="px-4">
                <NumberRow label={t('systemConfig.security.minLength')} value={minLength} min={6} max={32} onChange={setMinLength} />
              </div>
              <ToggleRow label={t('systemConfig.security.requireUppercase')} value={requireUpper} onChange={setRequireUpper} />
              <ToggleRow label={t('systemConfig.security.requireNumber')} value={requireNumber} onChange={setRequireNumber} />
              <ToggleRow label={t('systemConfig.security.requireSpecial')} value={requireSpecial} onChange={setRequireSpecial} />
              <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-500 mb-2 px-4 pt-4">{t('systemConfig.sections.system') || 'Phiên & MFA'}</h3>
              <div className="px-4">
                <NumberRow label={t('systemConfig.security.sessionTimeout')} value={sessionTimeout} min={5} max={1440} onChange={setSessionTimeout} />
                <NumberRow label={t('systemConfig.security.loginThrottle')} value={loginThrottle} min={1} max={20} onChange={setLoginThrottle} />
              </div>
              <ToggleRow label={t('systemConfig.security.mfaRequired')} value={mfaRequired} onChange={setMfaRequired} />
            </SectionCard>
          )}

          {active === 'exam' && (
            <SectionCard title={t('systemConfig.sections.exam')} icon={<svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2" /><path d="M9 14l2 2 4-4" /></svg>}>
              <div className="px-4">
                <NumberRow label={t('systemConfig.exam.defaultDuration')} value={defaultDuration} min={5} max={300} onChange={setDefaultDuration} />
                <NumberRow label={t('systemConfig.exam.maxQuestions')} value={maxQuestions} min={1} max={500} onChange={setMaxQuestions} />
                <NumberRow label={t('systemConfig.exam.gradingScale')} value={gradingScale} min={0} max={100} onChange={setGradingScale} />
              </div>
              <ToggleRow label={t('systemConfig.exam.enableProctoring')} description="Bật webcam giám sát trong quá trình thi" value={proctoring} onChange={setProctoring} />
              <ToggleRow label={t('systemConfig.exam.shuffleQuestions')} value={shuffle} onChange={setShuffle} />
              <ToggleRow label={t('systemConfig.exam.antiCheat')} description="Ngăn copy/paste và chuyển tab" value={antiCheat} onChange={setAntiCheat} />
            </SectionCard>
          )}

          {active === 'notification' && (
            <SectionCard title={t('systemConfig.sections.notification')} icon={<svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M15 17h5l-1.4-1.4A2 2 0 0118 14.2V11a6 6 0 00-4-5.7V5a2 2 0 10-4 0v.3C7.7 6.2 6 8.4 6 11v3.2c0 .5-.2 1-.6 1.4L4 17h5" /></svg>}>
              <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-500 mb-2 px-4">Kênh gửi</h3>
              <ToggleRow label={t('systemConfig.notification.emailChannel')} value={emailCh} onChange={setEmailCh} />
              <ToggleRow label={t('systemConfig.notification.pushChannel')} value={pushCh} onChange={setPushCh} />
              <ToggleRow label={t('systemConfig.notification.smsChannel')} value={smsCh} onChange={setSmsCh} />
              <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-500 mb-2 px-4 pt-4">Sự kiện</h3>
              <ToggleRow label={t('systemConfig.notification.newUserAlert')} value={newUserAlert} onChange={setNewUserAlert} />
              <ToggleRow label={t('systemConfig.notification.courseSubmittedAlert')} value={courseSubmittedAlert} onChange={setCourseSubmittedAlert} />
              <ToggleRow label={t('systemConfig.notification.examGradedAlert')} value={examGradedAlert} onChange={setExamGradedAlert} />
            </SectionCard>
          )}

          {active === 'blockchain' && (
            <SectionCard title={t('systemConfig.sections.blockchain')} icon={<svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" /></svg>}>
              <SelectRow
                label={t('systemConfig.blockchain.network')}
                value={network}
                options={[
                  { value: 'polygon-amoy', label: 'Polygon Amoy (Testnet)' },
                  { value: 'polygon-mainnet', label: 'Polygon Mainnet' },
                  { value: 'ethereum-sepolia', label: 'Ethereum Sepolia' },
                  { value: 'bsc-testnet', label: 'BSC Testnet' },
                ]}
                onChange={setNetwork}
              />
              <InputRow label={t('systemConfig.blockchain.contracts')} value={contract} onChange={setContract} />
              <InputRow label={t('systemConfig.blockchain.tokenSymbol')} value={tokenSymbol} onChange={setTokenSymbol} />
              <div className="px-4">
                <NumberRow label={t('systemConfig.blockchain.mintPerExam')} value={mintPerExam} min={0} max={1000} onChange={setMintPerExam} />
              </div>
            </SectionCard>
          )}

          {active === 'backup' && (
            <SectionCard title={t('systemConfig.sections.backup')} icon={<svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><ellipse cx="12" cy="5" rx="9" ry="3" /><path d="M21 12c0 1.66-4 3-9 3s-9-1.34-9-3" /></svg>}>
              <ToggleRow label={t('systemConfig.backup.autoBackup')} description="Sao lưu hàng ngày lúc 02:00 UTC" value={autoBackup} onChange={setAutoBackup} />
              <div className="px-4">
                <NumberRow label={t('systemConfig.backup.retentionDays')} value={retentionDays} min={1} max={365} onChange={setRetentionDays} />
              </div>
              <SelectRow
                label={t('systemConfig.backup.targetStorage')}
                value={targetStorage}
                ariaLabel={t('aria.selectStorage')}
                options={[
                  { value: 's3-ioes-prod', label: t('shared.storage.s3') },
                  { value: 'gcs-ioes-backup', label: t('shared.storage.gcs') },
                  { value: 'azure-ioes-backup', label: t('shared.storage.azure') },
                  { value: 'local-nas', label: t('shared.storage.nas') },
                ]}
                onChange={setTargetStorage}
              />
              <div className="px-4 pt-2">
                <button
                  onClick={() => {
                    setBackingUp(true);
                    setTimeout(() => {
                      setBackingUp(false);
                      setSavedAt(new Date().toLocaleTimeString('vi-VN'));
                    }, 1200);
                  }}
                  disabled={backingUp}
                  aria-label={t('aria.runBackup')}
                  data-testid={TEST_IDS.CONFIG_RUN_BACKUP}
                  className="inline-flex items-center gap-2 px-4 py-2 text-sm font-semibold rounded-xl border border-blue-300 dark:border-blue-700 bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 hover:bg-blue-100 dark:hover:bg-blue-900/50 hover:-translate-y-0.5 transition-all disabled:opacity-50"
                >
                  <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 12a9 9 0 11-9-9c2.52 0 4.93 1 6.74 2.74L21 8" /><path d="M21 3v5h-5" /></svg>
                  {t('systemConfig.backup.runBackupNow')}
                </button>
              </div>
            </SectionCard>
          )}
        </main>
      </div>
    </AdminLayout>
  );
};

export default SystemConfigPage;