import React, { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Link, useParams } from 'react-router-dom';
import Header from '@/components/public/Header';
import Footer from '@/components/public/Footer';

type UserRole = 'student' | 'instructor';

interface UserProfile {
  id: string;
  role: UserRole;
  name: string;
  title: string;
  bio: string;
  initials: string;
  gradient: string;
  verified: boolean;
  followers: number;
  following: number;
  courseCount: number;
  certificates: number;
  rating: number;
  joined: string;
  skills: string[];
  goals: string[];
  social: { label: string; handle: string }[];
}

interface CourseCard {
  id: string;
  title: string;
  category: string;
  students: number;
  rating: number;
  level: 'beginner' | 'intermediate' | 'advanced';
}

interface ReviewItem {
  id: string;
  course: string;
  rating: number;
  title: string;
  body: string;
  date: string;
}

interface BadgeItem {
  id: string;
  name: string;
  desc: string;
  unlocked: boolean;
  icon: React.ReactNode;
}

const MOCK_USERS: Record<string, UserProfile> = {
  'student-1': {
    id: 'student-1',
    role: 'student',
    name: 'Nguyen Minh Anh',
    title: 'Frontend Developer at VNG',
    bio: 'Frontend developer passionate about React, design systems, and accessible UI. Currently learning system design and exploring the Rust ecosystem.',
    initials: 'MA',
    gradient: 'from-blue-500 via-indigo-500 to-purple-600',
    verified: false,
    followers: 248,
    following: 132,
    courseCount: 6,
    certificates: 4,
    rating: 4.7,
    joined: '2024-03-15',
    skills: ['React', 'TypeScript', 'Tailwind', 'Next.js', 'Figma'],
    goals: ['Master system design', 'Crack FAANG interviews', 'Contribute to open source'],
    social: [
      { label: 'GitHub', handle: '@minhanh-dev' },
      { label: 'LinkedIn', handle: 'in/minhanh' },
      { label: 'Twitter', handle: '@minhanh_codes' },
    ],
  },
  'instructor-1': {
    id: 'instructor-1',
    role: 'instructor',
    name: 'Tran Quoc Bao',
    title: 'Senior Software Engineer & Instructor',
    bio: '10+ years building scalable web platforms. Author of the IOES React curriculum. Loves teaching through real-world projects and code reviews.',
    initials: 'QB',
    gradient: 'from-emerald-500 via-teal-500 to-cyan-600',
    verified: true,
    followers: 5420,
    following: 184,
    courseCount: 12,
    certificates: 0,
    rating: 4.9,
    joined: '2022-01-10',
    skills: ['React', 'Node.js', 'System Design', 'PostgreSQL', 'Docker', 'AWS'],
    goals: ['Launch advanced system design course', 'Mentor 1000 engineers'],
    social: [
      { label: 'GitHub', handle: '@quocbao' },
      { label: 'LinkedIn', handle: 'in/quocbao' },
      { label: 'YouTube', handle: '@quocbao-teaches' },
    ],
  },
  'student-2': {
    id: 'student-2',
    role: 'student',
    name: 'Le Phuong Thao',
    title: 'CS Student at HUST',
    bio: 'Final year computer science student. Curious about AI, competitive programming, and teaching others what I learn along the way.',
    initials: 'PT',
    gradient: 'from-amber-500 via-orange-500 to-rose-500',
    verified: false,
    followers: 92,
    following: 215,
    courseCount: 3,
    certificates: 2,
    rating: 4.5,
    joined: '2025-08-02',
    skills: ['Python', 'C++', 'Algorithms', 'PyTorch'],
    goals: ['Land an ML internship', 'Publish a research paper'],
    social: [
      { label: 'GitHub', handle: '@phuongthao' },
      { label: 'LinkedIn', handle: 'in/phuongthao' },
    ],
  },
};

