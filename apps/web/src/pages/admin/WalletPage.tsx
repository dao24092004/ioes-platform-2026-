import React, { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import AdminLayout from '@/components/layout/AdminLayout';
import PaginationBar from '@/components/common/PaginationBar';

type TxStatus = 'confirmed' | 'pending' | 'rejected';
type TxDirection = 'incoming' | 'outgoing';

interface WalletTransaction {
  id: string;
  hash: string;
  from: string;
  to: string;
  amount: number;
  signaturesRequired: number;
  signaturesCollected: number;
  status: TxStatus;
  direction: TxDirection;
  timestamp: string;
  category: string;
}

interface Signer {
  id: string;
  name: string;
  address: string;
  role: string;
  votingPower: number;
  status: 'active' | 'inactive';
}

interface PendingApproval {
  id: string;
  hash: string;
  proposer: string;
  recipient: string;
  amount: number;
  reason: string;
  createdAt: string;
  signaturesRequired: number;
  signaturesCollected: number;
  category: string;
}

const TRUNCATE = (s: string, lead: number, tail: number): string =>
  s.length > lead + tail + 3 ? `${s.slice(0, lead)}…${s.slice(-tail)}` : s;

const MOCK_SIGNERS: Signer[] = [
  { id: 's1', name: 'An Nguyen', address: '0x9F4b8a17Cd6E1a2Dc5B7E3a8F0c1d2e3A4B5c6D7', role: 'CEO', votingPower: 1, status: 'active' },
  { id: 's2', name: 'Bao Tran', address: '0xA1c2D3e4F5g6H7i8J9k0L1m2N3o4P5q6R7s8T9u0', role: 'CTO', votingPower: 1, status: 'active' },
  { id: 's3', name: 'Cuong Le', address: '0xB2c3D4e5F6g7H8i9J0k1L2m3N4o5P6q7R8s9T0u1V', role: 'CFO', votingPower: 1, status: 'active' },
  { id: 's4', name: 'Dao Pham', address: '0xC3d4E5f6G7h8I9j0K1l2M3n4O5p6Q7r8S9t0U1v2W', role: 'COO', votingPower: 1, status: 'active' },
  { id: 's5', name: 'Em Hoang', address: '0xD4e5F6g7H8i9J0k1L2m3N4o5P6q7R8s9T0u1V2w3X', role: 'Board Member', votingPower: 1, status: 'active' },
];

const MOCK_TRANSACTIONS: WalletTransaction[] = [
  { id: 'tx1', hash: '0xa1b2c3d4e5f6789012345678901234567890abcdef1234567890abcdef123456', from: '0xTreasury', to: '0xMarketing8a2b', amount: 25000, signaturesRequired: 3, signaturesCollected: 3, status: 'confirmed', direction: 'outgoing', timestamp: '2026-08-24 09:32', category: 'Marketing' },
  { id: 'tx2', hash: '0xb2c3d4e5f6789012345678901234567890abcdef1234567890abcdef12345678', from: '0xCustomer9b1f', to: '0xTreasury', amount: 12500, signaturesRequired: 3, signaturesCollected: 3, status: 'confirmed', direction: 'incoming', timestamp: '2026-08-23 18:14', category: 'Course Sale' },
  { id: 'tx3', hash: '0xc3d4e5f6789012345678901234567890abcdef1234567890abcdef1234567890', from: '0xTreasury', to: '0xPartner7c4d', amount: 50000, signaturesRequired: 3, signaturesCollected: 3, status: 'confirmed', direction: 'outgoing', timestamp: '2026-08-22 14:08', category: 'Partnership' },
  { id: 'tx4', hash: '0xd4e5f6789012345678901234567890abcdef1234567890abcdef1234567890ab', from: '0xTreasury', to: '0xDevTeam5e6f', amount: 18000, signaturesRequired: 3, signaturesCollected: 2, status: 'pending', direction: 'outgoing', timestamp: '2026-08-24 11:42', category: 'Payroll' },
  { id: 'tx5', hash: '0xe5f6789012345678901234567890abcdef1234567890abcdef1234567890abcd', from: '0xInvestor8d9e', to: '0xTreasury', amount: 250000, signaturesRequired: 3, signaturesCollected: 3, status: 'confirmed', direction: 'incoming', timestamp: '2026-08-21 10:55', category: 'Investment' },
  { id: 'tx6', hash: '0xf6789012345678901234567890abcdef1234567890abcdef1234567890abcdef12', from: '0xTreasury', to: '0xAuditFirm3a1b', amount: 8500, signaturesRequired: 3, signaturesCollected: 3, status: 'confirmed', direction: 'outgoing', timestamp: '2026-08-20 16:30', category: 'Audit' },
  { id: 'tx7', hash: '0x0789012345678901234567890abcdef1234567890abcdef1234567890abcdef1234', from: '0xTreasury', to: '0xContractor6c7d', amount: 12000, signaturesRequired: 3, signaturesCollected: 3, status: 'confirmed', direction: 'outgoing', timestamp: '2026-08-19 13:22', category: 'Contractor' },
  { id: 'tx8', hash: '0x189012345678901234567890abcdef1234567890abcdef1234567890abcdef12345', from: '0xTreasury', to: '0xCharity9e0f', amount: 5000, signaturesRequired: 3, signaturesCollected: 3, status: 'confirmed', direction: 'outgoing', timestamp: '2026-08-18 09:00', category: 'Charity' },
  { id: 'tx9', hash: '0x29012345678901234567890abcdef1234567890abcdef1234567890abcdef123456', from: '0xTreasury', to: '0xLegalTeam4b5c', amount: 7000, signaturesRequired: 3, signaturesCollected: 3, status: 'confirmed', direction: 'outgoing', timestamp: '2026-08-17 15:45', category: 'Legal' },
  { id: 'tx10', hash: '0x3012345678901234567890abcdef1234567890abcdef1234567890abcdef1234567', from: '0xCustomer2c3d', to: '0xTreasury', amount: 4500, signaturesRequired: 3, signaturesCollected: 3, status: 'confirmed', direction: 'incoming', timestamp: '2026-08-16 20:18', category: 'Subscription' },
  { id: 'tx11', hash: '0x412345678901234567890abcdef1234567890abcdef1234567890abcdef12345678', from: '0xTreasury', to: '0xInfraProvider5d6e', amount: 15000, signaturesRequired: 3, signaturesCollected: 3, status: 'confirmed', direction: 'outgoing', timestamp: '2026-08-15 11:00', category: 'Infrastructure' },
  { id: 'tx12', hash: '0x52345678901234567890abcdef1234567890abcdef1234567890abcdef123456789', from: '0xTreasury', to: '0xBugBounty7f8a', amount: 3000, signaturesRequired: 3, signaturesCollected: 3, status: 'confirmed', direction: 'outgoing', timestamp: '2026-08-14 14:30', category: 'Bug Bounty' },
  { id: 'tx13', hash: '0x6345678901234567890abcdef1234567890abcdef1234567890abcdef1234567890', from: '0xTreasury', to: '0xTeamOffsite1g2h', amount: 9500, signaturesRequired: 3, signaturesCollected: 3, status: 'confirmed', direction: 'outgoing', timestamp: '2026-08-13 10:15', category: 'Team Event' },
  { id: 'tx14', hash: '0x745678901234567890abcdef1234567890abcdef1234567890abcdef12345678901', from: '0xTreasury', to: '0xContractor3i4j', amount: 6000, signaturesRequired: 3, signaturesCollected: 1, status: 'pending', direction: 'outgoing', timestamp: '2026-08-24 13:05', category: 'Contractor' },
  { id: 'tx15', hash: '0x85678901234567890abcdef1234567890abcdef1234567890abcdef123456789012', from: '0xCustomer5k6l', to: '0xTreasury', amount: 9999, signaturesRequired: 3, signaturesCollected: 3, status: 'confirmed', direction: 'incoming', timestamp: '2026-08-12 22:42', category: 'Course Sale' },
  { id: 'tx16', hash: '0x9678901234567890abcdef1234567890abcdef1234567890abcdef1234567890123', from: '0xTreasury', to: '0xMarketing7m8n', amount: 32000, signaturesRequired: 3, signaturesCollected: 3, status: 'confirmed', direction: 'outgoing', timestamp: '2026-08-11 08:50', category: 'Marketing' },
  { id: 'tx17', hash: '0xa78901234567890abcdef1234567890abcdef1234567890abcdef12345678901234', from: '0xSuspicious9o0p', to: '0xTreasury', amount: 99999, signaturesRequired: 3, signaturesCollected: 1, status: 'rejected', direction: 'incoming', timestamp: '2026-08-10 03:21', category: 'Unknown' },
  { id: 'tx18', hash: '0xb8901234567890abcdef1234567890abcdef1234567890abcdef123456789012345', from: '0xTreasury', to: '0xLegalCounsel1q2r', amount: 11000, signaturesRequired: 3, signaturesCollected: 3, status: 'confirmed', direction: 'outgoing', timestamp: '2026-08-09 16:12', category: 'Legal' },
  { id: 'tx19', hash: '0xc901234567890abcdef1234567890abcdef1234567890abcdef1234567890123456', from: '0xTreasury', to: '0xVendor3s4t', amount: 4200, signaturesRequired: 3, signaturesCollected: 3, status: 'confirmed', direction: 'outgoing', timestamp: '2026-08-08 12:08', category: 'Vendor' },
  { id: 'tx20', hash: '0xd01234567890abcdef1234567890abcdef1234567890abcdef12345678901234567', from: '0xTreasury', to: '0xR&DTeam5u6v', amount: 28000, signaturesRequired: 3, signaturesCollected: 3, status: 'confirmed', direction: 'outgoing', timestamp: '2026-08-07 09:30', category: 'R&D' },
];

const MOCK_PENDING: PendingApproval[] = [
  {
    id: 'p1',
    hash: '0xd4e5f6789012345678901234567890abcdef1234567890abcdef1234567890ab',
    proposer: 'Bao Tran',
    recipient: '0xDevTeam5e6f',
    amount: 18000,
    reason: 'August payroll - engineering team',
    createdAt: '2026-08-24 11:42',
    signaturesRequired: 3,
    signaturesCollected: 2,
    category: 'Payroll',
  },
  {
    id: 'p2',
    hash: '0x745678901234567890abcdef1234567890abcdef1234567890abcdef12345678901',
    proposer: 'An Nguyen',
    recipient: '0xContractor3i4j',
    amount: 6000,
    reason: 'Security audit contractor - Q3 retainer',
    createdAt: '2026-08-24 13:05',
    signaturesRequired: 3,
    signaturesCollected: 1,
    category: 'Contractor',
  },
  {
    id: 'p3',
    hash: '0xe5f678901234567890abcdef1234567890abcdef1234567890abcdef1234567890ab',
    proposer: 'Cuong Le',
    recipient: '0xMarketingNewCampaign',
    amount: 35000,
    reason: 'Q4 launch campaign - paid social + influencer',
    createdAt: '2026-08-24 10:18',
    signaturesRequired: 3,
    signaturesCollected: 1,
    category: 'Marketing',
  },
];

const statusStyles: Record<TxStatus, { bg: string; text: string }> = {
  confirmed: { bg: 'bg-emerald-50 dark:bg-emerald-900/30', text: 'text-emerald-600 dark:text-emerald-400' },
  pending: { bg: 'bg-amber-50 dark:bg-amber-900/30', text: 'text-amber-600 dark:text-amber-400' },
  rejected: { bg: 'bg-rose-50 dark:bg-rose-900/30', text: 'text-rose-600 dark:text-rose-400' },
};

const WalletPage: React.FC = () => {
  const { t } = useTranslation();
  const [activeTab, setActiveTab] = useState<'overview' | 'transactions' | 'signers' | 'pending'>('overview');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(8);
  const [pendingItems, setPendingItems] = useState(MOCK_PENDING);

  const totalPages = Math.max(1, Math.ceil(MOCK_TRANSACTIONS.length / pageSize));
  const safePage = Math.min(page, totalPages);
  const startIdx = (safePage - 1) * pageSize;
  const endIdx = Math.min(startIdx + pageSize, MOCK_TRANSACTIONS.length);
  const paged = MOCK_TRANSACTIONS.slice(startIdx, endIdx);

  useEffect(() => {
    setPage(1);
  }, [pageSize]);

  const treasuryBalance = 4287650;
  const usdEquivalent = treasuryBalance * 1.24;
  const change24h = 2.4;

  const stats = useMemo(() => {
    const confirmed = MOCK_TRANSACTIONS.filter(tx => tx.status === 'confirmed').length;
    const pending = MOCK_TRANSACTIONS.filter(tx => tx.status === 'pending').length;
    const outgoing = MOCK_TRANSACTIONS
      .filter(tx => tx.status === 'confirmed' && tx.direction === 'outgoing')
      .reduce((s, tx) => s + tx.amount, 0);
    const incoming = MOCK_TRANSACTIONS
      .filter(tx => tx.status === 'confirmed' && tx.direction === 'incoming')
      .reduce((s, tx) => s + tx.amount, 0);
    return { confirmed, pending, outgoing, incoming };
  }, []);

  const handleApproval = (id: string, action: 'approve' | 'reject') => {
    setPendingItems(prev => prev.filter(p => p.id !== id));
    void action;
  };

  const tabs: { key: typeof activeTab; label: string }[] = [
    { key: 'overview', label: t('admin.wallet.tabs.overview') },
    { key: 'transactions', label: t('admin.wallet.tabs.transactions') },
    { key: 'signers', label: t('admin.wallet.tabs.signers') },
    { key: 'pending', label: t('admin.wallet.tabs.pending', { count: pendingItems.length }) },
  ];

  return (
    <AdminLayout
      title={t('admin.wallet.title')}
      subtitle={t('admin.wallet.subtitle')}
      headerActions={
        <>
          <button className="hidden sm:inline-flex items-center gap-2 px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 hover:border-blue-500 text-sm font-semibold transition-colors">
            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4" /><polyline points="7 10 12 15 17 10" /><line x1="12" y1="15" x2="12" y2="3" /></svg>
            {t('admin.wallet.actions.exportHistory')}
          </button>
          <button className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold transition-colors shadow-sm">
            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" /></svg>
            {t('admin.wallet.actions.propose')}
          </button>
        </>
      }
    >
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <div className="md:col-span-1 bg-gradient-to-br from-indigo-600 via-purple-600 to-pink-600 rounded-2xl p-6 text-white shadow-lg">
          <div className="flex items-center justify-between mb-3">
            <div className="text-xs uppercase tracking-wider opacity-90">{t('admin.wallet.treasuryBalance')}</div>
            <svg className="w-8 h-8 opacity-80" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 12V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2h14a2 2 0 002-2v-5" /><path d="M16 12h.01M8 12h.01M12 16h.01" /></svg>
          </div>
          <div className="text-4xl font-black mb-1">{treasuryBalance.toLocaleString('en-US')}</div>
          <div className="text-sm opacity-90 mb-4">IOES</div>
          <div className="flex items-end justify-between pt-3 border-t border-white/20">
            <div>
              <div className="text-xs opacity-80 mb-1">≈ USD</div>
              <div className="text-lg font-bold">${usdEquivalent.toLocaleString('en-US', { maximumFractionDigits: 0 })}</div>
            </div>
            <div className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-emerald-500/30 text-xs font-bold">
              <svg className="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="18 15 12 9 6 15" /></svg>
              +{change24h}%
            </div>
          </div>
        </div>
        <div className="bg-white dark:bg-slate-800/40 rounded-2xl border border-slate-200 dark:border-slate-800 p-6">
          <div className="text-xs uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-3">{t('admin.wallet.signers')}</div>
          <div className="text-4xl font-bold text-slate-900 dark:text-white mb-1">{MOCK_SIGNERS.length}</div>
          <div className="text-sm text-slate-500 dark:text-slate-400 mb-3">{t('admin.wallet.activeSigners')}</div>
          <div className="flex -space-x-2">
            {MOCK_SIGNERS.slice(0, 5).map((s, i) => (
              <div key={s.id} className={`w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-bold border-2 border-white dark:border-slate-800 ${['bg-blue-500', 'bg-emerald-500', 'bg-amber-500', 'bg-rose-500', 'bg-indigo-500'][i]}`}>
                {s.name.charAt(0)}
              </div>
            ))}
          </div>
        </div>
        <div className="bg-white dark:bg-slate-800/40 rounded-2xl border border-slate-200 dark:border-slate-800 p-6">
          <div className="text-xs uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-3">{t('admin.wallet.multisig')}</div>
          <div className="flex items-baseline gap-2 mb-2">
            <span className="text-4xl font-bold text-slate-900 dark:text-white">3</span>
            <span className="text-2xl text-slate-400">/</span>
            <span className="text-4xl font-bold text-slate-900 dark:text-white">5</span>
          </div>
          <div className="text-sm text-slate-500 dark:text-slate-400 mb-3">{t('admin.wallet.thresholdRequired')}</div>
          <div className="h-2 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
            <div className="h-full bg-gradient-to-r from-blue-500 to-indigo-600 rounded-full" style={{ width: '60%' }} />
          </div>
        </div>
      </div>

      <div className="bg-white dark:bg-slate-800/40 rounded-2xl border border-slate-200 dark:border-slate-800 overflow-hidden">
        <div className="border-b border-slate-200 dark:border-slate-800 px-2 overflow-x-auto">
          <div className="flex gap-1">
            {tabs.map((tab) => (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                className={`px-5 py-3.5 text-sm font-semibold transition-colors border-b-2 whitespace-nowrap ${
                  activeTab === tab.key
                    ? 'border-blue-600 text-blue-600 dark:text-blue-400'
                    : 'border-transparent text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        <div className="p-6">
          {activeTab === 'overview' && (
            <div className="grid lg:grid-cols-3 gap-6">
              <div className="lg:col-span-2">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-bold text-slate-900 dark:text-white">{t('admin.wallet.multisigConfig')}</h3>
                  <button className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 hover:border-blue-500 text-xs font-semibold transition-colors">
                    <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7" /><path d="M18.5 2.5a2.121 2.121 0 113 3L12 15l-4 1 1-4 9.5-9.5z" /></svg>
                    {t('admin.wallet.editConfig')}
                  </button>
                </div>
                <div className="grid sm:grid-cols-2 gap-3 mb-6">
                  <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-900/50">
                    <div className="text-xs uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1">{t('admin.wallet.config.threshold')}</div>
                    <div className="text-xl font-bold text-slate-900 dark:text-white">3 {t('admin.wallet.of')} 5</div>
                  </div>
                  <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-900/50">
                    <div className="text-xs uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1">{t('admin.wallet.config.dailyLimit')}</div>
                    <div className="text-xl font-bold text-slate-900 dark:text-white">100,000 IOES</div>
                  </div>
                  <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-900/50">
                    <div className="text-xs uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1">{t('admin.wallet.config.timeLock')}</div>
                    <div className="text-xl font-bold text-slate-900 dark:text-white">24h</div>
                  </div>
                  <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-900/50">
                    <div className="text-xs uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1">{t('admin.wallet.config.chain')}</div>
                    <div className="text-xl font-bold text-slate-900 dark:text-white">Ethereum</div>
                  </div>
                </div>

                <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-4">{t('admin.wallet.recentTx')}</h3>
                <div className="space-y-2">
                  {MOCK_TRANSACTIONS.slice(0, 5).map(tx => (
                    <div key={tx.id} className="flex items-center gap-3 p-3 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-900/50 transition-colors">
                      <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${tx.direction === 'incoming' ? 'bg-emerald-50 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-400' : 'bg-rose-50 text-rose-600 dark:bg-rose-900/30 dark:text-rose-400'}`}>
                        {tx.direction === 'incoming' ? (
                          <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="17 11 12 6 7 11" /><polyline points="17 18 12 13 7 18" /></svg>
                        ) : (
                          <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="7 13 12 18 17 13" /><polyline points="7 6 12 11 17 6" /></svg>
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="font-semibold text-sm text-slate-900 dark:text-white truncate">{tx.category}</div>
                        <div className="text-xs text-slate-500 dark:text-slate-400">{tx.timestamp}</div>
                      </div>
                      <div className={`font-bold text-sm ${tx.direction === 'incoming' ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}`}>
                        {tx.direction === 'incoming' ? '+' : '-'}{tx.amount.toLocaleString('en-US')}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
              <div>
                <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-4">{t('admin.wallet.activitySummary')}</h3>
                <div className="space-y-3">
                  <div className="p-4 rounded-xl bg-emerald-50 dark:bg-emerald-900/30">
                    <div className="text-xs uppercase tracking-wider text-emerald-600 dark:text-emerald-400 mb-1">{t('admin.wallet.summary.confirmed')}</div>
                    <div className="text-2xl font-bold text-slate-900 dark:text-white">{stats.confirmed}</div>
                  </div>
                  <div className="p-4 rounded-xl bg-amber-50 dark:bg-amber-900/30">
                    <div className="text-xs uppercase tracking-wider text-amber-600 dark:text-amber-400 mb-1">{t('admin.wallet.summary.pending')}</div>
                    <div className="text-2xl font-bold text-slate-900 dark:text-white">{stats.pending}</div>
                  </div>
                  <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-900/50">
                    <div className="text-xs uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1">{t('admin.wallet.summary.outgoing')}</div>
                    <div className="text-2xl font-bold text-slate-900 dark:text-white">{stats.outgoing.toLocaleString('en-US')}</div>
                  </div>
                  <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-900/50">
                    <div className="text-xs uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1">{t('admin.wallet.summary.incoming')}</div>
                    <div className="text-2xl font-bold text-slate-900 dark:text-white">{stats.incoming.toLocaleString('en-US')}</div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'transactions' && (
            <>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-slate-50 dark:bg-slate-800/50 text-xs uppercase tracking-wider text-slate-500 dark:text-slate-400">
                    <tr>
                      <th className="px-5 py-3 text-left font-semibold">{t('admin.wallet.table.hash')}</th>
                      <th className="px-5 py-3 text-left font-semibold">{t('admin.wallet.table.from')}</th>
                      <th className="px-5 py-3 text-left font-semibold">{t('admin.wallet.table.to')}</th>
                      <th className="px-5 py-3 text-right font-semibold">{t('admin.wallet.table.amount')}</th>
                      <th className="px-5 py-3 text-center font-semibold">{t('admin.wallet.table.signatures')}</th>
                      <th className="px-5 py-3 text-left font-semibold">{t('admin.wallet.table.status')}</th>
                      <th className="px-5 py-3 text-left font-semibold">{t('admin.wallet.table.time')}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                    {paged.map((tx) => {
                      const ss = statusStyles[tx.status];
                      return (
                        <tr key={tx.id} className="hover:bg-slate-50 dark:hover:bg-slate-900/40 transition-colors">
                          <td className="px-5 py-4">
                            <span className="font-mono text-xs text-slate-600 dark:text-slate-300">{TRUNCATE(tx.hash, 6, 4)}</span>
                          </td>
                          <td className="px-5 py-4 font-mono text-xs text-slate-600 dark:text-slate-300">{TRUNCATE(tx.from, 6, 4)}</td>
                          <td className="px-5 py-4 font-mono text-xs text-slate-600 dark:text-slate-300">{TRUNCATE(tx.to, 6, 4)}</td>
                          <td className="px-5 py-4 text-right">
                            <div className={`font-bold ${tx.direction === 'incoming' ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}`}>
                              {tx.direction === 'incoming' ? '+' : '-'}{tx.amount.toLocaleString('en-US')}
                            </div>
                            <div className="text-[10px] text-slate-500">{tx.category}</div>
                          </td>
                          <td className="px-5 py-4 text-center">
                            <div className="inline-flex items-center gap-1">
                              {Array.from({ length: tx.signaturesRequired }).map((_, i) => (
                                <span
                                  key={i}
                                  className={`w-2 h-2 rounded-full ${i < tx.signaturesCollected ? 'bg-emerald-500' : 'bg-slate-300 dark:bg-slate-600'}`}
                                />
                              ))}
                            </div>
                            <div className="text-[10px] text-slate-500 mt-0.5">{tx.signaturesCollected}/{tx.signaturesRequired}</div>
                          </td>
                          <td className="px-5 py-4">
                            <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-[11px] font-bold uppercase ${ss.bg} ${ss.text}`}>
                              {t(`admin.wallet.status.${tx.status}`)}
                            </span>
                          </td>
                          <td className="px-5 py-4 whitespace-nowrap text-slate-600 dark:text-slate-300">{tx.timestamp}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
              <PaginationBar
                i18nKey="admin.wallet"
                page={safePage}
                totalPages={totalPages}
                pageSize={pageSize}
                startIdx={startIdx}
                endIdx={endIdx}
                total={MOCK_TRANSACTIONS.length}
                onPageChange={setPage}
                onPageSizeChange={setPageSize}
                pageSizeOptions={[8, 12, 20]}
              />
            </>
          )}

          {activeTab === 'signers' && (
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {MOCK_SIGNERS.map((signer, i) => (
                <div key={signer.id} className="p-5 rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900">
                  <div className="flex items-start gap-3 mb-3">
                    <div className={`w-12 h-12 rounded-xl flex items-center justify-center text-white font-bold text-lg shrink-0 ${['bg-blue-500', 'bg-emerald-500', 'bg-amber-500', 'bg-rose-500', 'bg-indigo-500'][i]}`}>
                      {signer.name.charAt(0)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="font-bold text-slate-900 dark:text-white">{signer.name}</div>
                      <div className="text-xs text-slate-500 dark:text-slate-400">{signer.role}</div>
                    </div>
                    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${signer.status === 'active' ? 'bg-emerald-50 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-400' : 'bg-slate-100 text-slate-500'}`}>
                      <span className={`w-1.5 h-1.5 rounded-full ${signer.status === 'active' ? 'bg-emerald-500' : 'bg-slate-400'}`} />
                      {t(`admin.wallet.signerStatus.${signer.status}`)}
                    </span>
                  </div>
                  <div className="mb-3">
                    <div className="text-[10px] uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1">{t('admin.wallet.signerAddress')}</div>
                    <div className="font-mono text-xs text-slate-700 dark:text-slate-300 break-all">{TRUNCATE(signer.address, 8, 6)}</div>
                  </div>
                  <div className="flex items-center justify-between pt-3 border-t border-slate-100 dark:border-slate-700">
                    <div>
                      <div className="text-[10px] uppercase tracking-wider text-slate-500 dark:text-slate-400">{t('admin.wallet.votingPower')}</div>
                      <div className="font-bold text-slate-900 dark:text-white">{signer.votingPower}</div>
                    </div>
                    <button className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-rose-200 text-rose-600 hover:bg-rose-50 dark:border-rose-800/50 dark:hover:bg-rose-900/30 text-xs font-semibold transition-colors">
                      <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="3 6 5 6 21 6" /><path d="M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6" /></svg>
                      {t('admin.wallet.remove')}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}

          {activeTab === 'pending' && (
            <div className="space-y-4">
              {pendingItems.length === 0 ? (
                <div className="text-center py-12 text-slate-500 dark:text-slate-400">{t('admin.wallet.noPending')}</div>
              ) : (
                pendingItems.map(p => (
                  <div key={p.id} className="p-5 rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900">
                    <div className="flex flex-wrap items-start justify-between gap-3 mb-4">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="px-2 py-0.5 rounded-md bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 text-[10px] font-bold uppercase">{p.category}</span>
                          <span className="text-xs text-slate-500 dark:text-slate-400">{p.createdAt}</span>
                        </div>
                        <h4 className="font-bold text-slate-900 dark:text-white mb-1">{p.reason}</h4>
                        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-500 dark:text-slate-400">
                          <span><span className="font-semibold">{t('admin.wallet.proposer')}:</span> {p.proposer}</span>
                          <span className="font-mono">{TRUNCATE(p.hash, 8, 6)}</span>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-2xl font-bold text-slate-900 dark:text-white">{p.amount.toLocaleString('en-US')}</div>
                        <div className="text-xs text-slate-500">IOES</div>
                      </div>
                    </div>

                    <div className="mb-4 p-3 rounded-xl bg-slate-50 dark:bg-slate-900/50">
                      <div className="flex items-center justify-between text-xs mb-2">
                        <span className="font-semibold text-slate-700 dark:text-slate-300">{t('admin.wallet.signatureProgress')}</span>
                        <span className="text-slate-500">{p.signaturesCollected} / {p.signaturesRequired}</span>
                      </div>
                      <div className="h-2 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
                        <div className="h-full bg-gradient-to-r from-blue-500 to-indigo-600 rounded-full transition-all" style={{ width: `${(p.signaturesCollected / p.signaturesRequired) * 100}%` }} />
                      </div>
                    </div>

                    <div className="flex flex-wrap gap-2">
                      <button
                        onClick={() => handleApproval(p.id, 'approve')}
                        className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-semibold transition-colors"
                      >
                        <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="20 6 9 17 4 12" /></svg>
                        {t('admin.wallet.approve')}
                      </button>
                      <button
                        onClick={() => handleApproval(p.id, 'reject')}
                        className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl border border-rose-200 text-rose-600 hover:bg-rose-50 dark:border-rose-800/50 dark:hover:bg-rose-900/30 text-sm font-semibold transition-colors"
                      >
                        <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>
                        {t('admin.wallet.reject')}
                      </button>
                      <button className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 hover:border-blue-500 text-sm font-semibold transition-colors">
                        <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" /><circle cx="12" cy="12" r="3" /></svg>
                        {t('admin.wallet.viewDetails')}
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          )}
        </div>
      </div>
    </AdminLayout>
  );
};

export default WalletPage;