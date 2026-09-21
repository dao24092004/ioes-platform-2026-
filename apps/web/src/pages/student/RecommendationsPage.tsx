import React, { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useQuery } from '@tanstack/react-query';
import StudentLayout from '@/components/layout/StudentLayout';
import { contentApi, formatCoursePrice } from '@/services/api/content.api';
import {
  recommendationsApi,
  DEFAULT_RECOMMENDATION_LIMIT,
  type CourseRecommendation,
} from '@/services/api/recommendations.api';

/**
 * FR-AI-002 — gợi ý khoá học.
 *
 * Toàn bộ nội dung đến từ `GET /api/ai/recommendations/courses`; trang không
 * dựng thêm khoá, điểm hay lý do nào của riêng mình. Học viên mới chưa ghi
 * danh vẫn được backend trả khoá phổ biến, nên danh sách rỗng nghĩa là backend
 * thật sự không có gì — hiện trạng thái trống chứ không lấp bằng dữ liệu giả.
 *
 * Tên danh mục lấy từ content-service vì API gợi ý chỉ trả `categoryId`.
 */
const LIMIT = DEFAULT_RECOMMENDATION_LIMIT;

const RecommendationsPage: React.FC = () => {
  const { t, i18n } = useTranslation('recommendations');

  // `retry: false` ghi đè mặc định `retry: 1` của QueryClient: api gợi ý đã có
  // timeout ngắn riêng, nhưng thử lại một lần nữa là nhân đôi thời gian chờ
  // trước khi người dùng thấy lỗi thật. Ở đây đã có sẵn nút "Làm mới" để họ tự
  // thử lại khi muốn.
  const { data, isLoading, isError, error, isFetching, refetch } = useQuery({
    queryKey: ['ai', 'recommendations', { limit: LIMIT }],
    queryFn: () => recommendationsApi.getCourseRecommendations(LIMIT),
    staleTime: 5 * 60_000,
    retry: false,
  });

  // Dùng chung khoá truy vấn với CoursesPage để không gọi lại danh mục.
  const { data: categories = [] } = useQuery({
    queryKey: ['content', 'categories'],
    queryFn: () => contentApi.listCategories(),
    staleTime: 5 * 60_000,
  });

  const categoryName = useMemo(() => {
    const byId = new Map(categories.map(c => [c.id, c.name]));
    return (id: string | null) => (id ? byId.get(id) : undefined) ?? t('card.uncategorized');
  }, [categories, t]);

  const items = data?.items ?? [];
  const generatedAt = data?.generatedAt ? formatTime(data.generatedAt, i18n.language) : null;

  return (
    <StudentLayout
      title={t('title')}
      subtitle={t('subtitle')}
      headerActions={
        <button
          type="button"
          onClick={() => void refetch()}
          disabled={isFetching}
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 disabled:opacity-60 disabled:cursor-not-allowed text-white text-sm font-semibold shadow-sm transition-colors"
        >
          <RefreshIcon spinning={isFetching} />
          {isFetching ? t('actions.refreshing') : t('actions.refresh')}
        </button>
      }
    >
      <section className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 overflow-hidden">
        {!isLoading && !isError && items.length > 0 && (
          <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-800 flex flex-wrap items-center justify-between gap-2">
            <h2 className="text-base font-bold text-slate-900 dark:text-white">
              {t('meta.count', { count: items.length })}
            </h2>
            <div className="flex flex-wrap items-center gap-3 text-xs text-slate-500 dark:text-slate-400">
              {generatedAt && <span>{t('meta.generatedAt', { time: generatedAt })}</span>}
              {data?.strategy && <span>{t('meta.strategy', { strategy: data.strategy })}</span>}
            </div>
          </div>
        )}

        {isLoading ? (
          <div className="p-12 text-center">
            <div className="inline-block w-8 h-8 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
            <p className="mt-3 text-sm text-slate-500 dark:text-slate-400">{t('loading')}</p>
          </div>
        ) : isError ? (
          <div className="p-12 text-center">
            <p className="text-sm font-semibold text-red-600 dark:text-red-400">{t('error.title')}</p>
            <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">{t('error.description')}</p>
            {error instanceof Error && error.message && (
              <p className="mt-1 text-xs text-slate-400 dark:text-slate-500">
                {t('error.detail', { message: error.message })}
              </p>
            )}
            <button
              type="button"
              onClick={() => void refetch()}
              disabled={isFetching}
              className="mt-5 inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-slate-200 dark:border-slate-700 text-sm font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 disabled:opacity-60 transition-colors"
            >
              <RefreshIcon spinning={isFetching} />
              {t('actions.retry')}
            </button>
          </div>
        ) : items.length === 0 ? (
          <div className="p-12 text-center">
            <p className="text-sm font-semibold text-slate-900 dark:text-white">{t('empty.title')}</p>
            <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">{t('empty.description')}</p>
            <Link
              to="/student/courses"
              className="mt-5 inline-flex items-center px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold transition-colors"
            >
              {t('actions.browseCatalog')}
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 p-6">
            {items.map(item => (
              <RecommendationCard
                key={item.courseId}
                item={item}
                category={categoryName(item.categoryId)}
              />
            ))}
          </div>
        )}
      </section>
    </StudentLayout>
  );
};

