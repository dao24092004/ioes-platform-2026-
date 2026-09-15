import React from 'react';
import { useTranslation } from 'react-i18next';
import AdminLayout from '@/components/layout/AdminLayout';
import ComingSoon from '@/components/common/ComingSoon';

/**
 * Chưa service nào theo dõi phễu chuyển đổi, xem `admin.noBackend.funnels`.
 *
 * Phễu, cohort và gợi ý giả cũ đã được gỡ; route và menu giữ nguyên.
 */
const FunnelsPage: React.FC = () => {
  const { t } = useTranslation();

  return (
    <AdminLayout title={t('admin.funnels.title')}>
      <ComingSoon
        title={t('admin.funnels.title')}
        description={t('admin.noBackend.funnels.description')}
        missing={t('admin.noBackend.funnels.missing', { returnObjects: true }) as string[]}
      />
    </AdminLayout>
  );
};

export default FunnelsPage;
