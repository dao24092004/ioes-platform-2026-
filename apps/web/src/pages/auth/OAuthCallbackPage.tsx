import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';

type CallbackState = 'processing' | 'success' | 'error';

type ErrorReason = 'missing_params' | 'denied' | 'expired' | 'invalid_state';

interface ProviderInfo {
  key: string;
  label: string;
  bg: string;
  text: string;
  icon: React.ReactNode;
}

const PROVIDERS: Record<string, ProviderInfo> = {
  google: {
    key: 'google',
    label: 'Google',
    bg: 'bg-white border border-slate-200 dark:bg-white dark:border-slate-200',
    text: 'text-slate-900',
    icon: (
      <svg viewBox="0 0 24 24" className="w-6 h-6">
        <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
        <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
        <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
        <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
      </svg>
    ),
  },
  github: {
    key: 'github',
    label: 'GitHub',
    bg: 'bg-slate-900 dark:bg-slate-900',
    text: 'text-white',
    icon: (
      <svg viewBox="0 0 24 24" className="w-6 h-6 text-white" fill="currentColor">
        <path d="M12 .5C5.65.5.5 5.65.5 12c0 5.08 3.29 9.39 7.86 10.92.58.1.79-.25.79-.55v-2.1c-3.2.7-3.87-1.37-3.87-1.37-.52-1.32-1.27-1.67-1.27-1.67-1.04-.71.08-.7.08-.7 1.15.08 1.76 1.18 1.76 1.18 1.02 1.75 2.69 1.25 3.34.95.1-.74.4-1.25.72-1.54-2.55-.29-5.23-1.28-5.23-5.69 0-1.26.45-2.29 1.18-3.1-.12-.29-.51-1.46.11-3.04 0 0 .96-.31 3.15 1.18a10.97 10.97 0 015.74 0c2.18-1.49 3.14-1.18 3.14-1.18.62 1.58.23 2.75.11 3.04.74.81 1.18 1.84 1.18 3.1 0 4.42-2.69 5.4-5.25 5.69.41.36.78 1.06.78 2.14v3.17c0 .31.21.66.8.55C20.21 21.39 23.5 17.08 23.5 12 23.5 5.65 18.35.5 12 .5z" />
      </svg>
    ),
  },
  microsoft: {
    key: 'microsoft',
    label: 'Microsoft',
    bg: 'bg-white border border-slate-200 dark:bg-white dark:border-slate-200',
    text: 'text-slate-900',
    icon: (
      <svg viewBox="0 0 24 24" className="w-6 h-6">
        <rect width="11" height="11" fill="#F25022" />
        <rect x="13" width="11" height="11" fill="#7FBA00" />
        <rect y="13" width="11" height="11" fill="#00A4EF" />
        <rect x="13" y="13" width="11" height="11" fill="#FFB900" />
      </svg>
    ),
  },
};

