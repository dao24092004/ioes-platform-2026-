import React from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';

const Footer: React.FC = () => {
  const { t } = useTranslation();

  return (
    <footer className="bg-slate-100 dark:bg-slate-900 text-slate-600 dark:text-slate-300 py-16">
      <div className="max-w-7xl mx-auto px-6">
        <div className="grid md:grid-cols-5 gap-12 mb-12">
          {/* Brand */}
          <div className="md:col-span-2">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 rounded-xl bg-blue-600 flex items-center justify-center">
                <svg viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" className="w-6 h-6">
                  <path d="M12 14l9-5-9-5-9 5 9 5z" />
                  <path d="M12 14l6.16-3.422a12.083 12.083 0 01.665 6.479A11.952 11.952 0 0012 20.055a11.952 11.952 0 00-6.824-2.998 12.078 12.078 0 01.665-6.479L12 14z" />
                </svg>
              </div>
              <span className="text-xl font-bold text-slate-900 dark:text-white">IOES</span>
            </div>
            <p className="text-slate-500 dark:text-slate-400 leading-relaxed">
              {t('branding.login.desc')}
            </p>
          </div>

          {/* Links */}
          <div>
            <h4 className="font-bold text-slate-900 dark:text-white mb-4">{t('footer.quickLinks')}</h4>
            <ul className="space-y-3">
              <li><Link to="/courses" className="hover:text-blue-600 dark:hover:text-white transition-colors">{t('footer.courses')}</Link></li>
              <li><Link to="/verify" className="hover:text-blue-600 dark:hover:text-white transition-colors">{t('footer.verifyCertificate')}</Link></li>
              <li><Link to="/pricing" className="hover:text-blue-600 dark:hover:text-white transition-colors">{t('footer.pricing')}</Link></li>
              <li><Link to="/api-docs" className="hover:text-blue-600 dark:hover:text-white transition-colors">{t('footer.api')}</Link></li>
              <li><Link to="/docs" className="hover:text-blue-600 dark:hover:text-white transition-colors">{t('footer.docs')}</Link></li>
            </ul>
          </div>

          <div>
            <h4 className="font-bold text-slate-900 dark:text-white mb-4">{t('footer.support')}</h4>
            <ul className="space-y-3">
              <li><Link to="/help" className="hover:text-blue-600 dark:hover:text-white transition-colors">{t('footer.helpCenter')}</Link></li>
              <li><Link to="/contact" className="hover:text-blue-600 dark:hover:text-white transition-colors">{t('footer.contact')}</Link></li>
              <li><Link to="/community" className="hover:text-blue-600 dark:hover:text-white transition-colors">{t('footer.community')}</Link></li>
              <li><Link to="/faq" className="hover:text-blue-600 dark:hover:text-white transition-colors">{t('footer.faq')}</Link></li>
            </ul>
          </div>

          <div>
            <h4 className="font-bold text-slate-900 dark:text-white mb-4">{t('footer.company')}</h4>
            <ul className="space-y-3">
              <li><Link to="/about" className="hover:text-blue-600 dark:hover:text-white transition-colors">{t('footer.about')}</Link></li>
              <li><Link to="/legal/terms" className="hover:text-blue-600 dark:hover:text-white transition-colors">{t('footer.terms')}</Link></li>
              <li><Link to="/legal/privacy" className="hover:text-blue-600 dark:hover:text-white transition-colors">{t('footer.privacy')}</Link></li>
              <li><Link to="/blog" className="hover:text-blue-600 dark:hover:text-white transition-colors">{t('footer.blog')}</Link></li>
              <li><Link to="/careers" className="hover:text-blue-600 dark:hover:text-white transition-colors">{t('footer.careers')}</Link></li>
              <li><Link to="/press" className="hover:text-blue-600 dark:hover:text-white transition-colors">{t('footer.press')}</Link></li>
            </ul>
          </div>
        </div>

        <div className="pt-8 border-t border-slate-200 dark:border-slate-800 flex flex-col md:flex-row justify-between items-center gap-4">
          <p className="text-slate-500 dark:text-slate-500">{t('footer.copyright')}</p>
          <div className="flex gap-4">
            <a href="#" className="w-10 h-10 bg-slate-200 dark:bg-slate-800 rounded-lg flex items-center justify-center hover:bg-slate-300 dark:hover:bg-slate-700 transition-colors">
              <svg className="w-5 h-5 text-slate-600 dark:text-slate-400" viewBox="0 0 24 24" fill="currentColor">
                <path d="M23.953 4.57a10 10 0 01-2.825.775 4.958 4.958 0 002.163-2.723c-.951.555-2.005.959-3.127 1.184a4.92 4.92 0 00-8.384 4.482C7.69 8.095 4.067 6.13 1.64 3.162a4.822 4.822 0 00-.666 2.475c0 1.71.87 3.213 2.188 4.096a4.904 4.904 0 01-2.228-.616v.06a4.923 4.923 0 003.946 4.827 4.996 4.996 0 01-2.212.085 4.936 4.936 0 004.604 3.417 9.867 9.867 0 01-6.102 2.105c-.39 0-.779-.023-1.17-.067a13.995 13.995 0 007.557 2.209c9.053 0 13.998-7.496 13.998-13.985 0-.21 0-.42-.015-.63A9.935 9.935 0 0024 4.489z" />
              </svg>
            </a>
            <a href="#" className="w-10 h-10 bg-slate-200 dark:bg-slate-800 rounded-lg flex items-center justify-center hover:bg-slate-300 dark:hover:bg-slate-700 transition-colors">
              <svg className="w-5 h-5 text-slate-600 dark:text-slate-400" viewBox="0 0 24 24" fill="currentColor">
                <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
              </svg>
            </a>
            <a href="#" className="w-10 h-10 bg-slate-200 dark:bg-slate-800 rounded-lg flex items-center justify-center hover:bg-slate-300 dark:hover:bg-slate-700 transition-colors">
              <svg className="w-5 h-5 text-slate-600 dark:text-slate-400" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z" />
              </svg>
            </a>
            <a href="#" className="w-10 h-10 bg-slate-200 dark:bg-slate-800 rounded-lg flex items-center justify-center hover:bg-slate-300 dark:hover:bg-slate-700 transition-colors">
              <svg className="w-5 h-5 text-slate-600 dark:text-slate-400" viewBox="0 0 24 24" fill="currentColor">
                <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM18.891 0H1.312C.587 0 0 .516 0 1.219v21.562C0 23.484.587 24 1.312 24h17.579c.726 0 1.313-.516 1.313-1.219V1.219C24 .516 23.617 0 22.891 0h-3.978z" />
              </svg>
            </a>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
