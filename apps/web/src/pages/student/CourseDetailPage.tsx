import React, { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useQuery } from '@tanstack/react-query';
import StudentLayout from '@/components/layout/StudentLayout';
import { Card, CardTitleWithIcon } from '@/components/common/Card';
import { studentApi, type StudentCourseReview, type DiscussionPost } from '@/services/api';

type Tab = 'about' | 'curriculum' | 'reviews' | 'discussions';

const CourseDetailPage: React.FC = () => {
  const { t } = useTranslation();
  const { courseId = 'sc-001' } = useParams<{ courseId: string }>();
  const [tab, setTab] = useState<Tab>('about');

  const { data: course, isLoading } = useQuery({
    queryKey: ['student', 'course', courseId],
    queryFn: () => studentApi.courseDetail(courseId),
  });

  const tabs: { id: Tab; label: string }[] = [
    { id: 'about', label: t('student.courseDetail.about') },
    { id: 'curriculum', label: t('student.courseDetail.curriculum') },
    { id: 'reviews', label: t('student.courseDetail.reviews') },
    { id: 'discussions', label: t('student.courseDetail.discussions') },
  ];

  const levelKey = course ? `student.courseDetail.level${course.difficulty.charAt(0).toUpperCase()}${course.difficulty.slice(1)}` : '';

  return (
    <StudentLayout
      title={t('student.courses.title')}
      subtitle={course?.title || ''}
    >
      {isLoading || !course ? (
        <div className="p-12 text-center">
          <div className="inline-block w-8 h-8 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : (
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
          <div className="xl:col-span-2 space-y-6">
            <div className="relative h-64 rounded-2xl bg-gradient-to-br from-blue-600 via-cyan-500 to-emerald-500 overflow-hidden flex items-center justify-center">
              <button className="w-20 h-20 rounded-full bg-white/90 hover:bg-white flex items-center justify-center shadow-2xl hover:scale-105 transition-transform">
                <svg className="w-8 h-8 text-blue-600 ml-1" viewBox="0 0 24 24" fill="currentColor"><polygon points="5 3 19 12 5 21 5 3" /></svg>
              </button>
            </div>

            <Card padding="md">
              <div className="flex items-start justify-between gap-4 flex-wrap">
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <span className="px-2 py-1 rounded-md bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 text-[10px] font-bold uppercase">
                      {course.category}
                    </span>
                    <span className="px-2 py-1 rounded-md bg-emerald-50 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400 text-[10px] font-bold uppercase">
                      {t(levelKey)}
                    </span>
                  </div>
                  <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-2">{course.title}</h2>
                  <p className="text-sm text-slate-600 dark:text-slate-400">{course.short_description}</p>
                  <div className="flex items-center gap-4 mt-3 text-xs text-slate-500 dark:text-slate-400">
                    <span className="flex items-center gap-1">
                      <StarIcon /> <strong className="text-amber-600 dark:text-amber-400">{course.rating}</strong> ({course.reviews_count.toLocaleString('en-US')})
                    </span>
                    <span>•</span>
                    <span>{course.enrolled_count.toLocaleString('en-US')} {t('student.courseDetail.students')}</span>
                  </div>
                </div>
              </div>
            </Card>

            <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 overflow-hidden">
              <div className="border-b border-slate-200 dark:border-slate-800 flex overflow-x-auto">
                {tabs.map(tb => (
                  <button
                    key={tb.id}
                    onClick={() => setTab(tb.id)}
                    className={`px-5 py-3.5 text-sm font-semibold whitespace-nowrap transition-colors ${
                      tab === tb.id
                        ? 'border-b-2 border-blue-600 text-blue-600 dark:text-blue-400'
                        : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                    }`}
                  >
                    {tb.label}
                  </button>
                ))}
              </div>
              <div className="p-6">
                {tab === 'about' && <AboutTab course={course} />}
                {tab === 'curriculum' && <CurriculumTab course={course} />}
                {tab === 'reviews' && <ReviewsTab courseId={course.id} />}
                {tab === 'discussions' && <DiscussionsTab courseId={course.id} />}
              </div>
            </div>
          </div>

          <div className="space-y-6">
            <Card>
              <Link
                to={`/student/learn/${course.id}`}
                className="block w-full text-center py-3 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold transition-colors mb-3"
              >
                {t('student.courseDetail.continueBtn')}
              </Link>
              <Link
                to={`/student/discussions/${course.id}`}
                className="block w-full text-center py-3 rounded-xl border border-slate-200 dark:border-slate-700 hover:border-blue-500 hover:text-blue-600 text-sm font-semibold transition-colors"
              >
                {t('student.courseDetail.discussions')}
              </Link>
            </Card>

            <Card
              title={
                <CardTitleWithIcon color="primary">
                  <ClockIcon />
                  <span>{t('student.courseDetail.duration')}</span>
                </CardTitleWithIcon>
              }
            >
              <ul className="space-y-3 text-sm">
                <InfoRow icon={<ClockIcon />} label={t('student.courseDetail.duration')} value={`${course.duration_hours} ${t('student.courseDetail.hours')}`} />
                <InfoRow icon={<BookIcon />} label={t('student.courseDetail.lessonsCount', { count: course.lessons_count })} />
                <InfoRow icon={<LevelIcon />} label={t('student.courseDetail.level')} value={t(levelKey)} />
                <InfoRow icon={<LangIcon />} label={t('student.courseDetail.language')} value={course.language} />
                <InfoRow icon={<RefreshIcon />} label={t('student.courseDetail.lastUpdated')} value={course.last_updated} />
              </ul>
            </Card>

            <Card
              title={
                <CardTitleWithIcon color="warning">
                  <UserIcon /><span>{t('student.courseDetail.instructor')}</span>
                </CardTitleWithIcon>
              }
            >
              <div className="flex items-center gap-3">
                {course.instructor_avatar ? (
                  <img src={course.instructor_avatar} alt={course.instructor} className="w-12 h-12 rounded-full object-cover" />
                ) : (
                  <div className="w-12 h-12 rounded-full bg-gradient-to-br from-blue-500 to-cyan-500 text-white flex items-center justify-center font-bold text-sm">
                    {course.instructor.split(' ').slice(0, 2).map((s: string) => s.charAt(0)).join('').toUpperCase()}
                  </div>
                )}
                <div>
                  <div className="font-semibold text-sm">{course.instructor}</div>
                  <div className="text-xs text-slate-500 dark:text-slate-400">{t('student.courseDetail.instructorRole')}</div>
                </div>
              </div>
            </Card>
          </div>
        </div>
      )}
    </StudentLayout>
  );
};

