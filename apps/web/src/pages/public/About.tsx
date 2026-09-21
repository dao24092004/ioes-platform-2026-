import React, { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/common';
import Header from '../../components/public/Header';
import Footer from '../../components/public/Footer';

// Animated Section component for scroll reveal
const AnimatedSection: React.FC<{
  children: React.ReactNode;
  className?: string;
  delay?: number;
}> = ({ children, className = '', delay = 0 }) => {
  const [isVisible, setIsVisible] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setTimeout(() => setIsVisible(true), delay);
        }
      },
      { threshold: 0.1 }
    );

    if (ref.current) {
      observer.observe(ref.current);
    }

    return () => observer.disconnect();
  }, [delay]);

  return (
    <div
      ref={ref}
      className={`transition-all duration-700 ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'} ${className}`}
    >
      {children}
    </div>
  );
};

// Floating Particles Background
const FloatingParticles: React.FC = () => {
  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none">
      {[...Array(20)].map((_, i) => (
        <div
          key={i}
          className="absolute w-2 h-2 bg-blue-400/20 rounded-full animate-pulse"
          style={{
            left: `${Math.random() * 100}%`,
            top: `${Math.random() * 100}%`,
            animationDelay: `${Math.random() * 3}s`,
            animationDuration: `${2 + Math.random() * 3}s`,
          }}
        />
      ))}
    </div>
  );
};

interface CountUpProps {
  end: number;
  duration?: number;
  suffix?: string;
  isDecimal?: boolean;
}

const CountUp: React.FC<CountUpProps> = ({ end, duration = 2000, suffix = '', isDecimal = false }) => {
  const [count, setCount] = useState(0);
  const [isVisible, setIsVisible] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setCount(0);
          setIsVisible(true);
        } else {
          setIsVisible(false);
        }
      },
      { threshold: 0.3 }
    );

    if (ref.current) {
      observer.observe(ref.current);
    }

    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (!isVisible) return;

    let startTime: number;
    const animate = (timestamp: number) => {
      if (!startTime) startTime = timestamp;
      const progress = Math.min((timestamp - startTime) / duration, 1);
      const easeOut = 1 - Math.pow(1 - progress, 3);
      const value = isDecimal ? easeOut * end : Math.floor(easeOut * end);
      setCount(value);

      if (progress < 1) {
        requestAnimationFrame(animate);
      }
    };

    requestAnimationFrame(animate);
  }, [isVisible, end, duration, isDecimal]);

  return <div ref={ref}>{isDecimal ? count.toFixed(1) : count.toLocaleString()}{suffix}</div>;
};

interface TeamMember {
  id: string;
  full_name: string;
  email: string;
  avatar_url: string | null;
  bio: string | null;
  role: string;
  metadata: {
    title?: string;
    linkedin?: string;
    twitter?: string;
  };
}

