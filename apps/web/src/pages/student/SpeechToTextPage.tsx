import React from 'react';
import { useTranslation } from 'react-i18next';
import StudentLayout from '@/components/layout/StudentLayout';
import ComingSoon from '@/components/common/ComingSoon';

/**
 * Tính năng chưa có backend, xem `examApi.comingSoon.speechToText` để biết còn
 * thiếu gì.
 *
 * `services/ai-suite/speech-service` mới chỉ có Dockerfile và pyproject.toml,
 * nên bản ghi âm, điểm phát âm và lịch sử luyện tập cũ đều là số liệu tự bịa
 * và đã được gỡ. Lịch sử git giữ lại giao diện cũ khi cần dựng lại.
 */
const SpeechToTextPage: React.FC = () => {
  const { t } = useTranslation();

  return (
    <StudentLayout title={t('examApi.comingSoon.speechToText.title')}>
      <ComingSoon
        title={t('examApi.comingSoon.speechToText.title')}
        description={t('examApi.comingSoon.speechToText.description')}
        missing={t('examApi.comingSoon.speechToText.missing', { returnObjects: true }) as string[]}
      />
    </StudentLayout>
  );
};

export default SpeechToTextPage;
