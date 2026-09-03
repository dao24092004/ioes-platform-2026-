import React, { useMemo, useState } from 'react';
import { useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useQuery } from '@tanstack/react-query';
import StudentLayout from '@/components/layout/StudentLayout';
import { Card } from '@/components/common/Card';
import { studentApi } from '@/services/api';

type Filter = 'all' | '5star' | '4star' | '3star' | '2star' | '1star';

const ReviewsPage: React.FC = () => {
  const { t } = useTranslation();
  const { courseId = 'sc-001' } = useParams<{ courseId?: string }>();
  const [filter, setFilter] = useState<Filter>('all');

  const { data: reviews = [] } = useQuery({
    queryKey: ['student', 'reviews', courseId],
    queryFn: () => studentApi.courseReviews(courseId),
  });

  const dist = useMemo(() => {
    const d = { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 };
    reviews.forEach((r: any) => { d[r.rating as 1 | 2 | 3 | 4 | 5]++; });
    const total = reviews.length || 1;
    return Object.entries(d).map(([k, v]) => ({ star: Number(k), count: v, pct: Math.round((v / total) * 100) })).reverse();
  }, [reviews]);

  const filtered = useMemo(() => {
    if (filter === 'all') return reviews;
    const star = Number(filter.replace('star', ''));
    return reviews.filter((r: any) => r.rating === star);
  }, [reviews, filter]);

  const avg = useMemo(() => {
    if (reviews.length === 0) return 0;
    return (reviews.reduce((s: number, r: any) => s + r.rating, 0) / reviews.length).toFixed(1);
  }, [reviews]);

  return (
    <StudentLayout title={t('student.reviews.title')} subtitle={t('student.reviews.subtitle')}>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card padding="md" className="lg:col-span-1 h-fit">
          <div className="text-center mb-4">
            <div className="text-5xl font-bold text-slate-900 dark:text-white mb-1">{avg}</div>
            <div className="flex items-center justify-center gap-0.5 mb-2">
              {[1, 2, 3, 4, 5].map(i => (
                <StarIcon key={i} filled={i <= Math.round(Number(avg))} />
              ))}
            </div>
            <div className="text-xs text-slate-500 dark:text-slate-400">{t('student.reviews.basedOn', { count: 1284 })}</div>
          </div>
          <div className="space-y-1.5 mb-4">
            {dist.map(d => (
              <button
                key={d.star}
                onClick={() => setFilter(`${d.star}star` as Filter)}
                className="w-full flex items-center gap-2 text-xs hover:bg-slate-50 dark:hover:bg-slate-800/40 p-1 rounded"
              >
                <span className="w-12 text-left">{d.star} ★</span>
                <div className="flex-1 h-2 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                  <div className="h-full bg-amber-500" style={{ width: `${d.pct}%` }} />
                </div>
                <span className="w-10 text-right text-slate-500">{d.pct}%</span>
              </button>
            ))}
          </div>
          <button className="w-full py-2.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold transition-colors">
            {t('student.reviews.writeReview')}
          </button>
        </Card>

        <div className="lg:col-span-2 space-y-4">
          <div className="flex gap-2 flex-wrap">
            {(['all', '5star', '4star', '3star', '2star', '1star'] as Filter[]).map(f => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-all ${
                  filter === f
                    ? 'bg-blue-600 text-white shadow-sm'
                    : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
                }`}
              >
                {t(`student.reviews.filter.${f}`)}
              </button>
            ))}
          </div>
          {filtered.map((r: any) => (
            <div key={r.id} className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-5">
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
                    <span className="text-xs text-slate-500 dark:text-slate-400">· {new Date(r.posted_at).toLocaleDateString('vi-VN')}</span>
                  </div>
                  <div className="flex items-center gap-0.5 mb-2">
                    {Array.from({ length: 5 }).map((_, i) => (
                      <StarIcon key={i} filled={i < r.rating} />
                    ))}
                  </div>
                  <p className="text-sm text-slate-700 dark:text-slate-300">{r.content}</p>
                  <div className="mt-2 text-xs text-slate-500 dark:text-slate-400 flex items-center gap-3">
                    <button className="flex items-center gap-1 hover:text-blue-600">👍 {t('student.reviews.helpful')} ({r.helpful})</button>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </StudentLayout>
  );
};

const StarIcon = ({ filled = true }: { filled?: boolean }) => (
  <svg className={`w-4 h-4 ${filled ? 'text-amber-500' : 'text-slate-300 dark:text-slate-700'}`} viewBox="0 0 24 24" fill="currentColor"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" /></svg>
);

export default ReviewsPage;