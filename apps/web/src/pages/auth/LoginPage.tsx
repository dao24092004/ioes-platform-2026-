import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuthStore } from '@/app/store/authStore';
import { Button, Input } from '@/components/common';
import { authApi } from '@/services/api/auth.api';
import { ApiError } from '@/config/api.config';
import type { User } from '@/types/db';

/**
 * Tài khoản demo, chỉ để điền nhanh biểu mẫu khi chạy local — bấm vào là điền
 * email/mật khẩu rồi gửi lên auth-service như đăng nhập bình thường, KHÔNG
 * phải đường tắt bỏ qua xác thực. Nếu backend không có sẵn các tài khoản này
 * thì sẽ báo sai mật khẩu, đúng như mong đợi.
 *
 * Khối này chỉ hiện khi `import.meta.env.DEV`, để mật khẩu không lọt vào gói
 * build production. `database/seeds` hiện đang trống nên các nút này chưa đăng
 * nhập được cho tới khi có seed tạo đúng bốn tài khoản dưới đây.
 */
const SHOW_DEMO_ACCOUNTS = import.meta.env.DEV;

const DEMO_ACCOUNTS: Array<{ label: string; email: string; password: string }> = [
  {
    label: 'Admin',
    email: 'minh.nv@fpt.edu.vn',
    password: 'admin123',
  },
  {
    label: 'Super Admin',
    email: 'super.admin@ioes.vn',
    password: 'super123',
  },
  {
    label: 'Instructor',
    email: 'a.nv@fpt.edu.vn',
    password: 'instructor123',
  },
  {
    label: 'Student',
    email: 'nam.nh@fpt.edu.vn',
    password: 'student123',
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

  /**
   * Đăng nhập thật qua auth-service.
   *
   * Access token phải vào store trước khi điều hướng: apiClient đọc token từ
   * đó, nên nếu điều hướng trước thì trang đích gọi API sẽ đi thiếu token.
   */
  const signIn = async (emailValue: string, passwordValue: string) => {
    setIsLoading(true);
    setError('');

    try {
      const session = await authApi.login({ email: emailValue, password: passwordValue });

      const user: User = {
        id: session.user.id,
        email: session.user.email,
        full_name: session.user.fullName,
        role: session.user.role,
        avatar_url: session.user.avatarUrl,
      } as User;

      login(user, session.accessToken);
      navigate(homeForRole(user.role));
    } catch (err) {
      setError(
        err instanceof ApiError
          ? err.message
          : 'Không kết nối được máy chủ. Kiểm tra API Gateway đang chạy chưa.',
      );
      setIsLoading(false);
    }
  };

  const handleQuickLogin = (account: (typeof DEMO_ACCOUNTS)[0]) => {
    setEmail(account.email);
    setPassword(account.password);
    void signIn(account.email, account.password);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    void signIn(email, password);
  };

  return (
    <div className="w-full">
      {/* Quick-fill demo accounts — chỉ dựng khi chạy dev */}
      {SHOW_DEMO_ACCOUNTS && (
        <div className="mb-6">
          <div className="flex items-center gap-3 mb-3">
            <div className="flex-1 h-px bg-slate-200 dark:bg-slate-700" />
            <span className="text-xs text-slate-500 font-medium">Đăng nhập nhanh (tài khoản demo)</span>
            <div className="flex-1 h-px bg-slate-200 dark:bg-slate-700" />
          </div>
          <div className="grid grid-cols-2 gap-2">
            {DEMO_ACCOUNTS.map((account) => (
              <button
                key={account.label}
                type="button"
                onClick={() => handleQuickLogin(account)}
                className="py-2 px-3 text-xs font-medium rounded-lg border-2 border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800/50 text-slate-700 dark:text-slate-300 hover:border-blue-400 dark:hover:border-cyan-500 hover:bg-blue-50 dark:hover:bg-cyan-500/10 hover:text-blue-600 dark:hover:text-cyan-400 transition-all"
              >
                {account.label}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Login Form */}
      <form onSubmit={handleSubmit} className="space-y-5">
        {error && (
          <div className="p-3 bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/30 rounded-xl">
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
                    ? 'bg-gradient-to-r from-blue-600 to-cyan-500 border-transparent' 
                    : 'bg-white dark:bg-slate-800 border-slate-400 dark:border-slate-600'
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
            className="text-sm font-medium text-blue-600 dark:text-cyan-400 hover:text-blue-700 dark:hover:text-cyan-300 transition-colors"
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
      <p className="text-center text-sm text-slate-600 dark:text-slate-400 mt-8 pt-6 border-t border-slate-200 dark:border-slate-800">
        {t('branding.login.noAccount')}{' '}
        <Link to="/auth/register" className="font-semibold text-blue-600 dark:text-cyan-400 hover:text-blue-700 dark:hover:text-cyan-300 transition-colors">
          {t('branding.login.signUp')}
        </Link>
      </p>
    </div>
  );
}