const About: React.FC = () => {
  const { t } = useTranslation();

  const stats = [
    { value: 500, suffix: 'K+', label: t('stats.students'), icon: 'users', color: 'primary' },
    { value: 2000, suffix: '+', label: t('stats.courses'), icon: 'book', color: 'accent' },
    { value: 15, suffix: 'M+', label: t('stats.exams'), icon: 'check', color: 'success' },
    { value: 4.9, suffix: '/5', label: t('stats.rating'), icon: 'star', color: 'warning', isDecimal: true },
  ];

  const missions = [
    {
      title: t('about.missions.global.title'),
      desc: t('about.missions.global.desc'),
      icon: 'globe',
    },
    {
      title: t('about.missions.innovation.title'),
      desc: t('about.missions.innovation.desc'),
      icon: 'bulb',
    },
    {
      title: t('about.missions.quality.title'),
      desc: t('about.missions.quality.desc'),
      icon: 'shield',
    },
  ];

  const values = [
    { title: t('about.valuesData.quality.title'), desc: t('about.valuesData.quality.desc') },
    { title: t('about.valuesData.collaboration.title'), desc: t('about.valuesData.collaboration.desc') },
    { title: t('about.valuesData.innovation.title'), desc: t('about.valuesData.innovation.desc') },
    { title: t('about.valuesData.transparency.title'), desc: t('about.valuesData.transparency.desc') },
  ];

  const team: TeamMember[] = [
    { 
      id: 'uuid-001', 
      full_name: 'Phạm Minh Đạo', 
      email: 'dao@ioes.edu.vn',
      avatar_url: 'https://images.unsplash.com/photo-1560250097-0b93528c311a?w=400&h=400&fit=crop&crop=face', 
      bio: 'CEO & Founder với 15 năm kinh nghiệm trong ngành EdTech',
      role: 'instructor',
      metadata: { title: 'CEO & Founder', linkedin: '#', twitter: '#' }
    },
    { 
      id: 'uuid-002', 
      full_name: 'Nguyễn Hoàng Sơn', 
      email: 'son@ioes.edu.vn',
      avatar_url: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=400&h=400&fit=crop&crop=face', 
      bio: 'CTO với chuyên môn về AI và Machine Learning',
      role: 'instructor',
      metadata: { title: 'CTO', linkedin: '#', twitter: '#' }
    },
    { 
      id: 'uuid-003', 
      full_name: 'Bùi Minh Ngọc', 
      email: 'ngoc@ioes.edu.vn',
      avatar_url: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=400&h=400&fit=crop&crop=face', 
      bio: 'Head of AI - Chuyên gia về NLP và Computer Vision',
      role: 'instructor',
      metadata: { title: 'Head of AI', linkedin: '#', twitter: '#' }
    },
    { 
      id: 'uuid-004', 
      full_name: 'Nguyễn Đức Minh', 
      email: 'minh@ioes.edu.vn',
      avatar_url: 'https://images.unsplash.com/photo-1580489944761-15a19d654956?w=400&h=400&fit=crop&crop=face', 
      bio: 'Head of Education - 10 năm kinh nghiệm giảng dạy',
      role: 'instructor',
      metadata: { title: 'Head of Education', linkedin: '#', twitter: '#' }
    },
    { 
      id: 'uuid-005', 
      full_name: 'Vũ Xuân Quyết', 
      email: 'quyet@ioes.edu.vn',
      avatar_url: 'https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?w=400&h=400&fit=crop&crop=face', 
      bio: 'Head of Engineering - Kiến trúc sư hệ thống',
      role: 'instructor',
      metadata: { title: 'Head of Engineering', linkedin: '#', twitter: '#' }
    },
    { 
      id: 'uuid-006', 
      full_name: 'Chu Văn Tuấn', 
      email: 'tuan@ioes.edu.vn',
      avatar_url: 'https://images.unsplash.com/photo-1594744803329-e58b31de8bf5?w=400&h=400&fit=crop&crop=face', 
      bio: 'Head of Marketing - Chuyên gia Digital Marketing',
      role: 'instructor',
      metadata: { title: 'Head of Marketing', linkedin: '#', twitter: '#' }
    },
  ];

  const timeline = [
    { year: '2020', title: t('about.timeline.2020.title'), desc: t('about.timeline.2020.desc') },
    { year: '2021', title: t('about.timeline.2021.title'), desc: t('about.timeline.2021.desc') },
    { year: '2022', title: t('about.timeline.2022.title'), desc: t('about.timeline.2022.desc') },
    { year: '2023', title: t('about.timeline.2023.title'), desc: t('about.timeline.2023.desc') },
    { year: '2024', title: t('about.timeline.2024.title'), desc: t('about.timeline.2024.desc') },
  ];

  const getIcon = (icon: string, className: string = '') => {
    switch (icon) {
      case 'users': return <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75"/></svg>;
      case 'book': return <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M4 19.5A2.5 2.5 0 016.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 014 19.5v-15A2.5 2.5 0 016.5 2z"/></svg>;
      case 'check': return <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M22 11.08V12a10 10 0 11-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>;
      case 'star': return <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>;
      case 'globe': return <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><path d="M2 12h20M12 2a15.3 15.3 0 014 10 15.3 15.3 0 01-4 10 15.3 15.3 0 01-4-10 15.3 15.3 0 014-10z"/></svg>;
      case 'bulb': return <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z"/></svg>;
      case 'shield': return <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>;
      case 'check-circle': return <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M22 11.08V12a10 10 0 11-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>;
      case 'user': return <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>;
      default: return null;
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900 transition-colors duration-300">
      <Header />

      {/* Hero with enhanced design */}
      <section className="relative pt-32 pb-32 overflow-hidden">
        {/* Background gradient */}
        <div className="absolute inset-0 bg-gradient-to-b from-blue-50 via-white to-slate-50 dark:from-slate-800 dark:via-slate-900 dark:to-slate-800" />
        <FloatingParticles />
        
        {/* Animated gradient orbs */}
        <div className="absolute top-20 left-1/4 w-72 h-72 bg-blue-400/20 rounded-full blur-3xl animate-pulse" />
        <div className="absolute top-40 right-1/4 w-96 h-96 bg-cyan-400/20 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1s' }} />
        <div className="absolute bottom-0 left-1/2 w-80 h-80 bg-purple-400/10 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '2s' }} />
        
        <div className="relative max-w-4xl mx-auto px-6 text-center z-10">
          <AnimatedSection delay={100}>
            <span className="inline-flex items-center gap-2 px-5 py-2.5 bg-blue-100 dark:bg-blue-900/50 text-blue-700 dark:text-blue-400 rounded-full text-sm font-medium mb-6 shadow-lg shadow-blue-500/10">
              <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M12 14l9-5-9-5-9 5 9 5z"/><path d="M12 14l6.16-3.422a12.083 12.083 0 01.665 6.479A11.952 11.952 0 0012 20.055a11.952 11.952 0 00-6.824-2.998 12.078 12.078 0 01.665-6.479L12 14z"/>
              </svg>
              {t('about.title')}
            </span>
          </AnimatedSection>
          
          <AnimatedSection delay={200}>
            <h1 className="text-5xl md:text-6xl font-bold mb-6 leading-tight">
              <span className="bg-gradient-to-r from-blue-600 via-cyan-500 to-purple-600 bg-clip-text text-transparent">
                {t('about.hero.title')}
              </span>
            </h1>
          </AnimatedSection>
          
          <AnimatedSection delay={300}>
            <p className="text-xl text-slate-600 dark:text-slate-300 max-w-2xl mx-auto leading-relaxed">
              {t('about.hero.desc')}
            </p>
          </AnimatedSection>
          
          <AnimatedSection delay={400}>
            <div className="flex flex-wrap justify-center gap-4 mt-10">
              <Button as={Link} to="/courses" size="lg" className="shadow-xl shadow-blue-500/20">
                Khám phá khóa học
                <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M5 12h14M12 5l7 7-7 7"/></svg>
              </Button>
              <Button as={Link} to="/contact" size="lg" variant="secondary" className="border-2 border-blue-300 dark:border-blue-700 text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/30">
                Liên hệ ngay
              </Button>
            </div>
          </AnimatedSection>
        </div>
        
        {/* Wave separator */}
        <div className="absolute -bottom-1 left-0 right-0 h-24">
          <svg viewBox="0 0 1440 120" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full h-full">
            <path d="M0 120L60 105C120 90 240 60 360 45C480 30 600 30 720 37.5C840 45 960 60 1080 67.5C1200 75 1320 75 1380 75L1440 75V120H1380C1320 120 1200 120 1080 120C960 120 840 120 720 120C600 120 480 120 360 120C240 120 120 120 60 120H0Z" className="fill-white dark:fill-slate-900"/>
          </svg>
        </div>
      </section>

      {/* Stats with enhanced cards */}
      <section className="py-20 bg-white dark:bg-slate-900 relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-blue-50/50 to-transparent dark:via-slate-800/50" />
        
        <div className="relative max-w-5xl mx-auto px-6">
          <AnimatedSection>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
              {stats.map((stat, i) => (
                <div 
                  key={i} 
                  className="group relative bg-gradient-to-br from-white to-slate-50 dark:from-slate-800 dark:to-slate-800/50 rounded-2xl p-6 text-center border border-slate-100 dark:border-slate-700 shadow-lg shadow-slate-200/50 dark:shadow-none hover:shadow-xl hover:shadow-blue-500/10 hover:-translate-y-1 transition-all duration-300"
                >
                  {/* Glow effect on hover */}
                  <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-blue-500/5 to-cyan-500/5 opacity-0 group-hover:opacity-100 transition-opacity" />
                  
                  <div className={`relative w-14 h-14 rounded-xl flex items-center justify-center mx-auto mb-4 transform group-hover:scale-110 transition-transform ${
                    stat.color === 'primary' ? 'bg-gradient-to-br from-blue-500 to-blue-600 text-white shadow-lg shadow-blue-500/30' :
                    stat.color === 'accent' ? 'bg-gradient-to-br from-cyan-500 to-cyan-600 text-white shadow-lg shadow-cyan-500/30' :
                    stat.color === 'success' ? 'bg-gradient-to-br from-emerald-500 to-emerald-600 text-white shadow-lg shadow-emerald-500/30' :
                    'bg-gradient-to-br from-amber-500 to-amber-600 text-white shadow-lg shadow-amber-500/30'
                  }`}>
                    {getIcon(stat.icon, 'w-7 h-7')}
                  </div>
                  <div className="text-3xl font-bold bg-gradient-to-r from-slate-900 to-slate-700 dark:from-white dark:to-slate-200 bg-clip-text text-transparent mb-1">
                    <CountUp end={stat.value} suffix={stat.suffix} isDecimal={stat.isDecimal} duration={2500} />
                  </div>
                  <div className="text-sm text-slate-500 font-medium">{stat.label}</div>
                </div>
              ))}
            </div>
          </AnimatedSection>
        </div>
      </section>

      {/* Story with enhanced visual */}
      <section className="py-20 bg-slate-50 dark:bg-slate-800 relative overflow-hidden">
        <div className="absolute right-0 top-1/2 -translate-y-1/2 w-96 h-96 bg-blue-500/5 rounded-full blur-3xl" />
        
        <div className="relative max-w-5xl mx-auto px-6">
          <div className="grid md:grid-cols-2 gap-12 items-center">
            <AnimatedSection className="group">
              <div className="relative rounded-3xl overflow-hidden aspect-video shadow-2xl shadow-slate-300/50 dark:shadow-none">
                <img src="https://images.unsplash.com/photo-1522202176988-66273c2fd55f?w=600&h=400&fit=crop" alt="IOES Team" className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700" />
                <div className="absolute inset-0 bg-gradient-to-t from-slate-900/40 to-transparent" />
                <div className="absolute bottom-4 left-4 flex gap-2">
                  <span className="px-3 py-1 bg-white/90 rounded-full text-sm font-medium text-slate-800">2020 - 2026</span>
                </div>
              </div>
            </AnimatedSection>
            
            <AnimatedSection delay={150}>
              <span className="inline-flex items-center gap-2 px-4 py-2 bg-blue-100 dark:bg-blue-900/50 text-blue-700 dark:text-blue-400 rounded-full text-sm font-medium mb-4">
                <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>
                Câu chuyện của chúng tôi
              </span>
              <h3 className="text-3xl font-bold text-slate-900 dark:text-white mb-5">{t('about.story.title')}</h3>
              <p className="text-slate-600 dark:text-slate-300 mb-5 leading-relaxed text-lg">
                {t('about.story.desc1')}
              </p>
              <p className="text-slate-600 dark:text-slate-300 mb-5 leading-relaxed">
                {t('about.story.desc2')}
              </p>
              <p className="text-slate-600 dark:text-slate-300 leading-relaxed">
                {t('about.story.desc3')}
              </p>
            </AnimatedSection>
          </div>
        </div>
      </section>

      {/* Mission with enhanced cards */}
      <section className="py-20 bg-white dark:bg-slate-900 relative overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-blue-100/30 via-transparent to-transparent dark:from-blue-900/10" />
        
        <div className="relative max-w-5xl mx-auto px-6">
          <AnimatedSection className="text-center mb-14">
            <span className="inline-flex items-center gap-2 px-4 py-2 bg-blue-100 dark:bg-blue-900/50 text-blue-700 dark:text-blue-400 rounded-full text-sm font-medium mb-4">
              {t('about.missionLabel')}
            </span>
            <h2 className="text-4xl font-bold text-slate-900 dark:text-white mb-4">{t('about.vision')}</h2>
            <p className="text-slate-600 dark:text-slate-300 max-w-xl mx-auto text-lg">
              {t('about.visionDesc')}
            </p>
          </AnimatedSection>
          
          <div className="grid md:grid-cols-3 gap-8">
            {missions.map((m, i) => (
              <AnimatedSection key={i} delay={i * 100} className="group">
                <div className={`relative h-full bg-gradient-to-br from-white to-slate-50 dark:from-slate-800 dark:to-slate-800/50 rounded-3xl p-8 text-center border border-slate-100 dark:border-slate-700 shadow-lg hover:shadow-2xl transition-all duration-500 hover:-translate-y-2 ${
                  i === 0 ? 'hover:shadow-blue-500/10' : i === 1 ? 'hover:shadow-cyan-500/10' : 'hover:shadow-emerald-500/10'
                }`}>
                  {/* Top accent line */}
                  <div className={`absolute top-0 left-1/2 -translate-x-1/2 w-20 h-1 rounded-b-full ${
                    i === 0 ? 'bg-gradient-to-r from-transparent via-blue-500 to-transparent' : 
                    i === 1 ? 'bg-gradient-to-r from-transparent via-cyan-500 to-transparent' : 
                    'bg-gradient-to-r from-transparent via-emerald-500 to-transparent'
                  }`} />
                  
                  <div className={`w-18 h-18 rounded-2xl flex items-center justify-center mx-auto mb-6 mt-2 ${
                    i === 0 ? 'bg-gradient-to-br from-blue-500 to-blue-600 text-white shadow-lg shadow-blue-500/30' : 
                    i === 1 ? 'bg-gradient-to-br from-cyan-500 to-cyan-600 text-white shadow-lg shadow-cyan-500/30' : 
                    'bg-gradient-to-br from-emerald-500 to-emerald-600 text-white shadow-lg shadow-emerald-500/30'
                  }`}>
                    <div className="w-16 h-16 flex items-center justify-center">
                      {getIcon(m.icon, 'w-9 h-9')}
                    </div>
                  </div>
                  <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-3">{m.title}</h3>
                  <p className="text-slate-600 dark:text-slate-400 leading-relaxed">{m.desc}</p>
                </div>
              </AnimatedSection>
            ))}
          </div>
        </div>
      </section>

      {/* Values */}
      <section className="py-16 bg-slate-50 dark:bg-slate-800">
        <div className="max-w-5xl mx-auto px-6">
          <div className="text-center mb-12">
            <span className="inline-flex items-center gap-2 px-4 py-2 bg-blue-100 dark:bg-blue-900/50 text-blue-700 dark:text-blue-400 rounded-full text-sm font-medium mb-4">
              {t('about.values')}
            </span>
            <h2 className="text-3xl font-bold text-slate-900 dark:text-white mb-3">{t('about.valuesTitle')}</h2>
            <p className="text-slate-600 dark:text-slate-300">{t('about.valuesSubtitle')}</p>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {values.map((v, i) => (
              <div key={i} className="bg-white dark:bg-slate-900 rounded-2xl p-6 border border-slate-100 dark:border-slate-700 hover:border-blue-300 dark:hover:border-blue-600 hover:-translate-y-1 transition-all cursor-pointer">
                <div className={`w-12 h-12 rounded-xl flex items-center justify-center mb-4 ${
                  i === 0 ? 'bg-blue-100 text-blue-600' : i === 1 ? 'bg-cyan-100 text-cyan-600' : i === 2 ? 'bg-emerald-100 text-emerald-600' : 'bg-amber-100 text-amber-600'
                }`}>
                  {getIcon(i === 0 ? 'check-circle' : i === 1 ? 'users' : i === 2 ? 'bulb' : 'globe', 'w-6 h-6')}
                </div>
                <h4 className="font-semibold text-slate-900 dark:text-white mb-2">{v.title}</h4>
                <p className="text-sm text-slate-500">{v.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Team with enhanced cards */}
      <section className="py-20 bg-slate-50 dark:bg-slate-800 relative overflow-hidden">
        <div className="absolute left-0 bottom-0 w-96 h-96 bg-purple-500/5 rounded-full blur-3xl" />
        
        <div className="relative max-w-5xl mx-auto px-6">
          <AnimatedSection className="text-center mb-14">
            <span className="inline-flex items-center gap-2 px-4 py-2 bg-blue-100 dark:bg-blue-900/50 text-blue-700 dark:text-blue-400 rounded-full text-sm font-medium mb-4">
              {t('about.team')}
            </span>
            <h2 className="text-4xl font-bold text-slate-900 dark:text-white mb-4">{t('about.teamTitle')}</h2>
            <p className="text-slate-600 dark:text-slate-300 max-w-xl mx-auto text-lg">
              {t('about.teamDesc')}
            </p>
          </AnimatedSection>
          
          <div className="grid grid-cols-2 md:grid-cols-3 gap-6">
            {team.map((member, i) => (
              <AnimatedSection key={member.id} delay={i * 50}>
                <div className="group relative bg-white dark:bg-slate-800 rounded-3xl overflow-hidden border border-slate-100 dark:border-slate-700 shadow-lg hover:shadow-2xl hover:shadow-blue-500/10 transition-all duration-500 hover:-translate-y-3">
                  {/* Top gradient bar */}
                  <div className="h-1.5 bg-gradient-to-r from-blue-500 via-cyan-500 to-emerald-500" />
                  
                  <div className="h-48 overflow-hidden relative">
                    <img 
                      src={member.avatar_url || 'https://via.placeholder.com/400x400'} 
                      alt={member.full_name} 
                      className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700" 
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-slate-900/60 via-transparent to-transparent" />
                  </div>
                  
                  <div className="p-5 text-center">
                    <div className="font-bold text-slate-900 dark:text-white text-lg mb-0.5">{member.full_name}</div>
                    <div className="text-sm font-medium bg-gradient-to-r from-blue-600 to-cyan-500 bg-clip-text text-transparent mb-3">{member.metadata.title}</div>
                    {member.bio && (
                      <p className="text-xs text-slate-500 dark:text-slate-400 mb-4 line-clamp-2 leading-relaxed">{member.bio}</p>
                    )}
                    <div className="flex gap-2 justify-center">
                      <a href={member.metadata.linkedin || '#'} className="w-9 h-9 bg-slate-100 dark:bg-slate-700 rounded-xl flex items-center justify-center text-slate-500 hover:bg-blue-600 hover:text-white transition-all hover:scale-110">
                        <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor"><path d="M19 0h-14c-2.761 0-5 2.239-5 5v14c0 2.761 2.239 5 5 5h14c2.762 0 5-2.239 5-5v-14c0-2.761-2.238-5-5-5zm-11 19h-3v-11h3v11zm-1.5-12.268c-.966 0-1.75-.79-1.75-1.764s.784-1.764 1.75-1.764 1.75.79 1.75 1.764-.783 1.764-1.75 1.764zm13.5 12.268h-3v-5.604c0-3.368-4-3.113-4 0v5.604h-3v-11h3v1.765c1.396-2.586 7-2.777 7 2.476v6.759z"/></svg>
                      </a>
                      <a href={member.metadata.twitter || '#'} className="w-9 h-9 bg-slate-100 dark:bg-slate-700 rounded-xl flex items-center justify-center text-slate-500 hover:bg-sky-500 hover:text-white transition-all hover:scale-110">
                        <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor"><path d="M24 4.557c-.883.392-1.832.656-2.828.775 1.017-.609 1.798-1.574 2.165-2.724-.951.564-2.005.974-3.127 1.195-.897-.957-2.178-1.555-3.594-1.555-3.179 0-5.515 2.966-4.797 6.045-4.091-.205-7.719-2.165-10.148-5.144-1.29 2.213-.669 5.108 1.523 6.574-.806-.026-1.566-.247-2.229-.616-.054 2.281 1.581 4.415 3.949 4.89-.693.188-1.452.232-2.224.084.626 1.956 2.444 3.379 4.6 3.419-2.07 1.623-4.678 2.348-7.29 2.04 2.179 1.397 4.768 2.212 7.548 2.212 9.142 0 14.307-7.721 13.995-14.646.962-.695 1.797-1.562 2.457-2.549z"/></svg>
                      </a>
                    </div>
                  </div>
                </div>
              </AnimatedSection>
            ))}
          </div>
        </div>
      </section>

      {/* Timeline */}
      <section className="py-16 bg-slate-50 dark:bg-slate-800">
        <div className="max-w-3xl mx-auto px-6">
          <div className="text-center mb-12">
            <span className="inline-flex items-center gap-2 px-4 py-2 bg-blue-100 dark:bg-blue-900/50 text-blue-700 dark:text-blue-400 rounded-full text-sm font-medium mb-4">
              {t('about.timelineLabel')}
            </span>
            <h2 className="text-3xl font-bold text-slate-900 dark:text-white mb-3">{t('about.timelineTitle')}</h2>
            <p className="text-slate-600 dark:text-slate-300">{t('about.timelineDesc')}</p>
          </div>
          <div className="relative">
            <div className="absolute left-1/2 transform -translate-x-1/2 w-0.5 h-full bg-slate-200 dark:bg-slate-700 hidden md:block"></div>
            <div className="space-y-8">
              {timeline.map((t, i) => (
                <div key={i} className={`flex items-center gap-6 ${i % 2 === 0 ? 'md:flex-row' : 'md:flex-row-reverse'}`}>
                  <div className={`flex-1 ${i % 2 === 0 ? 'md:text-right' : 'md:text-left'} hidden md:block`}>
                    {i % 2 === 0 && (
                      <div className="bg-white dark:bg-slate-900 rounded-2xl p-5 border border-slate-100 dark:border-slate-700 inline-block">
                        <div className="text-sm font-semibold text-blue-600 dark:text-blue-400 mb-1">{t.year}</div>
                        <div className="font-semibold text-slate-900 dark:text-white mb-1">{t.title}</div>
                        <div className="text-sm text-slate-500">{t.desc}</div>
                      </div>
                    )}
                  </div>
                  <div className="w-4 h-4 bg-blue-600 rounded-full border-4 border-slate-100 dark:border-slate-800 flex-shrink-0 z-10 hidden md:block"></div>
                  <div className={`flex-1 ${i % 2 !== 0 ? 'md:text-right' : 'md:text-left'} hidden md:block`}>
                    {i % 2 !== 0 && (
                      <div className="bg-white dark:bg-slate-900 rounded-2xl p-5 border border-slate-100 dark:border-slate-700 inline-block">
                        <div className="text-sm font-semibold text-blue-600 dark:text-blue-400 mb-1">{t.year}</div>
                        <div className="font-semibold text-slate-900 dark:text-white mb-1">{t.title}</div>
                        <div className="text-sm text-slate-500">{t.desc}</div>
                      </div>
                    )}
                  </div>
                  {/* Mobile view */}
                  <div className="flex-1 md:hidden">
                    <div className="bg-white dark:bg-slate-900 rounded-2xl p-5 border border-slate-100 dark:border-slate-700">
                      <div className="text-sm font-semibold text-blue-600 dark:text-blue-400 mb-1">{t.year}</div>
                      <div className="font-semibold text-slate-900 dark:text-white mb-1">{t.title}</div>
                      <div className="text-sm text-slate-500">{t.desc}</div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Enhanced CTA */}
      <section className="relative py-24 overflow-hidden">
        {/* Background with gradient */}
        <div className="absolute inset-0 bg-gradient-to-br from-blue-600 via-blue-700 to-cyan-600" />
        <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA2MCA2MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxnIGZpbGw9IiNmZmYiIGZpbGwtb3BhY2l0eT0iMC4wNSI+PHBhdGggZD0iTTM2IDM0djItSDI0di0yaDEyek0zNiA1MHYtMkgxNHYtMGgyMnYtMGgydjJ6Ii8+PC9nPjwvZz48L3N2Zz4=')] opacity-50" />
        
        {/* Floating elements */}
        <div className="absolute top-10 left-10 w-32 h-32 bg-white/10 rounded-full animate-pulse" />
        <div className="absolute bottom-10 right-10 w-48 h-48 bg-cyan-400/20 rounded-full animate-pulse" style={{ animationDelay: '1s' }} />
        <div className="absolute top-1/2 right-1/4 w-20 h-20 bg-white/5 rounded-full" />
        
        <div className="relative max-w-3xl mx-auto px-6 text-center">
          <AnimatedSection>
            <h2 className="text-4xl md:text-5xl font-bold text-white mb-6 leading-tight">
              {t('cta.about.title')}
            </h2>
            <p className="text-xl text-white/90 mb-10 max-w-xl mx-auto">
              {t('cta.about.subtitle')}
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Button 
                as={Link} 
                to="/auth/register" 
                size="lg" 
                className="!bg-white !text-blue-600 hover:!bg-slate-100 shadow-2xl shadow-white/25 font-bold text-lg px-8 py-4 rounded-xl transition-all hover:scale-105"
              >
                Bắt đầu miễn phí
                <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M5 12h14M12 5l7 7-7 7"/></svg>
              </Button>
              <Button 
                as={Link} 
                to="/demo" 
                size="lg" 
                variant="secondary" 
                className="!bg-transparent !text-white border-2 border-white/70 hover:!bg-white/10 hover:!border-white font-medium text-lg px-8 py-4 rounded-xl transition-all"
              >
                Xem Demo
              </Button>
            </div>
          </AnimatedSection>
        </div>
      </section>

      <Footer />
    </div>
  );
};

export default About;
