import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useAuthStore } from '@/app/store/authStore';
import InstructorLayout from '@/components/layout/InstructorLayout';

type Tab = 'overview' | 'edit' | 'security' | 'notifications';

const TABS: Tab[] = ['overview', 'edit', 'security', 'notifications'];

const ProfilePage: React.FC = () => {
  const { t } = useTranslation();
  const { user } = useAuthStore();
  const [tab, setTab] = useState<Tab>('overview');

  const [form, setForm] = useState({
    full_name: user?.full_name ?? '',
    email: user?.email ?? '',
    phone: '',
    bio: '',
    title: 'Giảng viên lập trình',
    location: 'TP. Hồ Chí Minh',
    website: '',
  });

  const initials = (form.full_name || 'GV').split(' ').filter(Boolean).map((s: string) => s.charAt(0)).slice(0, 2).join('').toUpperCase();

  return (
    <InstructorLayout title={t('instructor.profile.title')} subtitle={t('instructor.profile.subtitle')}>
      {/* Header card */}
      <section className="relative bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 overflow-hidden mb-6">
        <div className="h-32 bg-gradient-to-r from-blue-600 via-cyan-500 to-purple-500" />
        <div className="px-6 pb-6 -mt-12">
          <div className="flex items-end gap-4 flex-wrap">
            <div className="w-24 h-24 rounded-2xl bg-white dark:bg-slate-900 p-1 shadow-lg">
              <div className="w-full h-full rounded-xl bg-gradient-to-br from-blue-500 to-cyan-500 text-white flex items-center justify-center text-2xl font-bold">
                {initials}
              </div>
            </div>
            <div className="flex-1 min-w-0">
              <h2 className="text-xl font-bold">{form.full_name || t('instructor.profile.unknownUser')}</h2>
              <p className="text-sm text-slate-500 dark:text-slate-400">{form.title} • {form.location}</p>
              <div className="flex items-center gap-3 mt-2 text-xs text-slate-500">
                <span className="inline-flex items-center gap-1">
                  <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" /><polyline points="22,6 12,13 2,6" /></svg>
                  {form.email}
                </span>
                <span>•</span>
                <span className="inline-flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                  {t('instructor.profile.active')}
                </span>
              </div>
            </div>
            <button
              onClick={() => setTab('edit')}
              className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold shadow-sm transition-colors"
            >
              {t('instructor.profile.editProfile')}
            </button>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-6">
            <Stat label={t('instructor.profile.stats.courses')} value="8" />
            <Stat label={t('instructor.profile.stats.students')} value="1,247" />
            <Stat label={t('instructor.profile.stats.exams')} value="24" />
            <Stat label={t('instructor.profile.stats.rating')} value="4.8★" />
          </div>
        </div>
      </section>

      {/* Tabs */}
      <div className="flex flex-wrap gap-1 p-1 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 mb-6 w-fit">
        {TABS.map((tb) => (
          <button
            key={tb}
            onClick={() => setTab(tb)}
            className={`px-4 py-2 text-sm font-semibold rounded-xl transition-all ${
              tab === tb ? 'bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400' : 'text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800'
            }`}
          >
            {t(`instructor.profile.tab.${tb}`)}
          </button>
        ))}
      </div>

      {tab === 'overview' && <OverviewTab />}
      {tab === 'edit' && <EditTab form={form} setForm={setForm} />}
      {tab === 'security' && <SecurityTab />}
      {tab === 'notifications' && <NotificationsTab />}
    </InstructorLayout>
  );
};

const Stat: React.FC<{ label: string; value: string }> = ({ label, value }) => (
  <div className="px-4 py-3 rounded-xl bg-slate-50 dark:bg-slate-800/50">
    <div className="text-xs text-slate-500 dark:text-slate-400 mb-0.5">{label}</div>
    <div className="text-lg font-bold tabular-nums">{value}</div>
  </div>
);

const OverviewTab: React.FC = () => {
  const { t } = useTranslation();
  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <article className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-6">
        <h3 className="text-sm font-semibold mb-3">{t('instructor.profile.about.title')}</h3>
        <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed">{t('instructor.profile.about.placeholder')}</p>
      </article>
      <article className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-6">
        <h3 className="text-sm font-semibold mb-3">{t('instructor.profile.recent.title')}</h3>
        <ul className="space-y-3 text-sm">
          {[1, 2, 3].map((i) => (
            <li key={i} className="flex items-center justify-between gap-3 py-2 border-b border-slate-100 dark:border-slate-800 last:border-0">
              <span className="text-slate-600 dark:text-slate-400">{t('instructor.profile.recent.item', { i })}</span>
              <span className="text-xs text-slate-400">{i * 2}h</span>
            </li>
          ))}
        </ul>
      </article>
    </div>
  );
};

