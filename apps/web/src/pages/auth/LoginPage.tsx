import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuthStore } from '@/app/store/authStore';
import { Button, Input } from '@/components/common';
import type { User } from '@/types/db';

// Mock accounts — match seedUsers in services/api.ts
const MOCK_ACCOUNTS: Array<{ label: string; email: string; password: string; user: Partial<User> }> = [
  {
    label: 'Admin',
    email: 'minh.nv@fpt.edu.vn',
    password: 'admin123',
    user: { id: 'u-001', email: 'minh.nv@fpt.edu.vn', full_name: 'Nguyễn Văn Minh', role: 'admin', avatar_url: 'https://i.pravatar.cc/100?img=1' },
  },
  {
    label: 'Super Admin',
    email: 'super.admin@ioes.vn',
    password: 'super123',
    user: { id: 'u-002', email: 'super.admin@ioes.vn', full_name: 'Trần Quốc Bảo', role: 'super_admin', avatar_url: null },
  },
  {
    label: 'Instructor',
    email: 'a.nv@fpt.edu.vn',
    password: 'instructor123',
    user: { id: 'u-003', email: 'a.nv@fpt.edu.vn', full_name: 'TS. Nguyễn Văn A', role: 'instructor', avatar_url: 'https://i.pravatar.cc/100?img=5' },
  },
  {
    label: 'Student',
    email: 'nam.nh@fpt.edu.vn',
    password: 'student123',
    user: { id: 'u-005', email: 'nam.nh@fpt.edu.vn', full_name: 'Nguyễn Hoàng Nam', role: 'student', avatar_url: 'https://i.pravatar.cc/100?img=11' },
  },
];

const homeForRole = (role: User['role']): string => {
  switch (role) {
    case 'admin':
    case 'super_admin':
      return '/admin';
    case 'instructor':
      return '/instructor';
    case 'student':
      return '/student';
    default:
      return '/';
  }
};

