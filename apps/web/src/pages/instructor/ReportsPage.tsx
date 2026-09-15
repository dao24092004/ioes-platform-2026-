import React from 'react';
import { useTranslation } from 'react-i18next';
import InstructorLayout from '@/components/layout/InstructorLayout';
import ComingSoon from '@/components/common/ComingSoon';

/**
 * Báo cáo ghi danh / hoàn thành / doanh thu / tương tác — chưa có backend,
 * xem `examApi.comingSoon.reports`.
 *
 * Không service nào tổng hợp các số liệu này theo giảng viên và theo khoảng
 * thời gian, và chưa có payment-service cho doanh thu. Chuỗi số và bảng so
 * sánh kỳ trước cũ đều do frontend tự sinh nên đã được gỡ.
 */
const ReportsPage: React.FC = () => {
  const { t } = useTranslation();

  return (
    <InstructorLayout title={t('instructor.reports.title')} subtitle={t('instructor.reports.subtitle')}>
      <ComingSoon
        title={t('examApi.comingSoon.reports.title')}
        description={t('examApi.comingSoon.reports.description')}
        missing={t('examApi.comingSoon.reports.missing', { returnObjects: true }) as string[]}
      />
    </InstructorLayout>
  );
};

export default ReportsPage;
