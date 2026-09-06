import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/common';

export default function ServerErrorPage() {
  const { t } = useTranslation();

  return (
    <div className="relative min-h-screen flex items-center justify-center overflow-hidden bg-slate-50 dark:bg-slate-950 px-6 py-12">
      {/* Animated gradient blobs */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-32 -right-32 w-96 h-96 bg-red-500/30 rounded-full mix-blend-multiply dark:mix-blend-screen filter blur-3xl animate-pulse" />
        <div className="absolute top-1/3 -left-32 w-96 h-96 bg-orange-400/30 rounded-full mix-blend-multiply dark:mix-blend-screen filter blur-3xl animate-pulse [animation-delay:2s]" />
        <div className="absolute -bottom-32 right-1/3 w-96 h-96 bg-rose-500/20 rounded-full mix-blend-multiply dark:mix-blend-screen filter blur-3xl animate-pulse [animation-delay:4s]" />
      </div>

      {/* Floating decorative shapes */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-20 right-[10%] w-4 h-4 bg-red-500 rounded-full animate-bounce [animation-duration:3s]" />
        <div className="absolute top-40 left-[15%] w-3 h-3 bg-orange-400 rounded-full animate-bounce [animation-duration:2.5s] [animation-delay:0.5s]" />
        <div className="absolute bottom-32 right-[20%] w-5 h-5 bg-rose-400 rounded-full animate-bounce [animation-duration:3.5s] [animation-delay:1s]" />
        <div className="absolute bottom-20 left-[10%] w-3 h-3 bg-yellow-400 rounded-full animate-bounce [animation-duration:2.8s] [animation-delay:1.5s]" />

        <div className="absolute top-32 left-[25%] w-8 h-8 border-2 border-red-400/40 rotate-45 animate-spin [animation-duration:8s]" />
        <div className="absolute bottom-40 right-[15%] w-6 h-6 border-2 border-orange-400/40 rotate-45 animate-spin [animation-duration:10s] [animation-direction:reverse]" />

        {/* Exclamation sparkle */}
        <div className="absolute top-1/4 left-1/4 text-4xl text-red-400/30 animate-ping [animation-duration:3s]">!</div>
        <div className="absolute bottom-1/3 right-1/4 text-3xl text-orange-400/30 animate-ping [animation-duration:2.5s] [animation-delay:1s]">!</div>
      </div>

      {/* Main glass card */}
      <div className="relative z-10 w-full max-w-lg">
        <div className="backdrop-blur-xl bg-white/70 dark:bg-slate-900/60 border border-white/40 dark:border-slate-700/50 rounded-3xl shadow-2xl shadow-red-500/10 dark:shadow-red-500/5 p-8 md:p-12 text-center">
          {/* Logo */}
          <Link to="/" className="inline-flex items-center justify-center gap-2 mb-8 group">
            <div className="w-10 h-10 bg-gradient-to-br from-blue-600 to-cyan-500 rounded-xl flex items-center justify-center shadow-lg shadow-blue-500/30 group-hover:scale-110 transition-transform duration-300">
              <svg className="w-6 h-6 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M12 14l9-5-9-5-9 5 9 5z"/>
                <path d="M12 14l6.16-3.422a12.083 12.083 0 01.665 6.479A11.952 11.952 0 0012 20.055a11.952 11.952 0 00-6.824-2.998 12.078 12.078 0 01.665-6.479L12 14z"/>
              </svg>
            </div>
            <span className="text-xl font-bold bg-gradient-to-r from-blue-600 to-cyan-500 bg-clip-text text-transparent">IOES</span>
          </Link>

          {/* Big 500 with glow + warning icon */}
          <div className="relative mb-6">
            <div className="absolute inset-0 flex items-center justify-center">
              <span className="text-[10rem] md:text-[14rem] font-black bg-gradient-to-br from-red-600 via-orange-500 to-rose-500 bg-clip-text text-transparent opacity-20 blur-2xl select-none">
                500
              </span>
            </div>
            <div className="relative flex items-center justify-center gap-3">
              <div className="w-14 h-14 bg-gradient-to-br from-red-500 to-orange-500 rounded-2xl flex items-center justify-center shadow-lg shadow-red-500/40 animate-pulse">
                <svg className="w-8 h-8 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <path d="M12 9v2m0 4h.01M5.07 19h13.86c1.54 0 2.5-1.67 1.73-3L13.73 4c-.77-1.33-2.69-1.33-3.46 0L3.34 16c-.77 1.33.19 3 1.73 3z"/>
                </svg>
              </div>
              <h1 className="text-7xl md:text-8xl font-black bg-gradient-to-br from-red-600 via-orange-500 to-rose-500 bg-clip-text text-transparent tracking-tight">
                500
              </h1>
            </div>
          </div>

          {/* Message */}
          <div className="inline-flex items-center gap-2 px-3 py-1 bg-red-100 dark:bg-red-900/40 text-red-700 dark:text-red-300 rounded-full text-xs font-medium mb-4">
            <span className="w-2 h-2 bg-red-500 rounded-full animate-ping" />
            {t('error.serverError')}
          </div>

          <p className="text-slate-600 dark:text-slate-400 mb-8 leading-relaxed">
            {t('error.serverErrorDesc')}
          </p>

          {/* Actions */}
          <div className="flex flex-col sm:flex-row gap-3">
            <Button
              onClick={() => window.location.reload()}
              fullWidth
              size="lg"
              className="bg-gradient-to-r from-red-600 to-orange-500 hover:from-red-700 hover:to-orange-600 shadow-lg shadow-red-500/30 hover:shadow-red-500/50 hover:scale-[1.02] transition-all"
            >
              <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"/>
              </svg>
              {t('error.tryAgain')}
            </Button>
            <Button
              as={Link}
              to="/"
              variant="secondary"
              fullWidth
              size="lg"
              className="hover:scale-[1.02] transition-all"
            >
              {t('error.backHome')}
            </Button>
          </div>
        </div>

        {/* Help text */}
        <p className="text-center text-xs text-slate-500 dark:text-slate-500 mt-6">
          {t('error.helpText') || 'Need help? Contact support@ioes.com'}
        </p>
      </div>
    </div>
  );
}