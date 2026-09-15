import React from 'react';
import { useTranslation } from 'react-i18next';
import AdminLayout from '@/components/layout/AdminLayout';
import ComingSoon from '@/components/common/ComingSoon';

/**
 * Chưa service nào ghi audit log, xem `admin.noBackend.auditLog`.
 *
 * Bảng nhật ký và số liệu giả cũ đã được gỡ; route và menu giữ nguyên.
 */
const AuditLogPage: React.FC = () => {
  const { t } = useTranslation();

  return (
    <AdminLayout title={t('admin.auditLog.title')}>
      <ComingSoon
        title={t('admin.auditLog.title')}
        description={t('admin.noBackend.auditLog.description')}
        missing={t('admin.noBackend.auditLog.missing', { returnObjects: true }) as string[]}
      />
    </AdminLayout>
  );
};

export default AuditLogPage;
