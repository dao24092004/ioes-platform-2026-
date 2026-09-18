import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import Header from '../../components/public/Header';
import Footer from '../../components/public/Footer';
import AnimatedSection from '@/components/common/AnimatedSection';
import { Button } from '@/components/common';
import { logger } from '@/utils/logger';

const FloatingOrbs = () => (
  <div className="absolute inset-0 overflow-hidden pointer-events-none">
    <div className="absolute top-10 left-1/4 w-72 h-72 bg-blue-400/20 rounded-full blur-3xl animate-pulse" />
    <div className="absolute bottom-10 right-1/4 w-96 h-96 bg-cyan-400/20 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1s' }} />
  </div>
);

const FloatingParticles = () => (
  <div className="absolute inset-0 overflow-hidden pointer-events-none">
    {[...Array(15)].map((_, i) => (
      <div
        key={i}
        className="absolute w-1.5 h-1.5 bg-blue-400/30 rounded-full animate-float"
        style={{
          left: `${Math.random() * 100}%`,
          top: `${Math.random() * 100}%`,
          animationDelay: `${Math.random() * 5}s`,
          animationDuration: `${4 + Math.random() * 3}s`,
        }}
      />
    ))}
  </div>
);

const Contact: React.FC = () => {
  const { t } = useTranslation();
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    topic: '',
    message: '',
  });
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    logger.info('ContactPage', 'Contact form submitted', { name: formData.name, email: formData.email });
    setSubmitted(true);
    setTimeout(() => {
      setFormData({ name: '', email: '', phone: '', topic: '', message: '' });
      setSubmitted(false);
    }, 3000);
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900 transition-colors duration-300">
      <Header />

      {/* Hero */}
      <section className="relative pt-32 pb-24 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-b from-blue-50 via-white to-slate-50 dark:from-slate-800 dark:via-slate-900 dark:to-slate-800" />
        <FloatingOrbs />
        <FloatingParticles />
        
        <div className="relative max-w-4xl mx-auto px-6 text-center z-10">
          <AnimatedSection delay={100}>
            <span className="inline-flex items-center gap-2 px-5 py-2.5 bg-blue-100 dark:bg-blue-900/50 text-blue-700 dark:text-blue-400 rounded-full text-sm font-medium mb-6 shadow-lg shadow-blue-500/10">
              <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z"/>
              </svg>
              {t('contact.title')}
            </span>
          </AnimatedSection>
          
          <AnimatedSection delay={200}>
            <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold mb-5 leading-tight">
              <span className="bg-gradient-to-r from-blue-600 via-cyan-500 to-blue-600 bg-clip-text text-transparent">
                {t('contact.hero.title')}
              </span>
            </h1>
          </AnimatedSection>
          
          <AnimatedSection delay={300}>
            <p className="text-lg text-slate-600 dark:text-slate-300 max-w-2xl mx-auto">
              {t('contact.hero.desc')}
            </p>
          </AnimatedSection>
        </div>
        
        {/* Wave separator */}
        <div className="absolute -bottom-1 left-0 right-0 h-16">
          <svg viewBox="0 0 1440 60" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full h-full">
            <path d="M0 0L60 5C120 10 240 20 360 25C480 30 600 30 720 27.5C840 25 960 20 1080 17.5C1200 15 1320 15 1380 15L1440 15V60H1380C1320 60 1200 60 1080 60C960 60 840 60 720 60C600 60 480 60 360 60C240 60 120 60 60 60H0V0Z" className="fill-white dark:fill-slate-900"/>
          </svg>
        </div>
      </section>

      {/* Contact Section */}
      <section className="py-16 bg-white dark:bg-slate-900">
        <div className="max-w-6xl mx-auto px-6">
          <div className="grid lg:grid-cols-5 gap-12">
            {/* Contact Info */}
            <div className="lg:col-span-2">
              <AnimatedSection delay={100}>
                <h3 className="text-2xl font-bold text-slate-900 dark:text-white mb-4">{t('contact.infoTitle')}</h3>
                <p className="text-slate-600 dark:text-slate-300 mb-8 leading-relaxed">
                  {t('contact.infoDesc')}
                </p>
              </AnimatedSection>

              <div className="space-y-5">
                <AnimatedSection delay={200}>
                  <div className="flex gap-4 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-2xl hover:shadow-lg transition-all group">
                    <div className="w-12 h-12 bg-blue-100 dark:bg-blue-900/50 rounded-xl flex items-center justify-center flex-shrink-0 group-hover:scale-110 transition-transform">
                      <svg className="w-6 h-6 text-blue-600" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0z"/>
                        <circle cx="12" cy="10" r="3"/>
                      </svg>
                    </div>
                    <div>
                      <h4 className="font-semibold text-slate-900 dark:text-white mb-1">{t('contact.address')}</h4>
                      <p className="text-sm text-slate-500 whitespace-pre-line">
                        {t('contact.addressValue')}
                      </p>
                    </div>
                  </div>
                </AnimatedSection>

                <AnimatedSection delay={300}>
                  <div className="flex gap-4 p-4 bg-cyan-50 dark:bg-cyan-900/20 rounded-2xl hover:shadow-lg transition-all group">
                    <div className="w-12 h-12 bg-cyan-100 dark:bg-cyan-900/50 rounded-xl flex items-center justify-center flex-shrink-0 group-hover:scale-110 transition-transform">
                      <svg className="w-6 h-6 text-cyan-600" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M22 16.92v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07 19.5 19.5 0 01-6-6 19.79 19.79 0 01-3.07-8.67A2 2 0 014.11 2h3a2 2 0 012 1.72 12.84 12.84 0 00.7 2.81 2 2 0 01-.45 2.11L8.09 9.91a16 16 0 006 6l1.27-1.27a2 2 0 012.11-.45 12.84 12.84 0 002.81.7A2 2 0 0122 16.92z"/>
                      </svg>
                    </div>
                    <div>
                      <h4 className="font-semibold text-slate-900 dark:text-white mb-1">{t('contact.hotline')}</h4>
                      <p className="text-sm text-slate-500 whitespace-pre-line">
                        {t('contact.hotlineValue')}
                      </p>
                    </div>
                  </div>
                </AnimatedSection>

                <AnimatedSection delay={400}>
                  <div className="flex gap-4 p-4 bg-emerald-50 dark:bg-emerald-900/20 rounded-2xl hover:shadow-lg transition-all group">
                    <div className="w-12 h-12 bg-emerald-100 dark:bg-emerald-900/50 rounded-xl flex items-center justify-center flex-shrink-0 group-hover:scale-110 transition-transform">
                      <svg className="w-6 h-6 text-emerald-600" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/>
                        <polyline points="22,6 12,13 2,6"/>
                      </svg>
                    </div>
                    <div>
                      <h4 className="font-semibold text-slate-900 dark:text-white mb-1">{t('contact.email')}</h4>
                      <p className="text-sm text-slate-500 whitespace-pre-line">
                        {t('contact.emailValue')}
                      </p>
                    </div>
                  </div>
                </AnimatedSection>

                <AnimatedSection delay={500}>
                  <div className="flex gap-4 p-4 bg-amber-50 dark:bg-amber-900/20 rounded-2xl hover:shadow-lg transition-all group">
                    <div className="w-12 h-12 bg-amber-100 dark:bg-amber-900/50 rounded-xl flex items-center justify-center flex-shrink-0 group-hover:scale-110 transition-transform">
                      <svg className="w-6 h-6 text-amber-600" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <circle cx="12" cy="12" r="10"/>
                        <polyline points="12 6 12 12 16 14"/>
                      </svg>
                    </div>
                    <div>
                      <h4 className="font-semibold text-slate-900 dark:text-white mb-1">{t('contact.hours')}</h4>
                      <p className="text-sm text-slate-500 whitespace-pre-line">
                        {t('contact.hoursValue')}
                      </p>
                    </div>
                  </div>
                </AnimatedSection>
              </div>

              {/* Social */}
              <AnimatedSection delay={600}>
                <div className="mt-10">
                  <h4 className="font-semibold text-slate-900 dark:text-white mb-4">{t('contact.connect')}</h4>
                  <div className="flex gap-3">
                    <a href="#" aria-label="Facebook" className="w-12 h-12 bg-slate-100 dark:bg-slate-800 rounded-xl flex items-center justify-center text-slate-500 hover:bg-blue-600 hover:text-white hover:-translate-y-1 hover:shadow-lg transition-all">
                      <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
                      </svg>
                    </a>
                    <a href="#" aria-label="Twitter" className="w-12 h-12 bg-slate-100 dark:bg-slate-800 rounded-xl flex items-center justify-center text-slate-500 hover:bg-sky-500 hover:text-white hover:-translate-y-1 hover:shadow-lg transition-all">
                      <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M23.953 4.57a10 10 0 01-2.825.775 4.958 4.958 0 002.163-2.723c-.951.555-2.005.959-3.127 1.184a4.92 4.92 0 00-8.384 4.482C7.69 8.095 4.067 6.13 1.64 3.162a4.822 4.822 0 00-.666 2.475c0 1.71.87 3.213 2.188 4.096a4.904 4.904 0 01-2.228-.616v.06a4.923 4.923 0 003.946 4.827 4.996 4.996 0 01-2.212.085 4.936 4.936 0 004.604 3.417 9.867 9.867 0 01-6.102 2.105c-.39 0-.779-.023-1.17-.067a13.995 13.995 0 007.557 2.209c9.053 0 13.998-7.496 13.998-13.985 0-.21 0-.42-.015-.63A9.935 9.935 0 0024 4.59z"/>
                      </svg>
                    </a>
                    <a href="#" aria-label="LinkedIn" className="w-12 h-12 bg-slate-100 dark:bg-slate-800 rounded-xl flex items-center justify-center text-slate-500 hover:bg-blue-700 hover:text-white hover:-translate-y-1 hover:shadow-lg transition-all">
                      <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M19 0h-14c-2.761 0-5 2.239-5 5v14c0 2.761 2.239 5 5 5h14c2.762 0 5-2.239 5-5v-14c0-2.761-2.238-5-5-5zm-11 19h-3v-11h3v11zm-1.5-12.268c-.966 0-1.75-.79-1.75-1.764s.784-1.764 1.75-1.764 1.75.79 1.75 1.764-.783 1.764-1.75 1.764zm13.5 12.268h-3v-5.604c0-3.368-4-3.113-4 0v5.604h-3v-11h3v1.765c1.396-2.586 7-2.777 7 2.476v6.759z"/>
                      </svg>
                    </a>
                    <a href="#" aria-label="GitHub" className="w-12 h-12 bg-slate-100 dark:bg-slate-800 rounded-xl flex items-center justify-center text-slate-500 hover:bg-slate-800 hover:text-white hover:-translate-y-1 hover:shadow-lg transition-all">
                      <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M12 0C5.374 0 0 5.373 0 12c0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23A11.509 11.509 0 0112 5.803c1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576C20.566 21.797 24 17.3 24 12c0-6.627-5.373-12-12-12z"/>
                      </svg>
                    </a>
                    <a href="#" aria-label="YouTube" className="w-12 h-12 bg-slate-100 dark:bg-slate-800 rounded-xl flex items-center justify-center text-slate-500 hover:bg-red-600 hover:text-white hover:-translate-y-1 hover:shadow-lg transition-all">
                      <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M23.498 6.186a3.016 3.016 0 00-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 00.502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 002.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 002.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/>
                      </svg>
                    </a>
                  </div>
                </div>
              </AnimatedSection>
            </div>

            {/* Contact Form */}
            <AnimatedSection delay={300} direction="left" className="lg:col-span-3">
              <div className="bg-gradient-to-br from-slate-50 to-blue-50 dark:from-slate-800 dark:to-slate-800 rounded-3xl p-8 border border-slate-200 dark:border-slate-700 shadow-xl">
                <div className="flex items-center gap-3 mb-6">
                  <div className="w-12 h-12 bg-blue-600 rounded-xl flex items-center justify-center">
                    <svg className="w-6 h-6 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/>
                      <polyline points="22,6 12,13 2,6"/>
                    </svg>
                  </div>
                  <h3 className="text-2xl font-bold text-slate-900 dark:text-white">{t('contact.formTitle')}</h3>
                </div>
                
                {submitted ? (
                  <div className="text-center py-16">
                    <div className="w-20 h-20 mx-auto mb-6 bg-emerald-100 dark:bg-emerald-900/40 rounded-full flex items-center justify-center animate-bounce">
                      <svg className="w-10 h-10 text-emerald-600" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M22 11.08V12a10 10 0 11-5.93-9.14"/>
                        <polyline points="22 4 12 14.01 9 11.01"/>
                      </svg>
                    </div>
                    <h4 className="text-xl font-bold text-slate-900 dark:text-white mb-2">Gửi thành công!</h4>
                    <p className="text-slate-500 dark:text-slate-400">Chúng tôi sẽ liên hệ lại với bạn sớm nhất có thể.</p>
                  </div>
                ) : (
                  <form onSubmit={handleSubmit} className="space-y-5">
                    <div className="grid sm:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">{t('contact.formName')}</label>
                        <input
                          type="text"
                          name="name"
                          value={formData.name}
                          onChange={handleChange}
                          placeholder={t('contact.formNamePlaceholder')}
                          required
                          className="w-full px-4 py-3.5 bg-white dark:bg-slate-900 border-2 border-slate-200 dark:border-slate-600 rounded-xl text-sm text-slate-900 dark:text-white placeholder-slate-400 focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 outline-none transition-all"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">{t('contact.formEmail')}</label>
                        <input
                          type="email"
                          name="email"
                          value={formData.email}
                          onChange={handleChange}
                          placeholder={t('contact.formEmailPlaceholder')}
                          required
                          className="w-full px-4 py-3.5 bg-white dark:bg-slate-900 border-2 border-slate-200 dark:border-slate-600 rounded-xl text-sm text-slate-900 dark:text-white placeholder-slate-400 focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 outline-none transition-all"
                        />
                      </div>
                    </div>
                    <div className="grid sm:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">{t('contact.formPhone')}</label>
                        <input
                          type="tel"
                          name="phone"
                          value={formData.phone}
                          onChange={handleChange}
                          placeholder={t('contact.formPhonePlaceholder')}
                          className="w-full px-4 py-3.5 bg-white dark:bg-slate-900 border-2 border-slate-200 dark:border-slate-600 rounded-xl text-sm text-slate-900 dark:text-white placeholder-slate-400 focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 outline-none transition-all"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">{t('contact.formTopic')}</label>
                        <select
                          name="topic"
                          value={formData.topic}
                          onChange={handleChange}
                          required
                          className="w-full px-4 py-3.5 bg-white dark:bg-slate-900 border-2 border-slate-200 dark:border-slate-600 rounded-xl text-sm text-slate-900 dark:text-white focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 outline-none transition-all cursor-pointer"
                        >
                          <option value="">{t('contact.formTopicPlaceholder')}</option>
                          <option value="support">{t('contact.formTopicSupport')}</option>
                          <option value="sales">{t('contact.formTopicSales')}</option>
                          <option value="feedback">{t('contact.formTopicFeedback')}</option>
                          <option value="partnership">{t('contact.formTopicPartnership')}</option>
                          <option value="other">{t('contact.formTopicOther')}</option>
                        </select>
                      </div>
                    </div>
                    <div>
                      <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">{t('contact.formMessage')}</label>
                      <textarea
                        name="message"
                        value={formData.message}
                        onChange={handleChange}
                        placeholder={t('contact.formMessagePlaceholder')}
                        required
                        rows={5}
                        className="w-full px-4 py-3.5 bg-white dark:bg-slate-900 border-2 border-slate-200 dark:border-slate-600 rounded-xl text-sm text-slate-900 dark:text-white placeholder-slate-400 focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 outline-none transition-all resize-none"
                      />
                    </div>
                    <Button type="submit" fullWidth size="lg" className="mt-2">
                      <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <line x1="22" y1="2" x2="11" y2="13"/>
                        <polygon points="22 2 15 22 11 13 2 9 22 2"/>
                      </svg>
                      {t('contact.formSubmit')}
                    </Button>
                  </form>
                )}
              </div>
            </AnimatedSection>
          </div>
        </div>
      </section>

      {/* Map & FAQ */}
      <section className="py-16 bg-slate-50 dark:bg-slate-800">
        <div className="max-w-6xl mx-auto px-6">
          {/* Map */}
          <AnimatedSection delay={100}>
            <div className="rounded-3xl overflow-hidden aspect-video mb-10 border border-slate-200 dark:border-slate-700 shadow-xl">
              <iframe
                title={t('contact.title')}
                src="https://www.google.com/maps?q=235+Hoàng+Quốc+Việt,+Cầu+Giấy,+Hà+Nội&output=embed"
                width="100%"
                height="100%"
                style={{ border: 0 }}
                allowFullScreen
                loading="lazy"
                referrerPolicy="no-referrer-when-downgrade"
                className="w-full h-full"
              />
            </div>
          </AnimatedSection>

          {/* FAQ */}
          <div className="grid md:grid-cols-2 gap-4">
            <AnimatedSection delay={200}>
              <div className="bg-white dark:bg-slate-900 rounded-2xl p-6 border border-slate-100 dark:border-slate-700 hover:shadow-lg transition-all group">
                <h4 className="font-semibold text-slate-900 dark:text-white mb-2 flex items-center gap-3">
                  <span className="w-8 h-8 bg-blue-600 text-white rounded-lg flex items-center justify-center text-xs font-bold shadow-lg shadow-blue-500/30">?</span>
                  {t('faq.support.title')}
                </h4>
                <p className="text-sm text-slate-500 ml-11 leading-relaxed">
                  {t('faq.support.desc')}
                </p>
              </div>
            </AnimatedSection>
            <AnimatedSection delay={300}>
              <div className="bg-white dark:bg-slate-900 rounded-2xl p-6 border border-slate-100 dark:border-slate-700 hover:shadow-lg transition-all group">
                <h4 className="font-semibold text-slate-900 dark:text-white mb-2 flex items-center gap-3">
                  <span className="w-8 h-8 bg-blue-600 text-white rounded-lg flex items-center justify-center text-xs font-bold shadow-lg shadow-blue-500/30">?</span>
                  {t('faq.response.title')}
                </h4>
                <p className="text-sm text-slate-500 ml-11 leading-relaxed">
                  {t('faq.response.desc')}
                </p>
              </div>
            </AnimatedSection>
            <AnimatedSection delay={400}>
              <div className="bg-white dark:bg-slate-900 rounded-2xl p-6 border border-slate-100 dark:border-slate-700 hover:shadow-lg transition-all group">
                <h4 className="font-semibold text-slate-900 dark:text-white mb-2 flex items-center gap-3">
                  <span className="w-8 h-8 bg-blue-600 text-white rounded-lg flex items-center justify-center text-xs font-bold shadow-lg shadow-blue-500/30">?</span>
                  {t('faq.partnership.title')}
                </h4>
                <p className="text-sm text-slate-500 ml-11 leading-relaxed">
                  {t('faq.partnership.desc')}
                </p>
              </div>
            </AnimatedSection>
            <AnimatedSection delay={500}>
              <div className="bg-white dark:bg-slate-900 rounded-2xl p-6 border border-slate-100 dark:border-slate-700 hover:shadow-lg transition-all group">
                <h4 className="font-semibold text-slate-900 dark:text-white mb-2 flex items-center gap-3">
                  <span className="w-8 h-8 bg-blue-600 text-white rounded-lg flex items-center justify-center text-xs font-bold shadow-lg shadow-blue-500/30">?</span>
                  {t('faq.technical.title')}
                </h4>
                <p className="text-sm text-slate-500 ml-11 leading-relaxed">
                  {t('faq.technical.desc')}
                </p>
              </div>
            </AnimatedSection>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="relative bg-gradient-to-r from-blue-600 to-cyan-500 py-20 text-center px-6 overflow-hidden">
        <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA2MCA2MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxnIGZpbGw9IndoaXRlIiBmaWxsLW9wYWNpdHk9Ii4wNSI+PGNpcmNsZSBjeD0iMzAiIGN5PSIzMCIgcj0iMiIvPjwvZz48L2c+PC9zdmc+')] opacity-50" />
        <AnimatedSection delay={100} className="relative">
          <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">{t('contact.ctaTitle')}</h2>
          <p className="text-white/90 mb-8 max-w-lg mx-auto">{t('contact.ctaDesc')}</p>
          <a href="tel:+84912345678" className="inline-flex items-center gap-2 px-6 py-3 bg-white text-blue-600 rounded-xl font-bold hover:bg-blue-50 transition-all hover:shadow-xl">
            <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M22 16.92v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07 19.5 19.5 0 01-6-6 19.79 19.79 0 01-3.07-8.67A2 2 0 014.11 2h3a2 2 0 012 1.72 12.84 12.84 0 00.7 2.81 2 2 0 01-.45 2.11L8.09 9.91a16 16 0 006 6l1.27-1.27a2 2 0 012.11-.45 12.84 12.84 0 002.81.7A2 2 0 0122 16.92z"/>
            </svg>
            Gọi ngay: 0912 345 678
          </a>
        </AnimatedSection>
      </section>

      <Footer />
    </div>
  );
};

export default Contact;
