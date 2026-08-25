import React, { useMemo } from 'react';
import { useTranslation } from 'react-i18next';

export interface PaginationBarProps {
  page: number;
  totalPages: number;
  pageSize: number;
  startIdx: number;
  endIdx: number;
  total: number;
  i18nKey: string;
  onPageChange: (p: number) => void;
  onPageSizeChange: (n: number) => void;
  pageSizeOptions?: number[];
}

const PaginationBar: React.FC<PaginationBarProps> = ({
  page,
  totalPages,
  pageSize,
  startIdx,
  endIdx,
  total,
  i18nKey,
  onPageChange,
  onPageSizeChange,
  pageSizeOptions = [5, 10, 20, 50, 100],
}) => {
  const { t } = useTranslation();

  const pages = useMemo<(number | 'dots')[]>(() => {
    const arr: (number | 'dots')[] = [];
    if (totalPages <= 7) {
      for (let i = 1; i <= totalPages; i++) arr.push(i);
    } else {
      arr.push(1);
      if (page > 3) arr.push('dots');
      const from = Math.max(2, page - 1);
      const to = Math.min(totalPages - 1, page + 1);
      for (let i = from; i <= to; i++) arr.push(i);
      if (page < totalPages - 2) arr.push('dots');
      arr.push(totalPages);
    }
    return arr;
  }, [page, totalPages]);

  const btn = 'w-9 h-9 inline-flex items-center justify-center rounded-lg text-sm font-semibold transition-colors';
  const nav = 'min-w-[120px] h-9 px-3 inline-flex items-center justify-center gap-1.5 rounded-lg text-sm font-semibold transition-colors disabled:opacity-40 disabled:cursor-not-allowed';

  return (
    <div className="px-6 py-4 border-t border-slate-200 dark:border-slate-800 flex flex-wrap gap-3 items-center justify-between">
      <div className="text-xs text-slate-500 dark:text-slate-400">
        {t(`${i18nKey}.pagination.range`, { from: startIdx + 1, to: endIdx, total })}
      </div>

      <div className="flex items-center gap-1">
        <button
          onClick={() => onPageChange(Math.max(1, page - 1))}
          disabled={page <= 1}
          className={`${nav} text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800`}
          aria-label={t(`${i18nKey}.pagination.prev`)}
        >
          <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <polyline points="15 18 9 12 15 6" />
          </svg>
          <span>{t(`${i18nKey}.pagination.prev`)}</span>
        </button>

        {pages.map((p, i) =>
          p === 'dots' ? (
            <span key={`d${i}`} className="w-9 h-9 inline-flex items-center justify-center text-sm text-slate-400">…</span>
          ) : (
            <button
              key={p}
              onClick={() => onPageChange(p)}
              className={`${btn} ${
                p === page
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
              }`}
              aria-current={p === page ? 'page' : undefined}
            >
              {p}
            </button>
          ),
        )}

        <button
          onClick={() => onPageChange(Math.min(totalPages, page + 1))}
          disabled={page >= totalPages}
          className={`${nav} text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800`}
          aria-label={t(`${i18nKey}.pagination.next`)}
        >
          <span>{t(`${i18nKey}.pagination.next`)}</span>
          <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <polyline points="9 18 15 12 9 6" />
          </svg>
        </button>
      </div>

      <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
        <span>{t(`${i18nKey}.pagination.pageSize`)}</span>
        <select
          value={pageSize}
          onChange={(e) => onPageSizeChange(Number(e.target.value))}
          className="px-2 py-1.5 text-sm rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 focus:outline-none focus:border-blue-500"
        >
          {pageSizeOptions.map((n) => (
            <option key={n} value={n}>{n}</option>
          ))}
        </select>
        <span>{t(`${i18nKey}.pagination.perPage`)}</span>
      </div>
    </div>
  );
};

export default PaginationBar;
