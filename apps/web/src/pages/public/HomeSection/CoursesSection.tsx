import React from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/common';

interface CourseMetadata {
  enrollments: number;
  completion_rate: number;
  avg_rating: number;
  total_reviews: number;
}

interface Course {
  id: string;
  instructor_id: string;
  category_id: string;
  category_name?: string;
  title: string;
  slug: string;
  short_description: string | null;
  description: string | null;
  thumbnail_url: string | null;
  preview_video_url: string | null;
  price: number;
  currency: string;
  duration_hours: number | null;
  difficulty_level: number | null;
  language: string;
  status: 'draft' | 'published' | 'archived';
  published_at: string | null;
  metadata: CourseMetadata;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
}

const CoursesSection: React.FC = () => {
  const { t } = useTranslation();

  const formatPrice = (price: number, currency: string): string => {
    if (price === 0) return t('courses.free');
    if (currency === 'VND') {
      if (price >= 1000) {
        return `${(price / 1000).toFixed(0)}K`;
      }
      return price.toLocaleString('vi-VN');
    }
    return `${price.toFixed(2)} ${currency}`;
  };

  const formatNumber = (num: number): string => {
    if (num >= 1000) {
      return `${(num / 1000).toFixed(1)}K`;
    }
    return num.toString();
  };

  const getBadge = (course: Course): { text: string; color: string } => {
    if (course.metadata.enrollments > 10000) return { text: 'Bestseller', color: 'bg-amber-500' };
    if (course.metadata.avg_rating >= 4.9) return { text: t('courses.badge.new'), color: 'bg-emerald-500' };
    const publishDate = course.published_at ? new Date(course.published_at) : null;
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    if (publishDate && publishDate > thirtyDaysAgo) return { text: t('courses.badge.popular'), color: 'bg-orange-500' };
    return { text: '', color: '' };
  };

  const courses: Course[] = [
    {
      id: '550e8400-e29b-41d4-a716-446655440001',
      instructor_id: 'inst-001',
      category_id: 'cat-programming',
      category_name: 'Lập trình',
      title: 'React.js Complete Guide 2024',
      slug: 'reactjs-complete-guide-2024',
      short_description: 'Học React từ cơ bản đến nâng cao, xây dựng 10+ dự án thực tế.',
      description: 'Khóa học React.js toàn diện từ cơ bản đến nâng cao...',
      thumbnail_url: 'https://images.unsplash.com/photo-1633356122544-f134324a6cee?w=600&h=400&fit=crop',
      preview_video_url: null,
      price: 0,
      currency: 'VND',
      duration_hours: 60,
      difficulty_level: 3,
      language: 'vi',
      status: 'published',
      published_at: '2024-02-01T00:00:00Z',
      metadata: {
        enrollments: 25300,
        completion_rate: 65,
        avg_rating: 4.8,
        total_reviews: 4560,
      },
      created_at: '2024-01-25T00:00:00Z',
      updated_at: '2024-06-18T00:00:00Z',
      deleted_at: null,
    },
    {
      id: '550e8400-e29b-41d4-a716-446655440002',
      instructor_id: 'inst-002',
      category_id: 'cat-ai',
      category_name: 'AI & ML',
      title: 'ChatGPT & AI Tools Masterclass',
      slug: 'chatgpt-ai-tools-masterclass',
      short_description: 'Tận dụng sức mạnh của AI để tăng năng suất làm việc 10x.',
      description: 'Khóa học toàn diện về ChatGPT và các công cụ AI hiện đại...',
      thumbnail_url: 'https://images.unsplash.com/photo-1677442136019-21780ecad995?w=600&h=400&fit=crop',
      preview_video_url: null,
      price: 1299000,
      currency: 'VND',
      duration_hours: 40,
      difficulty_level: 2,
      language: 'vi',
      status: 'published',
      published_at: '2024-01-15T00:00:00Z',
      metadata: {
        enrollments: 12500,
        completion_rate: 78,
        avg_rating: 4.9,
        total_reviews: 2340,
      },
      created_at: '2024-01-10T00:00:00Z',
      updated_at: '2024-06-20T00:00:00Z',
      deleted_at: null,
    },
    {
      id: '550e8400-e29b-41d4-a716-446655440003',
      instructor_id: 'inst-003',
      category_id: 'cat-marketing',
      category_name: 'Marketing',
      title: 'Digital Marketing toàn diện',
      slug: 'digital-marketing-toan-dien',
      short_description: 'SEO, Google Ads, Facebook Ads, Content Marketing từ A đến Z.',
      description: 'Khóa học Digital Marketing toàn diện bao gồm SEO, quảng cáo...',
      thumbnail_url: 'https://images.unsplash.com/photo-1460925895917-afdab827c52f?w=600&h=400&fit=crop',
      preview_video_url: null,
      price: 899000,
      currency: 'VND',
      duration_hours: 35,
      difficulty_level: 2,
      language: 'vi',
      status: 'published',
      published_at: '2024-03-01T00:00:00Z',
      metadata: {
        enrollments: 8700,
        completion_rate: 72,
        avg_rating: 4.7,
        total_reviews: 1230,
      },
      created_at: '2024-02-20T00:00:00Z',
      updated_at: '2024-06-15T00:00:00Z',
      deleted_at: null,
    },
  ];

  return (
    <section id="courses" className="py-24 bg-white dark:bg-slate-900">
      <div className="max-w-7xl mx-auto px-6">
        <div className="text-center mb-16">
          <span className="inline-flex items-center gap-2 px-4 py-2 bg-blue-100 dark:bg-blue-900/50 text-blue-700 dark:text-blue-300 rounded-full text-sm font-medium mb-4">
            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
            </svg>
            {t('courses.section.featured')}
          </span>
          <h2 className="text-3xl md:text-4xl font-bold text-slate-900 dark:text-white mb-4">
            {t('courses.section.explore')}
          </h2>
          <p className="text-lg text-slate-600 dark:text-slate-300">
            {t('courses.section.qualityCourses')}
          </p>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {courses.map((course) => {
            const badge = getBadge(course);
            return (
              <div key={course.id} className="bg-white dark:bg-slate-800 rounded-2xl overflow-hidden border border-slate-200 dark:border-slate-700 hover:shadow-xl hover:-translate-y-1 transition-all duration-300">
                <div className="h-44 relative overflow-hidden">
                  <img 
                    src={course.thumbnail_url || 'https://via.placeholder.com/600x400'}
                    alt={course.title}
                    className="w-full h-full object-cover"
                  />
                  {badge.text && (
                    <span className={`absolute top-3 left-3 px-3 py-1 text-xs font-bold rounded-md ${badge.color} text-white`}>
                      {badge.text}
                    </span>
                  )}
                  {course.difficulty_level && (
                    <span className="absolute top-3 right-3 px-2 py-1 text-xs font-medium bg-slate-900/80 text-white rounded-md">
                      {['Người mới', 'Cơ bản', 'Trung bình', 'Nâng cao', 'Chuyên gia'][course.difficulty_level - 1]}
                    </span>
                  )}
                </div>
                <div className="p-5">
                  <span className="text-xs font-semibold text-blue-600 dark:text-blue-400 mb-2 block">
                    {course.category_name}
                    {course.language === 'en' && (
                      <span className="ml-2 px-1.5 py-0.5 bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 rounded text-[10px]">EN</span>
                    )}
                  </span>
                  <h3 className="text-base font-semibold text-slate-900 dark:text-white mb-2 line-clamp-2">
                    {course.title}
                  </h3>
                  <p className="text-sm text-slate-500 dark:text-slate-400 mb-3 line-clamp-2">
                    {course.short_description}
                  </p>
                  <div className="flex items-center gap-4 text-sm text-slate-500 dark:text-slate-400 mb-4">
                    <span className="flex items-center gap-1">
                      <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2" />
                        <circle cx="9" cy="7" r="4" />
                      </svg>
                      {formatNumber(course.metadata.enrollments)}
                    </span>
                    <span className="flex items-center gap-1">
                      <svg className="w-4 h-4 text-amber-500" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
                      </svg>
                      {course.metadata.avg_rating.toFixed(1)}
                    </span>
                    {course.duration_hours && (
                      <span className="flex items-center gap-1">
                        <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <circle cx="12" cy="12" r="10"/>
                          <polyline points="12 6 12 12 16 14"/>
                        </svg>
                        {course.duration_hours}h
                      </span>
                    )}
                  </div>
                  <div className="flex items-center justify-between pt-4 border-t border-slate-100 dark:border-slate-700">
                    <div>
                      <span className="text-lg font-bold text-slate-900 dark:text-white">
                        {formatPrice(course.price, course.currency)}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button as={Link} to={`/courses/${course.slug}`} variant="secondary" size="sm">
                        {t('courses.viewDetail')}
                      </Button>
                      <Button as={Link} to="/auth/register" size="sm">
                        {t('courses.register')}
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        <div className="text-center mt-12">
          <Button as={Link} to="/courses" size="lg">
            {t('courses.section.viewAll')}
            <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M5 12h14M12 5l7 7-7 7" />
            </svg>
          </Button>
        </div>
      </div>
    </section>
  );
};

export default CoursesSection;
