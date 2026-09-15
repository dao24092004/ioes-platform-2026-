import React from 'react';
import { useTranslation } from 'react-i18next';
import StudentLayout from '@/components/layout/StudentLayout';
import ComingSoon from '@/components/common/ComingSoon';

/**
 * Chưa có backend đánh giá, xem `courseApi.comingSoon.reviews`.
 *
 * Bảng `reviews` có trong schema content-service nhưng chưa có API đọc hay
 * ghi, nên trang không còn hiện điểm trung bình và đánh giá tự bịa.
 */
const ReviewsPage: React.FC = () => {
  const { t } = useTranslation();

  return (
    <StudentLayout title={t('courseApi.comingSoon.reviews.title')}>
      <ComingSoon
        title={t('courseApi.comingSoon.reviews.title')}
        description={t('courseApi.comingSoon.reviews.description')}
        missing={t('courseApi.comingSoon.reviews.missing', { returnObjects: true }) as string[]}
      />
    </StudentLayout>
  );
};

export default ReviewsPage;
