import React, { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useQuery } from '@tanstack/react-query';
import StudentLayout from '@/components/layout/StudentLayout';
import { studentApi, type StudentSearchResult } from '@/services/api';

type Filter = 'all' | 'course' | 'lesson' | 'instructor' | 'exam';

const RECENT = ['React Hooks', 'Machine Learning', 'AWS', 'UI/UX Design'];
const POPULAR = ['Python', 'JavaScript', 'TypeScript', 'AI cơ bản', 'Cloud Computing', 'Cybersecurity'];

const SearchPage: React.FC = () => {
  const { t } = useTranslation();
  const [q, setQ] = useState('');
  const [debouncedQ, setDebouncedQ] = useState('');
  const [filter, setFilter] = useState<Filter>('all');

  useEffect(() => {
    const t = setTimeout(() => setDebouncedQ(q), 300);
    return () => clearTimeout(t);
  }, [q]);

  const { data: results = [] } = useQuery({
    queryKey: ['student', 'search', debouncedQ],
    queryFn: () => studentApi.search(debouncedQ),
    enabled: debouncedQ.length > 0,
  });

  const filtered = useMemo(() => {
    if (filter === 'all') return results;
    return results.filter((r: StudentSearchResult) => r.type === filter);
  }, [results, filter]);

  const typeBadge = (type: StudentSearchResult['type']) => {
    const map = {
      course: { bg: 'bg-blue-50 dark:bg-blue-900/30', text: 'text-blue-600 dark:text-blue-400', icon: '📚' },
      lesson: { bg: 'bg-cyan-50 dark:bg-cyan-900/30', text: 'text-cyan-600 dark:text-cyan-400', icon: '🎬' },
      instructor: { bg: 'bg-purple-50 dark:bg-purple-900/30', text: 'text-purple-600 dark:text-purple-400', icon: '👨‍🏫' },
      exam: { bg: 'bg-amber-50 dark:bg-amber-900/30', text: 'text-amber-600 dark:text-amber-400', icon: '📝' },
    };
    return map[type];
  };

  return (
    <StudentLayout title={t('student.search.title')} subtitle={t('student.search.subtitle')}>
      <div className="max-w-3xl mx-auto">
        <div className="relative mb-6">
          <input
            type="search"
            value={q}
            onChange={e => setQ(e.target.value)}
            placeholder={t('student.search.placeholder')}
            className="w-full pl-12 pr-4 py-3.5 text-base rounded-2xl border-2 border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 focus:outline-none focus:border-blue-500 transition-colors"
          />
          <svg className="w-5 h-5 absolute left-4 top-4 text-slate-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" /></svg>
        </div>

        {!debouncedQ ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-5">
              <h3 className="font-bold text-slate-900 dark:text-white mb-3">{t('student.search.recentSearches')}</h3>
              <ul className="space-y-2">
                {RECENT.map(r => (
                  <li key={r}>
                    <button onClick={() => setQ(r)} className="text-sm text-slate-600 dark:text-slate-400 hover:text-blue-600 flex items-center gap-2">
                      <ClockIcon /> {r}
                    </button>
                  </li>
                ))}
              </ul>
            </div>
            <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-5">
              <h3 className="font-bold text-slate-900 dark:text-white mb-3">{t('student.search.popularTopics')}</h3>
              <div className="flex flex-wrap gap-2">
                {POPULAR.map(p => (
                  <button
                    key={p}
                    onClick={() => setQ(p)}
                    className="px-3 py-1.5 rounded-full bg-slate-100 dark:bg-slate-800 text-sm hover:bg-blue-100 dark:hover:bg-blue-900/40 hover:text-blue-600 transition-colors"
                  >
                    {p}
                  </button>
                ))}
              </div>
            </div>
          </div>
        ) : (
          <>
            <div className="flex flex-wrap gap-2 mb-6">
              {(['all', 'course', 'lesson', 'instructor', 'exam'] as Filter[]).map(f => (
                <button
                  key={f}
                  onClick={() => setFilter(f)}
                  className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-all ${
                    filter === f
                      ? 'bg-blue-600 text-white shadow-sm'
                      : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
                  }`}
                >
                  {t(`student.search.filter.${f}`)} {f !== 'all' && `(${results.filter((r: StudentSearchResult) => r.type === f).length})`}
                </button>
              ))}
            </div>

            <div className="mb-4 text-sm text-slate-500 dark:text-slate-400">
              {filtered.length} {t('student.search.results')}
            </div>

            {filtered.length === 0 ? (
              <div className="text-center py-12 text-slate-500">{t('student.search.empty')}</div>
            ) : (
              <div className="space-y-3">
                {filtered.map((r: StudentSearchResult) => {
                  const tb = typeBadge(r.type);
                  return (
                      <Link
                        key={r.id}
                        to={r.type === 'course' ? '/student/courses/sc-001' : r.type === 'exam' ? '/student/exams' : '/student/courses'}
                        className="flex items-start gap-4 p-4 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 hover:shadow-md hover:border-blue-300 transition-all"
                      >
                        <div className={`w-12 h-12 rounded-xl ${tb.bg} ${tb.text} flex items-center justify-center text-2xl flex-shrink-0`}>
                          {tb.icon}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${tb.bg} ${tb.text}`}>
                              {t(`student.search.type.${r.type}`)}
                            </span>
                          </div>
                          <h3 className="font-semibold text-sm text-slate-900 dark:text-white">{r.title}</h3>
                          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">{r.subtitle}</p>
                          {r.meta && (
                            <div className="text-xs text-slate-500 dark:text-slate-400 mt-1">{r.meta}</div>
                          )}
                        </div>
                        <svg className="w-4 h-4 text-slate-400 self-center flex-shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="9 18 15 12 9 6" /></svg>
                      </Link>
                    );
                })}
              </div>
            )}
          </>
        )}
      </div>
    </StudentLayout>
  );
};

const ClockIcon = () => (
  <svg className="w-4 h-4 text-slate-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" /></svg>
);

export default SearchPage;