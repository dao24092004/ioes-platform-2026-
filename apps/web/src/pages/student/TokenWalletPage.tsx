import React, { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import StudentLayout from '@/components/layout/StudentLayout';
import PaginationBar from '@/components/common/PaginationBar';

type TxType = 'earn' | 'spend';
type TxCategory =
  | 'lesson'
  | 'exam'
  | 'streak'
  | 'review'
  | 'course_redeem'
  | 'certificate'
  | 'avatar'
  | 'donation'
  | 'bonus'
  | 'referral';

interface Transaction {
  id: string;
  date: string;
  type: TxType;
  category: TxCategory;
  description: string;
  amount: number;
  balanceAfter: number;
}

interface EarnRule {
  id: string;
  title: string;
  description: string;
  reward: number;
  dailyLimit: number;
  earnedToday: number;
  icon: React.ReactNode;
  tone: string;
}

interface SpendItem {
  id: string;
  title: string;
  description: string;
  cost: number;
  category: 'course' | 'cosmetic' | 'certificate' | 'donation';
  available: boolean;
  icon: React.ReactNode;
}

const CATEGORY_LABELS: Record<TxCategory, string> = {
  lesson: 'lesson',
  exam: 'exam',
  streak: 'streak',
  review: 'review',
  course_redeem: 'course',
  certificate: 'certificate',
  avatar: 'avatar',
  donation: 'donation',
  bonus: 'bonus',
  referral: 'referral',
};

const buildTransactions = (): Transaction[] => {
  const list: Omit<Transaction, 'id' | 'balanceAfter'>[] = [
    { date: '2026-08-24', type: 'earn', category: 'streak', description: '7-day learning streak', amount: 10 },
    { date: '2026-08-24', type: 'earn', category: 'lesson', description: 'Completed: React Hooks Deep Dive', amount: 5 },
    { date: '2026-08-23', type: 'spend', category: 'avatar', description: 'Unlocked avatar frame: Galaxy', amount: -25 },
    { date: '2026-08-23', type: 'earn', category: 'exam', description: 'Passed System Design Mock Exam (92%)', amount: 20 },
    { date: '2026-08-22', type: 'earn', category: 'review', description: 'Helpful review bonus', amount: 3 },
    { date: '2026-08-22', type: 'spend', category: 'course_redeem', description: 'Redeemed: TypeScript Deep Dive', amount: -120 },
    { date: '2026-08-21', type: 'earn', category: 'lesson', description: 'Completed: Async/Await Patterns', amount: 5 },
    { date: '2026-08-21', type: 'earn', category: 'bonus', description: 'Weekend study bonus', amount: 8 },
    { date: '2026-08-20', type: 'earn', category: 'referral', description: 'Friend joined via your invite', amount: 50 },
    { date: '2026-08-20', type: 'spend', category: 'certificate', description: 'Physical certificate framing', amount: -50 },
    { date: '2026-08-19', type: 'earn', category: 'lesson', description: 'Completed: CSS Grid Mastery', amount: 5 },
    { date: '2026-08-19', type: 'earn', category: 'exam', description: 'Passed React Basics Quiz (88%)', amount: 15 },
    { date: '2026-08-18', type: 'spend', category: 'donation', description: 'Donated to Open Source fund', amount: -20 },
    { date: '2026-08-18', type: 'earn', category: 'lesson', description: 'Completed: Node Streams Basics', amount: 5 },
    { date: '2026-08-17', type: 'earn', category: 'streak', description: '30-day milestone bonus', amount: 30 },
    { date: '2026-08-17', type: 'earn', category: 'exam', description: 'Passed Algorithms Quiz (95%)', amount: 20 },
    { date: '2026-08-16', type: 'spend', category: 'avatar', description: 'Unlocked avatar frame: Ocean', amount: -25 },
    { date: '2026-08-16', type: 'earn', category: 'lesson', description: 'Completed: Git Workflows', amount: 5 },
    { date: '2026-08-15', type: 'earn', category: 'bonus', description: 'Course completion bonus', amount: 25 },
    { date: '2026-08-15', type: 'earn', category: 'lesson', description: 'Completed: SQL Joins', amount: 5 },
    { date: '2026-08-14', type: 'spend', category: 'course_redeem', description: 'Redeemed: Docker for Beginners', amount: -80 },
    { date: '2026-08-14', type: 'earn', category: 'review', description: 'Helpful review bonus', amount: 3 },
    { date: '2026-08-13', type: 'earn', category: 'lesson', description: 'Completed: REST API Design', amount: 5 },
    { date: '2026-08-13', type: 'earn', category: 'exam', description: 'Passed Docker Quiz (90%)', amount: 20 },
    { date: '2026-08-12', type: 'earn', category: 'lesson', description: 'Completed: Linux CLI', amount: 5 },
    { date: '2026-08-11', type: 'earn', category: 'streak', description: '7-day learning streak', amount: 10 },
    { date: '2026-08-11', type: 'spend', category: 'donation', description: 'Donated to Scholarship fund', amount: -30 },
    { date: '2026-08-10', type: 'earn', category: 'lesson', description: 'Completed: React Patterns', amount: 5 },
    { date: '2026-08-10', type: 'earn', category: 'referral', description: 'Friend signed up for course', amount: 50 },
    { date: '2026-08-09', type: 'earn', category: 'bonus', description: 'Daily login bonus', amount: 2 },
  ];

  let balance = 1420;
  return list.map((tx, i) => {
    balance -= tx.amount;
    return { ...tx, id: `tx-${i}`, balanceAfter: balance };
  });
};

const MOCK_TRANSACTIONS: Transaction[] = buildTransactions();

const MOCK_EARN_RULES: EarnRule[] = [
  {
    id: 'e1',
    title: 'lesson',
    description: 'earn.lessonDesc',
    reward: 5,
    dailyLimit: 10,
    earnedToday: 15,
    tone: 'blue',
    icon: <svg className="w-6 h-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M2 3h6a4 4 0 014 4v14a3 3 0 00-3-3H2z" /><path d="M22 3h-6a4 4 0 00-4 4v14a3 3 0 013-3h7z" /></svg>,
  },
  {
    id: 'e2',
    title: 'exam',
    description: 'earn.examDesc',
    reward: 20,
    dailyLimit: 5,
    earnedToday: 20,
    tone: 'emerald',
    icon: <svg className="w-6 h-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M9 11l3 3L22 4" /><path d="M21 12v7a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2h11" /></svg>,
  },
  {
    id: 'e3',
    title: 'streak7',
    description: 'earn.streak7Desc',
    reward: 10,
    dailyLimit: 1,
    earnedToday: 10,
    tone: 'amber',
    icon: <svg className="w-6 h-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M8.5 14.5A2.5 2.5 0 0011 12c0-1.38-.5-2-1-3-1.072-2.143-.224-4.054 2-6 .5 2.5 2 4.9 4 6.5 2 1.6 3 3.5 3 5.5a7 7 0 11-14 0c0-1.153.433-2.294 1-3a2.5 2.5 0 002.5 2.5z" /></svg>,
  },
  {
    id: 'e4',
    title: 'streak30',
    description: 'earn.streak30Desc',
    reward: 30,
    dailyLimit: 1,
    earnedToday: 0,
    tone: 'orange',
    icon: <svg className="w-6 h-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10" /><circle cx="12" cy="12" r="6" /><circle cx="12" cy="12" r="2" /></svg>,
  },
  {
    id: 'e5',
    title: 'review',
    description: 'earn.reviewDesc',
    reward: 3,
    dailyLimit: 10,
    earnedToday: 6,
    tone: 'purple',
    icon: <svg className="w-6 h-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" /></svg>,
  },
  {
    id: 'e6',
    title: 'referral',
    description: 'earn.referralDesc',
    reward: 50,
    dailyLimit: 5,
    earnedToday: 0,
    tone: 'rose',
    icon: <svg className="w-6 h-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M16 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2" /><circle cx="8.5" cy="7" r="4" /><line x1="20" y1="8" x2="20" y2="14" /><line x1="23" y1="11" x2="17" y2="11" /></svg>,
  },
];

const MOCK_SPEND_ITEMS: SpendItem[] = [
  {
    id: 's1',
    title: 'spend.premiumCourse',
    description: 'spend.premiumCourseDesc',
    cost: 200,
    category: 'course',
    available: true,
    icon: <svg className="w-6 h-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M2 3h6a4 4 0 014 4v14a3 3 0 00-3-3H2z" /><path d="M22 3h-6a4 4 0 00-4 4v14a3 3 0 013-3h7z" /></svg>,
  },
  {
    id: 's2',
    title: 'spend.physicalCert',
    description: 'spend.physicalCertDesc',
    cost: 50,
    category: 'certificate',
    available: true,
    icon: <svg className="w-6 h-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="8" r="7" /><polyline points="8.21 13.89 7 23 12 20 17 23 15.79 13.88" /></svg>,
  },
  {
    id: 's3',
    title: 'spend.mentorSession',
    description: 'spend.mentorSessionDesc',
    cost: 150,
    category: 'course',
    available: true,
    icon: <svg className="w-6 h-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z" /></svg>,
  },
  {
    id: 's4',
    title: 'spend.profileFrame',
    description: 'spend.profileFrameDesc',
    cost: 25,
    category: 'cosmetic',
    available: true,
    icon: <svg className="w-6 h-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="3" width="18" height="18" rx="2" /><circle cx="8.5" cy="8.5" r="1.5" /><polyline points="21 15 16 10 5 21" /></svg>,
  },
  {
    id: 's5',
    title: 'spend.featuredWeek',
    description: 'spend.featuredWeekDesc',
    cost: 300,
    category: 'cosmetic',
    available: false,
    icon: <svg className="w-6 h-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" /></svg>,
  },
  {
    id: 's6',
    title: 'spend.donateOSS',
    description: 'spend.donateOSSDesc',
    cost: 20,
    category: 'donation',
    available: true,
    icon: <svg className="w-6 h-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M20.84 4.61a5.5 5.5 0 00-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 00-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 000-7.78z" /></svg>,
  },
];

const toneClass: Record<string, string> = {
  blue: 'bg-blue-50 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400',
  emerald: 'bg-emerald-50 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-400',
  amber: 'bg-amber-50 text-amber-600 dark:bg-amber-900/30 dark:text-amber-400',
  orange: 'bg-orange-50 text-orange-600 dark:bg-orange-900/30 dark:text-orange-400',
  purple: 'bg-purple-50 text-purple-600 dark:bg-purple-900/30 dark:text-purple-400',
  rose: 'bg-rose-50 text-rose-600 dark:bg-rose-900/30 dark:text-rose-400',
};

const formatDate = (iso: string): string => {
  const d = new Date(iso);
  return `${String(d.getFullYear())}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

const TokenWalletPage: React.FC = () => {
  const { t } = useTranslation();
  const [activeTab, setActiveTab] = useState<'overview' | 'earn' | 'spend' | 'history'>('overview');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  const totalEarned = useMemo(() => MOCK_TRANSACTIONS.filter(tx => tx.type === 'earn').reduce((sum, tx) => sum + tx.amount, 0), []);
  const totalSpent = useMemo(() => MOCK_TRANSACTIONS.filter(tx => tx.type === 'spend').reduce((sum, tx) => sum + Math.abs(tx.amount), 0), []);
  const currentBalance = MOCK_TRANSACTIONS[0]?.balanceAfter ?? 0;
  const pendingRewards = 45;

  const totalPages = Math.max(1, Math.ceil(MOCK_TRANSACTIONS.length / pageSize));
  const safePage = Math.min(page, totalPages);
  const startIdx = (safePage - 1) * pageSize;
  const endIdx = Math.min(startIdx + pageSize, MOCK_TRANSACTIONS.length);
  const paged = MOCK_TRANSACTIONS.slice(startIdx, endIdx);
  const recentFive = MOCK_TRANSACTIONS.slice(0, 5);

  useEffect(() => {
    setPage(1);
  }, [pageSize]);

  const tabs: { key: typeof activeTab; label: string }[] = [
    { key: 'overview', label: t('student.tokenWallet.tabs.overview') },
    { key: 'earn', label: t('student.tokenWallet.tabs.earn') },
    { key: 'spend', label: t('student.tokenWallet.tabs.spend') },
    { key: 'history', label: t('student.tokenWallet.tabs.history') },
  ];

  return (
    <StudentLayout
      title={t('student.tokenWallet.title')}
      subtitle={t('student.tokenWallet.subtitle')}
      headerActions={
        <button className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold transition-colors shadow-sm">
          <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="23 6 13.5 15.5 8.5 10.5 1 18" /><polyline points="17 6 23 6 23 12" /></svg>
          {t('student.tokenWallet.actions.transfer')}
        </button>
      }
    >
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4 mb-6">
        <div className="bg-gradient-to-br from-blue-600 via-indigo-600 to-purple-700 rounded-2xl p-5 text-white shadow-lg">
          <div className="flex items-center justify-between mb-2">
            <div className="text-xs uppercase tracking-wider opacity-80">{t('student.tokenWallet.stats.currentBalance')}</div>
            <svg className="w-6 h-6 opacity-80" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10" /><path d="M12 6v12M8 10h8M8 14h8" /></svg>
          </div>
          <div className="text-3xl font-bold">{currentBalance.toLocaleString('en-US')}</div>
          <div className="text-xs opacity-80 mt-1">IOES</div>
        </div>
        {[
          { label: t('student.tokenWallet.stats.lifetimeEarned'), value: totalEarned, icon: <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="23 6 13.5 15.5 8.5 10.5 1 18" /><polyline points="17 6 23 6 23 12" /></svg>, tone: 'emerald' },
          { label: t('student.tokenWallet.stats.lifetimeSpent'), value: totalSpent, icon: <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="23 18 13.5 8.5 8.5 13.5 1 6" /><polyline points="17 18 23 18 23 12" /></svg>, tone: 'amber' },
          { label: t('student.tokenWallet.stats.pending'), value: pendingRewards, icon: <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" /></svg>, tone: 'blue' },
        ].map((card) => (
          <div key={card.label} className="bg-white dark:bg-slate-800/40 rounded-2xl border border-slate-200 dark:border-slate-800 p-5">
            <div className="flex items-start justify-between mb-3">
              <div className={`w-11 h-11 rounded-xl flex items-center justify-center ${toneClass[card.tone]}`}>{card.icon}</div>
            </div>
            <div className="text-2xl font-bold text-slate-900 dark:text-white">+{card.value.toLocaleString('en-US')}</div>
            <div className="text-sm text-slate-500 dark:text-slate-400 mt-1">{card.label}</div>
          </div>
        ))}
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
                <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-4">{t('student.tokenWallet.recentTransactions')}</h3>
                <div className="space-y-2">
                  {recentFive.map((tx) => {
                    const isEarn = tx.type === 'earn';
                    return (
                      <div key={tx.id} className="flex items-center gap-3 p-3 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-900/50 transition-colors">
                        <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${isEarn ? 'bg-emerald-50 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-400' : 'bg-rose-50 text-rose-600 dark:bg-rose-900/30 dark:text-rose-400'}`}>
                          {isEarn ? (
                            <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="17 11 12 6 7 11" /><polyline points="17 18 12 13 7 18" /></svg>
                          ) : (
                            <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="7 13 12 18 17 13" /><polyline points="7 6 12 11 17 6" /></svg>
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="font-semibold text-sm text-slate-900 dark:text-white truncate">{tx.description}</div>
                          <div className="text-xs text-slate-500 dark:text-slate-400">{formatDate(tx.date)} · {t(`student.tokenWallet.category.${CATEGORY_LABELS[tx.category]}`)}</div>
                        </div>
                        <div className={`text-base font-bold ${isEarn ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}`}>
                          {isEarn ? '+' : ''}{tx.amount}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
              <div>
                <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-4">{t('student.tokenWallet.quickActions')}</h3>
                <div className="space-y-3">
                  <button className="w-full inline-flex items-center justify-between px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-700 hover:border-blue-500 hover:bg-blue-50 dark:hover:bg-blue-900/30 text-sm font-semibold transition-colors">
                    <span className="flex items-center gap-2 text-slate-700 dark:text-slate-200">
                      <svg className="w-4 h-4 text-blue-600" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4" /><polyline points="17 8 12 3 7 8" /><line x1="12" y1="3" x2="12" y2="15" /></svg>
                      {t('student.tokenWallet.actions.earnMore')}
                    </span>
                    <svg className="w-4 h-4 text-slate-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="9 18 15 12 9 6" /></svg>
                  </button>
                  <button className="w-full inline-flex items-center justify-between px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-700 hover:border-blue-500 hover:bg-blue-50 dark:hover:bg-blue-900/30 text-sm font-semibold transition-colors">
                    <span className="flex items-center gap-2 text-slate-700 dark:text-slate-200">
                      <svg className="w-4 h-4 text-blue-600" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z" /><polyline points="9 22 9 12 15 12 15 22" /></svg>
                      {t('student.tokenWallet.actions.browseMarket')}
                    </span>
                    <svg className="w-4 h-4 text-slate-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="9 18 15 12 9 6" /></svg>
                  </button>
                  <button className="w-full inline-flex items-center justify-between px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-700 hover:border-blue-500 hover:bg-blue-50 dark:hover:bg-blue-900/30 text-sm font-semibold transition-colors">
                    <span className="flex items-center gap-2 text-slate-700 dark:text-slate-200">
                      <svg className="w-4 h-4 text-blue-600" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M16 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2" /><circle cx="8.5" cy="7" r="4" /><line x1="20" y1="8" x2="20" y2="14" /><line x1="23" y1="11" x2="17" y2="11" /></svg>
                      {t('student.tokenWallet.actions.inviteFriends')}
                    </span>
                    <svg className="w-4 h-4 text-slate-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="9 18 15 12 9 6" /></svg>
                  </button>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'earn' && (
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {MOCK_EARN_RULES.map((rule) => {
                const pct = Math.min(100, Math.round((rule.earnedToday / (rule.dailyLimit * rule.reward)) * 100));
                return (
                  <div key={rule.id} className="p-5 rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900">
                    <div className={`w-12 h-12 rounded-xl flex items-center justify-center mb-3 ${toneClass[rule.tone]}`}>{rule.icon}</div>
                    <div className="font-bold text-slate-900 dark:text-white mb-1">{t(`student.tokenWallet.earn.${rule.title}`)}</div>
                    <div className="text-xs text-slate-500 dark:text-slate-400 mb-3">{t(`student.tokenWallet.${rule.description}`)}</div>
                    <div className="flex items-center justify-between text-sm mb-2">
                      <span className="font-bold text-blue-600 dark:text-blue-400">+{rule.reward} {t('student.tokenWallet.tokensPerAction')}</span>
                      <span className="text-xs text-slate-500 dark:text-slate-400">{rule.earnedToday}/{rule.dailyLimit * rule.reward}</span>
                    </div>
                    <div className="h-2 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                      <div className={`h-full rounded-full transition-all ${rule.tone === 'emerald' ? 'bg-emerald-500' : rule.tone === 'amber' ? 'bg-amber-500' : rule.tone === 'orange' ? 'bg-orange-500' : rule.tone === 'purple' ? 'bg-purple-500' : rule.tone === 'rose' ? 'bg-rose-500' : 'bg-blue-500'}`} style={{ width: `${pct}%` }} />
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {activeTab === 'spend' && (
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {MOCK_SPEND_ITEMS.map((item) => (
                <div key={item.id} className={`p-5 rounded-2xl border bg-white dark:bg-slate-900 transition-colors ${item.available ? 'border-slate-200 dark:border-slate-700' : 'border-slate-200 dark:border-slate-800 opacity-70'}`}>
                  <div className="flex items-start justify-between mb-3">
                    <div className="w-12 h-12 rounded-xl flex items-center justify-center bg-gradient-to-br from-blue-500 to-indigo-600 text-white">{item.icon}</div>
                    <span className="inline-flex items-center px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-xs font-semibold text-slate-600 dark:text-slate-300">
                      {t(`student.tokenWallet.spendCategory.${item.category}`)}
                    </span>
                  </div>
                  <div className="font-bold text-slate-900 dark:text-white mb-1">{t(`student.tokenWallet.${item.title}`)}</div>
                  <div className="text-xs text-slate-500 dark:text-slate-400 mb-4 line-clamp-2">{t(`student.tokenWallet.${item.description}`)}</div>
                  <div className="flex items-center justify-between">
                    <div className="font-bold text-blue-600 dark:text-blue-400">{item.cost} {t('student.tokenWallet.tokens')}</div>
                    <button
                      disabled={!item.available}
                      className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                        item.available
                          ? 'bg-blue-600 hover:bg-blue-700 text-white'
                          : 'bg-slate-100 dark:bg-slate-800 text-slate-400 cursor-not-allowed'
                      }`}
                    >
                      {item.available ? t('student.tokenWallet.redeem') : t('student.tokenWallet.locked')}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}

          {activeTab === 'history' && (
            <>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-slate-50 dark:bg-slate-800/50 text-xs uppercase tracking-wider text-slate-500 dark:text-slate-400">
                    <tr>
                      <th className="px-5 py-3 text-left font-semibold">{t('student.tokenWallet.table.date')}</th>
                      <th className="px-5 py-3 text-left font-semibold">{t('student.tokenWallet.table.type')}</th>
                      <th className="px-5 py-3 text-left font-semibold">{t('student.tokenWallet.table.description')}</th>
                      <th className="px-5 py-3 text-right font-semibold">{t('student.tokenWallet.table.amount')}</th>
                      <th className="px-5 py-3 text-right font-semibold">{t('student.tokenWallet.table.balance')}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                    {paged.map((tx) => {
                      const isEarn = tx.type === 'earn';
                      return (
                        <tr key={tx.id} className="hover:bg-slate-50 dark:hover:bg-slate-900/40 transition-colors">
                          <td className="px-5 py-4 whitespace-nowrap text-slate-700 dark:text-slate-300">{formatDate(tx.date)}</td>
                          <td className="px-5 py-4">
                            <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold uppercase ${isEarn ? 'bg-emerald-50 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400' : 'bg-rose-50 dark:bg-rose-900/30 text-rose-600 dark:text-rose-400'}`}>
                              {isEarn ? t('student.tokenWallet.type.earn') : t('student.tokenWallet.type.spend')}
                            </span>
                          </td>
                          <td className="px-5 py-4 text-slate-700 dark:text-slate-300">{tx.description}</td>
                          <td className={`px-5 py-4 text-right font-bold ${isEarn ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}`}>
                            {isEarn ? '+' : ''}{tx.amount}
                          </td>
                          <td className="px-5 py-4 text-right font-mono text-slate-700 dark:text-slate-300">{tx.balanceAfter.toLocaleString('en-US')}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
              <PaginationBar
                i18nKey="student.tokenWallet"
                page={safePage}
                totalPages={totalPages}
                pageSize={pageSize}
                startIdx={startIdx}
                endIdx={endIdx}
                total={MOCK_TRANSACTIONS.length}
                onPageChange={setPage}
                onPageSizeChange={setPageSize}
                pageSizeOptions={[10, 20, 30]}
              />
            </>
          )}
        </div>
      </div>
    </StudentLayout>
  );
};

export default TokenWalletPage;