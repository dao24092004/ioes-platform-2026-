import React from 'react';
import { useTranslation } from 'react-i18next';
import AdminLayout from '@/components/layout/AdminLayout';
import ComingSoon from '@/components/common/ComingSoon';

/**
 * Chưa có backend thu thập sự kiện bảo mật, xem `admin.noBackend.security`.
 *
 * Danh sách sự kiện, IP bị chặn và nhật ký giả cũ đã được gỡ; route và menu
 * giữ nguyên.
 */
const SecurityPage: React.FC = () => {
  const { t } = useTranslation();

  return (
    <AdminLayout title={t('security.title')}>
      <ComingSoon
        title={t('security.title')}
        description={t('admin.noBackend.security.description')}
        missing={t('admin.noBackend.security.missing', { returnObjects: true }) as string[]}
      />
    </AdminLayout>
  );
};

export default SecurityPage;
