import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useQueryClient } from '@tanstack/react-query';
import InstructorLayout from '@/components/layout/InstructorLayout';
import CourseForm, { type CourseFormData } from '@/components/instructor/CourseForm';
import { contentApi } from '@/services/api/content.api';

/** Slug từ tiêu đề: bỏ dấu tiếng Việt, chỉ giữ a-z, 0-9 và gạch nối. */
const slugify = (title: string): string =>
  title
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[đĐ]/g, 'd')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 200);

/**
 * Tạo khoá học qua content-service.
 *
 * Khoá mới luôn ở trạng thái nháp; giảng viên gửi duyệt và xuất bản ở trang sửa.
 * Chương và bài học phải tạo lần lượt vì backend không nhận cả cây trong một request.
 */
const CourseCreatePage: React.FC = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (data: CourseFormData) => {
    setSubmitting(true);
    setError(null);
    let courseId: string | null = null;
    try {
      const price = data.pricingModel === 'paid' ? Number(data.price) : 0;
      const course = await contentApi.createCourse({
        title: data.title.trim(),
        // Slug phải duy nhất; hậu tố thời gian tránh trùng khi hai khoá cùng tên.
        slug: `${slugify(data.title) || 'khoa-hoc'}-${Date.now().toString(36)}`,
        categoryId: data.category || null,
        shortDescription: data.shortDescription.trim() || null,
        description: data.fullDescription.trim() || null,
        thumbnailUrl: data.thumbnailUrl.trim() || null,
        price: Number.isFinite(price) && price > 0 ? price : 0,
        currency: 'VND',
        difficultyLevel: data.level,
        language: 'vi',
      });
      courseId = course.id;

      const chapters = data.chapters.filter(ch => ch.title.trim());
      for (let ci = 0; ci < chapters.length; ci++) {
        const chapter = await contentApi.addChapter(course.id, {
          title: chapters[ci].title.trim(),
          sortOrder: ci + 1,
        });
        const lessons = chapters[ci].lessons.filter(l => l.title.trim());
        for (let li = 0; li < lessons.length; li++) {
          const minutes = parseInt(lessons[li].duration, 10);
          await contentApi.addLesson(course.id, chapter.id, {
            title: lessons[li].title.trim(),
            lessonType: lessons[li].type,
            durationMinutes: Number.isFinite(minutes) ? minutes : null,
            sortOrder: li + 1,
          });
        }
      }

      qc.invalidateQueries({ queryKey: ['content', 'courses'] });
      navigate(`/instructor/courses/${course.id}/edit`);
    } catch (err) {
      if (courseId) {
        // Khoá đã được tạo nhưng chương/bài học lỗi giữa chừng: chuyển sang trang sửa
        // để làm tiếp, thay vì bấm lại và tạo ra khoá trùng.
        qc.invalidateQueries({ queryKey: ['content', 'courses'] });
        navigate(`/instructor/courses/${courseId}/edit`);
        return;
      }
      setError((err as Error).message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <InstructorLayout title={t('instructor.course.create')} subtitle={t('instructor.course.subtitle')}>
      <div className="max-w-4xl mx-auto">
        {error && (
          <div className="mb-4 p-3 rounded-xl bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-sm text-red-700 dark:text-red-300">
            {error}
          </div>
        )}
        <CourseForm
          onSubmit={handleSubmit}
          isSubmitting={submitting}
          submitLabel={t('instructor.course.saveDraft')}
        />
      </div>
    </InstructorLayout>
  );
};

export default CourseCreatePage;