const AboutTab: React.FC<{ course: any }> = ({ course }) => {
  const { t } = useTranslation();
  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-base font-bold text-slate-900 dark:text-white mb-3">{t('student.courseDetail.about')}</h3>
        <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed">{course.description}</p>
      </div>
      <div>
        <h3 className="text-base font-bold text-slate-900 dark:text-white mb-3">{t('student.courseDetail.whatYouLearn')}</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {course.what_you_learn.map((item: string, i: number) => (
            <div key={i} className="flex items-start gap-2 text-sm">
              <CheckIcon />
              <span className="text-slate-700 dark:text-slate-300">{item}</span>
            </div>
          ))}
        </div>
      </div>
      <div>
        <h3 className="text-base font-bold text-slate-900 dark:text-white mb-3">{t('student.courseDetail.requirements')}</h3>
        <ul className="space-y-2">
          {course.requirements.map((req: string, i: number) => (
            <li key={i} className="flex items-start gap-2 text-sm text-slate-700 dark:text-slate-300">
              <span className="w-1.5 h-1.5 rounded-full bg-slate-400 mt-2" />
              <span>{req}</span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
};

const CurriculumTab: React.FC<{ course: any }> = ({ course }) => {
  const { t } = useTranslation();
  const [openSection, setOpenSection] = useState<number | null>(0);
  return (
    <div className="space-y-3">
      <div className="text-sm text-slate-500 dark:text-slate-400 mb-4">
        {course.curriculum.reduce((acc: number, s: any) => acc + s.lessons.length, 0)} {t('student.dashboard.lessons')} · {course.curriculum.length} {t('student.courseDetail.section')}s
      </div>
      {course.curriculum.map((section: any, idx: number) => (
        <div key={idx} className="border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden">
          <button
            onClick={() => setOpenSection(openSection === idx ? null : idx)}
            className="w-full px-5 py-4 flex items-center justify-between hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors"
          >
            <div className="text-left">
              <div className="text-sm font-bold text-slate-900 dark:text-white">
                {t('student.courseDetail.section')} {idx + 1}: {section.section}
              </div>
              <div className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">{section.lessons.length} {t('student.dashboard.lessons')}</div>
            </div>
            <svg
              className={`w-4 h-4 text-slate-400 transition-transform ${openSection === idx ? 'rotate-180' : ''}`}
              viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
            >
              <polyline points="6 9 12 15 18 9" />
            </svg>
          </button>
          {openSection === idx && (
            <ul className="border-t border-slate-200 dark:border-slate-800 divide-y divide-slate-100 dark:divide-slate-800">
              {section.lessons.map((l: any, li: number) => (
                <li key={li} className="px-5 py-3 flex items-center gap-3 hover:bg-slate-50 dark:hover:bg-slate-800/30">
                  <PlayIcon />
                  <div className="flex-1 min-w-0">
                    <div className="text-sm text-slate-700 dark:text-slate-300">{l.title}</div>
                    <div className="text-xs text-slate-500 dark:text-slate-400">{l.duration_min} {t('student.courseDetail.minutes')}</div>
                  </div>
                  {l.preview && (
                    <span className="text-[10px] font-bold uppercase text-blue-600 dark:text-blue-400">
                      {t('student.courseDetail.preview')}
                    </span>
                  )}
                </li>
              ))}
            </ul>
          )}
        </div>
      ))}
    </div>
  );
};

const ReviewsTab: React.FC<{ courseId: string }> = ({ courseId }) => {
  const { t } = useTranslation();
  const { data: reviews = [] } = useQuery({
    queryKey: ['student', 'course', courseId, 'reviews'],
    queryFn: () => studentApi.courseReviews(courseId),
  });
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between mb-4">
        <div>
          <div className="text-3xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
            4.8 <StarIcon big />
          </div>
          <div className="text-sm text-slate-500 dark:text-slate-400">{t('student.reviews.basedOn', { count: 1284 })}</div>
        </div>
        <button className="px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold transition-colors">
          {t('student.reviews.writeReview')}
        </button>
      </div>
      {reviews.map((r: StudentCourseReview) => (
        <div key={r.id} className="pb-4 border-b border-slate-100 dark:border-slate-800 last:border-0">
          <div className="flex items-start gap-3">
            {r.user_avatar ? (
              <img src={r.user_avatar} alt={r.user_name} className="w-10 h-10 rounded-full" />
            ) : (
              <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-cyan-500 text-white flex items-center justify-center font-semibold text-xs">
                {r.user_name.split(' ').slice(0, 2).map((s: string) => s.charAt(0)).join('').toUpperCase()}
              </div>
            )}
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-1">
                <span className="font-semibold text-sm">{r.user_name}</span>
                <span className="text-xs text-slate-500 dark:text-slate-400">· {formatSimpleDate(r.posted_at)}</span>
              </div>
              <div className="flex items-center gap-0.5 mb-2">
                {Array.from({ length: 5 }).map((_, i) => (
                  <StarIcon key={i} filled={i < r.rating} />
                ))}
              </div>
              <p className="text-sm text-slate-700 dark:text-slate-300">{r.content}</p>
              <div className="mt-2 text-xs text-slate-500 dark:text-slate-400 flex items-center gap-3">
                <button className="flex items-center gap-1 hover:text-blue-600">
                  <ThumbIcon /> {t('student.reviews.helpful')} ({r.helpful})
                </button>
              </div>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
};

const DiscussionsTab: React.FC<{ courseId: string }> = ({ courseId }) => {
  const { t } = useTranslation();
  const { data: posts = [] } = useQuery({
    queryKey: ['student', 'course', courseId, 'discussion'],
    queryFn: () => studentApi.courseDiscussion(courseId),
  });
  return (
    <div>
      <div className="flex gap-2 mb-4">
        <input
          placeholder={t('student.discussion.placeholder')}
          className="flex-1 px-4 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm focus:outline-none focus:border-blue-500"
        />
        <button className="px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold transition-colors">
          {t('student.discussion.post')}
        </button>
      </div>
      <div className="space-y-4">
        {posts.slice(0, 5).map((p: DiscussionPost) => (
          <div key={p.id} className="flex items-start gap-3 pb-4 border-b border-slate-100 dark:border-slate-800 last:border-0">
            {p.author_avatar ? (
              <img src={p.author_avatar} alt={p.author_name} className="w-9 h-9 rounded-full" />
            ) : (
              <div className="w-9 h-9 rounded-full bg-gradient-to-br from-blue-500 to-cyan-500 text-white flex items-center justify-center font-semibold text-xs">
                {p.author_name.split(' ').slice(0, 2).map((s: string) => s.charAt(0)).join('').toUpperCase()}
              </div>
            )}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <span className="font-semibold text-sm">{p.author_name}</span>
                {p.is_instructor && (
                  <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-blue-100 dark:bg-blue-900/40 text-blue-600 dark:text-blue-300 uppercase">
                    {t('student.discussion.instructorBadge')}
                  </span>
                )}
                <span className="text-xs text-slate-500 dark:text-slate-400">· {formatSimpleDate(p.posted_at)}</span>
              </div>
              <p className="text-sm text-slate-700 dark:text-slate-300">{p.content}</p>
              <div className="mt-2 flex items-center gap-4 text-xs text-slate-500 dark:text-slate-400">
                <button className="flex items-center gap-1 hover:text-blue-600">♥ {p.likes}</button>
                <button className="flex items-center gap-1 hover:text-blue-600">💬 {p.replies}</button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

const InfoRow: React.FC<{ icon: React.ReactNode; label: string; value?: string }> = ({ icon, label, value }) => (
  <li className="flex items-center justify-between">
    <span className="flex items-center gap-2 text-slate-500 dark:text-slate-400">
      <span className="w-4 h-4">{icon}</span> {label}
    </span>
    <span className="font-semibold text-slate-900 dark:text-white">{value || '—'}</span>
  </li>
);

const formatSimpleDate = (iso: string) => {
  const d = new Date(iso);
  const now = Date.now();
  const diffMin = Math.floor((now - +d) / 60000);
  if (diffMin < 60) return `${diffMin}m ago`;
  if (diffMin < 1440) return `${Math.floor(diffMin / 60)}h ago`;
  return `${Math.floor(diffMin / 1440)}d ago`;
};

const CheckIcon = () => (
  <svg className="w-4 h-4 text-emerald-600 flex-shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><polyline points="20 6 9 17 4 12" /></svg>
);
const StarIcon = ({ filled = true, big = false }: { filled?: boolean; big?: boolean }) => (
  <svg className={`${big ? 'w-6 h-6' : 'w-3.5 h-3.5'} ${filled ? 'text-amber-500' : 'text-slate-300 dark:text-slate-700'}`} viewBox="0 0 24 24" fill="currentColor"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" /></svg>
);
const ClockIcon = () => (
  <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" /></svg>
);
const BookIcon = () => (
  <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" /></svg>
);
const LevelIcon = () => (
  <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12" /></svg>
);
const LangIcon = () => (
  <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10" /><line x1="2" y1="12" x2="22" y2="12" /><path d="M12 2a15.3 15.3 0 014 10 15.3 15.3 0 01-4 10 15.3 15.3 0 01-4-10 15.3 15.3 0 014-10z" /></svg>
);
const RefreshIcon = () => (
  <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="23 4 23 10 17 10" /><polyline points="1 20 1 14 7 14" /><path d="M3.51 9a9 9 0 0114.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0020.49 15" /></svg>
);
const UserIcon = () => (
  <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg>
);
const PlayIcon = () => (
  <svg className="w-4 h-4 text-blue-600 dark:text-blue-400" viewBox="0 0 24 24" fill="currentColor"><polygon points="5 3 19 12 5 21 5 3" /></svg>
);
const ThumbIcon = () => (
  <svg className="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M14 9V5a3 3 0 00-3-3l-4 9v11h11.28a2 2 0 002-1.7l1.38-9A2 2 0 0119.7 9H14zM7 22H4a2 2 0 01-2-2v-7a2 2 0 012-2h3" /></svg>
);

export default CourseDetailPage;