/** Một thẻ khoá học; mọi trường thiếu đều bị bỏ qua thay vì hiện giá trị mặc định. */
const RecommendationCard: React.FC<{ item: CourseRecommendation; category: string }> = ({
  item,
  category,
}) => {
  const { t } = useTranslation('recommendations');

  const level = item.level !== null ? t(`level.${item.level}`, { defaultValue: '' }) : '';
  const reasonTag = t(`reasonCode.${item.reasonCode}`, { defaultValue: '' });
  // score là 0..1 theo hợp đồng; giá trị lạ thì không hiện phần trăm sai lệch.
  const matchPercent =
    Number.isFinite(item.score) && item.score >= 0 && item.score <= 1
      ? Math.round(item.score * 100)
      : null;

  return (
    <article className="group flex flex-col bg-white dark:bg-slate-800/40 border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden hover:shadow-lg hover:-translate-y-1 transition-all">
      <div className="relative h-32 bg-gradient-to-br from-violet-500 to-blue-500 overflow-hidden">
        {item.thumbnailUrl ? (
          <img
            src={item.thumbnailUrl}
            alt={item.title}
            loading="lazy"
            className="absolute inset-0 w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
          />
        ) : (
          <div className="absolute inset-0 flex items-center justify-center text-white/80">
            <BookIcon />
          </div>
        )}
        <div className="absolute inset-x-0 bottom-0 h-16 bg-gradient-to-t from-black/55 to-transparent pointer-events-none" />
        <span className="absolute top-3 right-3 px-2 py-1 rounded-md bg-white/25 backdrop-blur text-white text-[10px] font-bold uppercase">
          {category}
        </span>
        {reasonTag && (
          <span className="absolute top-3 left-3 px-2 py-1 rounded-md bg-violet-600 text-white text-[10px] font-bold uppercase">
            {reasonTag}
          </span>
        )}
      </div>

      <div className="flex flex-1 flex-col p-4">
        <h3 className="font-semibold text-sm text-slate-900 dark:text-white line-clamp-2">
          {item.title}
        </h3>

        <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-500 dark:text-slate-400">
          {level && <span>{level}</span>}
          {item.durationHours !== null && <span>{t('card.duration', { hours: item.durationHours })}</span>}
          <span className="font-semibold text-slate-700 dark:text-slate-200">
            {formatCoursePrice(item, t('card.free'))}
          </span>
        </div>

        <div className="mt-3 rounded-xl bg-violet-50 dark:bg-violet-900/20 p-3">
          <p className="text-[10px] font-semibold uppercase tracking-wide text-violet-700 dark:text-violet-300">
            {t('card.reasonLabel')}
          </p>
          <p className="mt-1 text-xs leading-relaxed text-slate-600 dark:text-slate-300">
            {item.reason}
          </p>
          {matchPercent !== null && (
            <p className="mt-1 text-[10px] font-medium text-violet-600 dark:text-violet-400">
              {t('card.match', { percent: matchPercent })}
            </p>
          )}
        </div>

        <Link
          to={`/student/courses/${item.courseId}`}
          className="mt-4 block w-full text-center py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold transition-colors"
        >
          {t('actions.viewDetail')}
        </Link>
      </div>
    </article>
  );
};

/** ISO-8601 từ backend; chuỗi hỏng thì không hiện gì thay vì "Invalid Date". */
function formatTime(iso: string, locale: string): string | null {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return null;
  return date.toLocaleString(locale === 'vi' ? 'vi-VN' : 'en-US', {
    hour: '2-digit',
    minute: '2-digit',
    day: '2-digit',
    month: '2-digit',
  });
}

const RefreshIcon: React.FC<{ spinning?: boolean }> = ({ spinning }) => (
  <svg
    className={`w-4 h-4 ${spinning ? 'animate-spin' : ''}`}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    aria-hidden="true"
  >
    <path d="M21 12a9 9 0 1 1-2.64-6.36" />
    <path d="M21 3v6h-6" />
  </svg>
);

const BookIcon = () => (
  <svg className="w-10 h-10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
    <path d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
  </svg>
);

export default RecommendationsPage;