const MOCK_INSTRUCTOR_COURSES: CourseCard[] = [
  { id: 'c1', title: 'React Pro: From Junior to Senior', category: 'Frontend', students: 4820, rating: 4.9, level: 'intermediate' },
  { id: 'c2', title: 'TypeScript Deep Dive', category: 'Frontend', students: 3210, rating: 4.8, level: 'intermediate' },
  { id: 'c3', title: 'System Design Interview Bootcamp', category: 'Backend', students: 2540, rating: 4.9, level: 'advanced' },
  { id: 'c4', title: 'Node.js Microservices', category: 'Backend', students: 1820, rating: 4.7, level: 'advanced' },
];

const MOCK_STUDENT_COURSES: CourseCard[] = [
  { id: 's1', title: 'React Pro: From Junior to Senior', category: 'Frontend', students: 4820, rating: 4.9, level: 'intermediate' },
  { id: 's2', title: 'TypeScript Deep Dive', category: 'Frontend', students: 3210, rating: 4.8, level: 'intermediate' },
  { id: 's3', title: 'Algorithms Fundamentals', category: 'CS Basics', students: 6210, rating: 4.7, level: 'beginner' },
];

const MOCK_REVIEWS: ReviewItem[] = [
  { id: 'r1', course: 'React Pro: From Junior to Senior', rating: 5, title: 'Best React course I have ever taken', body: 'Bao walks through real-world refactors and explains the why behind every decision. The capstone project alone is worth the price.', date: '2025-11-12' },
  { id: 'r2', course: 'TypeScript Deep Dive', rating: 5, title: 'Finally makes generics click', body: 'I struggled with TS for years. After this course I refactored my whole team codebase with confidence.', date: '2025-09-30' },
  { id: 'r3', course: 'System Design Interview Bootcamp', rating: 4, title: 'Solid prep for senior interviews', body: 'Great coverage of caching, sharding and queues. Would love a deeper module on Kubernetes.', date: '2025-08-04' },
];

const BadgeIcons: Record<string, React.ReactNode> = {
  trophy: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-7 h-7"><path d="M8 21h8M12 17v4M7 4h10v5a5 5 0 11-10 0V4z" /><path d="M17 4h3v3a3 3 0 01-3 3M7 4H4v3a3 3 0 003 3" /></svg>,
  flame: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-7 h-7"><path d="M8.5 14.5A2.5 2.5 0 0011 12c0-1.38-.5-2-1-3-1.072-2.143-.224-4.054 2-6 .5 2.5 2 4.9 4 6.5 2 1.6 3 3.5 3 5.5a7 7 0 11-14 0c0-1.153.433-2.294 1-3a2.5 2.5 0 002.5 2.5z" /></svg>,
  star: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-7 h-7"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" /></svg>,
  rocket: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-7 h-7"><path d="M4.5 16.5c-1.5 1.26-2 5-2 5s3.74-.5 5-2c.71-.84.7-2.13-.09-2.91a2.18 2.18 0 00-2.91-.09zM12 15l-3-3a22 22 0 012-3.95A12.88 12.88 0 0122 2c0 2.72-.78 7.5-6 11a22.35 22.35 0 01-4 2z" /><path d="M9 12H4s.55-3.03 2-4c1.62-1.08 5 0 5 0M12 15v5s3.03-.55 4-2c1.08-1.62 0-5 0-5" /></svg>,
  book: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-7 h-7"><path d="M4 19.5A2.5 2.5 0 016.5 17H20" /><path d="M6.5 2H20v20H6.5A2.5 2.5 0 014 19.5v-15A2.5 2.5 0 016.5 2z" /></svg>,
  target: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-7 h-7"><circle cx="12" cy="12" r="10" /><circle cx="12" cy="12" r="6" /><circle cx="12" cy="12" r="2" /></svg>,
  award: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-7 h-7"><circle cx="12" cy="8" r="7" /><polyline points="8.21 13.89 7 23 12 20 17 23 15.79 13.88" /></svg>,
  zap: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-7 h-7"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" /></svg>,
  shield: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-7 h-7"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" /></svg>,
  message: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-7 h-7"><path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z" /></svg>,
  heart: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-7 h-7"><path d="M20.84 4.61a5.5 5.5 0 00-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 00-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 000-7.78z" /></svg>,
  globe: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-7 h-7"><circle cx="12" cy="12" r="10" /><line x1="2" y1="12" x2="22" y2="12" /><path d="M12 2a15.3 15.3 0 014 10 15.3 15.3 0 01-4 10 15.3 15.3 0 01-4-10 15.3 15.3 0 014-10z" /></svg>,
};

