import React from 'react';
import { useTranslation } from 'react-i18next';
import Header from '@/components/public/Header';
import Footer from '@/components/public/Footer';
import ComingSoon from '@/components/common/ComingSoon';

/**
 * Hồ sơ công khai `/users/:userId` — chưa có backend, xem
 * `examApi.comingSoon.userProfile`.
 *
 * auth-service chỉ có `GET /me` (chính mình) và `GET /users/{id}` dành cho
 * ADMIN; không có endpoint hồ sơ công khai, người theo dõi, kỹ năng hay huy
 * hiệu. Các hồ sơ viết tay (`MOCK_USERS`) đã được gỡ.
 */
const UserProfilePage: React.FC = () => {
  const { t } = useTranslation();

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950">
      <Header />
      <ComingSoon
        title={t('examApi.comingSoon.userProfile.title')}
        description={t('examApi.comingSoon.userProfile.description')}
        missing={t('examApi.comingSoon.userProfile.missing', { returnObjects: true }) as string[]}
      />
      <Footer />
    </div>
  );
};

export default UserProfilePage;
