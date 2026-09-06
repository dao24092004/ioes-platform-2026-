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
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-blue-50 dark:from-slate-950 dark:via-slate-900 dark:to-slate-950 flex items-center justify-center px-6 py-12">
      <div className="w-full max-w-md">
        {/* Brand */}
        <div className="flex items-center justify-center gap-3 mb-8">
          <div className="w-12 h-12 bg-gradient-to-br from-blue-600 to-blue-700 rounded-xl flex items-center justify-center shadow-lg">
            <svg className="w-7 h-7 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 14l9-5-9-5-9 5 9 5z" /><path d="M12 14l6.16-3.422a12.083 12.083 0 01.665 6.479A11.952 11.952 0 0012 20.055a11.952 11.952 0 00-6.824-2.998 12.078 12.078 0 01.665-6.479L12 14z" /></svg>
          </div>
          <span className="text-2xl font-bold text-slate-900 dark:text-white tracking-tight">IOES</span>
        </div>

        <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-xl p-8">
          {state === 'verifying' && (
            <div className="text-center">
              <div className="mx-auto w-20 h-20 rounded-full bg-blue-50 dark:bg-blue-900/30 flex items-center justify-center mb-6">
                <span className="w-10 h-10 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" />
              </div>
              <h1 className="text-2xl font-bold text-slate-900 dark:text-white mb-2">
                {t('auth.verifyEmail.verifying')}
              </h1>
              <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
                {t('auth.verifyEmail.verifyingDesc')}
              </p>
              <div className="mt-6 flex justify-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-blue-500 animate-pulse" />
                <span className="w-2 h-2 rounded-full bg-blue-400 animate-pulse" style={{ animationDelay: '0.15s' }} />
                <span className="w-2 h-2 rounded-full bg-blue-300 animate-pulse" style={{ animationDelay: '0.3s' }} />
              </div>
            </div>
          )}

          {state === 'sent' && (
            <div className="text-center">
              <div className="mx-auto w-20 h-20 rounded-full bg-blue-50 dark:bg-blue-900/30 flex items-center justify-center mb-6">
                <svg className="w-12 h-12 text-blue-600 dark:text-blue-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
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
                <p className="text-sm font-semibold text-blue-600 dark:text-blue-400 mb-6">
                  {pendingEmail}
                </p>
              )}
              <button
                type="button"
                onClick={handleResend}
                disabled={resendState !== 'idle'}
                className="mt-4 inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-white dark:bg-slate-700 border border-slate-300 dark:border-slate-600 hover:bg-slate-50 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-200 text-sm font-semibold transition-colors disabled:opacity-60"
              >
                {resendState === 'sending' && (
                  <span className="w-4 h-4 border-2 border-slate-400 border-t-transparent rounded-full animate-spin" />
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
                  className="text-sm text-blue-600 hover:text-blue-700 dark:text-blue-400 font-medium"
                >
                  {t('auth.verifyEmail.backToLogin')}
                </Link>
              </div>
            </div>
          )}

          {state === 'success' && (
            <div className="text-center">
              <div className="mx-auto w-20 h-20 rounded-full bg-emerald-50 dark:bg-emerald-900/30 flex items-center justify-center mb-6">
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
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              </div>
              <Link
                to="/auth/login"
                className="mt-6 inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold transition-colors shadow-sm"
              >
                {t('auth.verifyEmail.goToLogin')}
              </Link>
            </div>
          )}

          {state === 'error' && (
            <div className="text-center">
              <div className="mx-auto w-20 h-20 rounded-full bg-red-50 dark:bg-red-900/30 flex items-center justify-center mb-6">
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

              <div className="bg-slate-50 dark:bg-slate-900/50 rounded-xl px-4 py-3 mb-6 text-left">
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
                  className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white text-sm font-semibold transition-colors shadow-sm"
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
                  className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 hover:border-blue-500 text-sm font-semibold text-slate-700 dark:text-slate-300 transition-colors"
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
          <a href="mailto:support@ioes.com" className="text-blue-600 hover:text-blue-700 dark:text-blue-400">
            support@ioes.com
          </a>
        </p>
      </div>
    </div>
  );
};

export default VerifyEmailPage;
