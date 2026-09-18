import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { logger } from '@/utils/logger';
import { Button, Input } from '@/components/common';
import { authApi } from '@/services/api/auth.api';
import { ApiError } from '@/config/api.config';

export default function RegisterPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [agreeTerms, setAgreeTerms] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const getPasswordStrength = () => {
    let strength = 0;
    if (password.length >= 8) strength++;
    if (/[a-z]/.test(password)) strength++;
    if (/[A-Z]/.test(password)) strength++;
    if (/[0-9]/.test(password)) strength++;
    if (/[^a-zA-Z0-9]/.test(password)) strength++;
    return strength;
  };

  const strength = getPasswordStrength();
  const strengthLevels = ['password.weak', 'password.medium', 'password.strong', 'password.veryStrong'];
  const strengthColors = ['bg-red-500', 'bg-amber-500', 'bg-emerald-500', 'bg-emerald-500'];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (password !== confirmPassword) {
      logger.warn('RegisterPage', 'Password mismatch');
      setError('Mật khẩu nhập lại không khớp.');
      return;
    }
    // auth-service bắt tối thiểu 8 ký tự; chặn ở đây để khỏi mất một vòng gọi.
    if (password.length < 8) {
      setError('Mật khẩu phải có ít nhất 8 ký tự.');
      return;
    }

    setLoading(true);
    // Không log mật khẩu, chỉ log những trường không nhạy cảm.
    logger.info('RegisterPage', 'User attempting to register', {
      email,
      full_name: fullName,
      has_accepted_terms: agreeTerms,
    });

    try {
      await authApi.register({ email, password, fullName });
      // Đăng ký xong chưa có phiên — backend gửi email xác thực trước.
      navigate('/auth/verify-email', { state: { email, fullName } });
    } catch (err) {
      setError(
        err instanceof ApiError
          ? err.message
          : 'Không kết nối được máy chủ. Kiểm tra API Gateway đang chạy chưa.',
      );
      setLoading(false);
    }
  };

  const handleGoogleRegister = () => {
    logger.info('RegisterPage', 'User clicked Google register');
  };

  return (
    <div className="w-full">
      {/* Register Form */}
      <form onSubmit={handleSubmit} className="space-y-5">
        {error && (
          <div className="p-3 bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/30 rounded-xl">
            <p className="text-sm text-red-600 dark:text-red-400 text-center">{error}</p>
          </div>
        )}
        <Input
          label={t('auth.fullName')}
          type="text"
          value={fullName}
          onChange={(e) => setFullName(e.target.value)}
          placeholder={t('auth.fullNamePlaceholder')}
          required
        />

        <Input
          label={t('auth.email')}
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="email@company.com"
          required
        />

        <div>
          <Input
            label={t('auth.password')}
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder={t('auth.minChars')}
            required
          />
          {password && (
            <div className="mt-3">
              <div className="flex gap-1 mb-1">
                {[1, 2, 3, 4].map((i) => (
                  <div
                    key={i}
                    className={`h-1 flex-1 rounded-full transition-colors ${
                      i <= strength ? strengthColors[strength - 1] : 'bg-slate-200 dark:bg-slate-700'
                    }`}
                  />
                ))}
              </div>
              <span className={`text-xs font-medium ${
                strength <= 1 ? 'text-red-500 dark:text-red-400' : strength <= 2 ? 'text-amber-500 dark:text-amber-400' : 'text-emerald-500 dark:text-emerald-400'
              }`}>
                {t(strengthLevels[strength - 1])}
              </span>
            </div>
          )}
        </div>

        <Input
          label={t('auth.confirmPassword')}
          type="password"
          value={confirmPassword}
          onChange={(e) => setConfirmPassword(e.target.value)}
          placeholder="Confirm password"
          required
        />

        <div>
          <label className="flex items-start gap-3 cursor-pointer">
            <div className="relative mt-0.5">
              <input
                type="checkbox"
                checked={agreeTerms}
                onChange={(e) => setAgreeTerms(e.target.checked)}
                className={`w-5 h-5 rounded border-2 cursor-pointer appearance-none transition-all ${
                  agreeTerms 
                    ? 'bg-gradient-to-r from-blue-600 to-cyan-500 border-transparent' 
                    : 'bg-white dark:bg-slate-800 border-slate-400 dark:border-slate-600'
                }`}
                required
              />
              <svg className="absolute top-0.5 left-0.5 w-4 h-4 text-white pointer-events-none transition-opacity" fill="currentColor" viewBox="0 0 20 20" style={{ opacity: agreeTerms ? 1 : 0 }}>
                <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
              </svg>
            </div>
            <span className="text-sm text-slate-600 dark:text-slate-400">
              {t('auth.agreeTerms')}{' '}
              <a href="/terms" className="text-blue-600 dark:text-cyan-400 hover:text-blue-700 dark:hover:text-cyan-300 hover:underline">{t('auth.terms')}</a>
              {' '}{t('common.and')}{' '}
              <a href="/privacy" className="text-blue-600 dark:text-cyan-400 hover:text-blue-700 dark:hover:text-cyan-300 hover:underline">{t('auth.privacy')}</a>
            </span>
          </label>
        </div>

        <Button type="submit" fullWidth size="lg" disabled={!agreeTerms || loading}>
          {loading ? (
            <span className="inline-flex items-center gap-2">
              <svg className="animate-spin h-5 w-5 text-white" viewBox="0 0 24 24" fill="none">
                <circle cx="12" cy="12" r="10" stroke="currentColor" strokeOpacity="0.25" strokeWidth="4" />
                <path d="M4 12a8 8 0 018-8" stroke="currentColor" strokeWidth="4" strokeLinecap="round" fill="none" />
              </svg>
              {t('auth.creatingAccount', 'Đang tạo tài khoản…')}
            </span>
          ) : (
            t('auth.createAccount')
          )}
        </Button>
      </form>

      {/* Divider */}
      <div className="flex items-center gap-4 my-6">
        <div className="flex-1 h-px bg-slate-200 dark:bg-slate-700" />
        <span className="text-sm text-slate-500 font-medium">{t('auth.orRegisterWith')}</span>
        <div className="flex-1 h-px bg-slate-200 dark:bg-slate-700" />
      </div>

      {/* Social Register */}
      <Button variant="secondary" fullWidth onClick={handleGoogleRegister}>
        <svg viewBox="0 0 24 24" className="w-5 h-5">
          <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
          <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
          <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
          <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
        </svg>
        {t('auth.registerWithGoogle')}
      </Button>

      {/* Footer */}
      <p className="text-center text-sm text-slate-600 dark:text-slate-400 mt-8 pt-6 border-t border-slate-200 dark:border-slate-800">
        {t('branding.register.hasAccount')}{' '}
        <Link to="/auth/login" className="font-semibold text-blue-600 dark:text-cyan-400 hover:text-blue-700 dark:hover:text-cyan-300 transition-colors">
          {t('branding.register.signIn')}
        </Link>
      </p>
    </div>
  );
}
