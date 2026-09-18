import React, { useState, useEffect } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';

const AuthLayout: React.FC = () => {
  const { t } = useTranslation();
  const location = useLocation();
  
  // Detect which page is active
  const isLogin = location.pathname.includes('/login');
  
  // Transition states
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [showContent, setShowContent] = useState(true);

  // Handle page transitions
  useEffect(() => {
    if (isTransitioning) return;
    setIsTransitioning(true);
    setShowContent(false);
    
    setTimeout(() => {
      setShowContent(true);
      setTimeout(() => setIsTransitioning(false), 50);
    }, 250);
  }, [isLogin]);

  // Branding content for both states
  const loginBranding = {
    title: (
      <>
        {t('branding.login.title')}<br/>{t('branding.login.title2')}
      </>
    ),
    desc: t('branding.login.desc'),
    features: [
      { icon: 'lightbulb', text: t('branding.login.feature1') },
      { icon: 'eye', text: t('branding.login.feature2') },
      { icon: 'code', text: t('branding.login.feature3') },
    ],
    testimonial: t('branding.login.testimonial'),
    author: t('branding.login.testimonialAuthor'),
    role: t('branding.login.testimonialRole'),
    authorInitials: 'HT',
  };

  const registerBranding = {
    title: t('branding.register.title'),
    desc: t('branding.register.desc'),
    features: [
      { icon: 'book', text: t('branding.register.feature1') },
      { icon: 'shield', text: t('branding.register.feature2') },
      { icon: 'users', text: t('branding.register.feature3') },
    ],
    testimonial: t('branding.register.testimonial'),
    author: t('branding.register.testimonialAuthor'),
    role: t('branding.register.testimonialRole'),
    authorInitials: 'ML',
  };

  const branding = isLogin ? loginBranding : registerBranding;

  return (
    <div className="min-h-screen flex flex-col lg:flex-row bg-slate-50 dark:bg-slate-900 relative overflow-hidden transition-colors duration-300">
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

      {/* Mobile Logo */}
      <div className="lg:hidden absolute top-6 left-6 z-20">
        <Link to="/" className="flex items-center gap-2">
          <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-cyan-400 rounded-xl flex items-center justify-center shadow-lg shadow-blue-500/30">
            <svg className="w-6 h-6 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M12 14l9-5-9-5-9 5 9 5z"/>
              <path d="M12 14l6.16-3.422a12.083 12.083 0 01.665 6.479A11.952 11.952 0 0012 20.055a11.952 11.952 0 00-6.824-2.998 12.078 12.078 0 01.665-6.479L12 14z"/>
            </svg>
          </div>
          <span className="text-xl font-bold bg-gradient-to-r from-blue-400 via-cyan-400 to-purple-400 bg-clip-text text-transparent">IOES</span>
        </Link>
      </div>

      {/* 
        Login: Form LEFT (40%), Branding RIGHT (60%)
        Register: Branding LEFT (60%), Form RIGHT (40%)
      */}
      <div className={`flex-1 lg:flex-[4] flex items-center justify-center px-6 py-12 relative z-10 transition-all duration-300 ${
        isLogin ? 'lg:order-1' : 'lg:order-2'
      } ${isTransitioning ? 'opacity-0 scale-95' : 'opacity-100 scale-100'}`}>
        <div className="w-full max-w-md">
          <div className="text-center mb-8">
            <h2 className="text-3xl font-bold text-slate-900 dark:text-white mb-2">
              {isLogin ? t('auth.welcomeBack') : t('auth.createAccount')}
            </h2>
            <p className="text-slate-600 dark:text-slate-400">
              {isLogin ? t('auth.loginSubtitle') : t('auth.registerSubtitle')}
            </p>
          </div>

          {/* Animated Tabs */}
          <div className="relative flex bg-slate-100 dark:bg-slate-800/80 backdrop-blur-sm rounded-xl p-1 mb-8 border border-slate-200 dark:border-slate-700/50">
            {/* Sliding indicator */}
            <div 
              className={`absolute top-1 bottom-1 w-1/2 rounded-lg bg-gradient-to-r from-blue-600 to-cyan-500 shadow-lg shadow-blue-500/30 transition-all duration-300 ease-out ${
                isLogin ? 'left-1' : 'left-1/2'
              }`}
            />
            <Link
              to="/auth/login"
              className={`flex-1 py-3 text-center text-sm font-semibold rounded-lg transition-all duration-300 relative z-10 ${
                isLogin ? 'text-white' : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              {t('auth.login')}
            </Link>
            <Link
              to="/auth/register"
              className={`flex-1 py-3 text-center text-sm font-semibold rounded-lg transition-all duration-300 relative z-10 ${
                !isLogin ? 'text-white' : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              {t('auth.register')}
            </Link>
          </div>

          {/* Form Content */}
          <div className={`transition-all duration-300 ease-out ${
            showContent ? 'opacity-100 translate-x-0' : 'opacity-0 translate-x-8'
          }`}>
            <Outlet />
          </div>
        </div>
      </div>

      {/* Branding Panel - Swapped positions */}
      <div className={`hidden lg:flex lg:flex-[6] bg-gradient-to-br from-blue-600 via-blue-700 to-slate-800 dark:from-blue-900 dark:via-slate-900 dark:to-slate-950 relative overflow-hidden transition-all duration-300 ${
        isLogin ? 'lg:order-2' : 'lg:order-1'
      }`}>
        <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-white/5 dark:bg-white/10 rounded-full -translate-y-1/3 translate-x-1/3 blur-3xl" />
        <div className="absolute bottom-0 left-0 w-[400px] h-[400px] bg-cyan-500/20 dark:bg-cyan-500/10 rounded-full translate-y-1/3 -translate-x-1/3 blur-3xl" />
        
        <div className="relative z-10 flex flex-col justify-center px-12 xl:px-16 w-full max-w-lg mx-auto">
          <Link to="/" className="flex items-center gap-3 mb-12">
            <div className="w-12 h-12 bg-white/20 dark:bg-gradient-to-br dark:from-blue-500 dark:to-cyan-400 rounded-xl flex items-center justify-center shadow-lg dark:shadow-blue-500/30">
              <svg className="w-7 h-7 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M12 14l9-5-9-5-9 5 9 5z"/>
                <path d="M12 14l6.16-3.422a12.083 12.083 0 01.665 6.479A11.952 11.952 0 0012 20.055a11.952 11.952 0 00-6.824-2.998 12.078 12.078 0 01.665-6.479L12 14z"/>
              </svg>
            </div>
            <span className="text-2xl font-bold text-white dark:bg-gradient-to-r dark:from-blue-400 dark:via-cyan-400 dark:to-purple-400 dark:bg-clip-text dark:text-transparent">IOES</span>
          </Link>

          {/* Animated Branding Content */}
          <div className={`transition-all duration-300 ease-out ${
            showContent ? 'opacity-100 translate-y-0' : 'opacity-0 -translate-y-4'
          }`}>
            <h1 className="text-4xl font-bold text-white mb-5 leading-tight">
              {branding.title}
            </h1>
            <p className="text-white/80 dark:text-slate-300 text-lg mb-10 leading-relaxed">
              {branding.desc}
            </p>

            <div className="space-y-6 mb-10">
              {branding.features.map((feature, i) => (
                <div key={i} className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-white/15 dark:bg-gradient-to-br dark:from-blue-500/20 dark:to-cyan-500/20 rounded-xl flex items-center justify-center flex-shrink-0 border border-white/20 dark:border-blue-500/30">
                    {feature.icon === 'lightbulb' && (
                      <svg className="w-6 h-6 text-white dark:text-cyan-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z"/>
                      </svg>
                    )}
                    {feature.icon === 'eye' && (
                      <svg className="w-6 h-6 text-white dark:text-cyan-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/>
                        <path d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"/>
                      </svg>
                    )}
                    {feature.icon === 'code' && (
                      <svg className="w-6 h-6 text-white dark:text-cyan-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4"/>
                      </svg>
                    )}
                    {feature.icon === 'book' && (
                      <svg className="w-6 h-6 text-white dark:text-cyan-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"/>
                      </svg>
                    )}
                    {feature.icon === 'shield' && (
                      <svg className="w-6 h-6 text-white dark:text-cyan-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"/>
                      </svg>
                    )}
                    {feature.icon === 'users' && (
                      <svg className="w-6 h-6 text-white dark:text-cyan-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0M7 10a2 2 0 11-4 0 2 2 0 014 0z"/>
                      </svg>
                    )}
                  </div>
                  <span className="text-white/90 dark:text-slate-300">{feature.text}</span>
                </div>
              ))}
            </div>

            <div className="bg-white/10 dark:bg-gradient-to-br dark:from-blue-500/10 dark:to-cyan-500/10 backdrop-blur-sm rounded-2xl p-6 border border-white/20 dark:border-blue-500/20">
              <p className="text-white/90 dark:text-slate-300 italic mb-4 leading-relaxed">
                {branding.testimonial}
              </p>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-white/20 dark:bg-gradient-to-br dark:from-blue-500 dark:to-cyan-400 rounded-full flex items-center justify-center font-semibold text-white text-sm">
                  {branding.authorInitials}
                </div>
                <div>
                  <div className="font-semibold text-white text-sm">{branding.author}</div>
                  <div className="text-white/70 dark:text-slate-400 text-xs">{branding.role}</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Corner decorations - Dark mode only */}
      <div className="absolute top-6 left-6 w-20 h-20 border-l-2 border-t-2 border-cyan-500/30 rounded-tl-xl hidden dark:block" />
      <div className="absolute top-6 right-6 w-20 h-20 border-r-2 border-t-2 border-blue-500/30 rounded-tr-xl hidden dark:block" />
      <div className="absolute bottom-6 left-6 w-20 h-20 border-l-2 border-b-2 border-purple-500/30 rounded-bl-xl hidden dark:block" />
      <div className="absolute bottom-6 right-6 w-20 h-20 border-r-2 border-b-2 border-indigo-500/30 rounded-br-xl hidden dark:block" />
    </div>
  );
};

export default AuthLayout;
