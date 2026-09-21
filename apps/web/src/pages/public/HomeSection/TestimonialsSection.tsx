import React, { useState, useRef } from 'react';
import { useTranslation } from 'react-i18next';

const TestimonialsSection: React.FC = () => {
  const { t } = useTranslation();
  const [activeIndex, setActiveIndex] = useState(0);
  const scrollRef = useRef<HTMLDivElement>(null);

  const testimonials = [
    {
      name: 'Nguyễn Anh Tuấn',
      role: t('testimonials.studentRole'),
      avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=100&h=100&fit=crop&crop=face',
      content: t('testimonials.studentContent'),
      rating: 5,
    },
    {
      name: 'Trần Thị Bình',
      role: t('testimonials.teacherRole'),
      avatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=100&h=100&fit=crop&crop=face',
      content: t('testimonials.teacherContent'),
      rating: 5,
    },
    {
      name: 'Lê Hoàng Minh',
      role: t('testimonials.alumniRole'),
      avatar: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=100&h=100&fit=crop&crop=face',
      content: t('testimonials.alumniContent'),
      rating: 5,
    },
  ];

  const scrollToIndex = (index: number) => {
    if (scrollRef.current) {
      const cardWidth = 400 + 32;
      scrollRef.current.scrollTo({
        left: index * cardWidth,
        behavior: 'smooth',
      });
    }
    setActiveIndex(index);
  };

  const handlePrev = () => {
    const newIndex = activeIndex > 0 ? activeIndex - 1 : testimonials.length - 1;
    scrollToIndex(newIndex);
  };

  const handleNext = () => {
    const newIndex = activeIndex < testimonials.length - 1 ? activeIndex + 1 : 0;
    scrollToIndex(newIndex);
  };

  return (
    <section id="testimonials" className="py-24 bg-slate-50 dark:bg-slate-800/50 overflow-hidden relative">
      {/* Background decoration */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-0 right-0 w-96 h-96 bg-blue-50 dark:bg-blue-900/10 rounded-full blur-3xl" />
        <div className="absolute bottom-0 left-0 w-96 h-96 bg-indigo-50 dark:bg-indigo-900/10 rounded-full blur-3xl" />
      </div>

      <div className="relative max-w-7xl mx-auto px-6">
        {/* Section Header */}
        <div className="text-center mb-12">
          <span className="inline-flex items-center gap-2 px-4 py-2 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 rounded-full text-sm font-semibold mb-6">
            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
            </svg>
            {t('testimonials.title')}
          </span>
          <h2 className="text-3xl md:text-4xl font-bold text-slate-900 dark:text-white mb-4">
            {t('testimonials.heading')}
          </h2>
          <p className="text-lg text-slate-600 dark:text-slate-300 max-w-2xl mx-auto">
            {t('testimonials.subtitle')}
          </p>
        </div>

        {/* Navigation & Carousel */}
        <div className="flex items-center justify-between gap-4 mb-6">
          <div className="flex gap-2">
            {testimonials.map((_, index) => (
              <button
                key={index}
                onClick={() => scrollToIndex(index)}
                className={`h-2 rounded-full transition-all ${
                  index === activeIndex 
                    ? 'w-8 bg-blue-600 dark:bg-blue-400' 
                    : 'w-2 bg-slate-300 dark:bg-slate-600 hover:bg-slate-400 dark:hover:bg-slate-500'
                }`}
                aria-label={`Go to testimonial ${index + 1}`}
              />
            ))}
          </div>
          <div className="flex gap-2">
            <button
              onClick={handlePrev}
              className="w-10 h-10 rounded-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700 flex items-center justify-center transition-colors shadow-sm"
              aria-label="Previous testimonial"
            >
              <svg className="w-5 h-5 text-slate-600 dark:text-slate-300" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M15 19l-7-7 7-7" />
              </svg>
            </button>
            <button
              onClick={handleNext}
              className="w-10 h-10 rounded-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700 flex items-center justify-center transition-colors shadow-sm"
              aria-label="Next testimonial"
            >
              <svg className="w-5 h-5 text-slate-600 dark:text-slate-300" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M9 5l7 7-7 7" />
              </svg>
            </button>
          </div>
        </div>

        {/* Testimonial Cards */}
        <div 
          ref={scrollRef}
          className="flex gap-8 overflow-x-auto pb-4 scroll-smooth snap-x snap-mandatory"
          style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
        >
          {testimonials.map((testimonial, index) => (
            <div 
              key={index} 
              className={`min-w-[340px] sm:min-w-[400px] flex-shrink-0 bg-white dark:bg-slate-800 rounded-2xl p-6 border border-slate-200 dark:border-slate-700 snap-center transition-all duration-300 ${
                index === activeIndex ? 'shadow-xl ring-2 ring-blue-500 dark:ring-blue-400' : 'shadow-md hover:shadow-lg'
              }`}
            >
              {/* Quote Icon */}
              <div className="w-12 h-12 bg-blue-100 dark:bg-blue-900/30 rounded-xl flex items-center justify-center mb-4">
                <svg className="w-6 h-6 text-blue-600 dark:text-blue-400" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M14.017 21v-7.391c0-5.704 3.731-9.57 8.983-10.609l.995 2.151c-2.432.917-3.995 3.638-3.995 5.849h4v10h-9.983zm-14.017 0v-7.391c0-5.704 3.748-9.57 9-10.609l.996 2.151c-2.433.917-3.996 3.638-3.996 5.849h3.983v10h-9.983z" />
                </svg>
              </div>

              {/* Rating */}
              <div className="flex gap-1 mb-4">
                {[1,2,3,4,5].map(i => (
                  <svg key={i} className={`w-5 h-5 ${i <= testimonial.rating ? 'text-amber-400' : 'text-slate-300'}`} viewBox="0 0 24 24" fill="currentColor">
                    <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
                  </svg>
                ))}
              </div>

              {/* Content */}
              <p className="text-slate-600 dark:text-slate-300 mb-6 leading-relaxed">
                "{testimonial.content}"
              </p>

              {/* Author */}
              <div className="flex items-center gap-4 pt-4 border-t border-slate-100 dark:border-slate-700">
                <img 
                  src={testimonial.avatar} 
                  alt={testimonial.name}
                  className="w-12 h-12 rounded-full object-cover ring-2 ring-blue-100 dark:ring-blue-900"
                />
                <div>
                  <div className="font-semibold text-slate-900 dark:text-white">{testimonial.name}</div>
                  <div className="text-sm text-slate-500 dark:text-slate-400">{testimonial.role}</div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default TestimonialsSection;
