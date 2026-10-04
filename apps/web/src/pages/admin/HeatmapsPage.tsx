import React from 'react';
import { useTranslation } from 'react-i18next';
import AdminLayout from '@/components/layout/AdminLayout';
import ComingSoon from '@/components/common/ComingSoon';

/**
 * Web chưa ghi lượt click hay độ sâu cuộn, xem `admin.noBackend.heatmaps`.
 *
 * Điểm nóng và số liệu cuộn giả cũ đã được gỡ; route và menu giữ nguyên.
 */
const HeatmapsPage: React.FC = () => {
  const { t } = useTranslation();

  return (
    <AdminLayout title={t('admin.heatmaps.title')}>
      <div data-testid="admin-coming-heatmaps">
        <ComingSoon
          title={t('admin.heatmaps.title')}
          description={t('admin.noBackend.heatmaps.description')}
          missing={t('admin.noBackend.heatmaps.missing', { returnObjects: true }) as string[]}
        />
      </div>
    </AdminLayout>
  );
};

export default HeatmapsPage;
