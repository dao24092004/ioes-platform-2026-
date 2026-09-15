import React, { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useQuery } from '@tanstack/react-query';
import StudentLayout from '@/components/layout/StudentLayout';
import { contentApi, type Course } from '@/services/api/content.api';

/**
 * Tìm kiếm khoá học đã xuất bản.
 *
 * Chưa có API tìm kiếm chung cho bài thi, bài học hay giảng viên, nên trang
 * chỉ tìm khoá học qua `GET /api/v1/courses?search=` (khớp tiêu đề và slug).
 */
const SearchPage: React.FC = () => {
  const { t } = useTranslation();
  const [q, setQ] = useState('');
  const [debouncedQ, setDebouncedQ] = useState('');

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedQ(q.trim()), 300);
    return () => clearTimeout(timer);
  }, [q]);

  const { data, isFetching, isError } = useQuery({
    queryKey: ['content', 'courses', 'search', debouncedQ],
    // Backend không tự lọc theo vai trò: phải truyền status=published để học viên không thấy bản nháp.
    queryFn: () => contentApi.listCourses({ search: debouncedQ, status: 'published', perPage: 50 }),
    enabled: debouncedQ.length > 0,
  });
  const results = data?.data ?? [];

  const { data: categories = [] } = useQuery({
    queryKey: ['content', 'categories'],
    queryFn: () => contentApi.listCategories(),
    staleTime: 5 * 60_000,
  });
  const categoryName = useMemo(() => {
    const byId = new Map(categories.map(c => [c.id, c.name]));
    return (id: string | null) => (id ? byId.get(id) : undefined) ?? t('courseApi.uncategorized');
  }, [categories, t]);

  return (
    <StudentLayout title={t('student.search.title')} subtitle={t('courseApi.search.coursesOnly')}>
      <div className="max-w-3xl mx-auto">
        <div className="relative mb-6">
          <input
            type="search"
            value={q}
            onChange={e => setQ(e.target.value)}
            placeholder={t('student.courses.searchPlaceholder')}
            className="w-full pl-12 pr-4 py-3.5 text-base rounded-2xl border-2 border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 focus:outline-none focus:border-blue-500 transition-colors"
          />
          <svg className="w-5 h-5 absolute left-4 top-4 text-slate-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" /></svg>
        </div>

        {!debouncedQ ? (
          <div className="text-center py-12 text-sm text-slate-500 dark:text-slate-400">{t('courseApi.search.hint')}</div>
        ) : isError ? (
          <div className="text-center py-12 text-sm text-red-600">{t('common.loadError')}</div>
        ) : (
          <>
            <div className="mb-4 text-sm text-slate-500 dark:text-slate-400">
              {isFetching ? t('common.loading') : `${data?.meta.total ?? results.length} ${t('student.search.results')}`}
            </div>

            {!isFetching && results.length === 0 ? (
              <div className="text-center py-12 text-slate-500">{t('student.search.empty')}</div>
            ) : (
              <div className="space-y-3">
                {results.map((c: Course) => (
                  <Link
                    key={c.id}
                    to={`/student/courses/${c.id}`}
                    className="flex items-start gap-4 p-4 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 hover:shadow-md hover:border-blue-300 transition-all"
                  >
                    {c.thumbnailUrl ? (
                      <img src={c.thumbnailUrl} alt={c.title} loading="lazy" className="w-12 h-12 rounded-xl object-cover flex-shrink-0" />
                    ) : (
                      <div className="w-12 h-12 rounded-xl bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 flex items-center justify-center text-2xl flex-shrink-0">
                        📚
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400">
                          {t('student.search.type.course')}
                        </span>
                        <span className="text-xs text-slate-500 dark:text-slate-400">{categoryName(c.categoryId)}</span>
                      </div>
                      <h3 className="font-semibold text-sm text-slate-900 dark:text-white">{c.title}</h3>
                      {c.shortDescription && (
                        <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 line-clamp-2">{c.shortDescription}</p>
                      )}
                    </div>
                    <svg className="w-4 h-4 text-slate-400 self-center flex-shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="9 18 15 12 9 6" /></svg>
                  </Link>
                ))}
              </div>
            )}
          </>
        )}
      </div>
    </StudentLayout>
  );
};

export default SearchPage;
