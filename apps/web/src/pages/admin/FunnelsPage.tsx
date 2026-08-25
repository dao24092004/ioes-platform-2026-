import React, { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import AdminLayout from '@/components/layout/AdminLayout';

type FunnelKey = 'signup' | 'enrollment' | 'exam' | 'checkout';

type FunnelStep = {
  name: string;
  count: number;
};

const FUNNELS: Record<FunnelKey, FunnelStep[]> = {
  signup: [
    { name: 'admin.funnels.steps.signup.visit', count: 18420 },
    { name: 'admin.funnels.steps.signup.form', count: 11830 },
    { name: 'admin.funnels.steps.signup.verify', count: 9214 },
    { name: 'admin.funnels.steps.signup.profile', count: 7108 },
    { name: 'admin.funnels.steps.signup.done', count: 6482 },
  ],
  enrollment: [
    { name: 'admin.funnels.steps.enrollment.browse', count: 12480 },
    { name: 'admin.funnels.steps.enrollment.view', count: 9210 },
    { name: 'admin.funnels.steps.enrollment.cart', count: 5430 },
    { name: 'admin.funnels.steps.enrollment.pay', count: 3120 },
    { name: 'admin.funnels.steps.enrollment.done', count: 2740 },
  ],
  exam: [
    { name: 'admin.funnels.steps.exam.start', count: 8420 },
    { name: 'admin.funnels.steps.exam.q1', count: 8190 },
    { name: 'admin.funnels.steps.exam.mid', count: 6210 },
    { name: 'admin.funnels.steps.exam.submit', count: 4910 },
    { name: 'admin.funnels.steps.exam.grade', count: 4610 },
    { name: 'admin.funnels.steps.exam.cert', count: 4020 },
  ],
  checkout: [
    { name: 'admin.funnels.steps.checkout.cart', count: 6420 },
    { name: 'admin.funnels.steps.checkout.info', count: 5180 },
    { name: 'admin.funnels.steps.checkout.ship', count: 4210 },
    { name: 'admin.funnels.steps.checkout.pay', count: 3620 },
    { name: 'admin.funnels.steps.checkout.done', count: 3210 },
  ],
};

const FUNNEL_LABELS: Record<FunnelKey, string> = {
  signup: 'admin.funnels.selector.signup',
  enrollment: 'admin.funnels.selector.enrollment',
  exam: 'admin.funnels.selector.exam',
  checkout: 'admin.funnels.selector.checkout',
};

type CohortRow = { week: string; w0: number; w1: number; w2: number; w3: number; w4: number };

const MOCK_COHORTS: CohortRow[] = [
  { week: 'W-08', w0: 100, w1: 82, w2: 71, w3: 64, w4: 58 },
  { week: 'W-07', w0: 100, w1: 78, w2: 68, w3: 60, w4: 54 },
  { week: 'W-06', w0: 100, w1: 85, w2: 74, w3: 67, w4: 61 },
  { week: 'W-05', w0: 100, w1: 80, w2: 70, w3: 62, w4: 0 },
  { week: 'W-04', w0: 100, w1: 76, w2: 65, w3: 0, w4: 0 },
  { week: 'W-03', w0: 100, w1: 83, w2: 72, w3: 0, w4: 0 },
  { week: 'W-02', w0: 100, w1: 79, w2: 0, w3: 0, w4: 0 },
  { week: 'W-01', w0: 100, w1: 0, w2: 0, w3: 0, w4: 0 },
];

const RECOMMENDATIONS = [
  {
    titleKey: 'admin.funnels.recs.checkout.title',
    descKey: 'admin.funnels.recs.checkout.desc',
    impactKey: 'admin.funnels.recs.impact.high',
    icon: (
      <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <circle cx="9" cy="21" r="1" /><circle cx="20" cy="21" r="1" />
        <path d="M1 1h4l2.68 13.39a2 2 0 002 1.61h9.72a2 2 0 002-1.61L23 6H6" />
      </svg>
    ),
  },
  {
    titleKey: 'admin.funnels.recs.exam.title',
    descKey: 'admin.funnels.recs.exam.desc',
    impactKey: 'admin.funnels.recs.impact.medium',
    icon: (
      <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" />
        <polyline points="14 2 14 8 20 8" />
        <line x1="9" y1="13" x2="15" y2="13" />
      </svg>
    ),
  },
  {
    titleKey: 'admin.funnels.recs.signup.title',
    descKey: 'admin.funnels.recs.signup.desc',
    impactKey: 'admin.funnels.recs.impact.low',
    icon: (
      <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M16 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2" />
        <circle cx="8.5" cy="7" r="4" />
        <line x1="20" y1="8" x2="20" y2="14" />
        <line x1="23" y1="11" x2="17" y2="11" />
      </svg>
    ),
  },
];

const impactTone: Record<string, string> = {
  'admin.funnels.recs.impact.high': 'bg-red-50 text-red-600 dark:bg-red-900/30 dark:text-red-400',
  'admin.funnels.recs.impact.medium': 'bg-amber-50 text-amber-600 dark:bg-amber-900/30 dark:text-amber-400',
  'admin.funnels.recs.impact.low': 'bg-blue-50 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400',
};

const FunnelsPage: React.FC = () => {
  const { t } = useTranslation();
  const [funnel, setFunnel] = useState<FunnelKey>('enrollment');

  const steps = FUNNELS[funnel];
  const maxCount = steps[0]?.count ?? 1;
  const overallRate = ((steps[steps.length - 1].count / steps[0].count) * 100).toFixed(1);

  const stepMetrics = useMemo(() => {
    return steps.map((s, i) => {
      const widthPct = (s.count / maxCount) * 100;
      const convFromPrev = i === 0 ? 100 : ((s.count / steps[i - 1].count) * 100).toFixed(1);
      const dropoff = i === 0 ? 0 : steps[i - 1].count - s.count;
      return { ...s, widthPct: widthPct.toFixed(1), convFromPrev, dropoff };
    });
  }, [steps, maxCount]);

  const statCards = [
    {
      value: steps[0].count.toLocaleString('en-US'),
      label: t('admin.funnels.stats.entries'),
      tone: 'bg-blue-50 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400',
      icon: <svg className="w-6 h-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M22 12h-4l-3 9L9 3l-3 9H2" /></svg>,
    },
    {
      value: steps[steps.length - 1].count.toLocaleString('en-US'),
      label: t('admin.funnels.stats.completions'),
      tone: 'bg-emerald-50 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-400',
      icon: <svg className="w-6 h-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="20 6 9 17 4 12" /></svg>,
    },
    {
      value: `${overallRate}%`,
      label: t('admin.funnels.stats.conversion'),
      tone: 'bg-amber-50 text-amber-600 dark:bg-amber-900/30 dark:text-amber-400',
      icon: <svg className="w-6 h-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12" /></svg>,
    },
    {
      value: '38.4%',
      label: t('admin.funnels.stats.biggestDropoff'),
      tone: 'bg-red-50 text-red-600 dark:bg-red-900/30 dark:text-red-400',
      icon: <svg className="w-6 h-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" /><line x1="12" y1="9" x2="12" y2="13" /><line x1="12" y1="17" x2="12.01" y2="17" /></svg>,
    },
  ];

  return (
    <AdminLayout
      title={t('admin.funnels.title')}
      subtitle={t('admin.funnels.subtitle')}
      headerActions={
        <>
          <button className="hidden sm:inline-flex items-center gap-2 px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 hover:border-blue-500 text-sm font-semibold transition-colors">
            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4" /><polyline points="7 10 12 15 17 10" /><line x1="12" y1="15" x2="12" y2="3" /></svg>
            {t('admin.funnels.export')}
          </button>
          <button className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold transition-colors shadow-sm">
            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="12" y1="20" x2="12" y2="10" /><line x1="18" y1="20" x2="18" y2="4" /><line x1="6" y1="20" x2="6" y2="16" /></svg>
            {t('admin.funnels.compare')}
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

      <div className="bg-white dark:bg-slate-800/40 rounded-2xl border border-slate-200 dark:border-slate-800 p-5 mb-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
          <div>
            <h3 className="text-base font-bold text-slate-900 dark:text-white">{t('admin.funnels.viz.title')}</h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">{t('admin.funnels.viz.subtitle')}</p>
          </div>
          <select
            value={funnel}
            onChange={(e) => setFunnel(e.target.value as FunnelKey)}
            className="px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm font-medium focus:outline-none focus:border-blue-500"
          >
            {(Object.keys(FUNNEL_LABELS) as FunnelKey[]).map(k => (
              <option key={k} value={k}>{t(FUNNEL_LABELS[k])}</option>
            ))}
          </select>
        </div>

        <div className="space-y-3">
          {stepMetrics.map((s, i) => {
            const tones = ['bg-blue-500', 'bg-indigo-500', 'bg-purple-500', 'bg-pink-500', 'bg-rose-500', 'bg-red-500'];
            const tone = tones[Math.min(i, tones.length - 1)];
            return (
              <div key={i} className="flex items-center gap-4">
                <div className="w-32 shrink-0 text-right">
                  <div className="text-sm font-semibold text-slate-900 dark:text-white">{t(s.name)}</div>
                  <div className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                    {t('admin.funnels.step.conv', { value: s.convFromPrev })}
                  </div>
                </div>
                <div className="flex-1 relative">
                  <div className="w-full h-12 bg-slate-100 dark:bg-slate-900/40 rounded-lg overflow-hidden flex items-center">
                    <div
                      className={`h-full ${tone} flex items-center justify-between px-4 text-white text-sm font-bold transition-all`}
                      style={{ width: `${s.widthPct}%`, minWidth: '8%' }}
                    >
                      <span>{s.count.toLocaleString('en-US')}</span>
                      {i > 0 && (
                        <span className="text-xs font-semibold opacity-90">
                          -{s.dropoff.toLocaleString('en-US')}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        <div className="xl:col-span-2 bg-white dark:bg-slate-800/40 rounded-2xl border border-slate-200 dark:border-slate-800 overflow-hidden">
          <div className="p-5 border-b border-slate-100 dark:border-slate-800">
            <h3 className="text-base font-bold text-slate-900 dark:text-white">{t('admin.funnels.cohort.title')}</h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">{t('admin.funnels.cohort.subtitle')}</p>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 dark:bg-slate-800/50 text-xs uppercase tracking-wider text-slate-500 dark:text-slate-400">
                <tr>
                  <th className="px-4 py-3 text-left font-semibold">{t('admin.funnels.cohort.week')}</th>
                  <th className="px-4 py-3 text-center font-semibold">W0</th>
                  <th className="px-4 py-3 text-center font-semibold">W1</th>
                  <th className="px-4 py-3 text-center font-semibold">W2</th>
                  <th className="px-4 py-3 text-center font-semibold">W3</th>
                  <th className="px-4 py-3 text-center font-semibold">W4</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {MOCK_COHORTS.map((c, idx) => (
                  <tr key={idx}>
                    <td className="px-4 py-3 text-sm font-semibold text-slate-900 dark:text-white">{c.week}</td>
                    {[c.w0, c.w1, c.w2, c.w3, c.w4].map((v, j) => {
                      const tone =
                        v === 0
                          ? 'bg-slate-50 dark:bg-slate-900/40 text-slate-400'
                          : v >= 75
                          ? 'bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-300'
                          : v >= 50
                          ? 'bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-300'
                          : 'bg-red-100 dark:bg-red-900/40 text-red-700 dark:text-red-300';
                      return (
                        <td key={j} className="px-4 py-3 text-center">
                          <span className={`inline-flex items-center justify-center min-w-[60px] px-2 py-1.5 rounded-lg text-xs font-bold ${tone}`}>
                            {v === 0 ? '—' : `${v}%`}
                          </span>
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-800/40 rounded-2xl border border-slate-200 dark:border-slate-800 p-5">
          <div className="flex items-center gap-2 mb-1">
            <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white">
              <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M12 2L2 7l10 5 10-5-10-5z" />
                <path d="M2 17l10 5 10-5" />
                <path d="M2 12l10 5 10-5" />
              </svg>
            </div>
            <h3 className="text-base font-bold text-slate-900 dark:text-white">{t('admin.funnels.recs.title')}</h3>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 mb-5">{t('admin.funnels.recs.subtitle')}</p>

          <div className="space-y-3">
            {RECOMMENDATIONS.map((r, i) => (
              <div key={i} className="border border-slate-200 dark:border-slate-700 rounded-xl p-4 hover:border-blue-400 transition-colors">
                <div className="flex items-start gap-3">
                  <div className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 ${impactTone[r.impactKey]}`}>
                    {r.icon}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                      <h4 className="text-sm font-bold text-slate-900 dark:text-white">{t(r.titleKey)}</h4>
                      <span className={`text-[10px] uppercase font-bold px-2 py-0.5 rounded ${impactTone[r.impactKey]}`}>
                        {t(r.impactKey)}
                      </span>
                    </div>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-1.5 leading-relaxed">{t(r.descKey)}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>

          <button className="w-full mt-4 inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold transition-colors shadow-sm">
            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M5 13l4 4L19 7" /></svg>
            {t('admin.funnels.recs.applyAll')}
          </button>
        </div>
      </div>
    </AdminLayout>
  );
};

export default FunnelsPage;