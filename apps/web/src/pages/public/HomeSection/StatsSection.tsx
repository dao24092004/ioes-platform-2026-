import React, { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';

interface CountUpProps {
  end: number;
  duration?: number;
  suffix?: string;
}

export const CountUp: React.FC<CountUpProps> = ({ end, duration = 2000, suffix = '' }) => {
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
      setCount(Math.floor(easeOut * end));

      if (progress < 1) {
        requestAnimationFrame(animate);
      }
    };

    requestAnimationFrame(animate);
  }, [isVisible, end, duration]);

  return <div ref={ref}>{count.toLocaleString()}{suffix}</div>;
};

const StatsSection: React.FC = () => {
  const { t } = useTranslation();

  const stats = [
    {
      value: 10000,
      suffix: '+',
      label: t('stats.section.activeStudents'),
      icon: (
        <svg className="w-6 h-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2" />
          <circle cx="9" cy="7" r="4" />
          <path d="M23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75" />
        </svg>
      ),
      bgColor: 'bg-blue-100 dark:bg-blue-900/30',
      iconColor: 'text-blue-600 dark:text-blue-400',
      link: '/courses',
    },
    {
      value: 500,
      suffix: '+',
      label: t('stats.section.qualityCourses'),
      icon: (
        <svg className="w-6 h-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
        </svg>
      ),
      bgColor: 'bg-indigo-100 dark:bg-indigo-900/30',
      iconColor: 'text-indigo-600 dark:text-indigo-400',
      link: '/courses',
    },
    {
      value: 50000,
      suffix: '+',
      label: t('stats.section.examsCompleted'),
      icon: (
        <svg className="w-6 h-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      ),
      bgColor: 'bg-green-100 dark:bg-green-900/30',
      iconColor: 'text-green-600 dark:text-green-400',
      link: '/about',
    },
    {
      value: 4.9,
      suffix: '/5',
      label: t('stats.section.avgRating'),
      isDecimal: true,
      icon: (
        <svg className="w-6 h-6" viewBox="0 0 24 24" fill="currentColor">
          <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
        </svg>
      ),
      bgColor: 'bg-amber-100 dark:bg-amber-900/30',
      iconColor: 'text-amber-500',
      link: '/about',
    },
  ];

  return (
    <section className="py-20 bg-white dark:bg-slate-900 relative overflow-hidden">
      {/* Background decoration */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-0 left-1/4 w-96 h-96 bg-blue-50 dark:bg-blue-900/10 rounded-full blur-3xl" />
        <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-indigo-50 dark:bg-indigo-900/10 rounded-full blur-3xl" />
      </div>

      <div className="relative max-w-7xl mx-auto px-6">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-6 lg:gap-8">
          {stats.map((stat, index) => (
            <Link
              key={index}
              to={stat.link}
              className="group flex items-center gap-4 p-6 bg-slate-50 dark:bg-slate-800 rounded-2xl hover:bg-white dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:border-blue-200 dark:hover:border-blue-800 hover:shadow-lg transition-all duration-300"
            >
              <div className={`w-14 h-14 ${stat.bgColor} ${stat.iconColor} rounded-xl flex items-center justify-center flex-shrink-0 group-hover:scale-110 transition-transform`}>
                {stat.icon}
              </div>
              <div className="min-w-0">
                <div className="font-bold text-slate-900 dark:text-white text-xl md:text-2xl">
                  <CountUp 
                    end={stat.value} 
                    suffix={stat.suffix} 
                    duration={stat.isDecimal ? 1500 : 2000}
                  />
                </div>
                <div className="text-sm text-slate-500 dark:text-slate-400 truncate">{stat.label}</div>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
};

export default StatsSection;
