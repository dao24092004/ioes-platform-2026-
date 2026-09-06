import React from 'react';
import { useTranslation } from 'react-i18next';

const TestimonialsSection: React.FC = () => {
  const { t } = useTranslation();

  const testimonials = [
    {
      name: 'Nguyễn Anh Tuấn',
      role: t('testimonials.studentRole'),
      initials: 'NAT',
      color: 'blue',
      content: t('testimonials.studentContent'),
    },
    {
      name: 'Trần Thị Bình',
      role: t('testimonials.teacherRole'),
      initials: 'TTB',
      color: 'green',
      content: t('testimonials.teacherContent'),
    },
    {
      name: 'Lê Hoàng Minh',
      role: t('testimonials.alumniRole'),
      initials: 'LHM',
      color: 'purple',
      content: t('testimonials.alumniContent'),
    },
  ];

  const getColorClass = (color: string) => {
    const colors: Record<string, string> = {
      blue: 'bg-blue-500',
      green: 'bg-green-500',
      purple: 'bg-purple-500',
    };
    return colors[color] || colors.blue;
  };

  return (
    <section id="testimonials" className="py-24 bg-white dark:bg-slate-900 overflow-hidden">
      <div className="max-w-7xl mx-auto px-6">
        <div className="text-center mb-12">
          <span className="inline-flex items-center gap-2 px-4 py-2 bg-blue-100 dark:bg-blue-900/50 text-blue-700 dark:text-blue-400 rounded-full text-sm font-medium mb-4">
            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
            </svg>
            {t('testimonials.title')}
          </span>
          <h2 className="text-3xl md:text-4xl font-bold text-slate-900 dark:text-white mb-4">{t('testimonials.heading')}</h2>
          <p className="text-lg text-slate-600 dark:text-slate-300 max-w-2xl mx-auto">{t('testimonials.subtitle')}</p>
        </div>

        <div className="flex gap-6 overflow-x-auto pb-4">
          {testimonials.map((testimonial, index) => (
            <div key={index} className="min-w-[380px] max-w-[380px] flex-shrink-0 bg-slate-50 dark:bg-slate-800 rounded-2xl p-6 border border-slate-200 dark:border-slate-700">
              <div className="flex gap-1 mb-3">
                {[1,2,3,4,5].map(i => (
                  <svg key={i} className="w-5 h-5 text-amber-400" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
                  </svg>
                ))}
              </div>
              <p className="text-slate-600 dark:text-slate-300 mb-4">{testimonial.content}</p>
              <div className="flex items-center gap-3">
                <div className={`w-10 h-10 ${getColorClass(testimonial.color)} rounded-full flex items-center justify-center text-white font-bold text-sm`}>
                  {testimonial.initials}
                </div>
                <div>
                  <div className="font-semibold text-slate-900 dark:text-white">{testimonial.name}</div>
                  <div className="text-sm text-slate-500">{testimonial.role}</div>
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
