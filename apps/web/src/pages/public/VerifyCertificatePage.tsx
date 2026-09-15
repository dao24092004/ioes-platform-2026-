import React from 'react';
import { useTranslation } from 'react-i18next';
import Header from '@/components/public/Header';
import ComingSoon from '@/components/common/ComingSoon';

/**
 * Tính năng chưa có backend, xem `comingSoon.blockchain` để biết còn thiếu gì.
 *
 * Giao diện cũ và dữ liệu giả của trang này đã được gỡ: route và mục menu
 * giữ nguyên để không mất dấu thiết kế, nhưng trang không còn dựng số liệu
 * tự bịa nữa. Lịch sử git giữ lại bản cũ khi cần dựng lại.
 */
const VerifyCertificatePage: React.FC = () => {
  const { t } = useTranslation();

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950">
      <Header />
      <ComingSoon
        title={t('comingSoon.blockchain.title')}
        description={t('comingSoon.blockchain.description')}
        missing={t('comingSoon.blockchain.missing', { returnObjects: true }) as string[]}
      />
    </div>
  );
};

export default VerifyCertificatePage;
