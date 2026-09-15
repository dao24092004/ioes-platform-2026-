import React from 'react';
import { useTranslation } from 'react-i18next';
import AdminLayout from '@/components/layout/AdminLayout';
import ComingSoon from '@/components/common/ComingSoon';

/**
 * auth-service chưa có hồ sơ đăng ký giảng viên, xem
 * `admin.noBackend.instructorApproval`.
 *
 * Danh sách hồ sơ giả cũ đã được gỡ; route và menu giữ nguyên. Đổi vai trò
 * thật làm ở trang Quản lý người dùng (`PATCH /users/{id}/role`).
 */
const InstructorApprovalPage: React.FC = () => {
  const { t } = useTranslation();

  return (
    <AdminLayout title={t('admin.instructorApproval.title')}>
      <ComingSoon
        title={t('admin.instructorApproval.title')}
        description={t('admin.noBackend.instructorApproval.description')}
        missing={t('admin.noBackend.instructorApproval.missing', { returnObjects: true }) as string[]}
      />
    </AdminLayout>
  );
};

export default InstructorApprovalPage;
