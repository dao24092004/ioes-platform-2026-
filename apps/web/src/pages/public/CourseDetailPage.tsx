import React, { useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import Header from '../../components/public/Header';
import Footer from '../../components/public/Footer';

interface Review {
  id: string;
  name: string;
  avatarUrl?: string;
  initials?: string;
  date: string;
  rating: number;
  content: string;
  helpfulCount: number;
  instructorResponse?: { name: string; role: string; text: string };
}

interface CourseDetail {
  slug: string;
  title: string;
  description: string;
  tags: string[];
  students: number;
  rating: number;
  totalReviews: number;
  durationHours: number;
  totalLessons: number;
  originalPrice: number | null;
  currentPrice: number;
  isFree: boolean;
  iconKey: 'brain' | 'code' | 'rocket' | 'briefcase' | 'globe';
  instructor: { initials: string; name: string; role: string };
  features: { lifetime: boolean; certificate: boolean; aiMentor: boolean; practiceCount: number };
  ratingDistribution: { five: number; four: number; three: number; two: number; one: number };
  reviews: Review[];
  curriculum: { title: string; lessons: number; minutes: number }[];
  overview: string;
  requirements: string[];
  whatYouLearn: string[];
}

// Mock DB — sẽ fetch từ GET /api/courses/:slug sau
const MOCK_COURSES: CourseDetail[] = [
  {
    slug: 'machine-learning-fundamentals',
    title: 'Machine Learning Fundamentals - Từ Zero đến Hero',
    description:
      'Khóa học toàn diện về Machine Learning, từ các khái niệm cơ bản đến Deep Learning và Neural Networks. Được thiết kế bởi chuyên gia AI từ FPT AI Lab với hơn 10 năm kinh nghiệm.',
    tags: ['Machine Learning', 'Python', 'Deep Learning', 'AI', 'Data Science'],
    students: 2847,
    rating: 4.9,
    totalReviews: 847,
    durationHours: 42,
    totalLessons: 156,
    originalPrice: 1000000,
    currentPrice: 799000,
    isFree: false,
    iconKey: 'brain',
    instructor: { initials: 'NVA', name: 'TS. Nguyễn Văn A', role: 'AI Research Lead tại FPT AI Lab' },
    features: { lifetime: true, certificate: true, aiMentor: true, practiceCount: 42 },
    ratingDistribution: { five: 661, four: 127, three: 42, two: 13, one: 4 },
    reviews: [
      {
        id: 'r1',
        name: 'Nguyễn Hoàng Nam',
        avatarUrl: 'https://i.pravatar.cc/100?img=11',
        date: '3 ngày trước',
        rating: 5,
        content:
          'Khóa học tuyệt vời! Nội dung được trình bày rất logic và dễ hiểu. Đặc biệt phần Neural Networks và Backpropagation được giải thích rất chi tiết với các visualization sinh động. Instructor Nguyễn Văn A giảng rất hay, có nhiều ví dụ thực tế từ các dự án AI thực tế.',
        helpfulCount: 24,
        instructorResponse: {
          name: 'TS. Nguyễn Văn A',
          role: 'Giảng viên',
          text: 'Cảm ơn bạn Hoàng Nam! Rất vui khi khóa học giúp ích cho bạn. Phần Deep Learning sắp tới còn thú vị hơn nữa!',
        },
      },
      {
        id: 'r2',
        name: 'Lê Thị Hương',
        initials: 'LTH',
        date: '1 tuần trước',
        rating: 4,
        content:
          'Khóa học rất tốt cho người mới bắt đầu. Tuy nhiên, phần Math quá nhanh, em phải xem lại nhiều lần mới hiểu. Nên bổ sung thêm bài tập toán cơ bản ở phần prerequisites.',
        helpfulCount: 8,
      },
      {
        id: 'r3',
        name: 'Trần Minh Đức',
        avatarUrl: 'https://i.pravatar.cc/100?img=33',
        date: '2 tuần trước',
        rating: 5,
        content:
          "Best course I've taken! The hands-on projects are fantastic. I especially loved the final project where we built a complete ML pipeline from scratch. Highly recommend!",
        helpfulCount: 42,
      },
    ],
    curriculum: [
      { title: 'Giới thiệu & Cài đặt môi trường', lessons: 8, minutes: 65 },
      { title: 'Python cho Machine Learning', lessons: 12, minutes: 110 },
      { title: 'Supervised Learning', lessons: 24, minutes: 220 },
      { title: 'Unsupervised Learning', lessons: 18, minutes: 165 },
      { title: 'Deep Learning & Neural Networks', lessons: 32, minutes: 300 },
      { title: 'Dự án cuối khoá', lessons: 10, minutes: 95 },
    ],
    overview:
      'Khóa học này sẽ đưa bạn từ con số 0 đến thành thạo Machine Learning. Bạn sẽ học qua lý thuyết, thực hành và 5 dự án capstone thực tế.',
    requirements: ['Biết Python cơ bản', 'Toán THPT (đặc biệt là đạo hàm, xác suất)', 'Máy tính cấu hình trung bình'],
    whatYouLearn: [
      'Hiểu sâu các thuật toán ML cốt lõi',
      'Xây dựng và đánh giá mô hình hồi quy / phân loại',
      'Làm chủ Neural Networks và Deep Learning',
      'Triển khai pipeline ML hoàn chỉnh',
      'Áp dụng ML vào bài toán thực tế',
    ],
  },
  {
    slug: 'chatgpt-ai-tools-masterclass',
    title: 'ChatGPT & AI Tools Masterclass',
    description:
      'Tận dụng sức mạnh của AI để tăng năng suất làm việc 10x. Từ prompt engineering đến automation workflow.',
    tags: ['ChatGPT', 'Prompt Engineering', 'Automation', 'Productivity'],
    students: 12500,
    rating: 4.9,
    totalReviews: 2340,
    durationHours: 40,
    totalLessons: 120,
    originalPrice: 1299000,
    currentPrice: 1299000,
    isFree: false,
    iconKey: 'rocket',
    instructor: { initials: 'TTB', name: 'Trần Thị B', role: 'AI Product Manager tại VinAI' },
    features: { lifetime: true, certificate: true, aiMentor: true, practiceCount: 30 },
    ratingDistribution: { five: 1850, four: 380, three: 80, two: 20, one: 10 },
    reviews: [
      {
        id: 'r1',
        name: 'Phạm Văn Khoa',
        initials: 'PVK',
        date: '5 ngày trước',
        rating: 5,
        content: 'Prompt engineering được dạy rất bài bản, mình áp dụng vào công việc thực tế liền.',
        helpfulCount: 56,
      },
      {
        id: 'r2',
        name: 'Hoàng Thị Mai',
        avatarUrl: 'https://i.pravatar.cc/100?img=47',
        date: '2 tuần trước',
        rating: 5,
        content: 'Khóa học giúp mình tự động hoá 60% công việc hằng ngày.',
        helpfulCount: 31,
      },
    ],
    curriculum: [
      { title: 'Nền tảng ChatGPT', lessons: 10, minutes: 80 },
      { title: 'Prompt Engineering', lessons: 20, minutes: 180 },
      { title: 'Workflow tự động hoá', lessons: 25, minutes: 230 },
    ],
    overview: 'Khóa học giúp bạn làm chủ các công cụ AI hiện đại và tích hợp vào workflow.',
    requirements: ['Có tài khoản ChatGPT Plus (khuyến nghị)', 'Biết dùng máy tính cơ bản'],
    whatYouLearn: ['Prompt engineering nâng cao', 'Tự động hoá workflow', 'Xây dựng AI agent cơ bản'],
  },
  {
    slug: 'reactjs-complete-guide-2024',
    title: 'React.js Complete Guide 2024',
    description: 'Học React từ cơ bản đến nâng cao, xây dựng 10+ dự án thực tế.',
    tags: ['React', 'JavaScript', 'Frontend', 'Hooks'],
    students: 25300,
    rating: 4.8,
    totalReviews: 4560,
    durationHours: 60,
    totalLessons: 180,
    originalPrice: 0,
    currentPrice: 0,
    isFree: true,
    iconKey: 'code',
    instructor: { initials: 'LVC', name: 'Lê Văn C', role: 'Senior Frontend Engineer tại Tiki' },
    features: { lifetime: true, certificate: true, aiMentor: true, practiceCount: 50 },
    ratingDistribution: { five: 3500, four: 800, three: 200, two: 40, one: 20 },
    reviews: [
      {
        id: 'r1',
        name: 'Đặng Quốc Bảo',
        initials: 'DQB',
        date: '1 ngày trước',
        rating: 5,
        content: 'Khóa React miễn phí mà chất lượng như khoá trả phí, recommend!',
        helpfulCount: 89,
      },
    ],
    curriculum: [
      { title: 'React cơ bản', lessons: 30, minutes: 280 },
      { title: 'Hooks & State Management', lessons: 40, minutes: 360 },
      { title: 'React Router & Forms', lessons: 30, minutes: 270 },
    ],
    overview: 'Hành trình React từ zero đến hero với 10+ dự án thực tế.',
    requirements: ['HTML/CSS cơ bản', 'JavaScript ES6'],
    whatYouLearn: ['React fundamentals', 'Hooks', 'Context API', 'Redux Toolkit', 'Testing'],
  },
];

const ICON_PATHS: Record<CourseDetail['iconKey'], string> = {
  brain: 'M9.5 2A2.5 2.5 0 0112 4.5v15a2.5 2.5 0 01-4.96.44 2.5 2.5 0 01-2.96-3.08 3 3 0 01-.34-5.58 2.5 2.5 0 01.18-4.93A2.5 2.5 0 019.5 2z M14.5 2A2.5 2.5 0 0012 4.5v15a2.5 2.5 0 004.96.44 2.5 2.5 0 002.96-3.08 3 3 0 00.34-5.58 2.5 2.5 0 00-.18-4.93A2.5 2.5 0 0014.5 2z',
  code: 'M16 18l6-6-6-6 M8 6l-6 6 6 6',
  rocket: 'M5 13l4-4 4 4-4 4-4-4zM12.5 2.5a8.38 8.38 0 016.5 6.5l-2.5 2.5-6.5-6.5L12.5 2.5z',
  briefcase: 'M20 7H4a2 2 0 00-2 2v10a2 2 0 002 2h16a2 2 0 002-2V9a2 2 0 00-2-2zM16 21V5a2 2 0 00-2-2h-4a2 2 0 00-2 2v16',
  globe: 'M12 2a10 10 0 100 20 10 10 0 000-20zM2 12h20M12 2a15.3 15.3 0 010 20M12 2a15.3 15.3 0 000 20',
};

const formatVND = (n: number): string => n.toLocaleString('vi-VN') + 'đ';

const formatStars = (n: number) => Array.from({ length: 5 }, (_, i) => i < n);

const RatingStars: React.FC<{ rating: number; className?: string; size?: 'sm' | 'md' | 'lg' }> = ({ rating, className = '', size = 'md' }) => {
  const cls = size === 'lg' ? 'w-5 h-5' : size === 'sm' ? 'w-3.5 h-3.5' : 'w-4 h-4';
  return (
    <div className={`flex gap-0.5 ${className}`}>
      {formatStars(rating).map((on, i) => (
        <svg key={i} className={`${cls} ${on ? 'text-amber-400' : 'text-slate-200 dark:text-slate-700'}`} viewBox="0 0 24 24" fill="currentColor">
          <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
        </svg>
      ))}
    </div>
  );
};

const InteractiveStars: React.FC<{ value: number; onChange: (n: number) => void }> = ({ value, onChange }) => (
  <div className="flex gap-2 mb-4">
    {[1, 2, 3, 4, 5].map((n) => (
      <button key={n} type="button" onClick={() => onChange(n)} className="transition-transform hover:scale-110">
        <svg
          className={`w-7 h-7 ${n <= value ? 'text-amber-400' : 'text-slate-300 dark:text-slate-600'}`}
          viewBox="0 0 24 24"
          fill="currentColor"
        >
          <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
        </svg>
      </button>
    ))}
  </div>
);

const CourseDetailPage: React.FC = () => {
  const { t, i18n } = useTranslation();
  const { slug } = useParams<{ slug: string }>();
  const [activeTab, setActiveTab] = useState<'overview' | 'reviews' | 'curriculum' | 'instructor'>('reviews');
  const [reviewFilter, setReviewFilter] = useState<'newest' | 'highest' | 'lowest'>('newest');
  const [writeRating, setWriteRating] = useState(0);
  const [writeContent, setWriteContent] = useState('');
  const [helpfulClicks, setHelpfulClicks] = useState<Record<string, boolean>>({});

  const course = useMemo(() => MOCK_COURSES.find((c) => c.slug === slug), [slug]);

  if (!course) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-900">
        <Header />
        <div className="pt-32 pb-20 px-6">
          <div className="max-w-md mx-auto text-center">
            <div className="w-20 h-20 mx-auto mb-6 bg-slate-100 dark:bg-slate-800 rounded-full flex items-center justify-center">
              <svg className="w-10 h-10 text-slate-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="12" cy="12" r="10" />
                <line x1="12" y1="8" x2="12" y2="12" />
                <line x1="12" y1="16" x2="12.01" y2="16" />
              </svg>
            </div>
            <h1 className="text-2xl font-bold mb-2">{t('publicCourseDetail.notFound.title')}</h1>
            <p className="text-slate-500 dark:text-slate-400 mb-6">{t('publicCourseDetail.notFound.desc')}</p>
            <Link
              to="/courses"
              className="inline-flex items-center gap-2 px-5 py-3 bg-blue-600 text-white rounded-xl font-semibold hover:bg-blue-700"
            >
              <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M15 18l-6-6 6-6" />
              </svg>
              {t('publicCourseDetail.notFound.back')}
            </Link>
          </div>
        </div>
        <Footer />
      </div>
    );
  }

  const sortedReviews = [...course.reviews].sort((a, b) => {
    if (reviewFilter === 'highest') return b.rating - a.rating;
    if (reviewFilter === 'lowest') return a.rating - b.rating;
    return 0;
  });

  const dist = course.ratingDistribution;
  const totalDist = dist.five + dist.four + dist.three + dist.two + dist.one;

  const handleHelpful = (id: string) => {
    setHelpfulClicks((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const handleSubmitReview = (e: React.FormEvent) => {
    e.preventDefault();
    if (writeRating === 0 || !writeContent.trim()) return;
    // TODO: POST /api/courses/:slug/reviews
    alert(`Đã gửi đánh giá ${writeRating}★: ${writeContent}`);
    setWriteRating(0);
    setWriteContent('');
  };

  const locale = i18n.language?.startsWith('vi') ? 'vi' : 'en';

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900">
      <Header />

      {/* Hero — gradient header */}
      <header className="pt-20 pb-10 px-6 bg-gradient-to-br from-blue-600 via-blue-600 to-cyan-500 text-white">
        <div className="max-w-7xl mx-auto grid lg:grid-cols-[1fr_400px] gap-10">
          {/* Course Info */}
          <div>
            <Link to="/courses" className="inline-flex items-center gap-2 text-sm text-white/80 hover:text-white mb-4">
              <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M15 18l-6-6 6-6" />
              </svg>
              {t('publicCourseDetail.notFound.back')}
            </Link>

            <div className="flex flex-wrap items-center gap-x-5 gap-y-2 mb-4 text-sm opacity-90">
              <span className="flex items-center gap-1.5">
                <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2" />
                  <circle cx="9" cy="7" r="4" />
                </svg>
                {t('publicCourseDetail.studentsCount', { count: course.students })}
              </span>
              <span className="flex items-center gap-1.5">
                <svg className="w-4 h-4 text-amber-300" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
                </svg>
                {t('publicCourseDetail.ratingReviews', { rating: course.rating.toFixed(1), count: course.totalReviews })}
              </span>
              <span className="flex items-center gap-1.5">
                <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <circle cx="12" cy="12" r="10" />
                  <polyline points="12 6 12 12 16 14" />
                </svg>
                {t('publicCourseDetail.hoursCount', { count: course.durationHours })}
              </span>
              <span className="flex items-center gap-1.5">
                <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <polygon points="23 7 16 12 23 17 23 7" />
                  <rect x="1" y="5" width="15" height="14" rx="2" ry="2" />
                </svg>
                {t('publicCourseDetail.lessonsCount', { count: course.totalLessons })}
              </span>
            </div>

            <h1 className="text-3xl lg:text-4xl font-bold mb-4">{course.title}</h1>
            <p className="text-white/90 leading-relaxed mb-5 max-w-2xl">{course.description}</p>

            <div className="flex flex-wrap gap-2 mb-6">
              {course.tags.map((tag) => (
                <span key={tag} className="px-3 py-1 bg-white/20 backdrop-blur rounded-full text-xs font-medium">
                  {tag}
                </span>
              ))}
            </div>

            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-full bg-white text-blue-600 flex items-center justify-center font-bold text-sm">
                {course.instructor.initials}
              </div>
              <div>
                <div className="text-sm font-semibold">{course.instructor.name}</div>
                <div className="text-xs text-white/80">{course.instructor.role}</div>
              </div>
            </div>
          </div>

          {/* Enroll Card */}
          <aside className="bg-white dark:bg-slate-800 rounded-2xl p-6 text-slate-900 dark:text-white shadow-2xl self-start lg:sticky lg:top-24">
            <div className="h-44 rounded-xl bg-gradient-to-br from-blue-600 to-cyan-500 flex items-center justify-center mb-5">
              <svg className="w-16 h-16 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                <path d={ICON_PATHS[course.iconKey]} />
              </svg>
            </div>

            <div className="text-center mb-5">
              {course.originalPrice && course.originalPrice !== course.currentPrice ? (
                <>
                  <div className="text-sm text-slate-400 line-through">{formatVND(course.originalPrice)}</div>
                  <div className="text-4xl font-extrabold text-blue-600 dark:text-blue-400">{formatVND(course.currentPrice)}</div>
                </>
              ) : course.isFree ? (
                <div className="text-3xl font-extrabold text-emerald-600 dark:text-emerald-400">{t('courses.free')}</div>
              ) : (
                <div className="text-4xl font-extrabold text-blue-600 dark:text-blue-400">{formatVND(course.currentPrice)}</div>
              )}
            </div>

            <Link
              to={course.isFree ? '/register' : `/checkout/${course.slug}`}
              className="w-full block text-center py-3.5 bg-gradient-to-r from-blue-600 to-cyan-500 text-white rounded-xl font-semibold hover:shadow-lg hover:shadow-blue-500/30 hover:-translate-y-0.5 transition-all"
            >
              <span className="inline-flex items-center gap-2">
                <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <circle cx="9" cy="21" r="1" />
                  <circle cx="20" cy="21" r="1" />
                  <path d="M1 1h4l2.68 13.39a2 2 0 002 1.61h9.72a2 2 0 002-1.61L23 6H6" />
                </svg>
                {course.isFree ? t('publicCourseDetail.enrollFree') : t('publicCourseDetail.enrollNow')}
              </span>
            </Link>

            <ul className="mt-5 pt-5 border-t border-slate-100 dark:border-slate-700 space-y-2.5">
              {course.features.lifetime && (
                <li className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-300">
                  <svg className="w-4 h-4 text-emerald-500 flex-shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                  {t('publicCourseDetail.features.lifetime')}
                </li>
              )}
              {course.features.certificate && (
                <li className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-300">
                  <svg className="w-4 h-4 text-emerald-500 flex-shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                  {t('publicCourseDetail.features.certificate')}
                </li>
              )}
              {course.features.aiMentor && (
                <li className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-300">
                  <svg className="w-4 h-4 text-emerald-500 flex-shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                  {t('publicCourseDetail.features.aiMentor')}
                </li>
              )}
              <li className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-300">
                <svg className="w-4 h-4 text-emerald-500 flex-shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <polyline points="20 6 9 17 4 12" />
                </svg>
                {t('publicCourseDetail.features.videoLectures', { count: course.totalLessons })}
              </li>
              <li className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-300">
                <svg className="w-4 h-4 text-emerald-500 flex-shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <polyline points="20 6 9 17 4 12" />
                </svg>
                {t('publicCourseDetail.features.practice', { count: course.features.practiceCount })}
              </li>
            </ul>
          </aside>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-6 py-10 grid lg:grid-cols-[1fr_400px] gap-10">
        {/* Left column */}
        <div>
          {/* Tabs */}
          <div className="flex flex-wrap gap-2 mb-6 border-b border-slate-200 dark:border-slate-700 pb-4">
            {(['overview', 'reviews', 'curriculum', 'instructor'] as const).map((key) => (
              <button
                key={key}
                onClick={() => setActiveTab(key)}
                className={`px-5 py-2.5 text-sm font-medium rounded-xl transition-all ${
                  activeTab === key
                    ? 'bg-blue-600 text-white'
                    : 'text-slate-500 dark:text-slate-400 hover:text-blue-600 hover:bg-slate-100 dark:hover:bg-slate-800'
                }`}
              >
                {key === 'reviews'
                  ? t('publicCourseDetail.tabs.reviews') + ` (${course.totalReviews.toLocaleString(locale)})`
                  : t(`publicCourseDetail.tabs.${key}`)}
              </button>
            ))}
          </div>

          {/* Tab content */}
          {activeTab === 'overview' && (
            <div className="space-y-6">
              <section className="bg-white dark:bg-slate-800 rounded-2xl p-6 border border-slate-200 dark:border-slate-700">
                <h2 className="text-lg font-bold mb-3">Tổng quan</h2>
                <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed">{course.overview}</p>
              </section>
              <section className="bg-white dark:bg-slate-800 rounded-2xl p-6 border border-slate-200 dark:border-slate-700">
                <h2 className="text-lg font-bold mb-3">Bạn sẽ học được gì</h2>
                <ul className="space-y-2">
                  {course.whatYouLearn.map((item, i) => (
                    <li key={i} className="flex items-start gap-2 text-sm text-slate-600 dark:text-slate-300">
                      <svg className="w-5 h-5 text-emerald-500 flex-shrink-0 mt-0.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                        <polyline points="20 6 9 17 4 12" />
                      </svg>
                      {item}
                    </li>
                  ))}
                </ul>
              </section>
              <section className="bg-white dark:bg-slate-800 rounded-2xl p-6 border border-slate-200 dark:border-slate-700">
                <h2 className="text-lg font-bold mb-3">Yêu cầu</h2>
                <ul className="space-y-2">
                  {course.requirements.map((item, i) => (
                    <li key={i} className="flex items-start gap-2 text-sm text-slate-600 dark:text-slate-300">
                      <span className="text-blue-600">•</span>
                      {item}
                    </li>
                  ))}
                </ul>
              </section>
            </div>
          )}

          {activeTab === 'curriculum' && (
            <section className="bg-white dark:bg-slate-800 rounded-2xl p-6 border border-slate-200 dark:border-slate-700">
              <h2 className="text-lg font-bold mb-4">Nội dung khoá học</h2>
              <div className="space-y-2">
                {course.curriculum.map((sec, i) => (
                  <div
                    key={i}
                    className="flex items-center justify-between p-4 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 hover:border-blue-500 transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-lg bg-blue-100 dark:bg-blue-900/40 text-blue-600 dark:text-blue-400 flex items-center justify-center font-bold text-sm">
                        {i + 1}
                      </div>
                      <div>
                        <div className="text-sm font-semibold">{sec.title}</div>
                        <div className="text-xs text-slate-500 dark:text-slate-400">
                          {sec.lessons} bài • {sec.minutes} phút
                        </div>
                      </div>
                    </div>
                    <svg className="w-5 h-5 text-slate-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <polyline points="9 18 15 12 9 6" />
                    </svg>
                  </div>
                ))}
              </div>
            </section>
          )}

          {activeTab === 'instructor' && (
            <section className="bg-white dark:bg-slate-800 rounded-2xl p-6 border border-slate-200 dark:border-slate-700">
              <div className="flex items-start gap-4">
                <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-blue-600 to-cyan-500 text-white flex items-center justify-center font-bold text-2xl flex-shrink-0">
                  {course.instructor.initials}
                </div>
                <div>
                  <h2 className="text-xl font-bold">{course.instructor.name}</h2>
                  <p className="text-sm text-blue-600 dark:text-blue-400 mb-3">{course.instructor.role}</p>
                  <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
                    Giảng viên với hơn 10 năm kinh nghiệm trong lĩnh vực, đã đào tạo hàng nghìn học viên trên nền tảng IOES.
                  </p>
                </div>
              </div>
            </section>
          )}

          {activeTab === 'reviews' && (
            <section className="bg-white dark:bg-slate-800 rounded-2xl p-6 border border-slate-200 dark:border-slate-700">
              <h2 className="text-xl font-bold mb-5 flex items-center gap-2">
                <svg className="w-5 h-5 text-amber-400" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
                </svg>
                {t('publicCourseDetail.reviewsTitle')}
              </h2>

              {/* Rating overview */}
              <div className="grid sm:grid-cols-[180px_1fr] gap-6 p-5 bg-slate-50 dark:bg-slate-900 rounded-2xl mb-6">
                <div className="text-center">
                  <div className="text-5xl font-extrabold">{course.rating.toFixed(1)}</div>
                  <RatingStars rating={Math.round(course.rating)} size="md" className="justify-center my-2" />
                  <div className="text-xs text-slate-500 dark:text-slate-400">
                    {t('publicCourseDetail.reviewsCount', { count: course.totalReviews })}
                  </div>
                </div>
                <div className="space-y-1.5">
                  {([
                    { key: 'five', value: dist.five },
                    { key: 'four', value: dist.four },
                    { key: 'three', value: dist.three },
                    { key: 'two', value: dist.two },
                    { key: 'one', value: dist.one },
                  ] as const).map((row) => {
                    const pct = totalDist > 0 ? (row.value / totalDist) * 100 : 0;
                    return (
                      <div key={row.key} className="flex items-center gap-3">
                        <div className="flex items-center gap-1 w-12 text-xs text-slate-600 dark:text-slate-300">
                          <span className="font-semibold">{t(`publicCourseDetail.ratingBars.${row.key}`)}</span>
                          <svg className="w-3 h-3 text-amber-400" viewBox="0 0 24 24" fill="currentColor">
                            <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
                          </svg>
                        </div>
                        <div className="flex-1 h-2 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-gradient-to-r from-amber-300 to-amber-500 rounded-full"
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                        <div className="w-10 text-right text-xs text-slate-500 dark:text-slate-400">
                          {row.value.toLocaleString(locale)}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Filter */}
              <div className="flex justify-end mb-5">
                <select
                  value={reviewFilter}
                  onChange={(e) => setReviewFilter(e.target.value as typeof reviewFilter)}
                  className="px-4 py-2 text-sm border border-slate-200 dark:border-slate-700 rounded-xl bg-white dark:bg-slate-900 focus:outline-none focus:border-blue-500"
                >
                  <option value="newest">{t('publicCourseDetail.filter.newest')}</option>
                  <option value="highest">{t('publicCourseDetail.filter.highest')}</option>
                  <option value="lowest">{t('publicCourseDetail.filter.lowest')}</option>
                </select>
              </div>

              {/* Reviews list */}
              <div className="space-y-5">
                {sortedReviews.map((review) => {
                  const isHelpful = !!helpfulClicks[review.id];
                  return (
                    <div key={review.id} className="pb-5 border-b border-slate-100 dark:border-slate-700 last:border-0">
                      <div className="flex items-start justify-between gap-3 mb-3">
                        <div className="flex items-center gap-3">
                          {review.avatarUrl ? (
                            <img src={review.avatarUrl} alt={review.name} className="w-11 h-11 rounded-xl object-cover" />
                          ) : (
                            <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-500 text-white flex items-center justify-center font-semibold text-sm">
                              {review.initials || review.name.slice(0, 2).toUpperCase()}
                            </div>
                          )}
                          <div>
                            <div className="text-sm font-semibold">{review.name}</div>
                            <div className="text-xs text-slate-500 dark:text-slate-400">{review.date}</div>
                          </div>
                        </div>
                        <RatingStars rating={review.rating} size="sm" />
                      </div>

                      <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed mb-3">{review.content}</p>

                      <div className="flex items-center gap-4 text-xs text-slate-500 dark:text-slate-400">
                        <button
                          onClick={() => handleHelpful(review.id)}
                          className={`flex items-center gap-1.5 hover:text-blue-600 transition-colors ${
                            isHelpful ? 'text-blue-600 dark:text-blue-400 font-semibold' : ''
                          }`}
                        >
                          <svg
                            className="w-3.5 h-3.5"
                            viewBox="0 0 24 24"
                            fill={isHelpful ? 'currentColor' : 'none'}
                            stroke="currentColor"
                            strokeWidth="2"
                          >
                            <path d="M14 9V5a3 3 0 00-3-3l-4 9v11h11.28a2 2 0 002-1.7l1.38-9A2 2 0 0019.7 9H14zM7 22H4a2 2 0 01-2-2v-7a2 2 0 012-2h3" />
                          </svg>
                          {t('publicCourseDetail.actions.helpful', {
                            count: review.helpfulCount + (isHelpful ? 1 : 0),
                          })}
                        </button>
                        <button className="flex items-center gap-1.5 hover:text-blue-600 transition-colors">
                          <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z" />
                          </svg>
                          {t('publicCourseDetail.actions.reply')}
                        </button>
                      </div>

                      {review.instructorResponse && (
                        <div className="mt-4 ml-14 p-4 bg-slate-50 dark:bg-slate-900 rounded-xl">
                          <div className="flex items-center gap-2 mb-2">
                            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-600 to-cyan-500 text-white flex items-center justify-center text-xs font-semibold">
                              {review.instructorResponse.name.split(' ').pop()?.charAt(0)}
                            </div>
                            <span className="text-sm font-semibold">{review.instructorResponse.name}</span>
                            <span className="text-[11px] px-2 py-0.5 bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 rounded">
                              {review.instructorResponse.role}
                            </span>
                          </div>
                          <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed ml-10">
                            {review.instructorResponse.text}
                          </p>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>

              {/* Pagination */}
              <div className="flex justify-center items-center gap-2 mt-6">
                <button
                  title={t('publicCourseDetail.pagination.prev')}
                  className="w-9 h-9 rounded-lg border border-slate-200 dark:border-slate-700 flex items-center justify-center hover:border-blue-500 hover:text-blue-600 transition-colors text-slate-500"
                >
                  <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M15 18l-6-6 6-6" />
                  </svg>
                </button>
                {[1, 2, 3].map((n) => (
                  <button
                    key={n}
                    className={`w-9 h-9 rounded-lg text-sm font-medium ${
                      n === 1
                        ? 'bg-blue-600 text-white'
                        : 'border border-slate-200 dark:border-slate-700 hover:border-blue-500 hover:text-blue-600 text-slate-600 dark:text-slate-300'
                    }`}
                  >
                    {n}
                  </button>
                ))}
                <span className="px-1 text-slate-400">…</span>
                <button className="w-9 h-9 rounded-lg border border-slate-200 dark:border-slate-700 hover:border-blue-500 hover:text-blue-600 text-sm text-slate-600 dark:text-slate-300">
                  42
                </button>
                <button
                  title={t('publicCourseDetail.pagination.next')}
                  className="w-9 h-9 rounded-lg border border-slate-200 dark:border-slate-700 flex items-center justify-center hover:border-blue-500 hover:text-blue-600 transition-colors text-slate-500"
                >
                  <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M9 18l6-6-6-6" />
                  </svg>
                </button>
              </div>

              {/* Write review */}
              <form
                onSubmit={handleSubmitReview}
                className="mt-6 p-5 bg-slate-50 dark:bg-slate-900 rounded-2xl"
              >
                <h3 className="text-sm font-bold mb-3">{t('publicCourseDetail.writeReview.title')}</h3>
                <InteractiveStars value={writeRating} onChange={setWriteRating} />
                <textarea
                  value={writeContent}
                  onChange={(e) => setWriteContent(e.target.value)}
                  placeholder={t('publicCourseDetail.writeReview.placeholder')}
                  className="w-full p-3 text-sm border border-slate-200 dark:border-slate-700 rounded-xl bg-white dark:bg-slate-800 focus:outline-none focus:border-blue-500 min-h-[100px] resize-y mb-3"
                />
                <button
                  type="submit"
                  disabled={writeRating === 0 || !writeContent.trim()}
                  className="px-5 py-2.5 text-sm font-semibold bg-blue-600 hover:bg-blue-700 disabled:bg-slate-300 disabled:cursor-not-allowed text-white rounded-xl transition-colors"
                >
                  {t('publicCourseDetail.writeReview.submit')}
                </button>
              </form>
            </section>
          )}
        </div>

        {/* Right column — sticky aside chỉ hiển thị khi scroll trên mobile (desktop đã có enroll ở header) */}
        <aside className="hidden lg:block" aria-hidden />
      </main>

      <Footer />
    </div>
  );
};

export default CourseDetailPage;