import React from 'react';
import { useTranslation } from 'react-i18next';
import StudentLayout from '@/components/layout/StudentLayout';
import ComingSoon from '@/components/common/ComingSoon';

/**
 * Chưa có backend lộ trình học, xem `courseApi.comingSoon.learningPath`.
 *
 * Gateway có route `/api/learning-path/**` nhưng không service nào phục vụ,
 * nên trang không còn dựng lộ trình và tiến độ tự bịa.
 */
const LearningPathPage: React.FC = () => {
  const { t } = useTranslation();

  return (
    <StudentLayout title={t('student.learningPath.title')} subtitle={t('student.learningPath.subtitle')}>
      <ComingSoon
        title={t('courseApi.comingSoon.learningPath.title')}
        description={t('courseApi.comingSoon.learningPath.description')}
        missing={t('courseApi.comingSoon.learningPath.missing', { returnObjects: true }) as string[]}
      />
    </StudentLayout>
  );
};

export default LearningPathPage;
