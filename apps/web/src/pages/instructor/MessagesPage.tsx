import React from 'react';
import { useTranslation } from 'react-i18next';
import InstructorLayout from '@/components/layout/InstructorLayout';
import ComingSoon from '@/components/common/ComingSoon';

/**
 * Tính năng chưa có backend, xem `comingSoon.messages` để biết còn thiếu gì.
 *
 * Giao diện cũ và dữ liệu giả của trang này đã được gỡ: route và mục menu
 * giữ nguyên để không mất dấu thiết kế, nhưng trang không còn dựng số liệu
 * tự bịa nữa. Lịch sử git giữ lại bản cũ khi cần dựng lại.
 */
const MessagesPage: React.FC = () => {
  const { t } = useTranslation();

  return (
    <InstructorLayout title={t('comingSoon.messages.title')}>
      <ComingSoon
        title={t('comingSoon.messages.title')}
        description={t('comingSoon.messages.description')}
        missing={t('comingSoon.messages.missing', { returnObjects: true }) as string[]}
      />
    </InstructorLayout>
  );
};

export default MessagesPage;
