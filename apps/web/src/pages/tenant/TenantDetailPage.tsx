import React from 'react';
import { useTranslation } from 'react-i18next';
import Header from '@/components/public/Header';
import Footer from '@/components/public/Footer';
import ComingSoon from '@/components/common/ComingSoon';

/**
 * Tính năng chưa có backend, xem `examApi.comingSoon.tenantDetail`.
 *
 * Trang cũ dựng hồ sơ tổ chức và khoá học nổi bật từ `tenantData.ts` và một
 * bảng khoá học viết tay; không service nào quản lý tổ chức nên toàn bộ số
 * liệu đó đã được gỡ. Route giữ nguyên để không vỡ liên kết.
 */
const TenantDetailPage: React.FC = () => {
  const { t } = useTranslation();

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950">
      <Header />
      <ComingSoon
        title={t('examApi.comingSoon.tenantDetail.title')}
        description={t('examApi.comingSoon.tenantDetail.description')}
        missing={t('examApi.comingSoon.tenantDetail.missing', { returnObjects: true }) as string[]}
      />
      <Footer />
    </div>
  );
};

export default TenantDetailPage;
