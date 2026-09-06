import React from 'react';
import { useTranslation } from 'react-i18next';
import InstructorLayout from '@/components/layout/InstructorLayout';
import ComingSoon from '@/components/common/ComingSoon';

/**
 * Tính năng chưa có backend, xem `comingSoon.discussion` để biết còn thiếu gì.
 *
 * Giao diện cũ và dữ liệu giả của trang này đã được gỡ: route và mục menu
 * giữ nguyên để không mất dấu thiết kế, nhưng trang không còn dựng số liệu
 * tự bịa nữa. Lịch sử git giữ lại bản cũ khi cần dựng lại.
 */
const DiscussionsPage: React.FC = () => {
  const { t } = useTranslation();

  return (
    <InstructorLayout title={t('comingSoon.discussion.title')}>
      <ComingSoon
        title={t('comingSoon.discussion.title')}
        description={t('comingSoon.discussion.description')}
        missing={t('comingSoon.discussion.missing', { returnObjects: true }) as string[]}
      />
    </InstructorLayout>
  );
};

export default DiscussionsPage;