export default function LoginPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { login } = useAuthStore();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const handleQuickLogin = (account: (typeof MOCK_ACCOUNTS)[0]) => {
    setEmail(account.email);
    setPassword(account.password);
    // auto-login immediately
    setIsLoading(true);
    setError('');
    setTimeout(() => {
      login(account.user as User);
      navigate(homeForRole((account.user as User).role));
    }, 600);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');

    const matched = MOCK_ACCOUNTS.find(
      (a) => a.email === email && a.password === password
    );

    setTimeout(() => {
      if (matched) {
        login(matched.user as User);
        navigate(homeForRole((matched.user as User).role));
      } else {
        setError('Email hoặc mật khẩu không đúng.');
      }
      setIsLoading(false);
    }, 800);
  };

  return (
    <div className="min-h-screen flex bg-slate-50 dark:bg-slate-900">
      {/* Left Panel - Branding */}
      <div className="hidden lg:flex lg:w-1/2 bg-gradient-to-br from-blue-600 to-blue-800 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-96 h-96 bg-white/5 rounded-full -translate-y-1/2 translate-x-1/2" />
        <div className="absolute bottom-0 left-0 w-72 h-72 bg-cyan-500/20 rounded-full translate-y-1/2 -translate-x-1/2" />
        
        <div className="relative z-10 flex flex-col justify-center px-12 xl:px-16 w-full max-w-lg mx-auto">
          <Link to="/" className="flex items-center gap-3 mb-12">
            <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center">
              <svg className="w-7 h-7 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M12 14l9-5-9-5-9 5 9 5z"/>
                <path d="M12 14l6.16-3.422a12.083 12.083 0 01.665 6.479A11.952 11.952 0 0012 20.055a11.952 11.952 0 00-6.824-2.998 12.078 12.078 0 01.665-6.479L12 14z"/>
              </svg>
            </div>
            <span className="text-2xl font-bold text-white">IOES</span>
          </Link>

          <h1 className="text-4xl font-bold text-white mb-5 leading-tight">
            {t('branding.login.title')}<br/>{t('branding.login.title2')}
          </h1>
          <p className="text-white/85 text-lg mb-10 leading-relaxed">
            {t('branding.login.desc')}
          </p>

          <div className="space-y-6 mb-10">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-white/15 rounded-xl flex items-center justify-center flex-shrink-0">
                <svg className="w-6 h-6 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z"/>
                </svg>
              </div>
              <span className="text-white/90">{t('branding.login.feature1')}</span>
            </div>
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-white/15 rounded-xl flex items-center justify-center flex-shrink-0">
                <svg className="w-6 h-6 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/>
                  <path d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"/>
                </svg>
              </div>
              <span className="text-white/90">{t('branding.login.feature2')}</span>
            </div>
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-white/15 rounded-xl flex items-center justify-center flex-shrink-0">
                <svg className="w-6 h-6 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4"/>
                </svg>
              </div>
              <span className="text-white/90">{t('branding.login.feature3')}</span>
            </div>
          </div>

          <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-6">
            <p className="text-white/90 italic mb-4 leading-relaxed">
              {t('branding.login.testimonial')}
            </p>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center font-semibold text-white text-sm">
                HT
              </div>
              <div>
                <div className="font-semibold text-white text-sm">{t('branding.login.testimonialAuthor')}</div>
                <div className="text-white/70 text-xs">{t('branding.login.testimonialRole')}</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Right Panel - Form */}
      <div className="flex-1 flex items-center justify-center px-6 py-12">
        <div className="w-full max-w-md">
          <Link to="/" className="lg:hidden flex items-center justify-center gap-2 mb-8">
            <div className="w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center">
              <svg className="w-6 h-6 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M12 14l9-5-9-5-9 5 9 5z"/>
                <path d="M12 14l6.16-3.422a12.083 12.083 0 01.665 6.479A11.952 11.952 0 0012 20.055a11.952 11.952 0 00-6.824-2.998 12.078 12.078 0 01.665-6.479L12 14z"/>
              </svg>
            </div>
            <span className="text-xl font-bold text-slate-900 dark:text-white">IOES</span>
          </Link>

          <div className="text-center mb-8">
            <h2 className="text-3xl font-bold text-slate-900 dark:text-white mb-2">{t('auth.welcomeBack')}</h2>
            <p className="text-slate-600 dark:text-slate-400">{t('auth.loginSubtitle')}</p>
          </div>

          {/* Tabs */}
          <div className="flex bg-slate-100 dark:bg-slate-800 rounded-xl p-1 mb-8">
            <Link
              to="/auth/login"
              className="flex-1 py-3 text-center text-sm font-semibold rounded-lg bg-white dark:bg-slate-700 text-blue-600 dark:text-blue-400 shadow-sm transition-all"
            >
              {t('auth.login')}
            </Link>
            <Link
              to="/auth/register"
              className="flex-1 py-3 text-center text-sm font-semibold rounded-lg text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors"
            >
              {t('auth.register')}
            </Link>
          </div>

          {/* Quick-fill Mock Accounts */}
          <div className="mb-6">
            <div className="flex items-center gap-3 mb-3">
              <div className="flex-1 h-px bg-slate-200 dark:bg-slate-700" />
              <span className="text-xs text-slate-500 font-medium">Quick Login (Mock)</span>
              <div className="flex-1 h-px bg-slate-200 dark:bg-slate-700" />
            </div>
            <div className="grid grid-cols-2 gap-2">
              {MOCK_ACCOUNTS.map((account) => (
                <button
                  key={account.label}
                  type="button"
                  onClick={() => handleQuickLogin(account)}
                  className="py-2 px-3 text-xs font-medium rounded-lg border-2 border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:border-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/30 hover:text-blue-600 dark:hover:text-blue-400 transition-all"
                >
                  {account.label}
                </button>
              ))}
            </div>
          </div>

          {/* Login Form */}
          <form onSubmit={handleSubmit} className="space-y-5">
            {error && (
              <div className="p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl">
                <p className="text-sm text-red-600 dark:text-red-400 text-center">{error}</p>
              </div>
            )}
            <Input
              label={t('auth.email')}
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="email@company.com"
              required
            />

            <Input
              label={t('auth.password')}
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Nhập mật khẩu"
              required
            />

            <div className="flex items-center justify-between">
              <label className="flex items-center gap-3 cursor-pointer">
                <div className="relative">
                  <input
                    type="checkbox"
                    checked={rememberMe}
                    onChange={(e) => setRememberMe(e.target.checked)}
                    className={`w-5 h-5 rounded border-2 cursor-pointer appearance-none transition-all ${
                      rememberMe 
                        ? 'bg-blue-600 border-blue-600' 
                        : 'bg-white dark:bg-slate-700 border-slate-400 dark:border-slate-400'
                    }`}
                  />
                  <svg className="absolute top-0.5 left-0.5 w-4 h-4 text-white pointer-events-none transition-opacity" fill="currentColor" viewBox="0 0 20 20" style={{ opacity: rememberMe ? 1 : 0 }}>
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                </div>
                <span className="text-sm text-slate-600 dark:text-slate-400">{t('auth.rememberMe')}</span>
              </label>
              <Link
                to="/auth/forgot-password"
                className="text-sm font-medium text-blue-600 hover:text-blue-700 dark:text-blue-400"
              >
                {t('auth.forgotPassword')}
              </Link>
            </div>

            <Button type="submit" fullWidth size="lg" disabled={isLoading}>
              {isLoading ? (
                <svg className="w-5 h-5 animate-spin" viewBox="0 0 24 24" fill="none">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"/>
                </svg>
              ) : t('auth.login')}
            </Button>
          </form>

          {/* Divider */}
          <div className="flex items-center gap-4 my-6">
            <div className="flex-1 h-px bg-slate-200 dark:bg-slate-700" />
            <span className="text-sm text-slate-500 font-medium">{t('auth.orLoginWith')}</span>
            <div className="flex-1 h-px bg-slate-200 dark:bg-slate-700" />
          </div>

          {/* Social Login */}
          <div className="space-y-3">
            <Button variant="secondary" fullWidth onClick={() => alert('Google OAuth not connected yet.')}>
              <svg viewBox="0 0 24 24" className="w-5 h-5">
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
              </svg>
              {t('auth.loginWithGoogle')}
            </Button>

            <Button variant="secondary" fullWidth onClick={() => alert('GitHub OAuth not connected yet.')}>
              <svg viewBox="0 0 24 24" className="w-5 h-5" fill="currentColor">
                <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"/>
              </svg>
              {t('auth.loginWithGithub')}
            </Button>
          </div>

          {/* Footer */}
          <p className="text-center text-sm text-slate-600 dark:text-slate-400 mt-8 pt-6 border-t border-slate-200 dark:border-slate-700">
            {t('branding.login.noAccount')}{' '}
            <Link to="/auth/register" className="font-semibold text-blue-600 hover:text-blue-700 dark:text-blue-400">
              {t('branding.login.signUp')}
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
