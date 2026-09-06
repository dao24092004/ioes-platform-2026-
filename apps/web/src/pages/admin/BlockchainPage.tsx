import React from 'react';
import { useTranslation } from 'react-i18next';
import { useQuery } from '@tanstack/react-query';
import AdminLayout from '@/components/layout/AdminLayout';
import { blockchainApi, type TxRecord } from '@/services/api';
import { formatRelative } from '@/utils/time';
import { ANIMATION, TEST_IDS } from '@/constants/ui';

const txTypeStyles: Record<TxRecord['type'], { bg: string; text: string }> = {
  mint: { bg: 'bg-emerald-50 dark:bg-emerald-900/30', text: 'text-emerald-600 dark:text-emerald-400' },
  burn: { bg: 'bg-red-50 dark:bg-red-900/30', text: 'text-red-600 dark:text-red-400' },
  transfer: { bg: 'bg-blue-50 dark:bg-blue-900/30', text: 'text-blue-600 dark:text-blue-400' },
  reward: { bg: 'bg-amber-50 dark:bg-amber-900/30', text: 'text-amber-600 dark:text-amber-400' },
};

const txStatusStyles: Record<TxRecord['status'], { dot: string; cls: string }> = {
  confirmed: { dot: 'bg-emerald-500', cls: 'bg-emerald-50 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-400' },
  pending: { dot: 'bg-amber-500 animate-pulse', cls: 'bg-amber-50 text-amber-600 dark:bg-amber-900/30 dark:text-amber-400' },
  failed: { dot: 'bg-red-500', cls: 'bg-red-50 text-red-600 dark:bg-red-900/30 dark:text-red-400' },
};

const formatNumber = (n: number) => n.toLocaleString('en-US');

