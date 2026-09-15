import React, { useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import InstructorLayout from '@/components/layout/InstructorLayout';
import CourseForm, { type CourseFormData, type CourseLevel } from '@/components/instructor/CourseForm';
import {
  contentApi,
  type CourseDetail,
  type UpdateCoursePayload,
} from '@/services/api/content.api';

const toFormData = (detail: CourseDetail): Partial<CourseFormData> => {
  const { course, chapters } = detail;
  const price = course.price ?? 0;
  return {
    title: course.title,
    shortDescription: course.shortDescription ?? '',
    fullDescription: course.description ?? '',
    category: course.categoryId ?? '',
    level: (course.difficultyLevel ?? 1) as CourseLevel,
    thumbnailUrl: course.thumbnailUrl ?? '',
    chapters: chapters.map(ch => ({
      id: ch.id,
      title: ch.title,
      lessons: ch.lessons.map(l => ({
        id: l.id,
        title: l.title,
        type: l.lessonType,
        duration: l.durationMinutes != null ? String(l.durationMinutes) : '',
      })),
    })),
    pricingModel: price > 0 ? 'paid' : 'free',
    price: price > 0 ? String(price) : '',
  };
};

/**
 * Đồng bộ cây chương/bài học của biểu mẫu với backend.
 *
 * Backend chỉ có thêm và xoá, không có sửa: chương/bài học đã có mà bị đổi
 * tên trong biểu mẫu sẽ không được lưu (xem `courseApi.editNotes`).
 */
async function syncCurriculum(courseId: string, detail: CourseDetail, form: CourseFormData) {
  const existingChapters = new Map(detail.chapters.map(ch => [ch.id, ch]));
  const keptChapterIds = new Set(form.chapters.map(ch => ch.id));

  for (const ch of detail.chapters) {
    if (!keptChapterIds.has(ch.id)) {
      await contentApi.deleteChapter(courseId, ch.id);
    }
  }

  for (let ci = 0; ci < form.chapters.length; ci++) {
    const formChapter = form.chapters[ci];
    const existing = existingChapters.get(formChapter.id);
    let chapterId = existing?.id;

    if (!existing) {
      if (!formChapter.title.trim()) continue;
      const created = await contentApi.addChapter(courseId, {
        title: formChapter.title.trim(),
        sortOrder: ci + 1,
      });
      chapterId = created.id;
    } else {
      const keptLessonIds = new Set(formChapter.lessons.map(l => l.id));
      for (const lesson of existing.lessons) {
        if (!keptLessonIds.has(lesson.id)) {
          await contentApi.deleteLesson(courseId, existing.id, lesson.id);
        }
      }
    }

    const existingLessonIds = new Set(existing?.lessons.map(l => l.id) ?? []);
    for (let li = 0; li < formChapter.lessons.length; li++) {
      const lesson = formChapter.lessons[li];
      if (existingLessonIds.has(lesson.id) || !lesson.title.trim()) continue;
      const minutes = parseInt(lesson.duration, 10);
      await contentApi.addLesson(courseId, chapterId!, {
        title: lesson.title.trim(),
        lessonType: lesson.type,
        durationMinutes: Number.isFinite(minutes) ? minutes : null,
        sortOrder: li + 1,
      });
    }
  }
}

const CourseEditPage: React.FC = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const { courseId = '' } = useParams<{ courseId: string }>();
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const { data: detail, isLoading, isError } = useQuery({
    queryKey: ['content', 'course', courseId, 'detail'],
    queryFn: () => contentApi.getCourseDetail(courseId),
    enabled: !!courseId,
  });

  const invalidate = () => {
    qc.invalidateQueries({ queryKey: ['content', 'course', courseId] });
    qc.invalidateQueries({ queryKey: ['content', 'courses'] });
  };

  const submitMut = useMutation({
    mutationFn: () => contentApi.submitCourseForReview(courseId),
    onSuccess: invalidate,
  });
  const publishMut = useMutation({
    mutationFn: () => contentApi.publishCourse(courseId),
    onSuccess: invalidate,
  });

  const handleSubmit = async (data: CourseFormData) => {
    if (!detail) return;
    setSubmitting(true);
    setError(null);
    try {
      // UpdateCourse coi null là "giữ nguyên", nên trường để trống không xoá được giá trị cũ.
      const payload: UpdateCoursePayload = {
        title: data.title.trim(),
        shortDescription: data.shortDescription,
        description: data.fullDescription,
        categoryId: data.category || undefined,
        difficultyLevel: data.level,
        thumbnailUrl: data.thumbnailUrl.trim() || undefined,
      };
      if (data.pricingModel === 'free') {
        payload.price = 0;
      } else {
        const price = Number(data.price);
        if (Number.isFinite(price) && price >= 0) payload.price = price;
      }

      await contentApi.updateCourse(courseId, payload);
      await syncCurriculum(courseId, detail, data);
      invalidate();
      navigate('/instructor/courses');
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleCancel = () => navigate('/instructor/courses');

  if (isLoading) {
    return (
      <InstructorLayout title={t('instructor.course.edit')}>
        <div className="p-12 text-center">
          <div className="inline-block w-8 h-8 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
        </div>
      </InstructorLayout>
    );
  }

  if (isError || !detail) {
    return (
      <InstructorLayout title={t('instructor.course.edit')}>
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-12 text-center">
          <svg
            className="w-16 h-16 text-slate-300 dark:text-slate-700 mx-auto mb-4"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.5"
          >
            <path d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <h2 className="text-lg font-bold text-slate-900 dark:text-white">{t('courseApi.notFound.title')}</h2>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-2">{t('courseApi.notFound.description')}</p>
          <button
            onClick={handleCancel}
            className="mt-6 px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold transition-colors"
          >
            {t('courseApi.actions.backToList')}
          </button>
        </div>
      </InstructorLayout>
    );
  }

  const { course } = detail;
  const review = course.reviewStatus ?? 'none';
  const canSubmit = course.reviewStatus === null || course.reviewStatus === 'rejected';
  const canPublish = course.reviewStatus === 'approved' && course.status !== 'published';
  const actionError = (submitMut.error ?? publishMut.error) as Error | null;

  return (
    <InstructorLayout
      title={t('instructor.course.edit')}
      subtitle={course.title}
      headerActions={
        <div className="flex items-center gap-2">
          {canSubmit && (
            <button
              onClick={() => submitMut.mutate()}
              disabled={submitMut.isPending}
              className="px-4 py-2.5 rounded-xl text-sm font-semibold bg-amber-500 hover:bg-amber-600 text-white transition-colors disabled:opacity-50"
            >
              {t('courseApi.actions.submit')}
            </button>
          )}
          {canPublish && (
            <button
              onClick={() => publishMut.mutate()}
              disabled={publishMut.isPending}
              className="px-4 py-2.5 rounded-xl text-sm font-semibold bg-emerald-600 hover:bg-emerald-700 text-white transition-colors disabled:opacity-50"
            >
              {t('courseApi.actions.publish')}
            </button>
          )}
          <Link
            to="/instructor/courses"
            className="px-4 py-2.5 rounded-xl text-sm font-semibold border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
          >
            {t('common.cancel')}
          </Link>
        </div>
      }
    >
      <div className="max-w-4xl mx-auto">
        <div className="mb-4 flex flex-wrap items-center gap-2">
          <span
            className={`px-3 py-1 rounded-full text-xs font-semibold ${
              course.status === 'published'
                ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300'
                : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400'
            }`}
          >
            {t(`instructor.courses.status.${course.status}`)}
          </span>
          <span className="px-3 py-1 rounded-full text-xs font-semibold bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300">
            {t(`courseApi.reviewStatus.${review}`)}
          </span>
          <span className="text-xs text-slate-500 dark:text-slate-400">ID: {course.id}</span>
        </div>

        {course.reviewStatus === 'rejected' && course.rejectionReason && (
          <div className="mb-4 p-3 rounded-xl bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-sm text-red-700 dark:text-red-300">
            <strong>{t('admin.approval.rejectionReason')}:</strong> {course.rejectionReason}
          </div>
        )}

        <div className="mb-4 p-3 rounded-xl bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-900/50 text-xs text-amber-800 dark:text-amber-300">
          {t('courseApi.editNotes')}
        </div>

        {(error || actionError) && (
          <div className="mb-4 p-3 rounded-xl bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-sm text-red-700 dark:text-red-300">
            {error ?? actionError?.message}
          </div>
        )}

        <CourseForm
          key={course.id}
          initialData={toFormData(detail)}
          onSubmit={handleSubmit}
          isSubmitting={submitting}
          submitLabel={t('common.save')}
        />
      </div>
    </InstructorLayout>
  );
};

export default CourseEditPage;
