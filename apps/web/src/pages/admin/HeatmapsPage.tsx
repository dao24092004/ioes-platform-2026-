import React, { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import AdminLayout from '@/components/layout/AdminLayout';

type PageKey = 'homepage' | 'courseList' | 'checkout' | 'dashboard';
type DateRange = '7d' | '30d' | '90d';
type DeviceFilter = 'all' | 'desktop' | 'mobile' | 'tablet';

type Hotspot = {
  element: string;
  clicks: number;
  ctr: number;
  x: number;
  y: number;
  intensity: number;
};

type ScrollRow = { section: string; reach: number };

const PAGE_OPTIONS: { key: PageKey; label: string }[] = [
  { key: 'homepage', label: 'admin.heatmaps.page.homepage' },
  { key: 'courseList', label: 'admin.heatmaps.page.courseList' },
  { key: 'checkout', label: 'admin.heatmaps.page.checkout' },
  { key: 'dashboard', label: 'admin.heatmaps.page.dashboard' },
];

const MOCK_HOTSPOTS: Hotspot[] = [
  { element: 'admin.heatmaps.hotspots.data.ctaEnroll', clicks: 4821, ctr: 18.4, x: 72, y: 38, intensity: 1 },
  { element: 'admin.heatmaps.hotspots.data.courseCard1', clicks: 3642, ctr: 13.9, x: 22, y: 42, intensity: 0.95 },
  { element: 'admin.heatmaps.hotspots.data.searchBar', clicks: 2984, ctr: 11.4, x: 48, y: 12, intensity: 0.9 },
  { element: 'admin.heatmaps.hotspots.data.heroBanner', clicks: 2715, ctr: 10.4, x: 50, y: 22, intensity: 0.88 },
  { element: 'admin.heatmaps.hotspots.data.loginLink', clicks: 2410, ctr: 9.2, x: 88, y: 8, intensity: 0.82 },
  { element: 'admin.heatmaps.hotspots.data.courseCard3', clicks: 2104, ctr: 8.0, x: 76, y: 60, intensity: 0.78 },
  { element: 'admin.heatmaps.hotspots.data.pricingToggle', clicks: 1928, ctr: 7.4, x: 14, y: 70, intensity: 0.72 },
  { element: 'admin.heatmaps.hotspots.data.filterSidebar', clicks: 1731, ctr: 6.6, x: 8, y: 38, intensity: 0.68 },
  { element: 'admin.heatmaps.hotspots.data.footerAbout', clicks: 1542, ctr: 5.9, x: 30, y: 92, intensity: 0.6 },
  { element: 'admin.heatmaps.hotspots.data.languageSwitcher', clicks: 1284, ctr: 4.9, x: 82, y: 8, intensity: 0.55 },
  { element: 'admin.heatmaps.hotspots.data.courseCard2', clicks: 1180, ctr: 4.5, x: 50, y: 50, intensity: 0.5 },
  { element: 'admin.heatmaps.hotspots.data.helpCenter', clicks: 982, ctr: 3.8, x: 70, y: 92, intensity: 0.45 },
];

const MOCK_SCROLL: ScrollRow[] = [
  { section: '100%', reach: 86 },
  { section: '75%', reach: 62 },
  { section: '50%', reach: 41 },
  { section: '25%', reach: 22 },
  { section: '0%', reach: 8 },
];

const HeatmapsPage: React.FC = () => {
  const { t } = useTranslation();
  const [page, setPage] = useState<PageKey>('homepage');
  const [dateRange, setDateRange] = useState<DateRange>('30d');
  const [device, setDevice] = useState<DeviceFilter>('all');

  const topHotspots = useMemo(() => {
    return [...MOCK_HOTSPOTS].sort((a, b) => b.clicks - a.clicks).slice(0, 5);
  }, []);

  const heatCircles = useMemo(() => {
    return MOCK_HOTSPOTS.map((p, i) => {
      const radius = 14 + p.intensity * 18;
      const color =
        p.intensity > 0.85 ? '#ef4444' : p.intensity > 0.65 ? '#f59e0b' : '#3b82f6';
      const opacity = 0.35 + p.intensity * 0.45;
      return (
        <g key={i}>
          <circle
            cx={p.x * 6}
            cy={p.y * 4}
            r={radius}
            fill={color}
            opacity={opacity}
          />
          <circle cx={p.x * 6} cy={p.y * 4} r={4} fill="#ffffff" opacity={0.95} />
        </g>
      );
    });
  }, []);

  const statCards = [
    {
      value: '24,816',
      label: t('admin.heatmaps.stats.totalClicks'),
      icon: <svg className="w-6 h-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M9 11l3 3L22 4" /><path d="M21 12v7a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2h11" /></svg>,
      tone: 'bg-blue-50 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400',
    },
    {
      value: '5,432',
      label: t('admin.heatmaps.stats.uniqueClickers'),
      icon: <svg className="w-6 h-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M23 21v-2a4 4 0 00-3-3.87" /><path d="M16 3.13a4 4 0 010 7.75" /></svg>,
      tone: 'bg-emerald-50 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-400',
    },
    {
      value: '4.6',
      label: t('admin.heatmaps.stats.avgClicks'),
      icon: <svg className="w-6 h-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12" /></svg>,
      tone: 'bg-amber-50 text-amber-600 dark:bg-amber-900/30 dark:text-amber-400',
    },
    {
      value: t('admin.heatmaps.stats.heroBanner'),
      label: t('admin.heatmaps.stats.hottestArea'),
      icon: <svg className="w-6 h-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M8.5 14.5A2.5 2.5 0 0011 12c0-1.38-.5-2-1-3-1.072-2.143-.224-4.054 2-6 .5 2.5 2 4.9 4 6.5 2 1.6 3 3.5 3 5.5a7 7 0 11-14 0c0-1.153.433-2.294 1-3a2.5 2.5 0 002.5 2.5z" /></svg>,
      tone: 'bg-red-50 text-red-600 dark:bg-red-900/30 dark:text-red-400',
    },
  ];

  return (
    <AdminLayout
      title={t('admin.heatmaps.title')}
      subtitle={t('admin.heatmaps.subtitle')}
      headerActions={
        <>
          <button className="hidden sm:inline-flex items-center gap-2 px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 hover:border-blue-500 text-sm font-semibold transition-colors">
            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4" /><polyline points="7 10 12 15 17 10" /><line x1="12" y1="15" x2="12" y2="3" /></svg>
            {t('admin.heatmaps.export')}
          </button>
          <button className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold transition-colors shadow-sm">
            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M23 4v6h-6" /><path d="M1 20v-6h6" /><path d="M3.51 9a9 9 0 0114.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0020.49 15" /></svg>
            {t('admin.heatmaps.refresh')}
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
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <label className="text-xs font-bold uppercase text-slate-500 dark:text-slate-400">
              {t('admin.heatmaps.filter.page')}
            </label>
            <select
              value={page}
              onChange={(e) => setPage(e.target.value as PageKey)}
              className="px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm font-medium focus:outline-none focus:border-blue-500"
            >
              {PAGE_OPTIONS.map(opt => (
                <option key={opt.key} value={opt.key}>{t(opt.label)}</option>
              ))}
            </select>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <select
              value={dateRange}
              onChange={(e) => setDateRange(e.target.value as DateRange)}
              className="px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm font-medium focus:outline-none focus:border-blue-500"
            >
              <option value="7d">{t('admin.heatmaps.filter.last7d')}</option>
              <option value="30d">{t('admin.heatmaps.filter.last30d')}</option>
              <option value="90d">{t('admin.heatmaps.filter.last90d')}</option>
            </select>
            <select
              value={device}
              onChange={(e) => setDevice(e.target.value as DeviceFilter)}
              className="px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm font-medium focus:outline-none focus:border-blue-500"
            >
              <option value="all">{t('admin.heatmaps.filter.deviceAll')}</option>
              <option value="desktop">{t('admin.heatmaps.filter.desktop')}</option>
              <option value="mobile">{t('admin.heatmaps.filter.mobile')}</option>
              <option value="tablet">{t('admin.heatmaps.filter.tablet')}</option>
            </select>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6 mb-6">
        <div className="bg-white dark:bg-slate-800/40 rounded-2xl border border-slate-200 dark:border-slate-800 p-5">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-base font-bold text-slate-900 dark:text-white">{t('admin.heatmaps.click.title')}</h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">{t('admin.heatmaps.click.subtitle')}</p>
            </div>
          </div>
          <div className="relative bg-slate-50 dark:bg-slate-900/40 rounded-xl overflow-hidden border border-slate-100 dark:border-slate-800" style={{ aspectRatio: '3 / 2' }}>
            <svg viewBox="0 0 600 400" className="w-full h-full" preserveAspectRatio="xMidYMid meet">
              <rect x="0" y="0" width="600" height="400" fill="transparent" />
              <rect x="20" y="20" width="560" height="60" rx="6" fill="#cbd5e1" opacity="0.4" />
              <rect x="20" y="100" width="260" height="200" rx="6" fill="#cbd5e1" opacity="0.3" />
              <rect x="300" y="100" width="280" height="90" rx="6" fill="#cbd5e1" opacity="0.3" />
              <rect x="300" y="200" width="280" height="100" rx="6" fill="#cbd5e1" opacity="0.3" />
              <rect x="20" y="320" width="560" height="60" rx="6" fill="#cbd5e1" opacity="0.4" />
              {heatCircles}
            </svg>
          </div>
          <div className="flex items-center justify-center gap-6 mt-4 text-xs">
            <div className="flex items-center gap-2">
              <span className="w-3 h-3 rounded-full bg-red-500" />
              <span className="text-slate-600 dark:text-slate-300">{t('admin.heatmaps.legend.high')}</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-3 h-3 rounded-full bg-amber-500" />
              <span className="text-slate-600 dark:text-slate-300">{t('admin.heatmaps.legend.medium')}</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-3 h-3 rounded-full bg-blue-500" />
              <span className="text-slate-600 dark:text-slate-300">{t('admin.heatmaps.legend.low')}</span>
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-800/40 rounded-2xl border border-slate-200 dark:border-slate-800 p-5">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-base font-bold text-slate-900 dark:text-white">{t('admin.heatmaps.scroll.title')}</h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">{t('admin.heatmaps.scroll.subtitle')}</p>
            </div>
          </div>
          <div className="space-y-4 mt-6">
            {MOCK_SCROLL.map((row, idx) => {
              const ratio = row.reach / 100;
              const tone =
                row.reach >= 75
                  ? 'bg-emerald-500'
                  : row.reach >= 50
                  ? 'bg-amber-500'
                  : row.reach >= 25
                  ? 'bg-orange-500'
                  : 'bg-red-500';
              return (
                <div key={idx}>
                  <div className="flex items-center justify-between text-xs mb-1.5">
                    <span className="font-semibold text-slate-700 dark:text-slate-300">{row.section}</span>
                    <span className="font-bold text-slate-900 dark:text-white">{row.reach}%</span>
                  </div>
                  <div className="w-full h-8 bg-slate-100 dark:bg-slate-900/50 rounded-lg overflow-hidden">
                    <div
                      className={`h-full ${tone} flex items-center justify-end pr-3 text-white text-xs font-semibold transition-all`}
                      style={{ width: `${ratio * 100}%` }}
                    >
                      {row.reach >= 25 ? `${row.reach}%` : ''}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
          <div className="flex items-center justify-center gap-4 mt-6 text-xs flex-wrap">
            <div className="flex items-center gap-2">
              <span className="w-3 h-3 rounded bg-emerald-500" />
              <span className="text-slate-600 dark:text-slate-300">{t('admin.heatmaps.legend.reachHigh')}</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-3 h-3 rounded bg-red-500" />
              <span className="text-slate-600 dark:text-slate-300">{t('admin.heatmaps.legend.reachLow')}</span>
            </div>
          </div>
        </div>
      </div>

      <div className="bg-white dark:bg-slate-800/40 rounded-2xl border border-slate-200 dark:border-slate-800 overflow-hidden">
        <div className="p-5 border-b border-slate-100 dark:border-slate-800">
          <h3 className="text-base font-bold text-slate-900 dark:text-white">{t('admin.heatmaps.hotspots.title')}</h3>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">{t('admin.heatmaps.hotspots.subtitle')}</p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 dark:bg-slate-800/50 text-xs uppercase tracking-wider text-slate-500 dark:text-slate-400">
              <tr>
                <th className="px-5 py-3 text-left font-semibold w-12">#</th>
                <th className="px-5 py-3 text-left font-semibold">{t('admin.heatmaps.hotspots.element')}</th>
                <th className="px-5 py-3 text-right font-semibold">{t('admin.heatmaps.hotspots.clicks')}</th>
                <th className="px-5 py-3 text-right font-semibold">{t('admin.heatmaps.hotspots.ctr')}</th>
                <th className="px-5 py-3 text-left font-semibold w-1/3">{t('admin.heatmaps.hotspots.heatBar')}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {topHotspots.map((h, idx) => (
                <tr key={idx} className="hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors">
                  <td className="px-5 py-4 text-slate-500 dark:text-slate-400 font-semibold">{idx + 1}</td>
                  <td className="px-5 py-4 text-sm font-semibold text-slate-900 dark:text-white">{t(h.element)}</td>
                  <td className="px-5 py-4 text-right font-bold text-slate-900 dark:text-white">
                    {h.clicks.toLocaleString('en-US')}
                  </td>
                  <td className="px-5 py-4 text-right text-blue-600 dark:text-blue-400 font-semibold">{h.ctr}%</td>
                  <td className="px-5 py-4">
                    <div className="w-full h-2 bg-slate-100 dark:bg-slate-700/50 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-gradient-to-r from-blue-500 via-amber-500 to-red-500 rounded-full"
                        style={{ width: `${h.ctr * 4}%` }}
                      />
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </AdminLayout>
  );
};

export default HeatmapsPage;