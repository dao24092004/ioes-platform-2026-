import React, { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import InstructorLayout from '@/components/layout/InstructorLayout';

type IpType = 'course' | 'video' | 'exam' | 'content';
type IpStatus = 'verified' | 'pending' | 'rejected';

type IpEntry = {
  id: string;
  title: string;
  type: IpType;
  hash: string;
  registered: string;
  status: IpStatus;
};

type Licensee = {
  id: string;
  name: string;
  type: IpType;
  duration: string;
  royalty: string;
  status: 'active' | 'expired' | 'pending';
};

type Dispute = {
  id: string;
  title: string;
  claimant: string;
  filed: string;
  status: 'open' | 'reviewing' | 'resolved';
};

type TabKey = 'myIps' | 'register' | 'licensing' | 'disputes';

const IP_TYPE_STYLES: Record<IpType, string> = {
  course: 'bg-blue-50 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400',
  video: 'bg-purple-50 text-purple-600 dark:bg-purple-900/30 dark:text-purple-400',
  exam: 'bg-amber-50 text-amber-600 dark:bg-amber-900/30 dark:text-amber-400',
  content: 'bg-emerald-50 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-400',
};

const STATUS_STYLES: Record<IpStatus, string> = {
  verified: 'bg-emerald-50 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-400',
  pending: 'bg-amber-50 text-amber-600 dark:bg-amber-900/30 dark:text-amber-400',
  rejected: 'bg-red-50 text-red-600 dark:bg-red-900/30 dark:text-red-400',
};

const MOCK_IPS: IpEntry[] = [
  { id: 'ip-001', title: 'instructor.copyright.ips.ip001', type: 'course', hash: '0xa3f5e8c9b2d1f4e6a7b8c9d0e1f2a3b4c5d6e7f8a9b0c1d2e3f4a5b6c7d8e9f0', registered: '2024-03-12', status: 'verified' },
  { id: 'ip-002', title: 'instructor.copyright.ips.ip002', type: 'video', hash: '0xb4e6f7a8c9d0e1f2a3b4c5d6e7f8a9b0c1d2e3f4a5b6c7d8e9f0a1b2c3d4e5f6', registered: '2024-04-08', status: 'verified' },
  { id: 'ip-003', title: 'instructor.copyright.ips.ip003', type: 'exam', hash: '0xc5d6e7f8a9b0c1d2e3f4a5b6c7d8e9f0a1b2c3d4e5f6a7b8c9d0e1f2a3b4c5d6', registered: '2024-05-21', status: 'pending' },
  { id: 'ip-004', title: 'instructor.copyright.ips.ip004', type: 'content', hash: '0xd6e7f8a9b0c1d2e3f4a5b6c7d8e9f0a1b2c3d4e5f6a7b8c9d0e1f2a3b4c5d6e7', registered: '2024-06-03', status: 'verified' },
  { id: 'ip-005', title: 'instructor.copyright.ips.ip005', type: 'course', hash: '0xe7f8a9b0c1d2e3f4a5b6c7d8e9f0a1b2c3d4e5f6a7b8c9d0e1f2a3b4c5d6e7f8', registered: '2024-06-19', status: 'verified' },
  { id: 'ip-006', title: 'instructor.copyright.ips.ip006', type: 'video', hash: '0xf8a9b0c1d2e3f4a5b6c7d8e9f0a1b2c3d4e5f6a7b8c9d0e1f2a3b4c5d6e7f8a9', registered: '2024-07-04', status: 'pending' },
  { id: 'ip-007', title: 'instructor.copyright.ips.ip007', type: 'exam', hash: '0xa9b0c1d2e3f4a5b6c7d8e9f0a1b2c3d4e5f6a7b8c9d0e1f2a3b4c5d6e7f8a9b0', registered: '2024-07-22', status: 'verified' },
  { id: 'ip-008', title: 'instructor.copyright.ips.ip008', type: 'content', hash: '0xb0c1d2e3f4a5b6c7d8e9f0a1b2c3d4e5f6a7b8c9d0e1f2a3b4c5d6e7f8a9b0c1', registered: '2024-08-01', status: 'verified' },
];

const MOCK_LICENSEES: Licensee[] = [
  { id: 'lic-001', name: 'instructor.copyright.licensees.lic001', type: 'course', duration: '12 months', royalty: '$2,400', status: 'active' },
  { id: 'lic-002', name: 'instructor.copyright.licensees.lic002', type: 'video', duration: '24 months', royalty: '$1,850', status: 'active' },
  { id: 'lic-003', name: 'instructor.copyright.licensees.lic003', type: 'content', duration: '6 months', royalty: '$720', status: 'expired' },
];

const MOCK_DISPUTES: Dispute[] = [
  {
    id: 'dsp-001',
    title: 'instructor.copyright.disputesData.dsp001.title',
    claimant: 'instructor.copyright.disputesData.dsp001.claimant',
    filed: '2024-07-28',
    status: 'reviewing',
  },
];

const CopyrightPage: React.FC = () => {
  const { t } = useTranslation();
  const [tab, setTab] = useState<TabKey>('myIps');

  const [formType, setFormType] = useState<IpType>('course');
  const [formTitle, setFormTitle] = useState('');
  const [formDesc, setFormDesc] = useState('');
  const [formFile, setFormFile] = useState<string | null>(null);
  const [formHash, setFormHash] = useState<string | null>(null);
  const [formNetwork, setFormNetwork] = useState<'polygon' | 'ethereum' | 'binance'>('polygon');
  const [submitting, setSubmitting] = useState(false);

  const stats = useMemo(() => {
    const total = MOCK_IPS.length;
    const pending = MOCK_IPS.filter(i => i.status === 'pending').length;
    const verified = MOCK_IPS.filter(i => i.status === 'verified').length;
    return { total, pending, verified };
  }, []);

  const statCards = [
    {
      value: stats.total.toString(),
      label: t('instructor.copyright.stats.total'),
      tone: 'bg-blue-50 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400',
      icon: <svg className="w-6 h-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" /></svg>,
    },
    {
      value: stats.pending.toString(),
      label: t('instructor.copyright.stats.pending'),
      tone: 'bg-amber-50 text-amber-600 dark:bg-amber-900/30 dark:text-amber-400',
      icon: <svg className="w-6 h-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" /></svg>,
    },
    {
      value: stats.verified.toString(),
      label: t('instructor.copyright.stats.verified'),
      tone: 'bg-emerald-50 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-400',
      icon: <svg className="w-6 h-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="20 6 9 17 4 12" /></svg>,
    },
    {
      value: '$4,970',
      label: t('instructor.copyright.stats.revenue'),
      tone: 'bg-purple-50 text-purple-600 dark:bg-purple-900/30 dark:text-purple-400',
      icon: <svg className="w-6 h-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="12" y1="1" x2="12" y2="23" /><path d="M17 5H9.5a3.5 3.5 0 000 7h5a3.5 3.5 0 010 7H6" /></svg>,
    },
  ];

  const tabs: { key: TabKey; label: string }[] = [
    { key: 'myIps', label: t('instructor.copyright.tabs.myIps') },
    { key: 'register', label: t('instructor.copyright.tabs.register') },
    { key: 'licensing', label: t('instructor.copyright.tabs.licensing') },
    { key: 'disputes', label: t('instructor.copyright.tabs.disputes') },
  ];

  const generateHash = () => {
    const chars = '0123456789abcdef';
    let h = '0x';
    for (let i = 0; i < 64; i++) h += chars[Math.floor(Math.random() * chars.length)];
    setFormHash(h);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setTimeout(() => {
      setSubmitting(false);
      setFormTitle('');
      setFormDesc('');
      setFormFile(null);
      setFormHash(null);
      setTab('myIps');
    }, 1200);
  };

  const onFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (f) setFormFile(f.name);
  };

  return (
    <InstructorLayout
      title={t('instructor.copyright.title')}
      subtitle={t('instructor.copyright.subtitle')}
      headerActions={
        <>
          <button className="hidden sm:inline-flex items-center gap-2 px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 hover:border-blue-500 text-sm font-semibold transition-colors">
            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" /><polyline points="14 2 14 8 20 8" /></svg>
            {t('instructor.copyright.exportCert')}
          </button>
          <button
            onClick={() => setTab('register')}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold transition-colors shadow-sm"
          >
            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" /></svg>
            {t('instructor.copyright.registerNew')}
          </button>
        </>
      }
    >
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4 mb-6">
        {statCards.map((c, i) => (
          <div key={i} className="bg-white dark:bg-slate-800/40 rounded-2xl border border-slate-200 dark:border-slate-800 p-5">
            <div className="flex items-start justify-between mb-3">
              <div className={`w-11 h-11 rounded-xl flex items-center justify-center ${c.tone}`}>
                {c.icon}
              </div>
            </div>
            <h3 className="text-2xl font-bold text-slate-900 dark:text-white">{c.value}</h3>
            <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">{c.label}</p>
          </div>
        ))}
      </div>

      <div className="bg-white dark:bg-slate-800/40 rounded-2xl border border-slate-200 dark:border-slate-800 overflow-hidden">
        <div className="border-b border-slate-100 dark:border-slate-800 px-5">
          <nav className="flex gap-1 overflow-x-auto" aria-label="Tabs">
            {tabs.map(item => (
              <button
                key={item.key}
                onClick={() => setTab(item.key)}
                className={`px-4 py-3.5 text-sm font-semibold border-b-2 transition-colors whitespace-nowrap ${
                  tab === item.key
                    ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                    : 'border-transparent text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-300'
                }`}
              >
                {item.label}
              </button>
            ))}
          </nav>
        </div>

        <div className="p-5">
          {tab === 'myIps' && (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-slate-50 dark:bg-slate-800/50 text-xs uppercase tracking-wider text-slate-500 dark:text-slate-400">
                  <tr>
                    <th className="px-5 py-3 text-left font-semibold">{t('instructor.copyright.table.title')}</th>
                    <th className="px-5 py-3 text-left font-semibold">{t('instructor.copyright.table.type')}</th>
                    <th className="px-5 py-3 text-left font-semibold">{t('instructor.copyright.table.hash')}</th>
                    <th className="px-5 py-3 text-left font-semibold">{t('instructor.copyright.table.registered')}</th>
                    <th className="px-5 py-3 text-left font-semibold">{t('instructor.copyright.table.status')}</th>
                    <th className="px-5 py-3 text-right font-semibold">{t('instructor.copyright.table.actions')}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {MOCK_IPS.map(ip => (
                    <tr key={ip.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors">
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white">
                            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" /></svg>
                          </div>
                          <div className="min-w-0">
                            <div className="text-sm font-semibold text-slate-900 dark:text-white truncate max-w-[280px]">{t(ip.title)}</div>
                            <div className="text-[11px] text-slate-500 dark:text-slate-400">{ip.id}</div>
                          </div>
                        </div>
                      </td>
                      <td className="px-5 py-4">
                        <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-[11px] font-bold uppercase ${IP_TYPE_STYLES[ip.type]}`}>
                          {t(`instructor.copyright.type.${ip.type}`)}
                        </span>
                      </td>
                      <td className="px-5 py-4">
                        <code className="font-mono text-[11px] text-slate-600 dark:text-slate-400 bg-slate-100 dark:bg-slate-900/40 px-2 py-1 rounded">
                          {ip.hash.slice(0, 10)}…{ip.hash.slice(-6)}
                        </code>
                      </td>
                      <td className="px-5 py-4 whitespace-nowrap text-slate-700 dark:text-slate-300">{ip.registered}</td>
                      <td className="px-5 py-4">
                        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-bold uppercase ${STATUS_STYLES[ip.status]}`}>
                          <span className="w-1.5 h-1.5 rounded-full bg-current" />
                          {t(`instructor.copyright.status.${ip.status}`)}
                        </span>
                      </td>
                      <td className="px-5 py-4 text-right">
                        <button className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 hover:border-blue-500 hover:text-blue-600 text-xs font-semibold transition-colors">
                          <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" /><circle cx="12" cy="12" r="3" /></svg>
                          {t('instructor.copyright.action.view')}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {tab === 'register' && (
            <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-5 max-w-4xl">
              <div>
                <label className="block text-xs font-bold uppercase text-slate-500 dark:text-slate-400 mb-2">
                  {t('instructor.copyright.form.type')}
                </label>
                <select
                  value={formType}
                  onChange={(e) => setFormType(e.target.value as IpType)}
                  className="w-full px-3 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm font-medium focus:outline-none focus:border-blue-500"
                >
                  <option value="course">{t('instructor.copyright.type.course')}</option>
                  <option value="video">{t('instructor.copyright.type.video')}</option>
                  <option value="exam">{t('instructor.copyright.type.exam')}</option>
                  <option value="content">{t('instructor.copyright.type.content')}</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-bold uppercase text-slate-500 dark:text-slate-400 mb-2">
                  {t('instructor.copyright.form.title')}
                </label>
                <input
                  type="text"
                  required
                  value={formTitle}
                  onChange={(e) => setFormTitle(e.target.value)}
                  className="w-full px-3 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm focus:outline-none focus:border-blue-500"
                  placeholder={t('instructor.copyright.form.titlePlaceholder')}
                />
              </div>
              <div className="md:col-span-2">
                <label className="block text-xs font-bold uppercase text-slate-500 dark:text-slate-400 mb-2">
                  {t('instructor.copyright.form.description')}
                </label>
                <textarea
                  rows={4}
                  value={formDesc}
                  onChange={(e) => setFormDesc(e.target.value)}
                  className="w-full px-3 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm focus:outline-none focus:border-blue-500"
                  placeholder={t('instructor.copyright.form.descPlaceholder')}
                />
              </div>
              <div className="md:col-span-2">
                <label className="block text-xs font-bold uppercase text-slate-500 dark:text-slate-400 mb-2">
                  {t('instructor.copyright.form.file')}
                </label>
                <label className="block">
                  <input type="file" onChange={onFileChange} className="hidden" />
                  <div className="w-full px-4 py-3 rounded-xl border-2 border-dashed border-slate-300 dark:border-slate-700 hover:border-blue-400 cursor-pointer text-center text-sm text-slate-500 dark:text-slate-400">
                    {formFile ? (
                      <span className="font-semibold text-blue-600 dark:text-blue-400">{formFile}</span>
                    ) : (
                      <>
                        <svg className="w-6 h-6 mx-auto mb-1" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4" /><polyline points="17 8 12 3 7 8" /><line x1="12" y1="3" x2="12" y2="15" /></svg>
                        {t('instructor.copyright.form.dropFile')}
                      </>
                    )}
                  </div>
                </label>
              </div>
              <div className="md:col-span-2">
                <label className="block text-xs font-bold uppercase text-slate-500 dark:text-slate-400 mb-2">
                  {t('instructor.copyright.form.hash')}
                </label>
                <div className="flex flex-col sm:flex-row gap-2">
                  <code className="flex-1 px-3 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/40 text-xs font-mono text-slate-700 dark:text-slate-300 break-all">
                    {formHash ?? '—'}
                  </code>
                  <button
                    type="button"
                    onClick={generateHash}
                    className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl border border-blue-500 text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 text-sm font-semibold transition-colors"
                  >
                    <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 12a9 9 0 11-3-6.7L21 8" /><polyline points="21 3 21 8 16 8" /></svg>
                    {t('instructor.copyright.form.generateHash')}
                  </button>
                </div>
              </div>
              <div>
                <label className="block text-xs font-bold uppercase text-slate-500 dark:text-slate-400 mb-2">
                  {t('instructor.copyright.form.network')}
                </label>
                <select
                  value={formNetwork}
                  onChange={(e) => setFormNetwork(e.target.value as typeof formNetwork)}
                  className="w-full px-3 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm font-medium focus:outline-none focus:border-blue-500"
                >
                  <option value="polygon">{t('instructor.copyright.network.polygon')}</option>
                  <option value="ethereum">{t('instructor.copyright.network.ethereum')}</option>
                  <option value="binance">{t('instructor.copyright.network.binance')}</option>
                </select>
              </div>
              <div className="flex items-end justify-end gap-3">
                <button
                  type="button"
                  onClick={() => {
                    setFormTitle('');
                    setFormDesc('');
                    setFormFile(null);
                    setFormHash(null);
                  }}
                  className="px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 text-sm font-semibold hover:border-slate-400 transition-colors"
                >
                  {t('instructor.copyright.form.reset')}
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold transition-colors shadow-sm disabled:opacity-50"
                >
                  {submitting ? (
                    <>
                      <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      {t('instructor.copyright.form.submitting')}
                    </>
                  ) : (
                    <>
                      <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="20 6 9 17 4 12" /></svg>
                      {t('instructor.copyright.form.submit')}
                    </>
                  )}
                </button>
              </div>
            </form>
          )}

          {tab === 'licensing' && (
            <div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-5">
                <div className="bg-gradient-to-br from-blue-500 to-indigo-600 rounded-2xl p-5 text-white">
                  <p className="text-xs uppercase font-bold opacity-80">{t('instructor.copyright.licensing.totalIncome')}</p>
                  <h3 className="text-2xl font-bold mt-1">$4,970</h3>
                  <p className="text-xs opacity-80 mt-1">{t('instructor.copyright.licensing.last30d')}</p>
                </div>
                <div className="bg-gradient-to-br from-emerald-500 to-teal-600 rounded-2xl p-5 text-white">
                  <p className="text-xs uppercase font-bold opacity-80">{t('instructor.copyright.licensing.activeLicensees')}</p>
                  <h3 className="text-2xl font-bold mt-1">2</h3>
                  <p className="text-xs opacity-80 mt-1">{t('instructor.copyright.licensing.renewingSoon')}</p>
                </div>
                <div className="bg-gradient-to-br from-purple-500 to-pink-600 rounded-2xl p-5 text-white">
                  <p className="text-xs uppercase font-bold opacity-80">{t('instructor.copyright.licensing.totalDeals')}</p>
                  <h3 className="text-2xl font-bold mt-1">3</h3>
                  <p className="text-xs opacity-80 mt-1">{t('instructor.copyright.licensing.sinceLaunch')}</p>
                </div>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-slate-50 dark:bg-slate-800/50 text-xs uppercase tracking-wider text-slate-500 dark:text-slate-400">
                    <tr>
                      <th className="px-5 py-3 text-left font-semibold">{t('instructor.copyright.licensing.licensee')}</th>
                      <th className="px-5 py-3 text-left font-semibold">{t('instructor.copyright.table.type')}</th>
                      <th className="px-5 py-3 text-left font-semibold">{t('instructor.copyright.licensing.duration')}</th>
                      <th className="px-5 py-3 text-right font-semibold">{t('instructor.copyright.licensing.royalty')}</th>
                      <th className="px-5 py-3 text-left font-semibold">{t('instructor.copyright.table.status')}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                    {MOCK_LICENSEES.map(l => (
                      <tr key={l.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors">
                        <td className="px-5 py-4 text-sm font-semibold text-slate-900 dark:text-white">{t(l.name)}</td>
                        <td className="px-5 py-4">
                          <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-[11px] font-bold uppercase ${IP_TYPE_STYLES[l.type]}`}>
                            {t(`instructor.copyright.type.${l.type}`)}
                          </span>
                        </td>
                        <td className="px-5 py-4 text-slate-700 dark:text-slate-300">{l.duration}</td>
                        <td className="px-5 py-4 text-right font-bold text-emerald-600 dark:text-emerald-400">{l.royalty}</td>
                        <td className="px-5 py-4">
                          <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-bold uppercase ${
                            l.status === 'active'
                              ? 'bg-emerald-50 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-400'
                              : l.status === 'expired'
                              ? 'bg-slate-100 text-slate-500 dark:bg-slate-800/40 dark:text-slate-400'
                              : 'bg-amber-50 text-amber-600 dark:bg-amber-900/30 dark:text-amber-400'
                          }`}>
                            <span className="w-1.5 h-1.5 rounded-full bg-current" />
                            {t(`instructor.copyright.licensing.${l.status}`)}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {tab === 'disputes' && (
            <div>
              {MOCK_DISPUTES.length === 0 ? (
                <div className="py-12 text-center text-slate-500 dark:text-slate-400">
                  {t('instructor.copyright.disputes.empty')}
                </div>
              ) : (
                <div className="space-y-3">
                  {MOCK_DISPUTES.map(d => (
                    <div key={d.id} className="border border-amber-200 dark:border-amber-900/40 bg-amber-50/40 dark:bg-amber-900/10 rounded-xl p-4">
                      <div className="flex items-start gap-3">
                        <div className="w-10 h-10 rounded-lg bg-amber-100 dark:bg-amber-900/40 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0">
                          <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" /><line x1="12" y1="9" x2="12" y2="13" /><line x1="12" y1="17" x2="12.01" y2="17" /></svg>
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between gap-2 flex-wrap">
                            <h4 className="text-sm font-bold text-slate-900 dark:text-white">{t(d.title)}</h4>
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-bold uppercase bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300">
                              <span className="w-1.5 h-1.5 rounded-full bg-current" />
                              {t(`instructor.copyright.disputes.status.${d.status}`)}
                            </span>
                          </div>
                          <p className="text-xs text-slate-600 dark:text-slate-400 mt-1">
                            {t('instructor.copyright.disputes.claimant')}: <span className="font-semibold">{t(d.claimant)}</span>
                          </p>
                          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                            {t('instructor.copyright.disputes.filed')}: {d.filed}
                          </p>
                          <div className="flex gap-2 mt-3">
                            <button className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 hover:border-blue-500 hover:text-blue-600 text-xs font-semibold transition-colors">
                              <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" /><circle cx="12" cy="12" r="3" /></svg>
                              {t('instructor.copyright.disputes.view')}
                            </button>
                            <button className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 hover:border-emerald-500 hover:text-emerald-600 text-xs font-semibold transition-colors">
                              {t('instructor.copyright.disputes.respond')}
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </InstructorLayout>
  );
};

export default CopyrightPage;