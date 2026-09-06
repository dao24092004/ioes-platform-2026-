import React from 'react';
import { useTranslation } from 'react-i18next';

export interface ComingSoonProps {
  /** Tên tính năng, đã dịch sẵn bởi phía gọi. */
  title: string;
  /** Một câu mô tả tính năng sẽ làm gì khi có backend. */
  description: string;
  /** Những gì còn thiếu để tính năng chạy được. Bỏ trống thì không hiện danh sách. */
  missing?: string[];
}

/**
 * Trạng thái "sắp phát triển" cho các trang đã có giao diện nhưng chưa có
 * backend.
 *
 * <p>Thay hẳn phần thân trang thay vì gắn banner lên dữ liệu giả: một bảng số
 * liệu trông thật nhưng do frontend tự bịa vẫn bị đọc là số thật, kể cả khi có
 * dòng cảnh báo phía trên. Route và menu giữ nguyên để không mất dấu những gì
 * đã thiết kế.
 */
const ComingSoon: React.FC<ComingSoonProps> = ({ title, description, missing }) => {
  const { t } = useTranslation();

  return (
    <div className="flex min-h-[60vh] items-center justify-center px-4 py-12">
      <div className="w-full max-w-xl rounded-2xl border border-slate-200 bg-white p-8 text-center shadow-sm dark:border-slate-700 dark:bg-slate-900">
        <span className="inline-flex items-center gap-2 rounded-full bg-amber-50 px-3 py-1 text-xs font-medium text-amber-700 dark:bg-amber-900/30 dark:text-amber-400">
          <span aria-hidden="true">🚧</span>
          {t('comingSoon.badge')}
        </span>

        <h1 className="mt-5 text-2xl font-semibold text-slate-900 dark:text-slate-100">
          {title}
        </h1>

        <p className="mt-3 text-sm leading-relaxed text-slate-600 dark:text-slate-400">
          {description}
        </p>

        {missing && missing.length > 0 && (
          <div className="mt-6 rounded-xl bg-slate-50 p-4 text-left dark:bg-slate-800/60">
            <p className="text-xs font-medium uppercase tracking-wide text-slate-500 dark:text-slate-400">
              {t('comingSoon.missingHeading')}
            </p>
            <ul className="mt-2 space-y-1.5">
              {missing.map((item) => (
                <li
                  key={item}
                  className="flex gap-2 text-sm text-slate-600 dark:text-slate-300"
                >
                  <span aria-hidden="true" className="text-slate-400">
                    •
                  </span>
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        <p className="mt-6 text-xs text-slate-500 dark:text-slate-400">
          {t('comingSoon.noFakeData')}
        </p>
      </div>
    </div>
  );
};

export default ComingSoon;
