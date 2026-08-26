import React, { useState, useEffect, useRef } from 'react';
import { useLocation, useNavigate, Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useUIStore } from '@/app/store/uiStore';
import { useAuthStore } from '@/app/store/authStore';

interface HeaderProps {
  activeSection?: string;
}

const Header: React.FC<HeaderProps> = ({ activeSection: propActiveSection }) => {
  const { t, i18n } = useTranslation();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [avatarMenuOpen, setAvatarMenuOpen] = useState(false);
  const avatarMenuRef = useRef<HTMLDivElement>(null);
  const [scrollSection, setScrollSection] = useState('home');
  const location = useLocation();
  const navigate = useNavigate();
  const { user, isAuthenticated, logout } = useAuthStore();

  const theme = useUIStore((s) => s.theme);
  const setTheme = useUIStore((s) => s.setTheme);
  const isDark = theme === 'dark' || (theme === 'system' && typeof window !== 'undefined' && window.matchMedia('(prefers-color-scheme: dark)').matches);

  const cycleTheme = () => {
    const order: Array<'light' | 'dark' | 'system'> = ['light', 'dark', 'system'];
    const next = order[(order.indexOf(theme) + 1) % order.length];
    setTheme(next);
  };

  const toggleLanguage = () => {
    const newLang = i18n.language === 'vi' ? 'en' : 'vi';
    i18n.changeLanguage(newLang);
  };

  useEffect(() => {
    const handleScroll = () => {
      const sections = ['home', 'features', 'about', 'courses', 'arena', 'skilltree', 'aitutor', 'testimonials', 'contact'];
      const scrollPosition = window.scrollY + 100;

      for (const section of sections) {
        const element = document.getElementById(section);
        if (element) {
          const offsetTop = element.offsetTop;
          const offsetBottom = offsetTop + element.offsetHeight;
          if (scrollPosition >= offsetTop && scrollPosition < offsetBottom) {
            setScrollSection(section);
            break;
          }
        }
      }
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  useEffect(() => {
    if (!avatarMenuOpen) return;
    const handleClickOutside = (e: MouseEvent) => {
      if (avatarMenuRef.current && !avatarMenuRef.current.contains(e.target as Node)) {
        setAvatarMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [avatarMenuOpen]);

  useEffect(() => {
    setAvatarMenuOpen(false);
    setMobileMenuOpen(false);
  }, [location.pathname]);

  const getDashboardPath = (): string => {
    switch (user?.role) {
      case 'student': return '/student';
      case 'instructor': return '/instructor';
      case 'admin':
      case 'super_admin': return '/admin';
      default: return '/';
    }
  };

  const handleLogout = () => {
    logout();
    setAvatarMenuOpen(false);
    navigate('/');
  };

  const avatarInitial = (user?.full_name || user?.email || '?').trim().charAt(0).toUpperCase();

  const activeSection = propActiveSection || scrollSection;
  const isCoursesPage = location.pathname === '/courses';
  const isAboutPage = location.pathname === '/about';
  const isContactPage = location.pathname === '/contact';
  const isTenantsPage = location.pathname.startsWith('/tenants');
  const isHomePage = location.pathname === '/';

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 bg-white/95 dark:bg-slate-800/95 border-b border-slate-200 dark:border-slate-700">
      <div className="max-w-7xl mx-auto px-6 h-[72px] flex items-center justify-between">
        {/* Logo */}
        <Link to="/" className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-blue-600 flex items-center justify-center">
            <svg viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" className="w-6 h-6">
              <path d="M12 14l9-5-9-5-9 5 9 5z" />
              <path d="M12 14l6.16-3.422a12.083 12.083 0 01.665 6.479A11.952 11.952 0 0012 20.055a11.952 11.952 0 00-6.824-2.998 12.078 12.078 0 01.665-6.479L12 14z" />
            </svg>
          </div>
          <span className="text-xl font-bold text-slate-900 dark:text-white">IOES</span>
        </Link>

        {/* Nav Links - Desktop */}
        <div className="hidden md:flex items-center gap-1">
          <Link to="/" className={`px-4 py-2 rounded-lg font-medium text-sm transition-all duration-200 hover:scale-105 ${(activeSection === 'home' && isHomePage) ? 'text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/50' : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-700'}`}>{t('nav.home')}</Link>
          <Link to="/courses" className={`px-4 py-2 rounded-lg font-medium text-sm transition-all duration-200 hover:scale-105 ${activeSection === 'courses' || isCoursesPage ? 'text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/50' : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-700'}`}>{t('nav.courses')}</Link>
          <Link to="/about" className={`px-4 py-2 rounded-lg font-medium text-sm transition-all duration-200 hover:scale-105 ${isAboutPage ? 'text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/50' : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-700'}`}>{t('nav.about')}</Link>
          <Link to="/contact" className={`px-4 py-2 rounded-lg font-medium text-sm transition-all duration-200 hover:scale-105 ${isContactPage ? 'text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/50' : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-700'}`}>{t('nav.contact')}</Link>
          <Link to="/tenants" className={`px-4 py-2 rounded-lg font-medium text-sm transition-all duration-200 hover:scale-105 ${isTenantsPage ? 'text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/50' : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-700'}`}>{t('nav.tenants')}</Link>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-3">
          <button
            onClick={cycleTheme}
            className="p-2.5 min-w-[44px] bg-slate-100 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-lg cursor-pointer hover:bg-slate-200 dark:hover:bg-slate-600 transition-colors"
            aria-label="Toggle theme"
            title={t(`theme.${theme}`)}
          >
            {isDark ? (
              <svg className="w-5 h-5 text-slate-600 dark:text-slate-300" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="12" cy="12" r="5" />
                <path d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42" />
              </svg>
            ) : (
              <svg className="w-5 h-5 text-slate-600 dark:text-slate-300" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M21 12.79A9 9 0 1111.21 3 7 7 0 0021 12.79z" />
              </svg>
            )}
          </button>
          <button 
            onClick={toggleLanguage}
            className="px-4 py-2.5 bg-slate-100 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-lg text-sm font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-600 transition-colors"
            aria-label="Toggle language"
          >
            {i18n.language.toUpperCase()}
          </button>
          {isAuthenticated && user ? (
            <div className="relative" ref={avatarMenuRef}>
              <button
                onClick={() => setAvatarMenuOpen(v => !v)}
                aria-label={t('auth.accountMenu')}
                aria-haspopup="menu"
                aria-expanded={avatarMenuOpen}
                className="w-10 h-10 rounded-full overflow-hidden border-2 border-slate-200 dark:border-slate-700 hover:border-blue-500 transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                {user.avatar_url ? (
                  <img src={user.avatar_url} alt={user.full_name} className="w-full h-full object-cover" />
                ) : (
                  <span className="w-full h-full flex items-center justify-center bg-gradient-to-br from-blue-500 to-indigo-600 text-white text-sm font-bold">
                    {avatarInitial}
                  </span>
                )}
              </button>
              {avatarMenuOpen && (
                <div
                  role="menu"
                  className="absolute right-0 top-12 w-60 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 shadow-xl overflow-hidden"
                >
                  <div className="px-4 py-3 border-b border-slate-100 dark:border-slate-700">
                    <p className="text-sm font-semibold text-slate-900 dark:text-white truncate">{user.full_name}</p>
                    <p className="text-xs text-slate-500 dark:text-slate-400 truncate">{user.email}</p>
                  </div>
                  <Link
                    to={getDashboardPath()}
                    role="menuitem"
                    className="flex items-center gap-2 px-4 py-2.5 text-sm text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
                  >
                    <DashboardIcon /> {t('auth.myPage')}
                  </Link>
                  <button
                    onClick={handleLogout}
                    role="menuitem"
                    className="w-full flex items-center gap-2 px-4 py-2.5 text-sm text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-900/20 transition-colors"
                  >
                    <LogoutIcon /> {t('auth.logout')}
                  </button>
                </div>
              )}
            </div>
          ) : (
            <>
              <Link to="/auth/login" className="hidden sm:inline-flex px-4 py-2.5 border border-blue-600 text-blue-600 dark:text-blue-400 rounded-lg font-semibold hover:bg-blue-50 dark:hover:bg-blue-900/30 transition-colors">
                {t('auth.login')}
              </Link>
              <Link to="/auth/register" className="px-4 py-2.5 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 transition-colors shadow-lg">
                {t('auth.register')}
              </Link>
            </>
          )}
          <button
            className="md:hidden p-2.5 min-w-[44px] bg-slate-100 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-lg"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            aria-label="Toggle menu"
          >
            <svg className="w-5 h-5 text-slate-600 dark:text-slate-300" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              {mobileMenuOpen ? (
                <path d="M6 18L18 6M6 6l12 12" />
              ) : (
                <path d="M4 6h16M4 12h16M4 18h16" />
              )}
            </svg>
          </button>
        </div>
      </div>

      {/* Mobile Menu */}
      {mobileMenuOpen && (
        <div className="md:hidden bg-white dark:bg-slate-800 border-t border-slate-200 dark:border-slate-700 px-6 py-4">
          <div className="flex flex-col gap-2">
            <Link to="/" onClick={() => setMobileMenuOpen(false)} className={`px-4 py-3 rounded-lg font-medium transition-all ${(activeSection === 'home' && isHomePage) ? 'text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/50' : 'text-slate-600 dark:text-slate-300'}`}>{t('nav.home')}</Link>
            <Link to="/courses" onClick={() => setMobileMenuOpen(false)} className={`px-4 py-3 rounded-lg font-medium transition-all ${activeSection === 'courses' || isCoursesPage ? 'text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/50' : 'text-slate-600 dark:text-slate-300'}`}>{t('nav.courses')}</Link>
            <Link to="/about" onClick={() => setMobileMenuOpen(false)} className={`px-4 py-3 rounded-lg font-medium transition-all ${isAboutPage ? 'text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/50' : 'text-slate-600 dark:text-slate-300'}`}>{t('nav.about')}</Link>
            <Link to="/contact" onClick={() => setMobileMenuOpen(false)} className={`px-4 py-3 rounded-lg font-medium transition-all ${isContactPage ? 'text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/50' : 'text-slate-600 dark:text-slate-300'}`}>{t('nav.contact')}</Link>
            <Link to="/tenants" onClick={() => setMobileMenuOpen(false)} className={`px-4 py-3 rounded-lg font-medium transition-all ${isTenantsPage ? 'text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/50' : 'text-slate-600 dark:text-slate-300'}`}>{t('nav.tenants')}</Link>
            {isAuthenticated && user ? (
              <div className="flex flex-col gap-2 mt-4 pt-4 border-t border-slate-200 dark:border-slate-700">
                <div className="flex items-center gap-3 px-4 py-2">
                  {user.avatar_url ? (
                    <img src={user.avatar_url} alt={user.full_name} className="w-10 h-10 rounded-full object-cover" />
                  ) : (
                    <span className="w-10 h-10 rounded-full flex items-center justify-center bg-gradient-to-br from-blue-500 to-indigo-600 text-white text-sm font-bold">
                      {avatarInitial}
                    </span>
                  )}
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-slate-900 dark:text-white truncate">{user.full_name}</p>
                    <p className="text-xs text-slate-500 dark:text-slate-400 truncate">{user.email}</p>
                  </div>
                </div>
                <Link to={getDashboardPath()} className="flex items-center gap-2 px-4 py-3 rounded-lg font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700"><DashboardIcon /> {t('auth.myPage')}</Link>
                <button onClick={handleLogout} className="flex items-center gap-2 px-4 py-3 rounded-lg font-medium text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-900/20"><LogoutIcon /> {t('auth.logout')}</button>
              </div>
            ) : (
              <div className="flex gap-3 mt-4 pt-4 border-t border-slate-200 dark:border-slate-700">
                <Link to="/auth/login" className="flex-1 px-4 py-2.5 border border-blue-600 text-blue-600 dark:text-blue-400 rounded-lg font-semibold text-center">{t('auth.login')}</Link>
                <Link to="/auth/register" className="flex-1 px-4 py-2.5 bg-blue-600 text-white rounded-lg font-semibold text-center">{t('auth.register')}</Link>
              </div>
            )}
          </div>
        </div>
      )}
    </nav>
  );
};

const DashboardIcon = () => (
  <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <rect x="3" y="3" width="7" height="9" rx="1" />
    <rect x="14" y="3" width="7" height="5" rx="1" />
    <rect x="14" y="12" width="7" height="9" rx="1" />
    <rect x="3" y="16" width="7" height="5" rx="1" />
  </svg>
);
const LogoutIcon = () => (
  <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
    <polyline points="16 17 21 12 16 7" />
    <line x1="21" y1="12" x2="9" y2="12" />
  </svg>
);

export default Header;
