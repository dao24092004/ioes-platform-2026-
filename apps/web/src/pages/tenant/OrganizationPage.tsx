import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';

type TabKey = 'overview' | 'members' | 'courses' | 'billing' | 'settings';
type MemberStatus = 'active' | 'invited' | 'suspended';
type MemberRole = 'owner' | 'admin' | 'instructor' | 'student';

interface Member {
  id: string;
  full_name: string;
  email: string;
  avatar?: string;
  role: MemberRole;
  status: MemberStatus;
  last_active: string;
  department: string;
}

interface ActivityEvent {
  id: string;
  who: string;
  action: string;
  target: string;
  at: string;
  icon: React.ReactNode;
  tone: 'blue' | 'emerald' | 'amber' | 'purple';
}

interface CourseItem {
  id: string;
  title: string;
  students: number;
  lessons: number;
  status: 'published' | 'draft' | 'archived';
  thumbnail: string;
  rating: number;
}

interface InvoiceItem {
  id: string;
  number: string;
  date: string;
  amount: number;
  status: 'paid' | 'pending' | 'overdue';
}

const MEMBERS: Member[] = [
  { id: 'm1', full_name: 'Nguyen Hoang Nam', email: 'nam.nh@fpt.edu.vn', role: 'owner', status: 'active', last_active: '2026-08-23T15:42:00Z', department: 'Computer Science' },
  { id: 'm2', full_name: 'Tran Thi Mai', email: 'mai.tt@fpt.edu.vn', role: 'admin', status: 'active', last_active: '2026-08-23T11:18:00Z', department: 'Mathematics' },
  { id: 'm3', full_name: 'Le Quang Vinh', email: 'vinh.lq@fpt.edu.vn', role: 'instructor', status: 'active', last_active: '2026-08-22T20:05:00Z', department: 'Computer Science' },
  { id: 'm4', full_name: 'Pham Thanh Binh', email: 'binh.pt@fpt.edu.vn', role: 'instructor', status: 'active', last_active: '2026-08-21T08:00:00Z', department: 'AI Lab' },
  { id: 'm5', full_name: 'Vu Minh Hieu', email: 'hieu.vm@fpt.edu.vn', role: 'student', status: 'active', last_active: '2026-08-24T01:10:00Z', department: 'Computer Science' },
  { id: 'm6', full_name: 'Hoang My Linh', email: 'linh.hm@fpt.edu.vn', role: 'student', status: 'invited', last_active: '—', department: 'Design' },
  { id: 'm7', full_name: 'Bui Quang Huy', email: 'huy.bq@fpt.edu.vn', role: 'student', status: 'suspended', last_active: '2026-08-10T14:00:00Z', department: 'Business' },
  { id: 'm8', full_name: 'Do Kim Anh', email: 'anh.dk@fpt.edu.vn', role: 'student', status: 'active', last_active: '2026-08-23T19:30:00Z', department: 'Computer Science' },
];

const COURSES: CourseItem[] = [
  { id: 'c1', title: 'Full-Stack Web Development Bootcamp 2026', students: 1245, lessons: 48, status: 'published', thumbnail: 'web', rating: 4.8 },
  { id: 'c2', title: 'AI Engineering Professional', students: 820, lessons: 36, status: 'published', thumbnail: 'ai', rating: 4.9 },
  { id: 'c3', title: 'Data Structures & Algorithms', students: 612, lessons: 42, status: 'published', thumbnail: 'algo', rating: 4.7 },
  { id: 'c4', title: 'Mobile App Development with React Native', students: 0, lessons: 30, status: 'draft', thumbnail: 'mobile', rating: 0 },
  { id: 'c5', title: 'Modern UI/UX Design Principles', students: 430, lessons: 24, status: 'published', thumbnail: 'design', rating: 4.6 },
  { id: 'c6', title: 'Blockchain Fundamentals (2024)', students: 0, lessons: 18, status: 'archived', thumbnail: 'blockchain', rating: 4.2 },
];

const INVOICES: InvoiceItem[] = [
  { id: 'i1', number: 'INV-2026-008', date: '2026-08-01', amount: 12990000, status: 'paid' },
  { id: 'i2', number: 'INV-2026-007', date: '2026-07-01', amount: 12990000, status: 'paid' },
  { id: 'i3', number: 'INV-2026-006', date: '2026-06-01', amount: 12990000, status: 'paid' },
  { id: 'i4', number: 'INV-2026-005', date: '2026-05-01', amount: 12990000, status: 'paid' },
  { id: 'i5', number: 'INV-2026-009', date: '2026-09-01', amount: 14990000, status: 'pending' },
];

