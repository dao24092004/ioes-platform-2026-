import React, { useMemo, useState } from 'react';
import { useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useQuery } from '@tanstack/react-query';
import InstructorLayout from '@/components/layout/InstructorLayout';
import { studentApi } from '@/services/api';

const DiscussionsPage: React.FC = () => {
  const { t } = useTranslation();
  const { courseId = 'ic-001' } = useParams<{ courseId?: string }>();
  const [filter, setFilter] = useState<'all' | 'questions' | 'announcements'>('all');
  const [draft, setDraft] = useState('');

  const { data: posts = [] } = useQuery({
    queryKey: ['instructor', 'discussions', courseId],
    queryFn: () => studentApi.courseDiscussion(courseId),
  });

  const filtered = useMemo(() => {
    if (filter === 'all') return posts;
    if (filter === 'questions') return posts.filter((p: any) => p.content.includes('?'));
    return posts.filter((p: any) => p.is_instructor);
  }, [posts, filter]);

  return (
    <InstructorLayout
      title={t('instructor.discussion.title')}
      subtitle={t('instructor.discussion.subtitle')}
    >
      <div className="flex flex-wrap gap-2 mb-6">
        {(['all', 'questions', 'announcements'] as const).map(f => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-all ${
              filter === f
                ? 'bg-amber-600 text-white shadow-sm'
                : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
            }`}
          >
            {t(`instructor.discussion.filter.${f}`)}
          </button>
        ))}
      </div>

      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-5 mb-6">
        <textarea
          value={draft}
          onChange={e => setDraft(e.target.value)}
          placeholder={t('instructor.discussion.placeholder')}
          rows={3}
          className="w-full px-4 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm focus:outline-none focus:border-amber-500 resize-none"
        />
        <div className="flex items-center justify-between mt-2">
          <span className="text-xs text-slate-500 dark:text-slate-400">
            {t('instructor.discussion.helper')}
          </span>
          <button className="px-4 py-1.5 rounded-lg bg-amber-600 hover:bg-amber-700 text-white text-sm font-semibold transition-colors">
            {t('instructor.discussion.post')}
          </button>
        </div>
      </div>

      <div className="space-y-3">
        {filtered.map((p: any) => (
          <div key={p.id} className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-5">
            <div className="flex items-start gap-3 mb-3">
              {p.author_avatar ? (
                <img src={p.author_avatar} alt={p.author_name} className="w-10 h-10 rounded-full" />
              ) : (
                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-cyan-500 text-white flex items-center justify-center font-semibold text-xs">
                  {p.author_name.split(' ').slice(0, 2).map((s: string) => s.charAt(0)).join('').toUpperCase()}
                </div>
              )}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-semibold text-sm">{p.author_name}</span>
                  {p.is_instructor && (
                    <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-amber-100 dark:bg-amber-900/40 text-amber-600 dark:text-amber-300 uppercase">
                      {t('instructor.discussion.instructorBadge')}
                    </span>
                  )}
                  <span className="text-xs text-slate-500 dark:text-slate-400">
                    · {new Date(p.posted_at).toLocaleString('vi-VN', { dateStyle: 'short', timeStyle: 'short' })}
                  </span>
                </div>
                <p className="text-sm text-slate-700 dark:text-slate-300 mt-2">{p.content}</p>
                <div className="mt-3 flex items-center gap-4 text-xs text-slate-500 dark:text-slate-400">
                  <button className="flex items-center gap-1.5 hover:text-amber-600">
                    ♥ {t('instructor.discussion.like')} ({p.likes})
                  </button>
                  <button className="flex items-center gap-1.5 hover:text-amber-600">
                    💬 {t('instructor.discussion.reply')} ({p.replies})
                  </button>
                  <button className="ml-auto text-amber-600 hover:text-amber-700 font-semibold">
                    {t('instructor.discussion.replyAction')}
                  </button>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </InstructorLayout>
  );
};

export default DiscussionsPage;