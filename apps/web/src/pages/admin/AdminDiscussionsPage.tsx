import React, { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useQuery } from '@tanstack/react-query';
import AdminLayout from '@/components/layout/AdminLayout';
import { studentApi } from '@/services/api';

const STATUSES = ['all', 'active', 'reported', 'hidden'] as const;
type Status = (typeof STATUSES)[number];

const AdminDiscussionsPage: React.FC = () => {
  const { t } = useTranslation();
  const [filter, setFilter] = useState<Status>('all');
  const [search, setSearch] = useState('');

  const { data: posts = [] } = useQuery({
    queryKey: ['admin', 'discussions'],
    queryFn: () => studentApi.courseDiscussion('all'),
  });

  const augmented = useMemo(() => {
    return posts.map((p: any, i: number) => ({
      ...p,
      status: i === 1 ? 'reported' : i === 2 ? 'hidden' : 'active',
      reports: i === 1 ? 4 : 0,
      course: ['ReactJS', 'Database', 'AI/ML', 'Math', 'DSA'][i % 5],
    }));
  }, [posts]);

  const filtered = useMemo(() => {
    return augmented.filter((p: any) => {
      if (filter !== 'all' && p.status !== filter) return false;
      if (search && !p.content.toLowerCase().includes(search.toLowerCase()) && !p.author_name.toLowerCase().includes(search.toLowerCase())) {
        return false;
      }
      return true;
    });
  }, [augmented, filter, search]);

  const stats = useMemo(() => {
    return {
      total: augmented.length,
      active: augmented.filter((p: any) => p.status === 'active').length,
      reported: augmented.filter((p: any) => p.status === 'reported').length,
      hidden: augmented.filter((p: any) => p.status === 'hidden').length,
    };
  }, [augmented]);

  return (
    <AdminLayout
      title={t('admin.discussion.title')}
      subtitle={t('admin.discussion.subtitle')}
    >
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        {[
          { label: t('admin.discussion.total'), value: stats.total, color: 'blue' },
          { label: t('admin.discussion.activeCount'), value: stats.active, color: 'emerald' },
          { label: t('admin.discussion.reportedCount'), value: stats.reported, color: 'amber' },
          { label: t('admin.discussion.hiddenCount'), value: stats.hidden, color: 'red' },
        ].map(s => (
          <div key={s.label} className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-5">
            <div className="text-xs text-slate-500 dark:text-slate-400">{s.label}</div>
            <div className={`text-3xl font-bold mt-1 text-${s.color}-600`}>{s.value}</div>
          </div>
        ))}
      </div>

      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-4 mb-4 flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[220px]">
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder={t('admin.discussion.search')}
            className="w-full pl-9 pr-3 py-2 text-sm rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 focus:outline-none focus:border-red-500"
          />
          <svg className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="11" cy="11" r="8" />
            <line x1="21" y1="21" x2="16.65" y2="16.65" />
          </svg>
        </div>
        <div className="flex flex-wrap gap-2">
          {STATUSES.map(s => (
            <button
              key={s}
              onClick={() => setFilter(s)}
              className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-all ${
                filter === s
                  ? 'bg-red-600 text-white shadow-sm'
                  : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
              }`}
            >
              {t(`admin.discussion.filter.${s}`)}
            </button>
          ))}
        </div>
      </div>

      <div className="space-y-3">
        {filtered.map((p: any) => (
          <div key={p.id} className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-5">
            <div className="flex items-start gap-3 mb-3">
              <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-cyan-500 text-white flex items-center justify-center font-semibold text-xs flex-shrink-0">
                {p.author_name.split(' ').slice(0, 2).map((s: string) => s.charAt(0)).join('').toUpperCase()}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-semibold text-sm">{p.author_name}</span>
                  <span className="text-xs text-slate-500 dark:text-slate-400">·</span>
                  <span className="text-xs px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
                    {p.course}
                  </span>
                  <span className="text-xs text-slate-500 dark:text-slate-400">
                    · {new Date(p.posted_at).toLocaleString('vi-VN', { dateStyle: 'short', timeStyle: 'short' })}
                  </span>
                  {p.status === 'reported' && (
                    <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-red-100 dark:bg-red-900/40 text-red-600 dark:text-red-300 uppercase flex items-center gap-1">
                      <svg className="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
                        <line x1="12" y1="9" x2="12" y2="13" />
                        <line x1="12" y1="17" x2="12.01" y2="17" />
                      </svg>
                      {t('admin.discussion.reported')} ({p.reports})
                    </span>
                  )}
                  {p.status === 'hidden' && (
                    <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300 uppercase">
                      {t('admin.discussion.hidden')}
                    </span>
                  )}
                </div>
                <p className="text-sm text-slate-700 dark:text-slate-300 mt-2">{p.content}</p>
                <div className="mt-3 flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
                  <span>♥ {p.likes}</span>
                  <span>·</span>
                  <span>💬 {p.replies}</span>
                </div>
              </div>
              <div className="flex items-center gap-2 flex-shrink-0">
                {p.status !== 'hidden' ? (
                  <button className="px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 hover:border-amber-500 hover:text-amber-600 text-xs font-semibold transition-colors">
                    {t('admin.discussion.hide')}
                  </button>
                ) : (
                  <button className="px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 hover:border-emerald-500 hover:text-emerald-600 text-xs font-semibold transition-colors">
                    {t('admin.discussion.restore')}
                  </button>
                )}
                <button className="px-3 py-1.5 rounded-lg bg-red-600 hover:bg-red-700 text-white text-xs font-semibold transition-colors">
                  {t('admin.discussion.delete')}
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </AdminLayout>
  );
};

export default AdminDiscussionsPage;