const BlockchainPage: React.FC = () => {
  const { t } = useTranslation();

  const { data: stats } = useQuery({ queryKey: ['bc', 'stats'], queryFn: () => blockchainApi.tokenStats() });
  const { data: contract } = useQuery({ queryKey: ['bc', 'contract'], queryFn: () => blockchainApi.contract() });
  const { data: txs } = useQuery({ queryKey: ['bc', 'txs'], queryFn: () => blockchainApi.transactions() });
  const { data: weekly } = useQuery({ queryKey: ['bc', 'weekly'], queryFn: () => blockchainApi.weeklyRewards() });

  const statCards = [
    { value: stats?.totalSupply ?? 0, label: t('blockchain.stats.totalSupply'), color: 'blue' },
    { value: stats?.circulating ?? 0, label: t('blockchain.stats.circulating'), color: 'emerald' },
    { value: stats?.minted ?? 0, label: t('blockchain.stats.minted'), color: 'cyan' },
    { value: stats?.burned ?? 0, label: t('blockchain.stats.burned'), color: 'red' },
    { value: stats?.holders ?? 0, label: t('blockchain.stats.holders'), color: 'purple' },
    { value: stats?.tx24h ?? 0, label: t('blockchain.stats.tx24h'), color: 'amber' },
  ];

  const colorMap: Record<string, string> = {
    blue: 'bg-blue-50 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400',
    emerald: 'bg-emerald-50 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-400',
    cyan: 'bg-cyan-50 text-cyan-600 dark:bg-cyan-900/30 dark:text-cyan-400',
    red: 'bg-red-50 text-red-600 dark:bg-red-900/30 dark:text-red-400',
    purple: 'bg-purple-50 text-purple-600 dark:bg-purple-900/30 dark:text-purple-400',
    amber: 'bg-amber-50 text-amber-600 dark:bg-amber-900/30 dark:text-amber-400',
  };

  const weeklyMax = Math.max(...(weekly?.map((w: { value: number }) => w.value) ?? [1]));

  return (
    <AdminLayout title={t('blockchain.title')} subtitle={t('blockchain.subtitle')}>
      <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-4 mb-6">
        {statCards.map((s, i) => (
          <div
            key={i}
            data-testid={TEST_IDS.ANALYTICS_KPI}
            className="group relative overflow-hidden bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-5 transition-all hover:-translate-y-1 hover:shadow-lg hover:shadow-blue-500/5 opacity-0 animate-[fadeInUp_.6s_ease-out_forwards]"
            style={{ animationDelay: `${(i + 1) * ANIMATION.STAGGER_DURATION_S}s` }}
          >
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center mb-3 transition-all group-hover:scale-110 group-hover:rotate-[10deg] ${colorMap[s.color]}`}>
              <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="12" cy="12" r="10" />
                <path d="M12 6v6l4 2" />
              </svg>
            </div>
            <div className="text-2xl font-bold tabular-nums mb-1">{formatNumber(s.value)}</div>
            <div className="text-xs text-slate-500 dark:text-slate-400">{s.label}</div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 mb-6">
        <div
          data-testid={TEST_IDS.CONTRACT_CARD}
          className="xl:col-span-5 bg-gradient-to-br from-blue-600 via-blue-700 to-cyan-700 rounded-2xl p-6 text-white shadow-xl shadow-blue-500/30 opacity-0 animate-[fadeInUp_.6s_ease-out_forwards] hover:shadow-2xl hover:shadow-blue-500/40 hover:-translate-y-1 transition-all"
          style={{ animationDelay: `${2 * ANIMATION.STAGGER_DURATION_S}s` }}
        >
          <div className="flex items-start justify-between mb-4">
            <div>
              <div className="text-xs uppercase tracking-wider text-blue-100 mb-1">{t('blockchain.contract.title')}</div>
              <div className="flex items-center gap-2 mt-2">
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold bg-emerald-500/20 text-emerald-100 border border-emerald-400/30">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-300 animate-pulse" />
                  {t('blockchain.contract.verify')}
                </span>
                <span className="text-xs text-blue-100">{contract?.version}</span>
              </div>
            </div>
            <div className="w-12 h-12 rounded-xl bg-white/10 backdrop-blur flex items-center justify-center transition-transform hover:rotate-12 hover:scale-110">
              <svg className="w-6 h-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M10 20l4-16m4 4 4 4-4 4M6 16l-4-4 4-4" /></svg>
            </div>
          </div>

          <div className="space-y-3 mt-4">
            <div>
              <div className="text-[11px] uppercase tracking-wider text-blue-100 mb-1">{t('blockchain.contract.address')}</div>
              <div className="font-mono text-sm break-all bg-black/20 rounded-lg px-3 py-2 backdrop-blur">{contract?.address}</div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <div className="text-[11px] uppercase tracking-wider text-blue-100 mb-1">{t('blockchain.contract.network')}</div>
                <div className="text-sm font-semibold">{contract?.network}</div>
              </div>
              <div>
                <div className="text-[11px] uppercase tracking-wider text-blue-100 mb-1">{t('blockchain.contract.deployBlock')}</div>
                <div className="text-sm font-semibold tabular-nums">#{contract?.deploy_block.toLocaleString()}</div>
              </div>
            </div>
          </div>

          <a
            href="#"
            onClick={e => e.preventDefault()}
            aria-label={t('blockchain.contract.explorer')}
            className="mt-5 inline-flex items-center gap-2 px-4 py-2 text-sm font-semibold rounded-xl bg-white/15 hover:bg-white/25 backdrop-blur transition-all hover:-translate-y-0.5"
          >
            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 13v6a2 2 0 01-2 2H5a2 2 0 01-2-2V8a2 2 0 012-2h6" /><polyline points="15 3 21 3 21 9" /><line x1="10" y1="14" x2="21" y2="3" /></svg>
            {t('blockchain.contract.explorer')}
          </a>
        </div>

        <div
          data-testid={TEST_IDS.WEEKLY_REWARDS_CHART}
          className="xl:col-span-7 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-6 opacity-0 animate-[fadeInUp_.6s_ease-out_forwards] hover:shadow-lg hover:shadow-blue-500/5 transition-all"
          style={{ animationDelay: `${2.5 * ANIMATION.STAGGER_DURATION_S}s` }}
        >
          <h2 className="text-base font-semibold mb-1">{t('blockchain.rewards')}</h2>
          <p className="text-xs text-slate-500 mb-6">{t('shared.tokenSymbol')}</p>
          {weekly && (
            <div className="flex items-end gap-3 h-56">
              {weekly.map((p: { day: string; value: number }, i: number) => (
                <div key={p.day} className="flex-1 flex flex-col items-center gap-2 group">
                  <div className="text-xs font-semibold tabular-nums opacity-0 group-hover:opacity-100 transition-opacity">
                    {p.value.toLocaleString()}
                  </div>
                  <div
                    className="w-full rounded-t-lg bg-gradient-to-t from-blue-600 to-cyan-500 transition-all duration-700 group-hover:from-blue-500 group-hover:to-cyan-400"
                    style={{
                      height: `${(p.value / weeklyMax) * 100}%`,
                      animationDelay: `${i * ANIMATION.STAGGER_MS}ms`,
                      minHeight: 8,
                    }}
                  />
                  <div className="text-xs font-medium text-slate-500">{p.day}</div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <div
        className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 overflow-hidden opacity-0 animate-[fadeInUp_.6s_ease-out_forwards] hover:shadow-lg hover:shadow-blue-500/5 transition-all"
        style={{ animationDelay: `${3 * ANIMATION.STAGGER_DURATION_S}s` }}
      >
        <div className="px-6 py-5 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
          <h2 className="flex items-center gap-2.5 text-base font-semibold">
            <span className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400 flex items-center justify-center">
              <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="17 1 21 5 17 9" /><path d="M3 11V9a4 4 0 014-4h14" /><polyline points="7 23 3 19 7 15" /><path d="M21 13v2a4 4 0 01-4 4H3" /></svg>
            </span>
            {t('blockchain.transactions')}
          </h2>
          <button className="text-xs text-blue-600 hover:text-blue-700 font-medium transition-all hover:translate-x-1">
            {t('shared.viewAll')} →
          </button>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-slate-50 dark:bg-slate-800/50 text-xs uppercase tracking-wider text-slate-500">
                <th className="text-left px-6 py-3 font-semibold">{t('blockchain.table.tx')}</th>
                <th className="text-left px-6 py-3 font-semibold">{t('blockchain.table.type')}</th>
                <th className="text-left px-6 py-3 font-semibold">{t('blockchain.table.from')}</th>
                <th className="text-left px-6 py-3 font-semibold">{t('blockchain.table.to')}</th>
                <th className="text-right px-6 py-3 font-semibold">{t('blockchain.table.amount')}</th>
                <th className="text-left px-6 py-3 font-semibold">{t('blockchain.table.time')}</th>
                <th className="text-left px-6 py-3 font-semibold">{t('blockchain.table.status')}</th>
              </tr>
            </thead>
            <tbody>
              {(txs ?? []).map((tx: TxRecord) => {
                const ts = txTypeStyles[tx.type];
                const ss = txStatusStyles[tx.status];
                return (
                  <tr key={tx.id} data-testid={TEST_IDS.TX_ROW} className="border-t border-slate-100 dark:border-slate-800 transition-all hover:bg-blue-50/50 dark:hover:bg-blue-900/10 group">
                    <td className="px-6 py-4">
                      <code className="text-xs font-mono text-slate-600 dark:text-slate-400 bg-slate-100 dark:bg-slate-800 px-2 py-1 rounded">
                        {tx.tx_hash}
                      </code>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-semibold uppercase ${ts.bg} ${ts.text} transition-transform hover:scale-105`}>
                        {t(`blockchain.txType.${tx.type}`)}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <code className="text-xs font-mono text-slate-600 dark:text-slate-400">{tx.from.slice(0, 10)}…</code>
                    </td>
                    <td className="px-6 py-4">
                      <code className="text-xs font-mono text-slate-600 dark:text-slate-400">{tx.to.slice(0, 10)}…</code>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <span className="font-semibold tabular-nums text-sm">{tx.amount.toLocaleString()}</span>
                      <span className="ml-1 text-xs text-slate-500">{t('shared.tokenSymbol')}</span>
                    </td>
                    <td className="px-6 py-4 text-xs text-slate-500">{formatRelative(tx.created_at)}</td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${ss.cls}`}>
                        <span className={`w-1.5 h-1.5 rounded-full ${ss.dot}`} />
                        {t(`blockchain.txStatus.${tx.status}`)}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </AdminLayout>
  );
};

export default BlockchainPage;