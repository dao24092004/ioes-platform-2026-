import React from 'react';
import Header from '../../components/public/Header';
import HeroSection from './HomeSection/HeroSection';
import StatsSection from './HomeSection/StatsSection';
import FeaturesSection from './HomeSection/FeaturesSection';
import CoursesSection from './HomeSection/CoursesSection';
import ArenaSection from './HomeSection/ArenaSection';
import SkillTreeSection from './HomeSection/SkillTreeSection';
import AiMentorSection from './HomeSection/AiMentorSection';
import TestimonialsSection from './HomeSection/TestimonialsSection';
import CtaSection from './HomeSection/CtaSection';
import Footer from '../../components/public/Footer';

const Home: React.FC = () => {
  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900 transition-colors duration-300">
      <Header />
      
      {/* Sections */}
      <HeroSection />
      <StatsSection />
      <FeaturesSection />
      <CoursesSection />
      <ArenaSection />
      <SkillTreeSection />
      <AiMentorSection />
      <TestimonialsSection />
      <CtaSection />

      {/* Footer */}
      <Footer />
    </div>
  );
};

export default Home;