import React, { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuthStore } from '@/app/store/authStore';
import { useAuth } from '@/hooks/useAuth';
import { useUIStore } from '@/app/store/uiStore';

interface AdminLayoutProps {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
  headerActions?: React.ReactNode;
}

interface NavItem {
  path: string;
  label: string;
  icon: React.ReactNode;
  badge?: string;
}

interface NavSection {
  title: string;
  items: NavItem[];
}

const AdminLayout: React.FC<AdminLayoutProps> = ({ title, subtitle, children, headerActions }) => {
  const { t, i18n } = useTranslation();
  const location = useLocation();
  const { user } = useAuthStore();
  const { signOut } = useAuth();
  const { theme, setTheme } = useUIStore();
  const [mobileOpen, setMobileOpen] = useState(false);

  const sections: NavSection[] = [
    {
      title: t('admin.nav.overview'),
      items: [
        { path: '/admin', label: t('admin.nav.dashboard'), icon: <DashboardIcon /> },
        { path: '/admin/analytics', label: t('admin.nav.analytics'), icon: <ChartIcon /> },
      ],
    },
    {
      title: t('admin.nav.management'),
      items: [
        { path: '/admin/users', label: t('admin.nav.users'), icon: <UsersIcon />, badge: '5' },
        { path: '/admin/courses/approval', label: t('admin.nav.courses'), icon: <BookIcon />, badge: '12' },
        { path: '/admin/instructors/approval', label: t('admin.nav.instructorApproval'), icon: <InstructorIcon />, badge: '3' },
        { path: '/admin/exams', label: t('admin.nav.exams'), icon: <ExamIcon /> },
        { path: '/admin/discussions', label: t('admin.nav.discussions'), icon: <ChatIcon />, badge: '3' },
        { path: '/admin/blockchain', label: t('admin.nav.blockchain'), icon: <BlockchainIcon /> },
      ],
    },
    {
      title: t('admin.nav.tenantsSection'),
      items: [
        { path: '/admin/tenants', label: t('admin.nav.tenants'), icon: <BuildingIcon /> },
      ],
    },
    {
      title: t('admin.nav.analytics'),
      items: [
        { path: '/admin/heatmaps', label: t('admin.nav.heatmaps'), icon: <HeatmapIcon /> },
        { path: '/admin/funnels', label: t('admin.nav.funnels'), icon: <FunnelIcon /> },
        { path: '/admin/wallet', label: t('admin.nav.wallet'), icon: <WalletIcon /> },
      ],
    },
    {
      title: t('admin.nav.system'),
      items: [
        { path: '/admin/security', label: t('admin.nav.security'), icon: <ShieldIcon /> },
        { path: '/admin/audit-log', label: t('admin.nav.auditLog'), icon: <AuditLogIcon /> },
        { path: '/admin/notifications', label: t('admin.nav.notifications'), icon: <BellIcon /> },
        { path: '/admin/settings', label: t('admin.nav.settings'), icon: <SettingsIcon /> },
      ],
    },
  ];

  const isActive = (path: string) =>
    path === '/admin' ? location.pathname === '/admin' : location.pathname.startsWith(path);

  const toggleLang = () => {
    const next = i18n.language?.startsWith('vi') ? 'en' : 'vi';
    i18n.changeLanguage(next);
  };

  const initials = (user?.full_name || 'AD').split(' ').map(s => s.charAt(0)).slice(0, 2).join('').toUpperCase();

  // Show super_admin label for super_admin role
  const roleLabel = user?.role === 'super_admin' ? t('admin.role.superAdmin') : t('admin.role.admin');
  const avatarGradient = user?.role === 'super_admin'
    ? 'bg-gradient-to-br from-purple-500 to-pink-500'
    : 'bg-gradient-to-br from-red-500 to-orange-500';

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100">
      {/* Mobile toggle */}
      <button
        onClick={() => setMobileOpen(!mobileOpen)}
        className="lg:hidden fixed top-4 left-4 z-[60] w-11 h-11 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl shadow-md flex items-center justify-center hover:scale-105 transition-transform"
        aria-label="Toggle sidebar"
      >
        <svg className="w-6 h-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          {mobileOpen ? (
            <><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></>
          ) : (
            <><line x1="3" y1="6" x2="21" y2="6" /><line x1="3" y1="12" x2="21" y2="12" /><line x1="3" y1="18" x2="21" y2="18" /></>
          )}
        </svg>
      </button>

      {/* Mobile overlay */}
      {mobileOpen && (
        <div
          onClick={() => setMobileOpen(false)}
          className="lg:hidden fixed inset-0 bg-black/50 z-40 backdrop-blur-sm"
        />
      )}

      {/* Sidebar */}
      <aside
        className={`fixed top-0 left-0 bottom-0 z-50 w-64 bg-white dark:bg-slate-900 border-r border-slate-200 dark:border-slate-800 flex flex-col transition-transform duration-300 ${
          mobileOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
        }`}
      >
        {/* Brand */}
        <div className="h-18 px-6 flex items-center border-b border-slate-200 dark:border-slate-800" style={{ height: '72px' }}>
          <Link to="/" className="flex items-center gap-3 no-underline">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-600 to-cyan-500 flex items-center justify-center bg-[length:200%_200%] animate-[gradientShift_3s_ease_infinite]">
              <svg className="w-6 h-6 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M12 14l9-5-9-5-9 5 9 5z" />
                <path d="M12 14l6.16-3.422a12.083 12.083 0 01.665 6.479A11.952 11.952 0 0012 20.055a11.952 11.952 0 00-6.824-2.998 12.078 12.078 0 01.665-6.479L12 14z" />
              </svg>
            </div>
            <span className="text-xl font-bold tracking-tight">IOES</span>
          </Link>
        </div>

        {/* Nav */}
        <nav className="flex-1 py-4 px-3 overflow-y-auto">
          {sections.map((section, sIdx) => (
            <div key={sIdx} className="mb-6">
              <div className="text-[11px] font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500 px-3 mb-2">
                {section.title}
              </div>
              <ul className="space-y-1">
                {section.items.map(item => (
                  <li key={item.path}>
                    <Link
                      to={item.path}
                      onClick={() => setMobileOpen(false)}
                      className={`group relative flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all overflow-hidden ${
                        isActive(item.path)
                          ? 'bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400'
                          : 'text-slate-600 dark:text-slate-400 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-slate-50 dark:hover:bg-slate-800/50 hover:translate-x-1'
                      }`}
                    >
                      <span className="relative z-10 flex-shrink-0 w-5 h-5">{item.icon}</span>
                      <span className="relative z-10 flex-1">{item.label}</span>
                      {item.badge && (
                        <span className="relative z-10 px-2 py-0.5 text-[10px] font-bold bg-red-500 text-white rounded-full animate-[notificationPop_.3s_ease]">
                          {item.badge}
                        </span>
                      )}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </nav>

        {/* Footer user */}
        <div className="p-4 border-t border-slate-200 dark:border-slate-800">
          <div className="flex items-center gap-3 p-3 rounded-xl bg-slate-50 dark:bg-slate-800/50 hover:bg-blue-50 dark:hover:bg-blue-900/30 transition-all cursor-pointer group">
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-white font-semibold text-sm shadow-md group-hover:scale-105 transition-transform ${avatarGradient}`}>
              {initials}
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-sm font-semibold truncate">{user?.full_name || 'Admin'}</div>
              <div className="text-xs text-red-500 font-medium">{roleLabel}</div>
            </div>
            <button
              onClick={() => void signOut()}
              title={t('header.logout')}
              className="p-1.5 rounded-lg hover:bg-white dark:hover:bg-slate-700 transition-colors opacity-60 hover:opacity-100"
            >
              <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4" />
                <polyline points="16 17 21 12 16 7" />
                <line x1="21" y1="12" x2="9" y2="12" />
              </svg>
            </button>
          </div>
        </div>
      </aside>

      {/* Main */}
      <div className="lg:pl-64 transition-all duration-300">
        {/* Header */}
        <header className="sticky top-0 z-30 h-[72px] bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl border-b border-slate-200 dark:border-slate-800">
          <div className="flex items-center justify-between h-full px-6 lg:px-8 pl-16 lg:pl-8">
            <div className="opacity-0 animate-[fadeIn_.5s_ease_forwards]">
              <h1 className="text-xl lg:text-2xl font-bold">{title}</h1>
              {subtitle && <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">{subtitle}</p>}
            </div>
            <div className="flex items-center gap-2">
              {headerActions}
              {/* Language toggle */}
              <button
                onClick={toggleLang}
                title="Change Language"
                className="w-11 h-11 flex items-center justify-center rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 hover:scale-110 transition-all text-slate-500 dark:text-slate-400"
              >
                <span className="text-xs font-bold">{i18n.language?.startsWith('vi') ? 'VN' : 'EN'}</span>
              </button>
              {/* Theme toggle */}
              <button
                onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
                title={t('header.toggleTheme')}
                className="w-11 h-11 flex items-center justify-center rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 hover:scale-110 transition-all text-slate-500 dark:text-slate-400"
              >
                {theme === 'dark' ? (
                  <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <circle cx="12" cy="12" r="5" /><path d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42" />
                  </svg>
                ) : (
                  <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M21 12.79A9 9 0 1111.21 3 7 7 0 0021 12.79z" />
                  </svg>
                )}
              </button>
              {/* Notifications */}
              <button className="relative w-11 h-11 flex items-center justify-center rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 hover:scale-110 transition-all text-slate-500 dark:text-slate-400">
                <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                </svg>
                <span className="absolute top-2 right-2 w-2 h-2 bg-red-500 rounded-full animate-[pulse_2s_infinite]" />
              </button>
            </div>
          </div>
        </header>

        <main className="p-6 lg:p-8">
          {children}
        </main>
      </div>

      <style>{`
        @keyframes fadeIn { from { opacity: 0 } to { opacity: 1 } }
        @keyframes fadeInUp { from { opacity: 0; transform: translateY(20px) } to { opacity: 1; transform: translateY(0) } }
        @keyframes slideInLeft { from { opacity: 0; transform: translateX(-30px) } to { opacity: 1; transform: translateX(0) } }
        @keyframes slideInRight { from { opacity: 0; transform: translateX(30px) } to { opacity: 1; transform: translateX(0) } }
        @keyframes pulse { 0%,100% { transform: scale(1) } 50% { transform: scale(1.05) } }
        @keyframes notificationPop { 0% { transform: scale(0); opacity: 0 } 50% { transform: scale(1.2) } 100% { transform: scale(1); opacity: 1 } }
        @keyframes gradientShift { 0% { background-position: 0% 50% } 50% { background-position: 100% 50% } 100% { background-position: 0% 50% } }
        @keyframes countUp { from { opacity: 0; transform: translateY(10px) } to { opacity: 1; transform: translateY(0) } }
      `}</style>
    </div>
  );
};

/* Icons */
const BuildingIcon = () => (
  <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M3 21h18M5 21V7l8-4v18M19 21V11l-6-4" />
    <line x1="9" y1="9" x2="9" y2="9.01" /><line x1="9" y1="13" x2="9" y2="13.01" /><line x1="9" y1="17" x2="9" y2="17.01" />
    <path d="M14 13h.01M14 17h.01M14 9h.01" />
  </svg>
);
const DashboardIcon = () => (
  <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
  </svg>
);
const ChartIcon = () => (
  <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
  </svg>
);
const UsersIcon = () => (
  <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2" /><circle cx="9" cy="7" r="4" />
    <path d="M23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75" />
  </svg>
);
const InstructorIcon = () => (
  <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M22 10v6M2 10l10-5 10 5-10 5z" /><path d="M6 12v5c3 3 9 3 12 0v-5" />
  </svg>
);
const BookIcon = () => (
  <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
  </svg>
);
const ExamIcon = () => (
  <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
  </svg>
);
const ChatIcon = () => (
  <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z" />
  </svg>
);
const BlockchainIcon = () => (
  <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M10 20l4-16m4 4 4 4-4 4M6 16l-4-4 4-4" />
  </svg>
);
const ShieldIcon = () => (
  <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
  </svg>
);
const AuditLogIcon = () => (
  <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" />
    <polyline points="14 2 14 8 20 8" />
    <line x1="9" y1="13" x2="15" y2="13" />
    <line x1="9" y1="17" x2="13" y2="17" />
  </svg>
);
const BellIcon = () => (
  <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
  </svg>
);
const SettingsIcon = () => (
  <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <circle cx="12" cy="12" r="3" />
    <path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-2 2 2 2 0 01-2-2v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83 0 2 2 0 010-2.83l.06-.06a1.65 1.65 0 00.33-1.82 1.65 1.65 0 00-1.51-1H3a2 2 0 01-2-2 2 2 0 012-2h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 010-2.83 2 2 0 012.83 0l.06.06a1.65 1.65 0 001.82.33H9a1.65 1.65 0 001-1.51V3a2 2 0 012-2 2 2 0 012 2v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 0 2 2 0 010 2.83l-.06.06a1.65 1.65 0 00-.33 1.82V9a1.65 1.65 0 001.51 1H21a2 2 0 012 2 2 2 0 01-2 2h-.09a1.65 1.65 0 00-1.51 1z" />
  </svg>
);

const HeatmapIcon = () => (
  <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <rect x="3" y="3" width="6" height="6" rx="1" />
    <rect x="15" y="3" width="6" height="6" rx="1" />
    <rect x="3" y="15" width="6" height="6" rx="1" />
    <rect x="15" y="15" width="6" height="6" rx="1" />
    <rect x="9" y="9" width="6" height="6" rx="1" fill="currentColor" fillOpacity="0.3" />
  </svg>
);

const FunnelIcon = () => (
  <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M3 4h18l-7 9v6l-4 2v-8L3 4z" />
  </svg>
);

const WalletIcon = () => (
  <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M21 12V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2h14a2 2 0 002-2v-3" />
    <path d="M16 12h6v4h-6a2 2 0 110-4z" />
  </svg>
);

export default AdminLayout;