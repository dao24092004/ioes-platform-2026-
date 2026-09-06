import React from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/common';
import Header from '../../components/public/Header';
import Footer from '../../components/public/Footer';

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
    { value: '500K+', label: t('stats.students'), icon: 'users', color: 'primary' },
    { value: '2,000+', label: t('stats.courses'), icon: 'book', color: 'accent' },
    { value: '15M+', label: t('stats.exams'), icon: 'check', color: 'success' },
    { value: '4.9/5', label: t('stats.rating'), icon: 'star', color: 'warning' },
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

      {/* Hero */}
      <section className="pt-32 pb-16 bg-gradient-to-b from-white to-blue-50 dark:from-slate-800 dark:to-slate-800 text-center px-6">
        <div className="max-w-4xl mx-auto">
          <span className="inline-flex items-center gap-2 px-4 py-2 bg-blue-100 dark:bg-blue-900/50 text-blue-700 dark:text-blue-400 rounded-full text-sm font-medium mb-6">
            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M12 14l9-5-9-5-9 5 9 5z"/><path d="M12 14l6.16-3.422a12.083 12.083 0 01.665 6.479A11.952 11.952 0 0012 20.055a11.952 11.952 0 00-6.824-2.998 12.078 12.078 0 01.665-6.479L12 14z"/>
            </svg>
            {t('about.title')}
          </span>
          <h1 className="text-4xl md:text-5xl font-bold text-slate-900 dark:text-white mb-5">
            {t('about.hero.title')}
          </h1>
          <p className="text-lg text-slate-600 dark:text-slate-300 max-w-2xl mx-auto">
            {t('about.hero.desc')}
          </p>
        </div>
      </section>

      {/* Stats */}
      <section className="py-16 bg-white dark:bg-slate-900">
        <div className="max-w-5xl mx-auto px-6">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            {stats.map((stat, i) => (
              <div key={i} className="bg-slate-50 dark:bg-slate-800 rounded-2xl p-6 text-center border border-slate-100 dark:border-slate-700">
                <div className={`w-14 h-14 rounded-xl flex items-center justify-center mx-auto mb-3 ${
                  stat.color === 'primary' ? 'bg-blue-100 text-blue-600' :
                  stat.color === 'accent' ? 'bg-cyan-100 text-cyan-600' :
                  stat.color === 'success' ? 'bg-emerald-100 text-emerald-600' :
                  'bg-amber-100 text-amber-600'
                }`}>
                  {getIcon(stat.icon, 'w-7 h-7')}
                </div>
                <div className="text-3xl font-bold text-slate-900 dark:text-white mb-1">{stat.value}</div>
                <div className="text-sm text-slate-500">{stat.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Story */}
      <section className="py-16 bg-slate-50 dark:bg-slate-800">
        <div className="max-w-5xl mx-auto px-6">
          <div className="grid md:grid-cols-2 gap-12 items-center">
            <div className="rounded-3xl overflow-hidden aspect-video">
              <img src="https://images.unsplash.com/photo-1522202176988-66273c2fd55f?w=600&h=400&fit=crop" alt="IOES Team" className="w-full h-full object-cover" />
            </div>
            <div>
              <h3 className="text-2xl font-bold text-slate-900 dark:text-white mb-4">{t('about.story.title')}</h3>
              <p className="text-slate-600 dark:text-slate-300 mb-4 leading-relaxed">
                {t('about.story.desc1')}
              </p>
              <p className="text-slate-600 dark:text-slate-300 mb-4 leading-relaxed">
                {t('about.story.desc2')}
              </p>
              <p className="text-slate-600 dark:text-slate-300 leading-relaxed">
                {t('about.story.desc3')}
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Mission */}
      <section className="py-16 bg-white dark:bg-slate-900">
        <div className="max-w-5xl mx-auto px-6">
          <div className="text-center mb-12">
            <span className="inline-flex items-center gap-2 px-4 py-2 bg-blue-100 dark:bg-blue-900/50 text-blue-700 dark:text-blue-400 rounded-full text-sm font-medium mb-4">
              {t('about.missionLabel')}
            </span>
            <h2 className="text-3xl font-bold text-slate-900 dark:text-white mb-3">{t('about.vision')}</h2>
            <p className="text-slate-600 dark:text-slate-300 max-w-xl mx-auto">
              {t('about.visionDesc')}
            </p>
          </div>
          <div className="grid md:grid-cols-3 gap-6">
            {missions.map((m, i) => (
              <div key={i} className="bg-slate-50 dark:bg-slate-800 rounded-2xl p-8 text-center border border-slate-100 dark:border-slate-700">
                <div className={`w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-5 ${
                  i === 0 ? 'bg-blue-100 text-blue-600' : i === 1 ? 'bg-cyan-100 text-cyan-600' : 'bg-emerald-100 text-emerald-600'
                }`}>
                  {getIcon(m.icon, 'w-8 h-8')}
                </div>
                <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-2">{m.title}</h3>
                <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed">{m.desc}</p>
              </div>
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

      {/* Team */}
      <section className="py-16 bg-white dark:bg-slate-900">
        <div className="max-w-5xl mx-auto px-6">
          <div className="text-center mb-12">
            <span className="inline-flex items-center gap-2 px-4 py-2 bg-blue-100 dark:bg-blue-900/50 text-blue-700 dark:text-blue-400 rounded-full text-sm font-medium mb-4">
              {t('about.team')}
            </span>
            <h2 className="text-3xl font-bold text-slate-900 dark:text-white mb-3">{t('about.teamTitle')}</h2>
            <p className="text-slate-600 dark:text-slate-300">{t('about.teamDesc')}</p>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-6">
            {team.map((member) => (
              <div key={member.id} className="bg-slate-50 dark:bg-slate-800 rounded-2xl overflow-hidden border border-slate-100 dark:border-slate-700 hover:-translate-y-2 hover:shadow-lg transition-all">
                <div className="h-48 overflow-hidden">
                  <img src={member.avatar_url || 'https://via.placeholder.com/400x400'} alt={member.full_name} className="w-full h-full object-cover" />
                </div>
                <div className="p-5 text-center">
                  <div className="font-semibold text-slate-900 dark:text-white mb-1">{member.full_name}</div>
                  <div className="text-sm text-blue-600 dark:text-blue-400 mb-3">{member.metadata.title}</div>
                  {member.bio && (
                    <p className="text-xs text-slate-500 dark:text-slate-400 mb-3 line-clamp-2">{member.bio}</p>
                  )}
                  <div className="flex gap-2 justify-center">
                    <a href={member.metadata.linkedin || '#'} className="w-8 h-8 bg-slate-100 dark:bg-slate-700 rounded-lg flex items-center justify-center text-slate-500 hover:bg-blue-600 hover:text-white transition-colors">
                      <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor"><path d="M19 0h-14c-2.761 0-5 2.239-5 5v14c0 2.761 2.239 5 5 5h14c2.762 0 5-2.239 5-5v-14c0-2.761-2.238-5-5-5zm-11 19h-3v-11h3v11zm-1.5-12.268c-.966 0-1.75-.79-1.75-1.764s.784-1.764 1.75-1.764 1.75.79 1.75 1.764-.783 1.764-1.75 1.764zm13.5 12.268h-3v-5.604c0-3.368-4-3.113-4 0v5.604h-3v-11h3v1.765c1.396-2.586 7-2.777 7 2.476v6.759z"/></svg>
                    </a>
                    <a href={member.metadata.twitter || '#'} className="w-8 h-8 bg-slate-100 dark:bg-slate-700 rounded-lg flex items-center justify-center text-slate-500 hover:bg-blue-400 hover:text-white transition-colors">
                      <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor"><path d="M24 4.557c-.883.392-1.832.656-2.828.775 1.017-.609 1.798-1.574 2.165-2.724-.951.564-2.005.974-3.127 1.195-.897-.957-2.178-1.555-3.594-1.555-3.179 0-5.515 2.966-4.797 6.045-4.091-.205-7.719-2.165-10.148-5.144-1.29 2.213-.669 5.108 1.523 6.574-.806-.026-1.566-.247-2.229-.616-.054 2.281 1.581 4.415 3.949 4.89-.693.188-1.452.232-2.224.084.626 1.956 2.444 3.379 4.6 3.419-2.07 1.623-4.678 2.348-7.29 2.04 2.179 1.397 4.768 2.212 7.548 2.212 9.142 0 14.307-7.721 13.995-14.646.962-.695 1.797-1.562 2.457-2.549z"/></svg>
                    </a>
                  </div>
                </div>
              </div>
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

      {/* CTA */}
      <section className="bg-gradient-to-r from-blue-600 to-cyan-500 py-16 text-center px-6">
        <div className="max-w-xl mx-auto">
          <h2 className="text-3xl font-bold text-white mb-4">{t('cta.about.title')}</h2>
          <p className="text-white/90 mb-8">{t('cta.about.subtitle')}</p>
          <Button as={Link} to="/auth/login" size="lg" variant="secondary" className="!text-blue-600 dark:!text-white hover:!text-blue-700 dark:hover:!text-slate-100 border-blue-600 shadow-xl font-bold">
            <span className="text-blue-600 dark:text-white font-bold">{t('cta.about.button')}</span>
            <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M5 12h14M12 5l7 7-7 7"/></svg>
          </Button>
        </div>
      </section>

      <Footer />
    </div>
  );
};

export default About;
