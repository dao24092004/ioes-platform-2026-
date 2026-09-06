import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';

const CtaSection: React.FC = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();

  return (
    <section id="contact" className="py-24 bg-blue-600 relative overflow-hidden">
      <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA2MCA2MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxnIGZpbGw9IiNmZmYiIGZpbGwtb3BhY2l0eT0iMC4wNSI+PGNpcmNsZSBjeD0iMzAiIGN5PSIzMCIgcj0iMiIvPjwvZz48L2c+PC9zdmc+')] opacity-30" />
      <div className="relative max-w-4xl mx-auto px-6 text-center">
        <h2 className="text-3xl md:text-5xl font-bold text-white mb-6">
          {t('cta.home.title')}
        </h2>
        <p className="text-xl text-white/90 mb-10 max-w-2xl mx-auto">
          {t('cta.home.subtitle')}
        </p>
        <div className="flex flex-wrap justify-center gap-4">
          <button
            onClick={() => navigate('/auth/register')}
            className="px-8 py-4 text-lg font-bold rounded-xl transition-all bg-white hover:bg-slate-100 shadow-xl"
            style={{ color: '#2563eb' }}
          >
            <span className="flex items-center justify-center gap-2">
              <svg className="w-6 h-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ color: '#2563eb' }}>
                <path d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
              {t('cta.home.button')}
            </span>
          </button>
          <button
            onClick={() => navigate('/contact')}
            className="px-8 py-4 text-lg font-semibold rounded-xl transition-all border-2 border-white hover:bg-white/10"
            style={{ color: 'white' }}
          >
            {t('cta.home.contactSales')}
          </button>
        </div>
      </div>
    </section>
  );
};

export default CtaSection;