const MOCK_BADGES: BadgeItem[] = [
  { id: 'b1', name: 'First Course', desc: 'Completed your first course', unlocked: true, icon: BadgeIcons.book },
  { id: 'b2', name: '7-Day Streak', desc: 'Studied 7 days in a row', unlocked: true, icon: BadgeIcons.flame },
  { id: 'b3', name: 'Top Reviewer', desc: 'Left 10+ helpful reviews', unlocked: true, icon: BadgeIcons.star },
  { id: 'b4', name: 'Fast Learner', desc: 'Finished a course in under a week', unlocked: true, icon: BadgeIcons.rocket },
  { id: 'b5', name: 'Community Helper', desc: 'Answered 25 questions', unlocked: false, icon: BadgeIcons.message },
  { id: 'b6', name: 'Marathon', desc: '100-day study streak', unlocked: false, icon: BadgeIcons.flame },
  { id: 'b7', name: 'Perfectionist', desc: 'Scored 100% on 5 exams', unlocked: false, icon: BadgeIcons.target },
  { id: 'b8', name: 'Mentor', desc: 'Helped 50 students in forums', unlocked: false, icon: BadgeIcons.award },
  { id: 'b9', name: 'Early Bird', desc: 'Studied before 7am 30 times', unlocked: false, icon: BadgeIcons.zap },
  { id: 'b10', name: 'Course Creator', desc: 'Published your first course', unlocked: false, icon: BadgeIcons.trophy },
  { id: 'b11', name: 'Guardian', desc: 'Reported a critical bug', unlocked: false, icon: BadgeIcons.shield },
  { id: 'b12', name: 'Global Citizen', desc: 'Studied with learners from 10+ countries', unlocked: false, icon: BadgeIcons.globe },
];

const formatJoined = (iso: string): string => {
  const d = new Date(iso);
  return d.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
};

