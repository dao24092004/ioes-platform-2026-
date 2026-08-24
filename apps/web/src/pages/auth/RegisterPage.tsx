import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { logger } from '@/utils/logger';
import { Button, Input } from '@/components/common';

export default function RegisterPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [agreeTerms, setAgreeTerms] = useState(false);
  const [loading, setLoading] = useState(false);

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

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (password !== confirmPassword) {
      logger.warn('RegisterPage', 'Password mismatch');
      return;
    }

    setLoading(true);
    logger.info('RegisterPage', 'User attempting to register', {
      email,
      full_name: fullName,
      has_accepted_terms: agreeTerms,
    });

    // Mock flow: simulate API call then redirect to verify-email
    setTimeout(() => {
      navigate('/auth/verify-email', {
        state: { email, fullName },
      });
    }, 600);
  };

  const handleGoogleRegister = () => {
    logger.info('RegisterPage', 'User clicked Google register');
  };

  return (
    <div className="min-h-screen flex bg-slate-50 dark:bg-slate-900">
      {/* Left Panel - Form */}
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
            <h2 className="text-3xl font-bold text-slate-900 dark:text-white mb-2">{t('auth.createAccount')}</h2>
            <p className="text-slate-600 dark:text-slate-400">{t('auth.registerSubtitle')}</p>
          </div>

          {/* Tabs */}
          <div className="flex bg-slate-100 dark:bg-slate-800 rounded-xl p-1 mb-8">
            <Link
              to="/auth/login"
              className="flex-1 py-3 text-center text-sm font-semibold rounded-lg text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors"
            >
              {t('auth.login')}
            </Link>
            <Link
              to="/auth/register"
              className="flex-1 py-3 text-center text-sm font-semibold rounded-lg bg-white dark:bg-slate-700 text-blue-600 dark:text-blue-400 shadow-sm transition-all"
            >
              {t('auth.register')}
            </Link>
          </div>

          {/* Register Form */}
          <form onSubmit={handleSubmit} className="space-y-5">
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
                    strength <= 1 ? 'text-red-500' : strength <= 2 ? 'text-amber-500' : 'text-emerald-500'
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
                        ? 'bg-blue-600 border-blue-600' 
                        : 'bg-white dark:bg-slate-700 border-slate-400 dark:border-slate-400'
                    }`}
                    required
                  />
                  <svg className="absolute top-0.5 left-0.5 w-4 h-4 text-white pointer-events-none transition-opacity" fill="currentColor" viewBox="0 0 20 20" style={{ opacity: agreeTerms ? 1 : 0 }}>
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                </div>
                <span className="text-sm text-slate-600 dark:text-slate-400">
                  {t('auth.agreeTerms')}{' '}
                  <a href="/terms" className="text-blue-600 hover:text-blue-700 dark:text-blue-400 hover:underline">{t('auth.terms')}</a>
                  {' '}{t('common.and')}{' '}
                  <a href="/privacy" className="text-blue-600 hover:text-blue-700 dark:text-blue-400 hover:underline">{t('auth.privacy')}</a>
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
          <p className="text-center text-sm text-slate-600 dark:text-slate-400 mt-8 pt-6 border-t border-slate-200 dark:border-slate-700">
            {t('branding.register.hasAccount')}{' '}
            <Link to="/auth/login" className="font-semibold text-blue-600 hover:text-blue-700 dark:text-blue-400">
              {t('branding.register.signIn')}
            </Link>
          </p>
        </div>
      </div>

      {/* Right Panel - Branding */}
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
            {t('branding.register.title')}
          </h1>
          <p className="text-white/85 text-lg mb-10 leading-relaxed">
            {t('branding.register.desc')}
          </p>

          <div className="space-y-6 mb-10">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-white/15 rounded-xl flex items-center justify-center flex-shrink-0">
                <svg className="w-6 h-6 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"/>
                </svg>
              </div>
              <span className="text-white/90">{t('branding.register.feature1')}</span>
            </div>
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-white/15 rounded-xl flex items-center justify-center flex-shrink-0">
                <svg className="w-6 h-6 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"/>
                </svg>
              </div>
              <span className="text-white/90">{t('branding.register.feature2')}</span>
            </div>
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-white/15 rounded-xl flex items-center justify-center flex-shrink-0">
                <svg className="w-6 h-6 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0M7 10a2 2 0 11-4 0 2 2 0 014 0z"/>
                </svg>
              </div>
              <span className="text-white/90">{t('branding.register.feature3')}</span>
            </div>
          </div>

          <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-6">
            <p className="text-white/90 italic mb-4 leading-relaxed">
              {t('branding.register.testimonial')}
            </p>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center font-semibold text-white text-sm">
                ML
              </div>
              <div>
                <div className="font-semibold text-white text-sm">{t('branding.register.testimonialAuthor')}</div>
                <div className="text-white/70 text-xs">{t('branding.register.testimonialRole')}</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