const EditTab: React.FC<{
  form: { full_name: string; email: string; phone: string; bio: string; title: string; location: string; website: string };
  setForm: React.Dispatch<React.SetStateAction<{
    full_name: string; email: string; phone: string; bio: string; title: string; location: string; website: string;
  }>>;
}> = ({ form, setForm }) => {
  const { t } = useTranslation();
  const onChange = (k: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
    setForm((prev) => ({ ...prev, [k]: e.target.value }));
  return (
    <article className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-6 max-w-3xl">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Field label={t('instructor.profile.field.fullName')} value={form.full_name} onChange={onChange('full_name')} />
        <Field label={t('instructor.profile.field.email')} type="email" value={form.email} onChange={onChange('email')} />
        <Field label={t('instructor.profile.field.phone')} value={form.phone} onChange={onChange('phone')} />
        <Field label={t('instructor.profile.field.title')} value={form.title} onChange={onChange('title')} />
        <Field label={t('instructor.profile.field.location')} value={form.location} onChange={onChange('location')} />
        <Field label={t('instructor.profile.field.website')} value={form.website} onChange={onChange('website')} />
      </div>
      <div className="mt-4">
        <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">{t('instructor.profile.field.bio')}</label>
        <textarea
          rows={4}
          value={form.bio}
          onChange={onChange('bio')}
          className="w-full px-3 py-2.5 text-sm rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 focus:outline-none focus:border-blue-500 resize-none"
        />
      </div>
      <div className="mt-6 flex gap-3">
        <button className="px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold shadow-sm transition-colors">
          {t('instructor.profile.save')}
        </button>
        <button className="px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 hover:border-slate-300 text-sm font-semibold">
          {t('instructor.profile.cancel')}
        </button>
      </div>
    </article>
  );
};

const Field: React.FC<{
  label: string;
  value: string;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  type?: string;
}> = ({ label, value, onChange, type = 'text' }) => (
  <div>
    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">{label}</label>
    <input
      type={type}
      value={value}
      onChange={onChange}
      className="w-full px-3 py-2.5 text-sm rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 focus:outline-none focus:border-blue-500"
    />
  </div>
);

const SecurityTab: React.FC = () => {
  const { t } = useTranslation();
  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <article className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-6">
        <h3 className="text-sm font-semibold mb-1">{t('instructor.profile.security.password.title')}</h3>
        <p className="text-xs text-slate-500 mb-4">{t('instructor.profile.security.password.desc')}</p>
        <button className="px-4 py-2 rounded-lg border border-slate-200 dark:border-slate-700 hover:border-blue-500 hover:text-blue-600 text-sm font-semibold">
          {t('instructor.profile.security.password.change')}
        </button>
      </article>
      <article className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-6">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-sm font-semibold mb-1">{t('instructor.profile.security.2fa.title')}</h3>
            <p className="text-xs text-slate-500">{t('instructor.profile.security.2fa.desc')}</p>
          </div>
          <ToggleSwitch defaultChecked />
        </div>
      </article>
    </div>
  );
};

const NotificationsTab: React.FC = () => {
  const { t } = useTranslation();
  const opts: Array<{ key: string; title: string; desc: string }> = [
    { key: 'enrollment', title: t('instructor.profile.notif.enrollment.title'), desc: t('instructor.profile.notif.enrollment.desc') },
    { key: 'submission', title: t('instructor.profile.notif.submission.title'), desc: t('instructor.profile.notif.submission.desc') },
    { key: 'review', title: t('instructor.profile.notif.review.title'), desc: t('instructor.profile.notif.review.desc') },
    { key: 'system', title: t('instructor.profile.notif.system.title'), desc: t('instructor.profile.notif.system.desc') },
  ];
  return (
    <article className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-6 max-w-3xl">
      <div className="divide-y divide-slate-100 dark:divide-slate-800">
        {opts.map((o) => (
          <div key={o.key} className="flex items-center justify-between gap-4 py-4 first:pt-0 last:pb-0">
            <div className="flex-1 min-w-0">
              <h4 className="text-sm font-semibold mb-0.5">{o.title}</h4>
              <p className="text-xs text-slate-500">{o.desc}</p>
            </div>
            <ToggleSwitch defaultChecked={o.key === 'enrollment'} />
          </div>
        ))}
      </div>
    </article>
  );
};

const ToggleSwitch: React.FC<{ defaultChecked?: boolean }> = ({ defaultChecked = false }) => {
  const [checked, setChecked] = useState(defaultChecked);
  return (
    <button
      type="button"
      onClick={() => setChecked(!checked)}
      className={`relative w-11 h-6 rounded-full transition-colors ${checked ? 'bg-blue-600' : 'bg-slate-200 dark:bg-slate-700'}`}
      aria-pressed={checked}
    >
      <span
        className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform ${checked ? 'translate-x-5' : ''}`}
      />
    </button>
  );
};

export default ProfilePage;
