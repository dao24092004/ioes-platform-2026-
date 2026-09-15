import React from 'react';
import { useTranslation } from 'react-i18next';
import StudentLayout from '@/components/layout/StudentLayout';
import ComingSoon from '@/components/common/ComingSoon';

/**
 * Tính năng chưa có backend, xem `comingSoon.ocr` để biết còn thiếu gì.
 *
 * Giao diện cũ và dữ liệu giả của trang này đã được gỡ: route và mục menu
 * giữ nguyên để không mất dấu thiết kế, nhưng trang không còn dựng số liệu
 * tự bịa nữa. Lịch sử git giữ lại bản cũ khi cần dựng lại.
 */
const OCRPage: React.FC = () => {
  const { t } = useTranslation();

  return (
    <StudentLayout title={t('comingSoon.ocr.title')}>
      <ComingSoon
        title={t('comingSoon.ocr.title')}
        description={t('comingSoon.ocr.description')}
        missing={t('comingSoon.ocr.missing', { returnObjects: true }) as string[]}
      />
    </StudentLayout>
  );
};

export default OCRPage;