const OAuthCallbackPage: React.FC = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const provider = (params.get('provider') ?? 'google').toLowerCase();
  const code = params.get('code') ?? '';
  const state = params.get('state') ?? '';
  const errorParam = params.get('error') ?? '';

  const [cbState, setCbState] = useState<CallbackState>('processing');
  const [reason, setReason] = useState<ErrorReason>('missing_params');

  const providerInfo = useMemo(() => {
    return PROVIDERS[provider] ?? PROVIDERS.google;
  }, [provider]);

  useEffect(() => {
    if (errorParam) {
      setReason(errorParam === 'access_denied' ? 'denied' : 'invalid_state');
      setCbState('error');
      return;
    }
    if (!code || !state) {
      setReason('missing_params');
      setCbState('error');
      return;
    }
    const timer = setTimeout(() => {
      // Simulate expiry if code starts with exp_
      if (code.startsWith('exp_')) {
        setReason('expired');
        setCbState('error');
        return;
      }
      setCbState('success');
      setTimeout(() => navigate('/student'), 900);
    }, 1500);
    return () => clearTimeout(timer);
  }, [code, state, errorParam, navigate]);

  const errorText = useMemo(() => {
    switch (reason) {
      case 'missing_params':
        return t('auth.oauthCallback.errorMissingParams');
      case 'denied':
        return t('auth.oauthCallback.errorDenied');
      case 'expired':
        return t('auth.oauthCallback.errorExpired');
      default:
        return t('auth.oauthCallback.errorInvalidState');
    }
  }, [reason, t]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-blue-50 dark:from-slate-950 dark:via-slate-900 dark:to-slate-950 flex items-center justify-center px-6 py-12">
      <div className="w-full max-w-md">
        <div className="flex items-center justify-center gap-3 mb-8">
          <div className="w-12 h-12 bg-gradient-to-br from-blue-600 to-blue-700 rounded-xl flex items-center justify-center shadow-lg">
            <svg className="w-7 h-7 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 14l9-5-9-5-9 5 9 5z" /><path d="M12 14l6.16-3.422a12.083 12.083 0 01.665 6.479A11.952 11.952 0 0012 20.055a11.952 11.952 0 00-6.824-2.998 12.078 12.078 0 01.665-6.479L12 14z" /></svg>
          </div>
          <span className="text-2xl font-bold text-slate-900 dark:text-white tracking-tight">IOES</span>
        </div>

        <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-xl p-8">
          <div className="flex items-center justify-center mb-6">
            <div className={`w-16 h-16 rounded-2xl flex items-center justify-center shadow-md ${providerInfo.bg}`}>
              {providerInfo.icon}
            </div>
          </div>

          <h1 className="text-xl font-bold text-slate-900 dark:text-white text-center mb-2">
            {t('auth.oauthCallback.title', { provider: providerInfo.label })}
          </h1>

          {cbState === 'processing' && (
            <>
              <p className="text-sm text-slate-600 dark:text-slate-400 text-center mb-6">
                {t('auth.oauthCallback.processing')}
              </p>
              <div className="flex items-center justify-center mb-4">
                <span className="w-10 h-10 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" />
              </div>
              <div className="bg-slate-50 dark:bg-slate-900/50 rounded-xl px-4 py-3 space-y-2">
                <Row label={t('auth.oauthCallback.provider')} value={providerInfo.label} />
                <Row label={t('auth.oauthCallback.authCode')} value={code ? `${code.slice(0, 8)}...` : '—'} mono />
                <Row label={t('auth.oauthCallback.stateToken')} value={state ? `${state.slice(0, 8)}...` : '—'} mono />
              </div>
              <div className="flex items-center justify-center gap-1.5 mt-4">
                <span className="w-2 h-2 rounded-full bg-blue-500 animate-pulse" />
                <span className="w-2 h-2 rounded-full bg-blue-400 animate-pulse" style={{ animationDelay: '0.15s' }} />
                <span className="w-2 h-2 rounded-full bg-blue-300 animate-pulse" style={{ animationDelay: '0.3s' }} />
              </div>
            </>
          )}

          {cbState === 'success' && (
            <>
              <div className="flex items-center justify-center mb-4">
                <div className="w-16 h-16 rounded-full bg-emerald-50 dark:bg-emerald-900/30 flex items-center justify-center">
                  <svg className="w-9 h-9 text-emerald-600 dark:text-emerald-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M20 6L9 17l-5-5" strokeLinecap="round" strokeLinejoin="round" /></svg>
                </div>
              </div>
              <p className="text-sm text-slate-600 dark:text-slate-400 text-center mb-2">
                {t('auth.oauthCallback.success')}
              </p>
              <p className="text-xs text-slate-500 dark:text-slate-400 text-center">
                {t('auth.oauthCallback.redirecting')}
              </p>
            </>
          )}

          {cbState === 'error' && (
            <>
              <div className="flex items-center justify-center mb-4">
                <div className="w-16 h-16 rounded-full bg-red-50 dark:bg-red-900/30 flex items-center justify-center">
                  <svg className="w-9 h-9 text-red-600 dark:text-red-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="18" y1="6" x2="6" y2="18" strokeLinecap="round" strokeLinejoin="round" /><line x1="6" y1="6" x2="18" y2="18" strokeLinecap="round" strokeLinejoin="round" /></svg>
                </div>
              </div>
              <p className="text-sm text-slate-600 dark:text-slate-400 text-center mb-4">
                {errorText}
              </p>
              <div className="bg-slate-50 dark:bg-slate-900/50 rounded-xl px-4 py-3 mb-6 text-left">
                <div className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 uppercase mb-1">
                  {t('auth.oauthCallback.debugLabel')}
                </div>
                <Row label={t('auth.oauthCallback.provider')} value={providerInfo.label} />
                <Row label={t('auth.oauthCallback.code')} value={code || '—'} mono />
                <Row label={t('auth.oauthCallback.stateToken')} value={state || '—'} mono />
              </div>
              <div className="flex flex-col gap-3">
                <Link
                  to="/auth/login"
                  className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold transition-colors shadow-sm"
                >
                  {t('auth.oauthCallback.retryLogin')}
                </Link>
                <Link
                  to="/"
                  className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 hover:border-blue-500 text-sm font-semibold text-slate-700 dark:text-slate-300 transition-colors"
                >
                  {t('auth.oauthCallback.goHome')}
                </Link>
              </div>
            </>
          )}
        </div>

        <p className="text-center text-xs text-slate-500 dark:text-slate-400 mt-6">
          {t('auth.oauthCallback.secureNote')}
        </p>
      </div>
    </div>
  );
};

const Row: React.FC<{ label: string; value: string; mono?: boolean }> = ({ label, value, mono }) => (
  <div className="flex items-center justify-between gap-3 text-xs">
    <span className="text-slate-500 dark:text-slate-400 font-semibold">{label}</span>
    <span className={`text-slate-900 dark:text-white ${mono ? 'font-mono' : ''} truncate max-w-[60%]`}>{value}</span>
  </div>
);

export default OAuthCallbackPage;
