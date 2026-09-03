import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import Header from '../../components/public/Header';
import Footer from '../../components/public/Footer';

// Type matching Database Schema (content-service V1__init_schema.sql)
interface CourseMetadata {
  enrollments: number;
  completion_rate: number;
  avg_rating: number;
  total_reviews: number;
}

interface Course {
  id: string; // UUID from DB
  instructor_id: string;
  category_id: string;
  category_name?: string; // Populated from categories table
  title: string;
  slug: string;
  short_description: string | null;
  description: string | null;
  thumbnail_url: string | null;
  preview_video_url: string | null;
  price: number; // DECIMAL(12, 2)
  currency: string;
  duration_hours: number | null;
  difficulty_level: number | null; // 1-5
  language: string;
  status: 'draft' | 'published' | 'archived';
  published_at: string | null;
  metadata: CourseMetadata;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
}

interface Category {
  id: string; // UUID
  name: string;
  slug: string;
  description: string | null;
  parent_id: string | null;
  icon: string | null;
  sort_order: number;
  is_active: boolean;
  metadata: Record<string, unknown>;
}

const Courses: React.FC = () => {
  const { t } = useTranslation();
  const [activeCategory, setActiveCategory] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');

  // Categories - should be fetched from API: GET /api/categories
  const categories: Category[] = [
    { id: 'all', name: t('courses.all'), slug: 'all', description: null, parent_id: null, icon: 'M12 14l9-5-9-5-9 5 9 5z', sort_order: 0, is_active: true, metadata: {} },
    { id: 'cat-ai', name: 'AI & ML', slug: 'ai-ml', description: null, parent_id: null, icon: 'M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z', sort_order: 1, is_active: true, metadata: {} },
    { id: 'cat-programming', name: 'Lập trình', slug: 'programming', description: null, parent_id: null, icon: 'M16 18 22 12 16 6 M8 6 2 12 8 18', sort_order: 2, is_active: true, metadata: {} },
    { id: 'cat-marketing', name: 'Marketing', slug: 'marketing', description: null, parent_id: null, icon: 'M3 3h18v18H3z M3 9h18 M9 21V9', sort_order: 3, is_active: true, metadata: {} },
    { id: 'cat-business', name: 'Kinh doanh', slug: 'business', description: null, parent_id: null, icon: 'M12 2L2 7l10 5 10-5-10-5z M2 17l10 5 10-5 M2 12l10 5 10-5', sort_order: 4, is_active: true, metadata: {} },
    { id: 'cat-language', name: 'Ngoại ngữ', slug: 'language', description: null, parent_id: null, icon: 'M12 2a10 10 0 100 20 10 10 0 000-20z M2 12h20', sort_order: 5, is_active: true, metadata: {} },
  ];

  // Stats - should be computed from API or hardcoded for display
  const stats = [
    { value: '2,047', label: t('stats.courses') },
    { value: '500K+', label: t('stats.students') },
    { value: '1,200+', label: 'Giảng viên' },
    { value: '4.9/5', label: t('stats.rating') },
  ];

  // Courses - should be fetched from API: GET /api/courses?status=published&category_id=xxx
  // This matches the DB courses table structure
  const courses: Course[] = [
    {
      id: '550e8400-e29b-41d4-a716-446655440001',
      instructor_id: 'inst-001',
      category_id: 'cat-ai',
      category_name: 'AI & ML',
      title: 'ChatGPT & AI Tools Masterclass',
      slug: 'chatgpt-ai-tools-masterclass',
      short_description: 'Tận dụng sức mạnh của AI để tăng năng suất làm việc 10x.',
      description: 'Khóa học toàn diện về ChatGPT và các công cụ AI hiện đại...',
      thumbnail_url: 'https://images.unsplash.com/photo-1677442136019-21780ecad995?w=600&h=400&fit=crop',
      preview_video_url: null,
      price: 1299000, // VND (1.299K displayed)
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
      id: '550e8400-e29b-41d4-a716-446655440002',
      instructor_id: 'inst-002',
      category_id: 'cat-programming',
      category_name: 'Lập trình',
      title: 'React.js Complete Guide 2024',
      slug: 'reactjs-complete-guide-2024',
      short_description: 'Học React từ cơ bản đến nâng cao, xây dựng 10+ dự án thực tế.',
      description: 'Khóa học React.js toàn diện từ cơ bản đến nâng cao...',
      thumbnail_url: 'https://images.unsplash.com/photo-1633356122544-f134324a6cee?w=600&h=400&fit=crop',
      preview_video_url: null,
      price: 0, // FREE
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
      price: 899000, // 899K
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
    {
      id: '550e8400-e29b-41d4-a716-446655440004',
      instructor_id: 'inst-004',
      category_id: 'cat-business',
      category_name: 'Kinh doanh',
      title: 'MBA Essentials - Quản trị kinh doanh hiện đại',
      slug: 'mba-essentials-quan-tri-kinh-doanh',
      short_description: 'Chương trình MBA online với chi phí chỉ bằng 1/10.',
      description: 'Chương trình MBA online toàn diện...',
      thumbnail_url: 'https://images.unsplash.com/photo-1454165804606-c3d57bc86b40?w=600&h=400&fit=crop',
      preview_video_url: null,
      price: 2499000, // 2.499K
      currency: 'VND',
      duration_hours: 120,
      difficulty_level: 4,
      language: 'vi',
      status: 'published',
      published_at: '2024-01-20T00:00:00Z',
      metadata: {
        enrollments: 5200,
        completion_rate: 58,
        avg_rating: 4.9,
        total_reviews: 890,
      },
      created_at: '2024-01-15T00:00:00Z',
      updated_at: '2024-06-10T00:00:00Z',
      deleted_at: null,
    },
    {
      id: '550e8400-e29b-41d4-a716-446655440005',
      instructor_id: 'inst-005',
      category_id: 'cat-language',
      category_name: 'Ngoại ngữ',
      title: 'IELTS 8.0 trong 3 tháng',
      slug: 'ielts-80-trong-3-thang',
      short_description: 'Phương pháp học IELTS hiệu quả, cam kết đầu ra.',
      description: 'Khóa học IELTS 8.0 với phương pháp học hiệu quả...',
      thumbnail_url: 'https://images.unsplash.com/photo-1546410531-bb4caa6b424d?w=600&h=400&fit=crop',
      preview_video_url: null,
      price: 1799000, // 1.799K
      currency: 'VND',
      duration_hours: 80,
      difficulty_level: 3,
      language: 'vi',
      status: 'published',
      published_at: '2024-02-15T00:00:00Z',
      metadata: {
        enrollments: 18900,
        completion_rate: 82,
        avg_rating: 4.8,
        total_reviews: 3210,
      },
      created_at: '2024-02-01T00:00:00Z',
      updated_at: '2024-06-12T00:00:00Z',
      deleted_at: null,
    },
    {
      id: '550e8400-e29b-41d4-a716-446655440006',
      instructor_id: 'inst-006',
      category_id: 'cat-programming',
      category_name: 'Lập trình',
      title: 'Solidity & Smart Contract Development',
      slug: 'solidity-smart-contract-development',
      short_description: 'Học lập trình smart contract, xây dựng DApps trên Ethereum.',
      description: 'Khóa học Solidity và Smart Contract từ cơ bản đến nâng cao...',
      thumbnail_url: 'https://images.unsplash.com/photo-1639762681485-074b7f938ba0?w=600&h=400&fit=crop',
      preview_video_url: null,
      price: 0, // FREE
      currency: 'VND',
      duration_hours: 45,
      difficulty_level: 4,
      language: 'en',
      status: 'published',
      published_at: '2024-04-01T00:00:00Z',
      metadata: {
        enrollments: 3400,
        completion_rate: 55,
        avg_rating: 4.6,
        total_reviews: 420,
      },
      created_at: '2024-03-20T00:00:00Z',
      updated_at: '2024-06-08T00:00:00Z',
      deleted_at: null,
    },
  ];

  // Format price for display
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

  // Format number for display (e.g., 12500 -> 12.5K)
  const formatNumber = (num: number): string => {
    if (num >= 1000000) {
      return `${(num / 1000000).toFixed(1)}M`;
    }
    if (num >= 1000) {
      return `${(num / 1000).toFixed(1)}K`;
    }
    return num.toString();
  };

  // Get difficulty label
  const getDifficultyLabel = (level: number | null): string => {
    if (!level) return '';
    const labels = ['', 'Người mới', 'Cơ bản', 'Trung bình', 'Nâng cao', 'Chuyên gia'];
    return labels[level] || '';
  };

  // Get badge based on course metadata
  const getBadge = (course: Course): string => {
    if (course.metadata.enrollments > 10000) return 'PRO';
    if (course.metadata.avg_rating >= 4.9) return 'HOT';
    const publishDate = course.published_at ? new Date(course.published_at) : null;
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    if (publishDate && publishDate > thirtyDaysAgo) return 'NEW';
    return '';
  };

  // Filter courses
  const filteredCourses = courses.filter(course => {
    // Only show published courses
    if (course.status !== 'published') return false;
    
    // Filter by category
    if (activeCategory !== 'all' && course.category_id !== activeCategory) return false;
    
    // Filter by search
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      return (
        course.title.toLowerCase().includes(query) ||
        course.short_description?.toLowerCase().includes(query) ||
        course.category_name?.toLowerCase().includes(query)
      );
    }
    
    return true;
  });

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900">
      <Header />

      {/* Hero */}
      <section className="pt-32 pb-16 px-6 bg-gradient-to-b from-white to-blue-50 dark:from-slate-900 dark:to-blue-900/20 text-center">
        <div className="max-w-4xl mx-auto">
          <div className="inline-flex items-center gap-2 px-4 py-2 bg-blue-100 dark:bg-blue-900/50 text-blue-700 dark:text-blue-300 rounded-full text-sm font-semibold mb-6">
            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M4 19.5A2.5 2.5 0 016.5 17H20" />
              <path d="M6.5 2H20v20H6.5A2.5 2.5 0 014 19.5v-15A2.5 2.5 0 016.5 2z" />
            </svg>
            {t('courses.explore')}
          </div>
          <h1 className="text-3xl md:text-4xl lg:text-5xl font-extrabold text-slate-900 dark:text-white mb-6 whitespace-nowrap">
            {t('courses.title')} <span className="bg-gradient-to-r from-blue-600 to-cyan-500 bg-clip-text text-transparent">{t('courses.titleHighlight')}</span>
          </h1>
          <p className="text-lg text-slate-600 dark:text-slate-300 mb-8 max-w-2xl mx-auto">
            {t('courses.subtitle')}
          </p>
        </div>
      </section>

      {/* Filters */}
      <div className="px-6 py-6 bg-white dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700">
        <div className="max-w-7xl mx-auto flex flex-wrap gap-4 items-center">
          {/* Search */}
          <div className="flex-1 min-w-[250px] max-w-md">
            <div className="relative">
              <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="11" cy="11" r="8" />
                <path d="M21 21l-4.35-4.35" />
              </svg>
              <input
                type="text"
                placeholder={t('common.search') + '...'}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 text-sm border-2 border-slate-200 dark:border-slate-700 rounded-xl bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-white focus:outline-none focus:border-blue-500"
              />
            </div>
          </div>
          
          <div className="flex gap-2">
            <button
              onClick={() => {}}
              className="px-4 py-2 text-sm font-medium rounded-lg transition-colors bg-blue-600 text-white"
            >
              {t('courses.all')}
            </button>
            <button
              onClick={() => {}}
              className="px-4 py-2 text-sm font-medium rounded-lg transition-colors bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-600"
            >
              {t('courses.free')}
            </button>
            <button
              onClick={() => {}}
              className="px-4 py-2 text-sm font-medium rounded-lg transition-colors bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-600"
            >
              {t('courses.premium')}
            </button>
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => {}}
              className="px-4 py-2 text-sm font-medium rounded-lg transition-colors bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-600"
            >
              {t('courses.popular')}
            </button>
            <button
              onClick={() => {}}
              className="px-4 py-2 text-sm font-medium rounded-lg transition-colors bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-600"
            >
              {t('courses.newest')}
            </button>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <section className="py-16 px-6">
        <div className="max-w-7xl mx-auto">
          {/* Stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6 mb-12">
            {stats.map((stat, index) => (
              <div key={index} className="bg-white dark:bg-slate-800 rounded-xl p-6 text-center border border-slate-200 dark:border-slate-700">
                <div className="text-3xl font-bold text-blue-600 dark:text-blue-400 mb-1">{stat.value}</div>
                <div className="text-sm text-slate-500 dark:text-slate-400">{stat.label}</div>
              </div>
            ))}
          </div>

          {/* Categories - using data from DB categories table */}
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-12">
            {categories.filter(cat => cat.is_active).map((cat) => (
              <button
                key={cat.id}
                onClick={() => setActiveCategory(cat.id)}
                className={`p-5 rounded-xl text-center transition-all border ${
                  activeCategory === cat.id
                    ? 'bg-blue-50 dark:bg-blue-900/30 border-blue-500'
                    : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 hover:border-blue-300 dark:hover:border-blue-600'
                }`}
              >
                <div className={`w-12 h-12 mx-auto mb-3 rounded-xl flex items-center justify-center transition-colors ${
                  activeCategory === cat.id
                    ? 'bg-blue-600'
                    : 'bg-blue-50 dark:bg-slate-700'
                }`}>
                  <svg
                    className={`w-6 h-6 ${activeCategory === cat.id ? 'text-white' : 'text-blue-600 dark:text-blue-400'}`}
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                  >
                    <path d={cat.icon || ''} />
                  </svg>
                </div>
                <div className="text-sm font-medium text-slate-700 dark:text-slate-200">{cat.name}</div>
              </button>
            ))}
          </div>

          {/* Featured Cards */}
          <div className="grid md:grid-cols-2 gap-6 mb-12">
            <div className="bg-gradient-to-br from-blue-600 to-cyan-500 rounded-2xl p-8 text-white">
              <h3 className="text-2xl font-bold mb-3">Khóa học AI Pro</h3>
              <p className="text-white/90 mb-5">Trở thành chuyên gia AI với chương trình đào tạo toàn diện từ cơ bản đến nâng cao.</p>
              <Link to="/register" className="inline-flex items-center gap-2 bg-white text-blue-600 px-5 py-2.5 rounded-lg font-semibold hover:bg-blue-50 transition-colors">
                {t('common.viewAll')}
                <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M5 12h14M12 5l7 7-7 7" />
                </svg>
              </Link>
            </div>
            <div className="bg-gradient-to-br from-blue-600 to-cyan-500 rounded-2xl p-8 text-white">
              <h3 className="text-2xl font-bold mb-3">Lộ trình Backend Developer</h3>
              <p className="text-white/90 mb-5">Học Node.js, Python, Go từ con số 0 đến chuyên gia với lộ trình bài bản.</p>
              <Link to="/register" className="inline-flex items-center gap-2 bg-white text-blue-600 px-5 py-2.5 rounded-lg font-semibold hover:bg-blue-50 transition-colors">
                {t('skillTree.startPath')}
                <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M5 12h14M12 5l7 7-7 7" />
                </svg>
              </Link>
            </div>
          </div>

          {/* Course Grid */}
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredCourses.map((course) => (
              <div
                key={course.id}
                className="bg-white dark:bg-slate-800 rounded-2xl overflow-hidden border border-slate-200 dark:border-slate-700 hover:shadow-xl hover:-translate-y-1 transition-all duration-300"
              >
                <div className="h-44 relative overflow-hidden">
                  <img
                    src={course.thumbnail_url || 'https://via.placeholder.com/600x400'}
                    alt={course.title}
                    className="w-full h-full object-cover"
                  />
                  {getBadge(course) && (
                    <span className={`absolute top-3 left-3 px-3 py-1 text-xs font-bold rounded-md ${
                      getBadge(course) === 'PRO' ? 'bg-amber-500 text-white' :
                      getBadge(course) === 'HOT' ? 'bg-emerald-500 text-white' : 'bg-orange-500 text-white'
                    }`}>
                      {getBadge(course) === 'PRO' ? 'Bestseller' : getBadge(course) === 'HOT' ? 'HOT' : 'NEW'}
                    </span>
                  )}
                  {course.difficulty_level && (
                    <span className="absolute top-3 right-3 px-2 py-1 text-xs font-medium bg-slate-900/80 text-white rounded-md">
                      {getDifficultyLabel(course.difficulty_level)}
                    </span>
                  )}
                </div>
                <div className="p-5">
                  <div className="text-xs font-semibold text-blue-600 dark:text-blue-400 mb-2">
                    {course.category_name}
                    {course.language === 'en' && (
                      <span className="ml-2 px-1.5 py-0.5 bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 rounded text-[10px]">EN</span>
                    )}
                  </div>
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
                      <Link
                        to={`/courses/${course.slug}`}
                        className="px-3 py-2 border border-blue-600 text-blue-600 dark:text-blue-400 text-sm font-semibold rounded-lg hover:bg-blue-50 dark:hover:bg-blue-900/30 transition-colors"
                      >
                        {t('courses.viewDetail')}
                      </Link>
                      <Link
                        to="/register"
                        className="px-4 py-2 bg-blue-600 text-white text-sm font-semibold rounded-lg hover:bg-blue-700 transition-colors"
                      >
                        {t('courses.register')}
                      </Link>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Empty State */}
          {filteredCourses.length === 0 && (
            <div className="text-center py-12">
              <svg className="w-16 h-16 mx-auto text-slate-300 dark:text-slate-600 mb-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                <path d="M4 19.5A2.5 2.5 0 016.5 17H20"/>
                <path d="M6.5 2H20v20H6.5A2.5 2.5 0 014 19.5v-15A2.5 2.5 0 016.5 2z"/>
              </svg>
              <h3 className="text-lg font-medium text-slate-600 dark:text-slate-400">Không tìm thấy khóa học nào</h3>
              <p className="text-sm text-slate-400 dark:text-slate-500 mt-1">Thử thay đổi bộ lọc hoặc từ khóa tìm kiếm</p>
            </div>
          )}
        </div>
      </section>

      {/* Pagination */}
      <div className="py-8 px-6 bg-slate-50 dark:bg-slate-900">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <span className="text-sm text-slate-500 dark:text-slate-400">
            {t('common.showing')} {filteredCourses.length}/{courses.length} {t('courses.coursesOf')}
          </span>
          <div className="flex items-center gap-2">
            <button className="p-2 rounded-lg border border-slate-300 dark:border-slate-600 text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-50" disabled>
              <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M15 18l-6-6 6-6" />
              </svg>
            </button>
            <button className="w-10 h-10 rounded-lg bg-blue-600 text-white font-medium">1</button>
            <button className="w-10 h-10 rounded-lg border border-slate-300 dark:border-slate-600 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800">2</button>
            <button className="w-10 h-10 rounded-lg border border-slate-300 dark:border-slate-600 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800">3</button>
            <span className="px-2 text-slate-400">...</span>
            <button className="w-10 h-10 rounded-lg border border-slate-300 dark:border-slate-600 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800">342</button>
            <button className="p-2 rounded-lg border border-slate-300 dark:border-slate-600 text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800">
              <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M9 18l6-6-6-6" />
              </svg>
            </button>
          </div>
        </div>
      </div>

      {/* CTA */}
      <section className="bg-gradient-to-r from-blue-600 to-cyan-500 py-20 px-6 text-center">
        <div className="max-w-2xl mx-auto">
          <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">
            {t('cta.courses.title')}
          </h2>
          <p className="text-lg text-white/90 mb-8">
            {t('cta.courses.subtitle')}
          </p>
          <Link
            to="/register"
            className="inline-flex items-center gap-2 bg-white text-blue-600 px-8 py-4 rounded-xl font-bold text-lg hover:bg-blue-50 transition-colors"
          >
            {t('cta.courses.button')}
            <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M5 12h14M12 5l7 7-7 7" />
            </svg>
          </Link>
        </div>
      </section>

      <Footer />
    </div>
  );
};

export default Courses;