const THUMBNAIL_GRADIENT: Record<string, string> = {
  web: 'from-blue-500 to-cyan-500',
  ai: 'from-purple-500 to-indigo-600',
  algo: 'from-amber-500 to-orange-600',
  mobile: 'from-emerald-500 to-teal-600',
  design: 'from-pink-500 to-rose-600',
  blockchain: 'from-slate-500 to-slate-700',
};

const TAB_KEYS: TabKey[] = ['overview', 'members', 'courses', 'billing', 'settings'];

const formatRelative = (iso: string): string => {
  if (iso === '—') return '—';
  const d = new Date(iso);
  const diffMs = Date.now() - d.getTime();
  const minutes = Math.floor(diffMs / 60000);
  if (minutes < 60) return `${Math.max(1, minutes)}m`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h`;
  const days = Math.floor(hours / 24);
  return `${days}d`;
};

const roleInitials = (role: MemberRole): string => {
  const map: Record<MemberRole, string> = {
    owner: 'OW', admin: 'AD', instructor: 'IN', student: 'ST',
  };
  return map[role];
};

const OrganizationPage: React.FC = () => {
  const { t } = useTranslation();
  const [activeTab, setActiveTab] = useState<TabKey>('overview');
  const [search, setSearch] = useState('');
  const [openFaq, setOpenFaq] = useState<string | null>(null);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showInviteModal, setShowInviteModal] = useState(false);

  const stats = useMemo(
    () => [
      {
        key: 'members',
        value: '156',
        sub: '+12 this month',
        label: t('tenant.organization.stats.members'),
        tone: 'blue',
        icon: (
          <svg className="w-6 h-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75" />
          </svg>
        ),
      },
      {
        key: 'courses',
        value: '24',
        sub: '6 published',
        label: t('tenant.organization.stats.activeCourses'),
        tone: 'emerald',
        icon: (
          <svg className="w-6 h-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M4 19.5A2.5 2.5 0 016.5 17H20" /><path d="M6.5 2H20v20H6.5A2.5 2.5 0 014 19.5v-15A2.5 2.5 0 016.5 2z" />
          </svg>
        ),
      },
      {
        key: 'exams',
        value: '342',
        sub: '+48 this week',
        label: t('tenant.organization.stats.totalExams'),
        tone: 'amber',
        icon: (
          <svg className="w-6 h-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
            <path d="M9 14l2 2 4-4" />
          </svg>
        ),
      },
      {
        key: 'mrr',
        value: '₫12.99M',
        sub: 'Next bill Sep 1',
        label: t('tenant.organization.stats.mrr'),
        tone: 'purple',
        icon: (
          <svg className="w-6 h-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <line x1="12" y1="1" x2="12" y2="23" />
            <path d="M17 5H9.5a3.5 3.5 0 000 7h5a3.5 3.5 0 010 7H6" />
          </svg>
        ),
      },
    ],
    [t],
  );

  const activities: ActivityEvent[] = [
    {
      id: 'a1', who: 'Tran Thi Mai', action: 'invited', target: 'Hoang My Linh', at: '2026-08-23T15:42:00Z',
      tone: 'blue',
      icon: <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M16 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2" /><circle cx="8.5" cy="7" r="4" /><line x1="20" y1="8" x2="20" y2="14" /><line x1="23" y1="11" x2="17" y2="11" /></svg>,
    },
    {
      id: 'a2', who: 'Le Quang Vinh', action: 'published course', target: 'AI Engineering Professional', at: '2026-08-22T18:20:00Z',
      tone: 'emerald',
      icon: <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" /></svg>,
    },
    {
      id: 'a3', who: 'System', action: 'renewed plan', target: 'Enterprise Monthly', at: '2026-08-01T00:01:00Z',
      tone: 'amber',
      icon: <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" /></svg>,
    },
    {
      id: 'a4', who: 'Nguyen Hoang Nam', action: 'updated branding on', target: 'login.fpt.ioes.vn', at: '2026-07-28T09:15:00Z',
      tone: 'purple',
      icon: <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="13.5" cy="6.5" r="1.5" /><circle cx="17.5" cy="10.5" r="1.5" /><circle cx="8.5" cy="7.5" r="1.5" /><circle cx="6.5" cy="12.5" r="1.5" /><path d="M12 2C6.5 2 2 6.5 2 12s4.5 10 10 10c.926 0 1.648-.746 1.648-1.673 0-.43-.18-.83-.473-1.108A1.99 1.99 0 0112 17c-2.761 0-5-2.239-5-5s2.239-5 5-5c1.326 0 2.4.5 3.236 1.18a1 1 0 001.414-.18 1 1 0 00-.182-1.398A6.97 6.97 0 0012 2z" /></svg>,
    },
    {
      id: 'a5', who: 'Pham Thanh Binh', action: 'graded', target: '42 essay submissions', at: '2026-07-25T14:50:00Z',
      tone: 'emerald',
      icon: <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" /><polyline points="14 2 14 8 20 8" /></svg>,
    },
  ];

  const filteredMembers = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return MEMBERS;
    return MEMBERS.filter(m =>
      `${m.full_name} ${m.email} ${m.department}`.toLowerCase().includes(q),
    );
  }, [search]);

  const filteredCourses = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return COURSES;
    return COURSES.filter(c => c.title.toLowerCase().includes(q));
  }, [search]);

  const toneClass: Record<string, string> = {
    blue: 'bg-blue-50 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400',
    emerald: 'bg-emerald-50 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-400',
    amber: 'bg-amber-50 text-amber-600 dark:bg-amber-900/30 dark:text-amber-400',
    purple: 'bg-purple-50 text-purple-600 dark:bg-purple-900/30 dark:text-purple-400',
  };

  const roleColors: Record<MemberRole, string> = {
    owner: 'bg-purple-50 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300',
    admin: 'bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300',
    instructor: 'bg-emerald-50 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300',
    student: 'bg-slate-100 text-slate-700 dark:bg-slate-700 dark:text-slate-300',
  };

  const statusColors: Record<MemberStatus, string> = {
    active: 'bg-emerald-50 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300',
    invited: 'bg-amber-50 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300',
    suspended: 'bg-red-50 text-red-700 dark:bg-red-900/30 dark:text-red-300',
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100">
      {/* Top nav */}
      <header className="bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 sticky top-0 z-30">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link to="/" className="flex items-center gap-2.5">
              <div className="w-10 h-10 bg-gradient-to-br from-blue-600 to-blue-700 rounded-xl flex items-center justify-center shadow-sm">
                <svg className="w-5 h-5 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 14l9-5-9-5-9 5 9 5z" /><path d="M12 14l6.16-3.422a12.083 12.083 0 01.665 6.479A11.952 11.952 0 0012 20.055a11.952 11.952 0 00-6.824-2.998 12.078 12.078 0 01.665-6.479L12 14z" /></svg>
              </div>
              <span className="text-lg font-bold text-slate-900 dark:text-white">IOES</span>
            </Link>
            <div className="hidden md:flex items-center text-sm text-slate-400">
              <svg className="w-4 h-4 mx-2" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="9 18 15 12 9 6" /></svg>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-emerald-500 to-emerald-600 flex items-center justify-center text-white font-bold text-sm">
                F
              </div>
              <div className="hidden sm:block">
                <div className="text-sm font-bold text-slate-900 dark:text-white leading-tight">FPT University</div>
                <div className="text-[11px] text-slate-500 dark:text-slate-400">fpt.ioes.vn · Enterprise</div>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button className="hidden sm:inline-flex items-center gap-2 px-3.5 py-2 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 text-sm font-semibold transition-colors text-slate-700 dark:text-slate-300">
              <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" /></svg>
              <span className="hidden md:inline">{t('common.search')}</span>
            </button>
            <button className="relative w-10 h-10 flex items-center justify-center rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors text-slate-500 dark:text-slate-400">
              <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" /></svg>
              <span className="absolute top-2 right-2 w-2 h-2 bg-red-500 rounded-full" />
            </button>
            <div className="flex items-center gap-2.5 pl-3 border-l border-slate-200 dark:border-slate-800">
              <div className="w-9 h-9 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white font-bold text-xs">
                NN
              </div>
              <div className="hidden lg:block">
                <div className="text-xs font-semibold text-slate-900 dark:text-white leading-tight">Nguyen Hoang Nam</div>
                <div className="text-[11px] text-slate-500 dark:text-slate-400">Owner</div>
              </div>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="max-w-7xl mx-auto px-6 flex items-center gap-1 overflow-x-auto">
          {TAB_KEYS.map((key) => {
            const active = activeTab === key;
            return (
              <button
                key={key}
                onClick={() => { setActiveTab(key); setSearch(''); }}
                className={`relative px-4 py-3 text-sm font-semibold transition-colors whitespace-nowrap ${
                  active
                    ? 'text-blue-600 dark:text-blue-400'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                {t(`tenant.organization.tabs.${key}`)}
                {active && (
                  <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-blue-600 dark:bg-blue-400 rounded-t" />
                )}
              </button>
            );
          })}
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-6 py-8">
        <div className="mb-6">
          <h1 className="text-2xl md:text-3xl font-extrabold text-slate-900 dark:text-white">
            {t('tenant.organization.headerTitle')}
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            {t('tenant.organization.headerSubtitle')}
          </p>
        </div>

        {activeTab === 'overview' && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
              {stats.map(s => (
                <div key={s.key} className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-5">
                  <div className="flex items-start justify-between mb-3">
                    <div className={`w-11 h-11 rounded-xl flex items-center justify-center ${toneClass[s.tone]}`}>
                      {s.icon}
                    </div>
                  </div>
                  <h3 className="text-2xl font-bold text-slate-900 dark:text-white">{s.value}</h3>
                  <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">{s.label}</p>
                  {s.sub && <p className="text-xs text-slate-400 mt-1">{s.sub}</p>}
                </div>
              ))}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <div className="lg:col-span-2 bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-6">
                <div className="flex items-center justify-between mb-5">
                  <h3 className="text-base font-bold text-slate-900 dark:text-white">{t('tenant.organization.activityTitle')}</h3>
                  <button className="text-xs font-semibold text-blue-600 hover:text-blue-700 dark:text-blue-400">
                    {t('common.viewAll')}
                  </button>
                </div>
                <ol className="space-y-5">
                  {activities.map((a, i) => (
                    <li key={a.id} className="flex items-start gap-3.5 relative">
                      {i < activities.length - 1 && (
                        <span className="absolute left-[18px] top-9 bottom-[-20px] w-px bg-slate-200 dark:bg-slate-700" />
                      )}
                      <div className={`w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 ${toneClass[a.tone]}`}>
                        {a.icon}
                      </div>
                      <div className="flex-1 min-w-0 pt-0.5">
                        <p className="text-sm text-slate-900 dark:text-white leading-snug">
                          <span className="font-semibold">{a.who}</span>{' '}
                          <span className="text-slate-600 dark:text-slate-400">{a.action}</span>{' '}
                          <span className="font-semibold">{a.target}</span>
                        </p>
                        <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                          {formatRelative(a.at)} · {new Date(a.at).toLocaleString('vi-VN')}
                        </p>
                      </div>
                    </li>
                  ))}
                </ol>
              </div>

              <div className="bg-gradient-to-br from-blue-600 to-cyan-600 rounded-2xl p-6 text-white">
                <h3 className="text-base font-bold mb-1">{t('tenant.organization.upgradeTitle')}</h3>
                <p className="text-sm text-blue-100 mb-4">{t('tenant.organization.upgradeDesc')}</p>
                <ul className="space-y-2 text-sm mb-5">
                  <li className="flex items-center gap-2">
                    <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="20 6 9 17 4 12" /></svg>
                    {t('tenant.organization.upgradeFeature1')}
                  </li>
                  <li className="flex items-center gap-2">
                    <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="20 6 9 17 4 12" /></svg>
                    {t('tenant.organization.upgradeFeature2')}
                  </li>
                  <li className="flex items-center gap-2">
                    <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="20 6 9 17 4 12" /></svg>
                    {t('tenant.organization.upgradeFeature3')}
                  </li>
                </ul>
                <button className="w-full inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-white text-blue-700 font-semibold text-sm hover:bg-blue-50 transition-colors">
                  {t('tenant.organization.upgradeBtn')}
                </button>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'members' && (
          <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 overflow-hidden">
            <div className="p-5 flex flex-col md:flex-row md:items-center justify-between gap-3 border-b border-slate-100 dark:border-slate-700">
              <div className="relative w-full md:w-80">
                <svg className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" /></svg>
                <input type="text" value={search} onChange={(e) => setSearch(e.target.value)}
                  placeholder={t('tenant.organization.searchMember')}
                  className="w-full pl-11 pr-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-sm focus:outline-none focus:border-blue-500"
                />
              </div>
              <button onClick={() => setShowInviteModal(true)}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold transition-colors shadow-sm"
              >
                <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" /></svg>
                {t('tenant.organization.inviteMember')}
              </button>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-slate-50 dark:bg-slate-800/50 text-xs uppercase tracking-wider text-slate-500 dark:text-slate-400">
                  <tr>
                    <th className="px-5 py-3 text-left font-semibold">{t('tenant.organization.colName')}</th>
                    <th className="px-5 py-3 text-left font-semibold">{t('tenant.organization.colEmail')}</th>
                    <th className="px-5 py-3 text-left font-semibold">{t('tenant.organization.colRole')}</th>
                    <th className="px-5 py-3 text-left font-semibold">{t('tenant.organization.colStatus')}</th>
                    <th className="px-5 py-3 text-left font-semibold">{t('tenant.organization.colLastActive')}</th>
                    <th className="px-5 py-3 text-right font-semibold">{t('tenant.organization.colActions')}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
                  {filteredMembers.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="px-5 py-12 text-center text-slate-500 dark:text-slate-400">
                        {t('tenant.organization.noMembers')}
                      </td>
                    </tr>
                  ) : filteredMembers.map(m => (
                    <tr key={m.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors">
                      <td className="px-5 py-4 whitespace-nowrap">
                        <div className="flex items-center gap-2.5">
                          <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white font-bold text-xs flex-shrink-0">
                            {m.full_name.split(' ').map(s => s[0]).slice(0, 2).join('')}
                          </div>
                          <div className="min-w-0">
                            <div className="text-sm font-semibold text-slate-900 dark:text-white truncate max-w-[180px]">{m.full_name}</div>
                            <div className="text-[11px] text-slate-500 dark:text-slate-400">{m.department}</div>
                          </div>
                        </div>
                      </td>
                      <td className="px-5 py-4 whitespace-nowrap text-slate-600 dark:text-slate-400 font-mono text-xs">{m.email}</td>
                      <td className="px-5 py-4 whitespace-nowrap">
                        <span className={`inline-flex items-center px-2.5 py-1 rounded-md text-[11px] font-bold uppercase ${roleColors[m.role]}`}>
                          {t(`tenant.organization.roles.${m.role}`)}
                        </span>
                      </td>
                      <td className="px-5 py-4 whitespace-nowrap">
                        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-bold uppercase ${statusColors[m.status]}`}>
                          <span className="w-1.5 h-1.5 rounded-full bg-current" />
                          {t(`tenant.organization.statuses.${m.status}`)}
                        </span>
                      </td>
                      <td className="px-5 py-4 whitespace-nowrap text-slate-600 dark:text-slate-400 text-xs">
                        {m.last_active === '—' ? '—' : `${formatRelative(m.last_active)} ${t('tenant.organization.ago')}`}
                      </td>
                      <td className="px-5 py-4 text-right">
                        <button className="inline-flex items-center justify-center w-8 h-8 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-500 hover:text-slate-900 dark:hover:text-white transition-colors">
                          <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="1" /><circle cx="12" cy="5" r="1" /><circle cx="12" cy="19" r="1" /></svg>
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {activeTab === 'courses' && (
          <div className="space-y-4">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
              <div className="relative w-full md:w-80">
                <svg className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" /></svg>
                <input type="text" value={search} onChange={(e) => setSearch(e.target.value)}
                  placeholder={t('tenant.organization.searchCourse')}
                  className="w-full pl-11 pr-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-sm focus:outline-none focus:border-blue-500"
                />
              </div>
              <button className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold transition-colors shadow-sm">
                <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" /></svg>
                {t('tenant.organization.newCourse')}
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredCourses.map(c => (
                <div key={c.id} className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 overflow-hidden hover:border-blue-400 transition-colors">
                  <div className={`h-32 bg-gradient-to-br ${THUMBNAIL_GRADIENT[c.thumbnail]} relative`}>
                    <div className="absolute top-3 left-3">
                      <span className={`inline-flex items-center px-2.5 py-1 rounded-md text-[10px] font-bold uppercase ${c.status === 'published' ? 'bg-emerald-500 text-white' : c.status === 'draft' ? 'bg-amber-500 text-white' : 'bg-slate-500 text-white'}`}>
                        {t(`tenant.organization.courseStatus.${c.status}`)}
                      </span>
                    </div>
                    <div className="absolute bottom-3 right-3 text-white text-xs font-mono opacity-90">
                      {c.students.toLocaleString('en-US')} {t('tenant.organization.students')}
                    </div>
                  </div>
                  <div className="p-4">
                    <h4 className="text-sm font-bold text-slate-900 dark:text-white leading-snug line-clamp-2 mb-3">{c.title}</h4>
                    <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
                      <span className="inline-flex items-center gap-1">
                        <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10" /><polygon points="10 8 16 12 10 16 10 8" /></svg>
                        {c.lessons} {t('tenant.organization.lessons')}
                      </span>
                      {c.status === 'published' && (
                        <span className="inline-flex items-center gap-1 text-amber-600">
                          <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="currentColor"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" /></svg>
                          {c.rating.toFixed(1)}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {activeTab === 'billing' && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <div className="lg:col-span-2 bg-gradient-to-br from-blue-600 via-blue-700 to-indigo-700 rounded-2xl p-6 text-white">
                <div className="flex items-center justify-between mb-4">
                  <span className="inline-flex items-center px-2.5 py-1 rounded-md text-[10px] font-bold uppercase bg-white/20">
                    {t('tenant.organization.currentPlan')}
                  </span>
                  <span className="text-xs text-blue-100">{t('tenant.organization.billedMonthly')}</span>
                </div>
                <h3 className="text-2xl font-bold mb-1">Enterprise</h3>
                <p className="text-sm text-blue-100 mb-5">{t('tenant.organization.planDesc')}</p>
                <div className="flex items-baseline gap-1.5 mb-5">
                  <span className="text-4xl font-extrabold">₫12.99M</span>
                  <span className="text-sm text-blue-100">/ {t('tenant.organization.month')}</span>
                </div>
                <ul className="text-sm text-blue-100 space-y-2 mb-6">
                  <li className="flex items-center gap-2">
                    <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="20 6 9 17 4 12" /></svg>
                    {t('tenant.organization.planFeature1')}
                  </li>
                  <li className="flex items-center gap-2">
                    <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="20 6 9 17 4 12" /></svg>
                    {t('tenant.organization.planFeature2')}
                  </li>
                  <li className="flex items-center gap-2">
                    <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="20 6 9 17 4 12" /></svg>
                    {t('tenant.organization.planFeature3')}
                  </li>
                </ul>
                <div className="flex flex-wrap gap-3">
                  <button className="px-5 py-2.5 rounded-xl bg-white text-blue-700 font-semibold text-sm hover:bg-blue-50 transition-colors">
                    {t('tenant.organization.managePlan')}
                  </button>
                  <button className="px-5 py-2.5 rounded-xl bg-white/10 backdrop-blur-sm border border-white/30 text-white font-semibold text-sm hover:bg-white/20 transition-colors">
                    {t('tenant.organization.contactSales')}
                  </button>
                </div>
              </div>

              <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-6">
                <h3 className="text-base font-bold text-slate-900 dark:text-white mb-3">{t('tenant.organization.paymentMethod')}</h3>
                <div className="bg-gradient-to-br from-slate-800 to-slate-900 rounded-xl p-4 text-white mb-4">
                  <div className="flex items-center justify-between mb-8">
                    <span className="text-sm font-semibold tracking-wider">VISA</span>
                    <svg className="w-8 h-8 opacity-80" viewBox="0 0 24 24" fill="currentColor"><circle cx="12" cy="12" r="10" opacity="0.5" /></svg>
                  </div>
                  <div className="font-mono text-base tracking-wider mb-2">•••• •••• •••• 4242</div>
                  <div className="flex items-center justify-between text-xs">
                    <div>
                      <div className="text-white/60">Cardholder</div>
                      <div className="font-semibold">Nguyen Hoang Nam</div>
                    </div>
                    <div>
                      <div className="text-white/60">Expires</div>
                      <div className="font-semibold">09/28</div>
                    </div>
                  </div>
                </div>
                <button className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 hover:border-blue-500 text-sm font-semibold text-slate-700 dark:text-slate-300 transition-colors">
                  <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 20h9" /><path d="M16.5 3.5a2.121 2.121 0 113 3L7 19l-4 1 1-4L16.5 3.5z" /></svg>
                  {t('tenant.organization.updateCard')}
                </button>
              </div>
            </div>

            <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 overflow-hidden">
              <div className="px-5 py-4 border-b border-slate-100 dark:border-slate-700 flex items-center justify-between">
                <h3 className="text-base font-bold text-slate-900 dark:text-white">{t('tenant.organization.invoicesTitle')}</h3>
                <button className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 hover:border-blue-500 text-xs font-semibold text-slate-700 dark:text-slate-300 transition-colors">
                  <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4" /><polyline points="7 10 12 15 17 10" /><line x1="12" y1="15" x2="12" y2="3" /></svg>
                  {t('common.exportCSV')}
                </button>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-slate-50 dark:bg-slate-800/50 text-xs uppercase tracking-wider text-slate-500 dark:text-slate-400">
                    <tr>
                      <th className="px-5 py-3 text-left font-semibold">{t('tenant.organization.colInvoice')}</th>
                      <th className="px-5 py-3 text-left font-semibold">{t('tenant.organization.colDate')}</th>
                      <th className="px-5 py-3 text-left font-semibold">{t('tenant.organization.colAmount')}</th>
                      <th className="px-5 py-3 text-left font-semibold">{t('tenant.organization.colStatus')}</th>
                      <th className="px-5 py-3 text-right font-semibold">{t('tenant.organization.colActions')}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
                    {INVOICES.map(i => (
                      <tr key={i.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors">
                        <td className="px-5 py-4 font-mono text-sm font-semibold text-slate-900 dark:text-white">{i.number}</td>
                        <td className="px-5 py-4 text-slate-600 dark:text-slate-400">{i.date}</td>
                        <td className="px-5 py-4 font-semibold text-slate-900 dark:text-white">₫{(i.amount).toLocaleString('en-US')}</td>
                        <td className="px-5 py-4">
                          <span className={`inline-flex items-center px-2.5 py-1 rounded-md text-[11px] font-bold uppercase ${
                            i.status === 'paid' ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300'
                              : i.status === 'pending' ? 'bg-amber-50 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300'
                              : 'bg-red-50 text-red-700 dark:bg-red-900/30 dark:text-red-300'
                          }`}>
                            {t(`tenant.organization.invoiceStatus.${i.status}`)}
                          </span>
                        </td>
                        <td className="px-5 py-4 text-right">
                          <button className="text-xs font-semibold text-blue-600 hover:text-blue-700 dark:text-blue-400">
                            {t('common.viewDetail')}
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'settings' && (
          <div className="space-y-6">
            <Card title={t('tenant.organization.sectionGeneral')}>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Field label={t('tenant.organization.orgName')}>
                  <input defaultValue="FPT University"
                    className="w-full px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-sm focus:outline-none focus:border-blue-500" />
                </Field>
                <Field label={t('tenant.organization.orgDomain')}>
                  <input defaultValue="fpt.ioes.vn"
                    className="w-full px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-sm focus:outline-none focus:border-blue-500" />
                </Field>
                <Field label={t('tenant.organization.orgContactEmail')}>
                  <input defaultValue="contact@fpt.edu.vn" type="email"
                    className="w-full px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-sm focus:outline-none focus:border-blue-500" />
                </Field>
                <Field label={t('tenant.organization.orgPhone')}>
                  <input defaultValue="+84 28 7300 1866" type="tel"
                    className="w-full px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-sm focus:outline-none focus:border-blue-500" />
                </Field>
              </div>
              <Field label={t('tenant.organization.orgAddress')} className="mt-4">
                <textarea defaultValue="Floor 15, FPT Tower, 10 Pham Van Bach, Cau Giay, Hanoi" rows={2}
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-sm focus:outline-none focus:border-blue-500 resize-none" />
              </Field>
            </Card>

            <Card title={t('tenant.organization.sectionBranding')}>
              <div className="flex items-center gap-5">
                <div className="w-20 h-20 rounded-xl bg-gradient-to-br from-emerald-500 to-emerald-600 flex items-center justify-center text-white text-3xl font-bold">
                  F
                </div>
                <div className="flex-1">
                  <h4 className="text-sm font-semibold text-slate-900 dark:text-white">{t('tenant.organization.orgLogo')}</h4>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mb-3">{t('tenant.organization.orgLogoHint')}</p>
                  <div className="flex gap-2">
                    <button className="px-3.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 hover:border-blue-500 text-xs font-semibold text-slate-700 dark:text-slate-300 transition-colors">
                      {t('tenant.organization.uploadLogo')}
                    </button>
                    <button className="px-3.5 py-1.5 rounded-lg text-xs font-semibold text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors">
                      {t('common.delete')}
                    </button>
                  </div>
                </div>
              </div>
            </Card>

            <Card title={t('tenant.organization.sectionFaq')}>
              {(['faq1', 'faq2', 'faq3'] as const).map(key => {
                const open = openFaq === key;
                return (
                  <div key={key} className="border border-slate-200 dark:border-slate-700 rounded-xl overflow-hidden mb-2 last:mb-0">
                    <button
                      type="button"
                      onClick={() => setOpenFaq(open ? null : key)}
                      className="w-full px-4 py-3 flex items-center justify-between text-left hover:bg-slate-50 dark:hover:bg-slate-900/50 transition-colors"
                    >
                      <span className="text-sm font-semibold text-slate-900 dark:text-white">
                        {t(`tenant.organization.faq${key.charAt(3).toUpperCase()}Q`)}
                      </span>
                      <svg className={`w-4 h-4 text-slate-500 transition-transform ${open ? 'rotate-180' : ''}`} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <polyline points="6 9 12 15 18 9" />
                      </svg>
                    </button>
                    {open && (
                      <div className="px-4 pb-4 text-xs text-slate-600 dark:text-slate-400 leading-relaxed border-t border-slate-100 dark:border-slate-700 pt-3">
                        {t(`tenant.organization.faq${key.charAt(3).toUpperCase()}A`)}
                      </div>
                    )}
                  </div>
                );
              })}
            </Card>

            <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-900/50 rounded-2xl p-6">
              <div className="flex items-start gap-4">
                <div className="w-11 h-11 rounded-xl bg-red-100 dark:bg-red-900/40 flex items-center justify-center flex-shrink-0">
                  <svg className="w-6 h-6 text-red-600 dark:text-red-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" /><line x1="12" y1="9" x2="12" y2="13" /><line x1="12" y1="17" x2="12.01" y2="17" /></svg>
                </div>
                <div className="flex-1">
                  <h3 className="text-base font-bold text-red-700 dark:text-red-400 mb-1">{t('tenant.organization.dangerTitle')}</h3>
                  <p className="text-sm text-red-800 dark:text-red-300 mb-3">{t('tenant.organization.dangerDesc')}</p>
                  <button onClick={() => setShowDeleteModal(true)}
                    className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-red-600 hover:bg-red-700 text-white text-sm font-semibold transition-colors shadow-sm">
                    <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="3 6 5 6 21 6" /><path d="M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6" /></svg>
                    {t('tenant.organization.deleteOrg')}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </main>

      {showInviteModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm" onClick={() => setShowInviteModal(false)}>
          <div className="w-full max-w-md bg-white dark:bg-slate-800 rounded-2xl shadow-2xl overflow-hidden" onClick={(e) => e.stopPropagation()}>
            <div className="px-6 py-4 border-b border-slate-100 dark:border-slate-700 flex items-center justify-between">
              <h3 className="text-lg font-bold text-slate-900 dark:text-white">{t('tenant.organization.inviteTitle')}</h3>
              <button onClick={() => setShowInviteModal(false)} className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700">
                <svg className="w-5 h-5 text-slate-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>
              </button>
            </div>
            <div className="p-6 space-y-4">
              <Field label={t('tenant.organization.inviteEmailLabel')}>
                <input type="email" placeholder="new.member@example.com"
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-sm focus:outline-none focus:border-blue-500" />
              </Field>
              <Field label={t('tenant.organization.inviteRoleLabel')}>
                <select className="w-full px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-sm">
                  <option>{t('tenant.organization.roles.instructor')}</option>
                  <option>{t('tenant.organization.roles.student')}</option>
                  <option>{t('tenant.organization.roles.admin')}</option>
                </select>
              </Field>
              <div className="flex justify-end gap-3 pt-2">
                <button onClick={() => setShowInviteModal(false)}
                  className="px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 hover:border-blue-500 text-sm font-semibold text-slate-700 dark:text-slate-300 transition-colors">
                  {t('common.cancel')}
                </button>
                <button onClick={() => setShowInviteModal(false)}
                  className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold transition-colors shadow-sm">
                  {t('tenant.organization.inviteSend')}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {showDeleteModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm" onClick={() => setShowDeleteModal(false)}>
          <div className="w-full max-w-md bg-white dark:bg-slate-800 rounded-2xl shadow-2xl overflow-hidden" onClick={(e) => e.stopPropagation()}>
            <div className="p-6">
              <div className="mx-auto w-14 h-14 rounded-full bg-red-50 dark:bg-red-900/30 flex items-center justify-center mb-4">
                <svg className="w-8 h-8 text-red-600 dark:text-red-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" /><line x1="12" y1="9" x2="12" y2="13" /><line x1="12" y1="17" x2="12.01" y2="17" /></svg>
              </div>
              <h3 className="text-lg font-bold text-slate-900 dark:text-white text-center mb-2">{t('tenant.organization.deleteTitle')}</h3>
              <p className="text-sm text-slate-600 dark:text-slate-400 text-center mb-5">
                {t('tenant.organization.deleteDesc')}
              </p>
              <input placeholder={t('tenant.organization.deleteConfirmPlaceholder')}
                className="w-full px-4 py-2.5 rounded-xl border border-red-200 dark:border-red-900 bg-white dark:bg-slate-900 text-sm mb-4 focus:outline-none focus:border-red-500" />
              <div className="flex justify-end gap-3">
                <button onClick={() => setShowDeleteModal(false)}
                  className="px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 hover:border-blue-500 text-sm font-semibold text-slate-700 dark:text-slate-300 transition-colors">
                  {t('common.cancel')}
                </button>
                <button onClick={() => setShowDeleteModal(false)}
                  className="px-4 py-2 rounded-xl bg-red-600 hover:bg-red-700 text-white text-sm font-semibold transition-colors shadow-sm">
                  {t('tenant.organization.deleteOrg')}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

const Card: React.FC<{ title: string; children: React.ReactNode; className?: string }> = ({ title, children, className = '' }) => (
  <div className={`bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-6 ${className}`}>
    <h2 className="text-base font-bold text-slate-900 dark:text-white mb-5">{title}</h2>
    {children}
  </div>
);

const Field: React.FC<{ label: string; children: React.ReactNode; className?: string }> = ({ label, children, className = '' }) => (
  <div className={className}>
    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">{label}</label>
    {children}
  </div>
);

export default OrganizationPage;
