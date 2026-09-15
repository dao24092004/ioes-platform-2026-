import React from 'react';
import { useTranslation } from 'react-i18next';
import Header from '@/components/public/Header';
import Footer from '@/components/public/Footer';
import ComingSoon from '@/components/common/ComingSoon';

/**
 * Tính năng chưa có backend, xem `comingSoon.tenant`.
 *
 * Trang cũ liệt kê tổ chức từ `tenantData.ts` và số liệu marketing viết tay
 * (50K+ học viên, 99.9% uptime); không service nào quản lý tổ chức nên đã gỡ.
 * Route giữ nguyên để không vỡ liên kết.
 */
const TenantsPage: React.FC = () => {
  const { t } = useTranslation();

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950">
      <Header />
      <main className="pt-[72px]">
        <ComingSoon
          title={t('comingSoon.tenant.title')}
          description={t('comingSoon.tenant.description')}
          missing={t('comingSoon.tenant.missing', { returnObjects: true }) as string[]}
        />
      </main>
      <Footer />
    </div>
  );
};

export default TenantsPage;
