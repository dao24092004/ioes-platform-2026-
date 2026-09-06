import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { logger } from '@/utils/logger';

const LINK_TTL_SECONDS = 24 * 60; // 24 phút — liên kết hết hạn sau 24h (demo dùng phút để dễ xem)
const RESEND_COOLDOWN_SECONDS = 60;

const formatMMSS = (totalSeconds: number): string => {
  const safe = Math.max(0, Math.floor(totalSeconds));
  const m = Math.floor(safe / 60);
  const s = safe % 60;
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
};

export default function ForgotPasswordPage() {
  const { t } = useTranslation();
  const [email, setEmail] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [error, setError] = useState('');

  // Countdown đếm ngược cho liên kết hết hạn
  const [expiresIn, setExpiresIn] = useState(LINK_TTL_SECONDS);
  // Cooldown cho nút gửi lại
  const [resendCooldown, setResendCooldown] = useState(0);
  // Trạng thái đã bấm gửi lại (hiển thị confirm)
  const [resendJustSent, setResendJustSent] = useState(false);

  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (!isSuccess) return;
    if (intervalRef.current) clearInterval(intervalRef.current);
    intervalRef.current = setInterval(() => {
      setExpiresIn((v) => (v > 0 ? v - 1 : 0));
      setResendCooldown((v) => (v > 0 ? v - 1 : 0));
    }, 1000);
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [isSuccess]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      logger.info('ForgotPasswordPage', 'User requested password reset', { email });

      // TODO: Call API - POST /api/auth/forgot-password
      // DB: password_resets table (token, expires_at, used_at)

      // Simulate API call
      await new Promise((resolve) => setTimeout(resolve, 1500));

      setExpiresIn(LINK_TTL_SECONDS);
      setResendCooldown(0);
      setResendJustSent(false);
      setIsSuccess(true);
    } catch (err) {
      setError(t('auth.forgotPasswordError'));
      logger.error('ForgotPasswordPage', 'Password reset request failed', { error: err });
    } finally {
      setIsLoading(false);
    }
  };

  const handleResend = async () => {
    if (resendCooldown > 0) return;

    // TODO: Call API - POST /api/auth/forgot-password (resend)
    logger.info('ForgotPasswordPage', 'User requested to resend verification email', { email });

    // Reset countdown + bắt đầu cooldown 60s
    setExpiresIn(LINK_TTL_SECONDS);
    setResendCooldown(RESEND_COOLDOWN_SECONDS);
    setResendJustSent(true);
    setTimeout(() => setResendJustSent(false), 3000);
  };

  const handleTryAnother = () => {
    setIsSuccess(false);
    setEmail('');
    setExpiresIn(LINK_TTL_SECONDS);
    setResendCooldown(0);
    setResendJustSent(false);
    setError('');
  };

  const timerExpired = expiresIn <= 0;
  const timerClass = timerExpired
    ? 'text-red-600 dark:text-red-400'
    : expiresIn <= 60
    ? 'text-amber-600 dark:text-amber-400'
    : 'text-blue-600 dark:text-blue-400';

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-900 px-6 py-12">
      <div className="w-full max-w-md">
        {/* Logo */}
        <Link to="/" className="flex items-center justify-center gap-2 mb-8">
          <div className="w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center">
            <svg className="w-6 h-6 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M12 14l9-5-9-5-9 5 9 5z" />
              <path d="M12 14l6.16-3.422a12.083 12.083 0 01.665 6.479A11.952 11.952 0 0012 20.055a11.952 11.952 0 00-6.824-2.998 12.078 12.078 0 01.665-6.479L12 14z" />
            </svg>
          </div>
          <span className="text-xl font-bold text-slate-900 dark:text-white">IOES</span>
        </Link>

        {/* Card */}
        <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-xl border border-slate-100 dark:border-slate-700 p-8">
          {!isSuccess ? (
            <>
              {/* Header */}
              <div className="text-center mb-8">
                <div className="w-16 h-16 bg-blue-100 dark:bg-blue-900/50 rounded-2xl flex items-center justify-center mx-auto mb-4">
                  <svg className="w-8 h-8 text-blue-600 dark:text-blue-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" />
                  </svg>
                </div>
                <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-2">
                  {t('auth.forgotPasswordTitle')}
                </h2>
                <p className="text-slate-600 dark:text-slate-400 text-sm">
                  {t('auth.forgotPasswordSubtitle')}
                </p>
              </div>

              {/* Form */}
              <form onSubmit={handleSubmit} className="space-y-5">
                {error && (
                  <div className="p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl">
                    <div className="flex items-center gap-3">
                      <svg className="w-5 h-5 text-red-500" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M12 22C6.477 22 2 17.523 2 12S6.477 2 12 2s10 4.477 10 10-4.477 10-10 10zm-1-7v2h2v-2h-2zm0-8v6h2V7h-2z" />
                      </svg>
                      <span className="text-sm text-red-600 dark:text-red-400">{error}</span>
                    </div>
                  </div>
                )}

                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                    {t('auth.email')}
                  </label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="email@company.com"
                    className="w-full px-4 py-3.5 text-sm border-2 border-slate-200 dark:border-slate-600 rounded-xl bg-white dark:bg-slate-700 text-slate-900 dark:text-white placeholder-slate-400 focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 outline-none transition-all"
                    required
                  />
                  <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">
                    {t('auth.forgotPasswordHint')}
                  </p>
                </div>

                <button
                  type="submit"
                  disabled={isLoading}
                  className="w-full py-3.5 text-sm font-semibold bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 disabled:cursor-not-allowed text-white rounded-xl shadow-lg shadow-blue-600/30 hover:shadow-blue-700/40 transition-all hover:-translate-y-0.5 disabled:hover:translate-y-0 disabled:hover:shadow-none flex items-center justify-center gap-2"
                >
                  {isLoading ? (
                    <>
                      <svg className="w-5 h-5 animate-spin" viewBox="0 0 24 24" fill="none">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                      </svg>
                      {t('auth.forgotPasswordSending')}
                    </>
                  ) : (
                    t('auth.forgotPasswordSend')
                  )}
                </button>
              </form>

              {/* Back to Login */}
              <div className="mt-6 text-center">
                <Link
                  to="/auth/login"
                  className="inline-flex items-center gap-2 text-sm text-blue-600 hover:text-blue-700 dark:text-blue-400 transition-colors"
                >
                  <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M15 18l-6-6 6-6" />
                  </svg>
                  {t('auth.forgotPasswordBackToLogin')}
                </Link>
              </div>
            </>
          ) : (
            /* Success State — đồng bộ với file 27-email-verification */
            <div className="text-center">
              {/* Status badge "Chờ xác minh" */}
              <div className="inline-flex items-center gap-2 px-4 py-2 bg-amber-50 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400 rounded-full text-xs font-semibold mb-6">
                <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                {t('auth.forgotPasswordSentTo')}
              </div>

              {/* Icon */}
              <div className="w-16 h-16 bg-blue-100 dark:bg-blue-900/50 rounded-2xl flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8 text-blue-600 dark:text-blue-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                </svg>
              </div>

              <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-2">
                {t('auth.forgotPasswordSuccess')}
              </h2>
              <p className="text-slate-600 dark:text-slate-400 mb-6 text-sm">
                {t('auth.forgotPasswordSuccessDesc')}
              </p>

              {/* Email box */}
              <div className="bg-slate-50 dark:bg-slate-700 rounded-xl p-4 mb-4 flex items-center gap-3 text-left">
                <div className="w-10 h-10 rounded-lg bg-blue-100 dark:bg-blue-900/40 flex items-center justify-center flex-shrink-0">
                  <svg className="w-5 h-5 text-blue-600 dark:text-blue-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                  </svg>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-xs text-slate-500 dark:text-slate-400">
                    {t('auth.forgotPasswordSentTo')}
                  </div>
                  <div className="text-sm font-semibold text-slate-900 dark:text-white truncate">
                    {email}
                  </div>
                </div>
              </div>

              {/* Countdown box — Liên kết hết hạn sau */}
              <div className="bg-slate-50 dark:bg-slate-700 rounded-xl p-4 mb-6">
                <div className="text-xs text-slate-500 dark:text-slate-400 mb-1.5">
                  {t('auth.forgotPasswordCountdownLabel')}
                </div>
                <div className={`text-3xl font-bold font-mono ${timerClass}`}>
                  {timerExpired ? t('auth.forgotPasswordExpired') : formatMMSS(expiresIn)}
                </div>
              </div>

              {/* Nút gửi lại email xác minh */}
              <button
                onClick={handleResend}
                disabled={resendCooldown > 0}
                className={`w-full py-3.5 text-sm font-semibold rounded-xl transition-all flex items-center justify-center gap-2 ${
                  resendCooldown > 0
                    ? 'bg-slate-100 dark:bg-slate-700 text-slate-400 cursor-not-allowed'
                    : 'bg-blue-600 hover:bg-blue-700 text-white shadow-lg shadow-blue-600/30 hover:shadow-blue-700/40 hover:-translate-y-0.5'
                }`}
              >
                <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
                {resendCooldown > 0
                  ? t('auth.forgotPasswordResendCooldown', { seconds: resendCooldown })
                  : resendJustSent
                  ? t('auth.forgotPasswordResendSent')
                  : t('auth.forgotPasswordResend')}
              </button>

              {/* Quay lại đăng nhập */}
              <Link
                to="/auth/login"
                className="w-full mt-3 py-3 text-sm font-semibold border border-slate-200 dark:border-slate-600 text-slate-700 dark:text-slate-300 hover:border-blue-500 hover:text-blue-600 dark:hover:text-blue-400 rounded-xl transition-colors flex items-center justify-center gap-2"
              >
                <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M11 16l-4-4m0 0l4-4m-4 4h14m-5 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h7a3 3 0 013 3v1" />
                </svg>
                {t('auth.forgotPasswordBackToLogin')}
              </Link>

              <p className="text-xs text-slate-500 dark:text-slate-400 mt-6 leading-relaxed">
                {t('auth.forgotPasswordCheckSpam')}
              </p>

              <button
                onClick={handleTryAnother}
                className="w-full mt-4 py-2.5 text-sm font-medium text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors"
              >
                {t('auth.forgotPasswordTryAnother')}
              </button>
            </div>
          )}
        </div>

        {/* Footer */}
        <p className="text-center text-xs text-slate-500 dark:text-slate-400 mt-6">
          <Link to="/" className="hover:text-slate-700 dark:hover:text-slate-300 transition-colors">
            ← {t('branding.login.backHome')}
          </Link>
        </p>
      </div>
    </div>
  );
}