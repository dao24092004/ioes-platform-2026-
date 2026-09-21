import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import Button from '@/components/common/Button';
import { CountUp } from './StatsSection';
import { useAuthStore } from '@/app/store/authStore';

const heroImages = [
  {
    src: "https://images.unsplash.com/photo-1522202176988-66273c2fd55f?w=600&h=400&fit=crop",
    alt: "students-learning"
  },
  {
    src: "https://images.unsplash.com/photo-1531482615713-2afd69097998?w=600&h=400&fit=crop",
    alt: "teacher-teaching"
  },
  {
    src: "https://images.unsplash.com/photo-1517245386807-bb43f82c33c4?w=600&h=400&fit=crop",
    alt: "smart-classroom"
  }
];

const HeroSection: React.FC = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const isAuthenticated = useAuthStore(s => s.isAuthenticated && !!s.accessToken);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isVideoOpen, setIsVideoOpen] = useState(false);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    intervalRef.current = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % heroImages.length);
    }, 5000);
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, []);

  useEffect(() => {
    if (isVideoOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => { document.body.style.overflow = ''; };
  }, [isVideoOpen]);

  return (
    <section id="home" className="relative pt-32 pb-20 bg-white dark:bg-slate-900 overflow-hidden">
      {/* Background decorative elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-blue-50 dark:bg-blue-900/20 rounded-full blur-3xl" />
        <div className="absolute -bottom-40 -left-40 w-96 h-96 bg-indigo-50 dark:bg-indigo-900/20 rounded-full blur-3xl" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-gradient-to-r from-blue-100/30 to-indigo-100/30 dark:from-blue-900/10 dark:to-indigo-900/10 rounded-full blur-3xl" />
      </div>

      <div className="relative max-w-7xl mx-auto px-6">
        <div className="grid lg:grid-cols-2 gap-16 items-center">
          {/* Left Content */}
          <div className="relative z-10">
            {/* Badge */}
            <div className="inline-flex items-center gap-2 px-4 py-2 bg-blue-50 dark:bg-blue-900/30 border border-blue-100 dark:border-blue-800 rounded-full text-blue-700 dark:text-blue-300 text-sm font-medium mb-8">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500"></span>
              </span>
              {t('home.hero.online')}
            </div>

            {/* Headline */}
            <h1 className="text-3xl md:text-4xl lg:text-[3rem] font-bold text-slate-900 dark:text-white leading-[1.5] pb-3 mb-6">
              <span className="whitespace-nowrap">{t('home.hero.title')}</span>
              <span className="block bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent pb-2">
                {t('home.hero.titleHighlight')}
              </span>
            </h1>

            {/* Subtitle */}
            <p className="text-lg md:text-xl text-slate-600 dark:text-slate-300 mb-10 leading-relaxed max-w-xl">
              {t('home.hero.subtitle')}
            </p>

            {/* CTA Buttons */}
            <div className="flex flex-wrap items-center gap-4 mb-12">
              <Button 
                size="lg" 
                onClick={() => navigate(isAuthenticated ? '/courses' : '/auth/register')}
                className="shadow-lg shadow-blue-500/25 hover:shadow-xl hover:shadow-blue-500/30 hover:-translate-y-0.5 transition-all"
              >
                <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
                {t('home.hero.cta')}
              </Button>
              <Button 
                variant="secondary" 
                size="lg" 
                onClick={() => setIsVideoOpen(true)}
                className="border-2 hover:bg-slate-50 dark:hover:bg-slate-800"
              >
                <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <polygon points="5 3 19 12 5 21 5 3" />
                </svg>
                {t('home.hero.watchDemo')}
              </Button>
            </div>

            {/* Stats */}
            <div className="flex flex-wrap gap-8 md:gap-12">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-blue-100 dark:bg-blue-900/30 rounded-xl flex items-center justify-center">
                  <svg className="w-6 h-6 text-blue-600 dark:text-blue-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2" />
                    <circle cx="9" cy="7" r="4" />
                    <path d="M23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75" />
                  </svg>
                </div>
                <div>
                  <div className="text-2xl font-bold text-slate-900 dark:text-white">
                    <CountUp end={10} suffix="K+" duration={1500} />
                  </div>
                  <div className="text-sm text-slate-500 dark:text-slate-400">{t('home.hero.users')}</div>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-indigo-100 dark:bg-indigo-900/30 rounded-xl flex items-center justify-center">
                  <svg className="w-6 h-6 text-indigo-600 dark:text-indigo-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                  </svg>
                </div>
                <div>
                  <div className="text-2xl font-bold text-slate-900 dark:text-white">
                    <CountUp end={500} suffix="+" duration={1500} />
                  </div>
                  <div className="text-sm text-slate-500 dark:text-slate-400">{t('stats.courses')}</div>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-green-100 dark:bg-green-900/30 rounded-xl flex items-center justify-center">
                  <svg className="w-6 h-6 text-green-600 dark:text-green-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <div>
                  <div className="text-2xl font-bold text-slate-900 dark:text-white">
                    <CountUp end={999} suffix="‰" duration={1500} />
                  </div>
                  <div className="text-sm text-slate-500 dark:text-slate-400">{t('home.hero.uptime')}</div>
                </div>
              </div>
            </div>
          </div>

          {/* Right Content - Image Carousel */}
          <div className="relative hidden lg:block">
            <div 
              className="relative rounded-3xl overflow-hidden shadow-2xl shadow-blue-500/10 cursor-pointer group"
              onClick={() => setCurrentIndex((prev) => (prev + 1) % heroImages.length)}
            >
              {heroImages.map((image, index) => (
                <img
                  key={index}
                  src={image.src}
                  alt={image.alt}
                  className={`w-full h-[420px] object-cover transition-all duration-500 ${
                    index === currentIndex ? 'opacity-100 scale-100' : 'opacity-0 scale-105 absolute'
                  }`}
                />
              ))}
              
              {/* Overlay gradient */}
              <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent" />
              
              {/* Carousel indicators */}
              <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-2">
                {heroImages.map((_, index) => (
                  <button
                    key={index}
                    onClick={(e) => { e.stopPropagation(); setCurrentIndex(index); }}
                    className={`h-1.5 rounded-full transition-all ${
                      index === currentIndex ? 'bg-white w-8' : 'bg-white/50 hover:bg-white/80 w-1.5'
                    }`}
                  />
                ))}
              </div>

              {/* Play button overlay */}
              <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity bg-black/20">
                <div className="w-16 h-16 bg-white/90 rounded-full flex items-center justify-center shadow-lg">
                  <svg className="w-6 h-6 text-slate-900 ml-1" viewBox="0 0 24 24" fill="currentColor">
                    <polygon points="5 3 19 12 5 21 5 3" />
                  </svg>
                </div>
              </div>
            </div>

            {/* Decorative elements */}
            <div className="absolute -top-6 -right-6 w-24 h-24 bg-blue-100 dark:bg-blue-900/30 rounded-2xl -z-10" />
            <div className="absolute -bottom-6 -left-6 w-32 h-32 bg-indigo-100 dark:bg-indigo-900/30 rounded-full -z-10" />
          </div>
        </div>
      </div>

      {/* Bottom wave separator */}
      <div className="absolute bottom-0 left-0 right-0">
        <svg viewBox="0 0 1440 100" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full h-auto">
          <path d="M0 50L48 45C96 40 192 30 288 35C384 40 480 60 576 65C672 70 768 60 864 50C960 40 1056 30 1152 35C1248 40 1344 60 1392 70L1440 80V100H1392C1344 100 1248 100 1152 100C1056 100 960 100 864 100C768 100 672 100 576 100C480 100 384 100 288 100C192 100 96 100 48 100H0V50Z" fill="currentColor" className="text-slate-50 dark:text-slate-800"/>
        </svg>
      </div>

      {/* Video Modal */}
      {isVideoOpen && (
        <div 
          className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm"
          onClick={() => setIsVideoOpen(false)}
        >
          <div 
            className="relative w-full max-w-4xl bg-black rounded-2xl overflow-hidden shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              onClick={() => setIsVideoOpen(false)}
              className="absolute top-4 right-4 z-10 w-10 h-10 bg-black/50 hover:bg-black/70 rounded-full flex items-center justify-center text-white transition-colors"
              aria-label="Close video"
            >
              <svg className="w-6 h-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
            <div className="relative pt-[56.25%]">
              <iframe
                className="absolute top-0 left-0 w-full h-full"
                src="https://www.youtube.com/embed/dQw4w9WgXcQ?autoplay=1&rel=0"
                title="IOES Platform Demo"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
              />
            </div>
          </div>
        </div>
      )}
    </section>
  );
};

export default HeroSection;
