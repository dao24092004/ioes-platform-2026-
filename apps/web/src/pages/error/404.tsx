import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/common';

export default function NotFoundPage() {
  const { t } = useTranslation();

  return (
    <div className="relative min-h-screen flex items-center justify-center overflow-hidden bg-slate-50 dark:bg-slate-950 px-6 py-12">
      {/* Animated gradient blobs */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-32 -left-32 w-96 h-96 bg-blue-500/30 rounded-full mix-blend-multiply dark:mix-blend-screen filter blur-3xl animate-pulse" />
        <div className="absolute top-1/3 -right-32 w-96 h-96 bg-cyan-400/30 rounded-full mix-blend-multiply dark:mix-blend-screen filter blur-3xl animate-pulse [animation-delay:2s]" />
        <div className="absolute -bottom-32 left-1/3 w-96 h-96 bg-purple-500/20 rounded-full mix-blend-multiply dark:mix-blend-screen filter blur-3xl animate-pulse [animation-delay:4s]" />
      </div>

      {/* Floating decorative shapes */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-20 left-[10%] w-4 h-4 bg-blue-500 rounded-full animate-bounce [animation-duration:3s]" />
        <div className="absolute top-40 right-[15%] w-3 h-3 bg-cyan-400 rounded-full animate-bounce [animation-duration:2.5s] [animation-delay:0.5s]" />
        <div className="absolute bottom-32 left-[20%] w-5 h-5 bg-purple-400 rounded-full animate-bounce [animation-duration:3.5s] [animation-delay:1s]" />
        <div className="absolute bottom-20 right-[10%] w-3 h-3 bg-pink-400 rounded-full animate-bounce [animation-duration:2.8s] [animation-delay:1.5s]" />

        <div className="absolute top-32 right-[25%] w-8 h-8 border-2 border-blue-400/40 rotate-45 animate-spin [animation-duration:8s]" />
        <div className="absolute bottom-40 left-[15%] w-6 h-6 border-2 border-purple-400/40 rotate-45 animate-spin [animation-duration:10s] [animation-direction:reverse]" />
      </div>

      {/* Main glass card */}
      <div className="relative z-10 w-full max-w-lg">
        <div className="backdrop-blur-xl bg-white/70 dark:bg-slate-900/60 border border-white/40 dark:border-slate-700/50 rounded-3xl shadow-2xl shadow-blue-500/10 dark:shadow-blue-500/5 p-8 md:p-12 text-center">
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

          {/* Big 404 with glow */}
          <div className="relative mb-6">
            <div className="absolute inset-0 flex items-center justify-center">
              <span className="text-[10rem] md:text-[14rem] font-black bg-gradient-to-br from-blue-600 via-cyan-500 to-purple-500 bg-clip-text text-transparent opacity-20 blur-2xl select-none">
                404
              </span>
            </div>
            <h1 className="relative text-7xl md:text-8xl font-black bg-gradient-to-br from-blue-600 via-cyan-500 to-purple-500 bg-clip-text text-transparent tracking-tight animate-pulse">
              404
            </h1>
          </div>

          {/* Message */}
          <div className="inline-flex items-center gap-2 px-3 py-1 bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300 rounded-full text-xs font-medium mb-4">
            <span className="w-2 h-2 bg-blue-500 rounded-full animate-ping" />
            {t('error.pageNotFound')}
          </div>

          <p className="text-slate-600 dark:text-slate-400 mb-8 leading-relaxed">
            {t('error.pageNotFoundDesc')}
          </p>

          {/* Actions */}
          <div className="flex flex-col sm:flex-row gap-3">
            <Button
              as={Link}
              to="/"
              fullWidth
              size="lg"
              className="bg-gradient-to-r from-blue-600 to-cyan-500 hover:from-blue-700 hover:to-cyan-600 shadow-lg shadow-blue-500/30 hover:shadow-blue-500/50 hover:scale-[1.02] transition-all"
            >
              <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6"/>
              </svg>
              {t('error.backHome')}
            </Button>
            <Button
              as={Link}
              to="/auth/login"
              variant="secondary"
              fullWidth
              size="lg"
              className="hover:scale-[1.02] transition-all"
            >
              {t('error.backToLogin')}
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