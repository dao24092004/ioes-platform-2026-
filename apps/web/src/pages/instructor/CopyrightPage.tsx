import React from 'react';
import { useTranslation } from 'react-i18next';
import InstructorLayout from '@/components/layout/InstructorLayout';
import ComingSoon from '@/components/common/ComingSoon';

/**
 * Tính năng chưa có backend, xem `comingSoon.copyright` để biết còn thiếu gì.
 *
 * Giao diện cũ và dữ liệu giả của trang này đã được gỡ: route và mục menu
 * giữ nguyên để không mất dấu thiết kế, nhưng trang không còn dựng số liệu
 * tự bịa nữa. Lịch sử git giữ lại bản cũ khi cần dựng lại.
 */
const CopyrightPage: React.FC = () => {
  const { t } = useTranslation();

  return (
    <InstructorLayout title={t('comingSoon.copyright.title')}>
      <ComingSoon
        title={t('comingSoon.copyright.title')}
        description={t('comingSoon.copyright.description')}
        missing={t('comingSoon.copyright.missing', { returnObjects: true }) as string[]}
      />
    </InstructorLayout>
  );
};

export default CopyrightPage;
