import React from 'react';
import { useTranslation } from 'react-i18next';
import InstructorLayout from '@/components/layout/InstructorLayout';
import ComingSoon from '@/components/common/ComingSoon';

/**
 * Tạo bài thi — chưa có backend, xem `examApi.comingSoon.examCreate`.
 *
 * `ExamController` của exam-suite chỉ có GET và `POST /exams/:id/start`, không
 * có `POST /exams`; câu hỏi của đề lấy qua `exam_sections` mà cũng không có
 * API ghi. Form cũ chờ `setTimeout` 800ms rồi quay về như thể đã lưu và đọc
 * danh sách khoá học giả, nên đã được gỡ. Soạn câu hỏi lẻ vẫn làm được ở ngân
 * hàng câu hỏi (`/api/question-bank/questions`).
 */
const ExamCreatePage: React.FC = () => {
  const { t } = useTranslation();

  return (
    <InstructorLayout title={t('instructor.exam.create')}>
      <ComingSoon
        title={t('examApi.comingSoon.examCreate.title')}
        description={t('examApi.comingSoon.examCreate.description')}
        missing={t('examApi.comingSoon.examCreate.missing', { returnObjects: true }) as string[]}
      />
    </InstructorLayout>
  );
};

export default ExamCreatePage;
