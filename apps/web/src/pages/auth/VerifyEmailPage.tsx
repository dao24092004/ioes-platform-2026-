import { useEffect, useMemo, useState } from 'react';
import { Link, useLocation, useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';

type VerifyState = 'verifying' | 'sent' | 'success' | 'error';

type ErrorReason = 'expired' | 'invalid' | 'already_used';

type LocationState = { email?: string; fullName?: string };

const VerifyEmailPage: React.FC = () => {
  const { t } = useTranslation();
  const [params] = useSearchParams();
  const location = useLocation();
  const routerState = (location.state as LocationState | null) ?? null;
  const pendingEmail = routerState?.email ?? '';
  const token = params.get('token') ?? '';
  const [state, setState] = useState<VerifyState>(token ? 'verifying' : 'sent');
  const [reason, setReason] = useState<ErrorReason>('invalid');
  const [resendState, setResendState] = useState<'idle' | 'sending' | 'sent'>('idle');

  useEffect(() => {
    if (!token) {
      setState('error');
      setReason('invalid');
      return;
    }
    const timer = setTimeout(() => {
      // Simulated verification logic
      if (token.startsWith('used_')) {
        setReason('already_used');
        setState('error');
      } else if (token.startsWith('exp_')) {
        setReason('expired');
        setState('error');
      } else if (token.startsWith('bad_')) {
        setReason('invalid');
        setState('error');
      } else {
        setState('success');
      }
    }, 1500);
    return () => clearTimeout(timer);
  }, [token]);

  const errorReasonText = useMemo(() => {
    switch (reason) {
      case 'expired':
        return t('auth.verifyEmail.errorExpiredDesc');
      case 'already_used':
        return t('auth.verifyEmail.errorAlreadyUsedDesc');
      default:
        return t('auth.verifyEmail.errorInvalidDesc');
    }
  }, [reason, t]);

  const handleResend = () => {
    setResendState('sending');
    setTimeout(() => {
      setResendState('sent');
      setTimeout(() => setResendState('idle'), 2500);
    }, 900);
  };

  return (
    <div className="min-h-screen flex items-center justify-center relative overflow-hidden bg-gradient-to-br from-slate-50 via-white to-blue-50 dark:from-slate-900 dark:via-slate-900 dark:to-slate-950 transition-colors duration-300">
      {/* Background grid - Dark mode */}
      <div className="absolute inset-0 opacity-[0.06] dark:block hidden">
        <div
          className="w-full h-full"
          style={{
            backgroundImage: `
              linear-gradient(rgba(59, 130, 246, 0.4) 1px, transparent 1px),
              linear-gradient(90deg, rgba(59, 130, 246, 0.4) 1px, transparent 1px)
            `,
            backgroundSize: '50px 50px',
          }}
        />
      </div>

      {/* Background glow effects - Dark mode */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[400px] bg-gradient-to-b from-blue-600/20 dark:from-blue-600/20 to-transparent rounded-full blur-3xl hidden dark:block" />
      <div className="absolute bottom-0 left-1/4 w-[400px] h-[400px] bg-gradient-to-tr from-cyan-500/10 to-transparent rounded-full blur-3xl hidden dark:block" />
      <div className="absolute bottom-0 right-1/4 w-[400px] h-[400px] bg-gradient-to-tl from-purple-500/10 to-transparent rounded-full blur-3xl hidden dark:block" />

      <div className="w-full max-w-md relative z-10 px-6">
        {/* Brand */}
        <div className="flex items-center justify-center gap-3 mb-8">
          <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-cyan-400 rounded-xl flex items-center justify-center shadow-lg shadow-blue-500/30">
            <svg className="w-7 h-7 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M12 14l9-5-9-5-9 5 9 5z" />
              <path d="M12 14l6.16-3.422a12.083 12.083 0 01.665 6.479A11.952 11.952 0 0012 20.055a11.952 11.952 0 00-6.824-2.998 12.078 12.078 0 01.665-6.479L12 14z" />
            </svg>
          </div>
          <span className="text-2xl font-bold bg-gradient-to-r from-blue-400 via-cyan-400 to-purple-400 bg-clip-text text-transparent tracking-tight">IOES</span>
        </div>

        <div className="bg-white dark:bg-slate-800/60 backdrop-blur-xl rounded-2xl border border-slate-200 dark:border-slate-700/50 shadow-xl dark:shadow-2xl dark:shadow-blue-500/10 p-8 transition-colors duration-300">
          {state === 'verifying' && (
            <div className="text-center">
              <div className="mx-auto w-20 h-20 rounded-full bg-gradient-to-br from-blue-100 to-cyan-100 dark:from-blue-500/20 dark:to-cyan-500/20 flex items-center justify-center mb-6 border border-blue-200 dark:border-blue-500/30">
                <span className="w-10 h-10 border-4 border-blue-600 dark:border-cyan-400 border-t-transparent rounded-full animate-spin" />
              </div>
              <h1 className="text-2xl font-bold text-slate-900 dark:text-white mb-2">
                {t('auth.verifyEmail.verifying')}
              </h1>
              <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
                {t('auth.verifyEmail.verifyingDesc')}
              </p>
              <div className="mt-6 flex justify-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-blue-500 dark:bg-cyan-400 animate-pulse" />
                <span className="w-2 h-2 rounded-full bg-blue-400 dark:bg-cyan-300 animate-pulse" style={{ animationDelay: '0.15s' }} />
                <span className="w-2 h-2 rounded-full bg-blue-300 dark:bg-cyan-200 animate-pulse" style={{ animationDelay: '0.3s' }} />
              </div>
            </div>
          )}

          {state === 'sent' && (
            <div className="text-center">
              <div className="mx-auto w-20 h-20 rounded-full bg-gradient-to-br from-blue-100 to-cyan-100 dark:from-blue-500/20 dark:to-cyan-500/20 flex items-center justify-center mb-6 border border-blue-200 dark:border-blue-500/30">
                <svg className="w-12 h-12 text-blue-600 dark:text-cyan-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M3 8l9 6 9-6M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </div>
              <h1 className="text-2xl font-bold text-slate-900 dark:text-white mb-2">
                {t('auth.verifyEmail.checkInbox')}
              </h1>
              <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed mb-2">
                {t('auth.verifyEmail.checkInboxDesc')}
              </p>
              {pendingEmail && (
                <p className="text-sm font-semibold text-blue-600 dark:text-cyan-400 mb-6">
                  {pendingEmail}
                </p>
              )}
              <button
                type="button"
                onClick={handleResend}
                disabled={resendState !== 'idle'}
                className="mt-4 inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-slate-100 dark:bg-slate-700/80 border border-slate-200 dark:border-slate-600 hover:bg-slate-200 dark:hover:bg-slate-600 hover:border-blue-400 dark:hover:border-cyan-500/50 text-slate-700 dark:text-slate-200 text-sm font-semibold transition-all disabled:opacity-60"
              >
                {resendState === 'sending' && (
                  <span className="w-4 h-4 border-2 border-slate-400 dark:border-slate-400 border-t-transparent rounded-full animate-spin" />
                )}
                {resendState === 'sent'
                  ? t('auth.verifyEmail.resent')
                  : resendState === 'sending'
                    ? t('auth.verifyEmail.resending')
                    : t('auth.verifyEmail.resend')}
              </button>
              <div className="mt-6 pt-6 border-t border-slate-200 dark:border-slate-700">
                <Link
                  to="/auth/login"
                  className="text-sm text-blue-600 dark:text-cyan-400 hover:text-blue-700 dark:hover:text-cyan-300 font-medium transition-colors"
                >
                  {t('auth.verifyEmail.backToLogin')}
                </Link>
              </div>
            </div>
          )}

          {state === 'success' && (
            <div className="text-center">
              <div className="mx-auto w-20 h-20 rounded-full bg-gradient-to-br from-emerald-100 to-green-100 dark:from-emerald-500/20 dark:to-green-500/20 flex items-center justify-center mb-6 border border-emerald-200 dark:border-emerald-500/30">
                <svg className="w-12 h-12 text-emerald-600 dark:text-emerald-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <path d="M20 6L9 17l-5-5" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </div>
              <h1 className="text-2xl font-bold text-slate-900 dark:text-white mb-2">
                {t('auth.verifyEmail.success')}
              </h1>
              <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed mb-6">
                {t('auth.verifyEmail.successDesc')}
              </p>
              <div className="flex flex-col items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400">
                <span>{t('auth.verifyEmail.redirecting')}</span>
                <span className="w-2 h-2 rounded-full bg-emerald-500 dark:bg-emerald-400 animate-pulse" />
              </div>
              <Link
                to="/auth/login"
                className="mt-6 inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-blue-600 to-cyan-500 hover:from-blue-500 hover:to-cyan-400 text-white text-sm font-semibold transition-all shadow-lg shadow-blue-500/30"
              >
                {t('auth.verifyEmail.goToLogin')}
              </Link>
            </div>
          )}

          {state === 'error' && (
            <div className="text-center">
              <div className="mx-auto w-20 h-20 rounded-full bg-gradient-to-br from-red-100 to-rose-100 dark:from-red-500/20 dark:to-rose-500/20 flex items-center justify-center mb-6 border border-red-200 dark:border-red-500/30">
                <svg className="w-12 h-12 text-red-600 dark:text-red-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <line x1="18" y1="6" x2="6" y2="18" strokeLinecap="round" strokeLinejoin="round" />
                  <line x1="6" y1="6" x2="18" y2="18" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </div>
              <h1 className="text-2xl font-bold text-slate-900 dark:text-white mb-2">
                {t('auth.verifyEmail.error')}
              </h1>
              <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed mb-6">
                {errorReasonText}
              </p>

              <div className="bg-slate-50 dark:bg-slate-900/50 rounded-xl px-4 py-3 mb-6 text-left border border-slate-200 dark:border-slate-700/50">
                <div className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 uppercase mb-1">
                  {t('auth.verifyEmail.tokenLabel')}
                </div>
                <code className="block text-xs font-mono text-slate-700 dark:text-slate-300 break-all">
                  {token || t('auth.verifyEmail.noToken')}
                </code>
              </div>

              <div className="flex flex-col gap-3">
                <button
                  onClick={handleResend}
                  disabled={resendState !== 'idle'}
                  className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-blue-600 to-cyan-500 hover:from-blue-500 hover:to-cyan-400 disabled:from-slate-400 disabled:to-slate-500 text-white text-sm font-semibold transition-all shadow-lg shadow-blue-500/30 disabled:shadow-none"
                >
                  {resendState === 'sending' && (
                    <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  )}
                  {resendState === 'sent'
                    ? t('auth.verifyEmail.resent')
                    : resendState === 'sending'
                    ? t('auth.verifyEmail.resending')
                    : t('auth.verifyEmail.resend')}
                </button>
                <Link
                  to="/auth/login"
                  className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-600 hover:border-blue-400 dark:hover:border-cyan-500/50 text-sm font-semibold text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white transition-colors"
                >
                  <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="19" y1="12" x2="5" y2="12" /><polyline points="12 19 5 12 12 5" /></svg>
                  {t('auth.verifyEmail.backToLogin')}
                </Link>
              </div>
            </div>
          )}
        </div>

        <p className="text-center text-xs text-slate-500 dark:text-slate-400 mt-6">
          {t('auth.verifyEmail.needHelp')}{' '}
          <a href="mailto:support@ioes.com" className="text-blue-600 dark:text-cyan-400 hover:text-blue-700 dark:hover:text-cyan-300 transition-colors">
            support@ioes.com
          </a>
        </p>
      </div>

      {/* Corner decorations - Dark mode only */}
      <div className="absolute top-6 left-6 w-20 h-20 border-l-2 border-t-2 border-cyan-500/30 rounded-tl-xl hidden dark:block" />
      <div className="absolute top-6 right-6 w-20 h-20 border-r-2 border-t-2 border-blue-500/30 rounded-tr-xl hidden dark:block" />
      <div className="absolute bottom-6 left-6 w-20 h-20 border-l-2 border-b-2 border-purple-500/30 rounded-bl-xl hidden dark:block" />
      <div className="absolute bottom-6 right-6 w-20 h-20 border-r-2 border-b-2 border-indigo-500/30 rounded-br-xl hidden dark:block" />
    </div>
  );
};

export default VerifyEmailPage;