const UserProfilePage: React.FC = () => {
  const { t } = useTranslation();
  const { userId } = useParams<{ userId: string }>();
  const [activeTab, setActiveTab] = useState<'overview' | 'courses' | 'reviews' | 'achievements'>('overview');
  const [following, setFollowing] = useState(false);

  const user = useMemo(() => MOCK_USERS[userId ?? ''] ?? MOCK_USERS['student-1'], [userId]);

  const stats = [
    { label: t('public.userProfile.stats.followers'), value: user.followers.toLocaleString('en-US') },
    { label: t('public.userProfile.stats.following'), value: user.following.toLocaleString('en-US') },
    {
      label: user.role === 'instructor' ? t('public.userProfile.stats.courses') : t('public.userProfile.stats.enrolled'),
      value: user.courseCount.toLocaleString('en-US'),
    },
    {
      label: user.role === 'instructor' ? t('public.userProfile.stats.ratingLabel') : t('public.userProfile.stats.certificates'),
      value: user.role === 'instructor' ? user.rating.toFixed(1) : user.certificates.toLocaleString('en-US'),
    },
  ];

  const courses = user.role === 'instructor' ? MOCK_INSTRUCTOR_COURSES : MOCK_STUDENT_COURSES;

  const tabs: { key: typeof activeTab; label: string }[] = [
    { key: 'overview', label: t('public.userProfile.tabs.overview') },
    { key: 'courses', label: t('public.userProfile.tabs.courses') },
    { key: 'reviews', label: t('public.userProfile.tabs.reviews') },
    { key: 'achievements', label: t('public.userProfile.tabs.achievements') },
  ];

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900">
      <Header />

      <main className="pt-[72px]">
        <section className={`relative h-64 bg-gradient-to-br ${user.gradient}`}>
          <div className="absolute inset-0 opacity-20">
            <svg viewBox="0 0 100 100" className="w-full h-full">
              <pattern id="coverPattern" width="10" height="10" patternUnits="userSpaceOnUse">
                <circle cx="2" cy="2" r="1" fill="white" />
              </pattern>
              <rect width="100" height="100" fill="url(#coverPattern)" />
            </svg>
          </div>
        </section>

        <div className="max-w-7xl mx-auto px-6 -mt-24 relative z-10">
          <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-xl p-6 md:p-8">
            <div className="flex flex-col md:flex-row md:items-end gap-6">
              <div className={`w-32 h-32 md:w-40 md:h-40 rounded-2xl bg-gradient-to-br ${user.gradient} flex items-center justify-center text-white text-4xl md:text-5xl font-black border-4 border-white dark:border-slate-800 shadow-lg shrink-0`}>
                {user.initials}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex flex-wrap items-center gap-2 mb-2">
                  <h1 className="text-2xl md:text-3xl font-bold text-slate-900 dark:text-white">{user.name}</h1>
                  {user.verified && (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 text-xs font-bold">
                      <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="20 6 9 17 4 12" /></svg>
                      {t('public.userProfile.verified')}
                    </span>
                  )}
                  <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold ${
                    user.role === 'instructor'
                      ? 'bg-emerald-50 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400'
                      : 'bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400'
                  }`}>
                    {user.role === 'instructor' ? t('public.userProfile.role.instructor') : t('public.userProfile.role.student')}
                  </span>
                </div>
                <p className="text-slate-600 dark:text-slate-300 mb-4">{user.title}</p>
                <div className="text-xs text-slate-500 dark:text-slate-400">
                  {t('public.userProfile.joined')} {formatJoined(user.joined)}
                </div>
              </div>
              <div className="flex gap-2 shrink-0">
                <button
                  onClick={() => setFollowing(v => !v)}
                  className={`inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold transition-colors shadow-sm ${
                    following
                      ? 'bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-200'
                      : 'bg-blue-600 hover:bg-blue-700 text-white'
                  }`}
                >
                  {following ? (
                    <>
                      <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="20 6 9 17 4 12" /></svg>
                      {t('public.userProfile.following')}
                    </>
                  ) : (
                    <>
                      <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" /></svg>
                      {t('public.userProfile.follow')}
                    </>
                  )}
                </button>
                <button className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 hover:border-blue-500 text-sm font-semibold transition-colors">
                  <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="18" cy="5" r="3" /><circle cx="6" cy="12" r="3" /><circle cx="18" cy="19" r="3" /><line x1="8.59" y1="13.51" x2="15.42" y2="17.49" /><line x1="15.41" y1="6.51" x2="8.59" y2="10.49" /></svg>
                  {t('public.userProfile.share')}
                </button>
              </div>
            </div>

            <div className="mt-8 grid grid-cols-2 md:grid-cols-4 gap-4">
              {stats.map((s) => (
                <div key={s.label} className="text-center md:text-left">
                  <div className="text-2xl md:text-3xl font-bold text-slate-900 dark:text-white">{s.value}</div>
                  <div className="text-xs text-slate-500 dark:text-slate-400 uppercase tracking-wider mt-1">{s.label}</div>
                </div>
              ))}
            </div>
          </div>

          <div className="mt-6 bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 overflow-hidden">
            <div className="border-b border-slate-200 dark:border-slate-700 px-2 overflow-x-auto">
              <div className="flex gap-1">
                {tabs.map((tab) => (
                  <button
                    key={tab.key}
                    onClick={() => setActiveTab(tab.key)}
                    className={`px-5 py-3.5 text-sm font-semibold transition-colors border-b-2 whitespace-nowrap ${
                      activeTab === tab.key
                        ? 'border-blue-600 text-blue-600 dark:text-blue-400'
                        : 'border-transparent text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                    }`}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="p-6 md:p-8">
              {activeTab === 'overview' && (
                <div className="grid lg:grid-cols-3 gap-8">
                  <div className="lg:col-span-2 space-y-6">
                    <div>
                      <h3 className="text-sm font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-3">{t('public.userProfile.about')}</h3>
                      <p className="text-slate-700 dark:text-slate-300 leading-relaxed">{user.bio}</p>
                    </div>
                    <div>
                      <h3 className="text-sm font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-3">{t('public.userProfile.skills')}</h3>
                      <div className="flex flex-wrap gap-2">
                        {user.skills.map((s) => (
                          <span key={s} className="inline-flex items-center px-3 py-1.5 rounded-full bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 text-sm font-semibold">
                            {s}
                          </span>
                        ))}
                      </div>
                    </div>
                    <div>
                      <h3 className="text-sm font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-3">{t('public.userProfile.goals')}</h3>
                      <ul className="space-y-2">
                        {user.goals.map((g) => (
                          <li key={g} className="flex items-start gap-3">
                            <span className="mt-0.5 w-5 h-5 rounded-full bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
                              <svg className="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><polyline points="20 6 9 17 4 12" /></svg>
                            </span>
                            <span className="text-slate-700 dark:text-slate-300">{g}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>
                  <div className="space-y-4">
                    <button className="w-full inline-flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold transition-colors shadow-sm">
                      <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z" /></svg>
                      {t('public.userProfile.sendMessage')}
                    </button>
                    <div className="bg-slate-50 dark:bg-slate-900/50 rounded-xl p-4">
                      <h4 className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-3">{t('public.userProfile.socialLinks')}</h4>
                      <div className="space-y-2">
                        {user.social.map((s) => (
                          <a key={s.label} href="#" className="flex items-center justify-between px-3 py-2 rounded-lg hover:bg-white dark:hover:bg-slate-800 transition-colors">
                            <span className="text-sm font-semibold text-slate-700 dark:text-slate-200">{s.label}</span>
                            <span className="text-sm text-slate-500 dark:text-slate-400">{s.handle}</span>
                          </a>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {activeTab === 'courses' && (
                <div>
                  <div className="flex items-center justify-between mb-6">
                    <h3 className="text-lg font-bold text-slate-900 dark:text-white">
                      {user.role === 'instructor' ? t('public.userProfile.coursesCreated') : t('public.userProfile.enrolledCourses')}
                    </h3>
                    <span className="text-sm text-slate-500 dark:text-slate-400">{courses.length} {t('public.userProfile.coursesCount')}</span>
                  </div>
                  <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    {courses.map((c) => (
                      <Link key={c.id} to={`/courses/${c.id}`} className="group bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-2xl overflow-hidden hover:shadow-lg transition-shadow">
                        <div className={`h-32 bg-gradient-to-br ${user.gradient} relative`}>
                          <div className="absolute inset-0 flex items-center justify-center text-white">
                            <svg className="w-10 h-10 opacity-80" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M2 3h6a4 4 0 014 4v14a3 3 0 00-3-3H2z" /><path d="M22 3h-6a4 4 0 00-4 4v14a3 3 0 013-3h7z" /></svg>
                          </div>
                          <span className="absolute top-3 left-3 px-2 py-0.5 rounded-md bg-white/90 dark:bg-slate-900/90 text-slate-900 dark:text-white text-[10px] font-bold uppercase">{c.level}</span>
                        </div>
                        <div className="p-4">
                          <span className="text-[11px] font-bold uppercase text-blue-600 dark:text-blue-400">{c.category}</span>
                          <h4 className="font-bold text-slate-900 dark:text-white mt-1 line-clamp-2 group-hover:text-blue-600 transition-colors">{c.title}</h4>
                          <div className="flex items-center justify-between mt-3 text-xs text-slate-500 dark:text-slate-400">
                            <span>{c.students.toLocaleString('en-US')} {t('public.userProfile.students')}</span>
                            <span className="inline-flex items-center gap-1 font-semibold">
                              <svg className="w-3.5 h-3.5 text-amber-500" viewBox="0 0 24 24" fill="currentColor"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" /></svg>
                              {c.rating.toFixed(1)}
                            </span>
                          </div>
                        </div>
                      </Link>
                    ))}
                  </div>
                </div>
              )}

              {activeTab === 'reviews' && (
                <div className="space-y-4 max-w-3xl">
                  <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-4">{t('public.userProfile.reviewsLeft')}</h3>
                  {MOCK_REVIEWS.map((r) => (
                    <div key={r.id} className="p-5 rounded-xl border border-slate-200 dark:border-slate-700">
                      <div className="flex items-start justify-between mb-2">
                        <div>
                          <div className="text-xs font-semibold text-blue-600 dark:text-blue-400 mb-1">{r.course}</div>
                          <h4 className="font-bold text-slate-900 dark:text-white">{r.title}</h4>
                        </div>
                        <div className="flex items-center gap-0.5">
                          {Array.from({ length: 5 }).map((_, i) => (
                            <svg key={i} className={`w-4 h-4 ${i < r.rating ? 'text-amber-500' : 'text-slate-300 dark:text-slate-600'}`} viewBox="0 0 24 24" fill="currentColor"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" /></svg>
                          ))}
                        </div>
                      </div>
                      <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed mb-2">{r.body}</p>
                      <div className="text-xs text-slate-400">{new Date(r.date).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}</div>
                    </div>
                  ))}
                </div>
              )}

              {activeTab === 'achievements' && (
                <div>
                  <div className="flex items-center justify-between mb-6">
                    <h3 className="text-lg font-bold text-slate-900 dark:text-white">{t('public.userProfile.badgesTitle')}</h3>
                    <span className="text-sm text-slate-500 dark:text-slate-400">
                      {MOCK_BADGES.filter(b => b.unlocked).length} / {MOCK_BADGES.length} {t('public.userProfile.unlocked')}
                    </span>
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
                    {MOCK_BADGES.map((b) => (
                      <div
                        key={b.id}
                        className={`p-4 rounded-xl border text-center transition-colors ${
                          b.unlocked
                            ? 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700'
                            : 'bg-slate-50 dark:bg-slate-900/50 border-slate-200 dark:border-slate-800 opacity-60'
                        }`}
                      >
                        <div className={`w-14 h-14 rounded-xl mx-auto flex items-center justify-center mb-2 ${
                          b.unlocked
                            ? 'bg-gradient-to-br from-amber-100 to-amber-200 dark:from-amber-900/40 dark:to-amber-800/40 text-amber-600 dark:text-amber-400'
                            : 'bg-slate-200 dark:bg-slate-700 text-slate-400'
                        }`}>
                          {b.icon}
                        </div>
                        <div className="font-bold text-sm text-slate-900 dark:text-white">{b.name}</div>
                        <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-1 line-clamp-2">{b.desc}</div>
                        {b.unlocked && (
                          <span className="inline-flex items-center gap-1 mt-2 text-[10px] font-bold uppercase text-emerald-600 dark:text-emerald-400">
                            <svg className="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><polyline points="20 6 9 17 4 12" /></svg>
                            {t('public.userProfile.unlocked')}
                          </span>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="h-16" />
      </main>

      <Footer />
    </div>
  );
};

export default UserProfilePage;