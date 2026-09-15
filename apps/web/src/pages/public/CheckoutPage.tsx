import React from 'react';
import { useTranslation } from 'react-i18next';
import ComingSoon from '@/components/common/ComingSoon';

/**
 * Tính năng chưa có backend, xem `comingSoon.checkout` để biết còn thiếu gì.
 *
 * Giao diện cũ và dữ liệu giả của trang này đã được gỡ: route và mục menu
 * giữ nguyên để không mất dấu thiết kế, nhưng trang không còn dựng số liệu
 * tự bịa nữa. Lịch sử git giữ lại bản cũ khi cần dựng lại.
 */
const CheckoutPage: React.FC = () => {
  const { t } = useTranslation();

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950">
      <ComingSoon
        title={t('comingSoon.checkout.title')}
        description={t('comingSoon.checkout.description')}
        missing={t('comingSoon.checkout.missing', { returnObjects: true }) as string[]}
      />
    </div>
  );
};

export default CheckoutPage;
