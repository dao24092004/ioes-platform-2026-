import React, { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useQuery } from '@tanstack/react-query';
import InstructorLayout from '@/components/layout/InstructorLayout';
import CourseForm, { type CourseFormData } from '@/components/instructor/CourseForm';
import { instructorApi } from '@/services/api';

const CourseEditPage: React.FC = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { courseId } = useParams<{ courseId: string }>();
  const [submitting, setSubmitting] = useState(false);

  const { data: courses = [] } = useQuery({
    queryKey: ['instructor', 'courses'],
    queryFn: () => instructorApi.myCourses(),
  });

  const course = courses.find((c: { id: string }) => c.id === courseId);

  const handleSubmit = async (_data: CourseFormData) => {
    setSubmitting(true);
    await new Promise(resolve => setTimeout(resolve, 800));
    setSubmitting(false);
    navigate('/instructor');
  };

  const handleCancel = () => navigate('/instructor');

  if (!course) {
    return (
      <InstructorLayout title={t('instructor.course.edit')} subtitle={t('instructor.course.subtitle')}>
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
          <h2 className="text-lg font-bold text-slate-900 dark:text-white">Course not found</h2>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-2">
            The course you're trying to edit doesn't exist or has been removed.
          </p>
          <button
            onClick={handleCancel}
            className="mt-6 px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold transition-colors"
          >
            Back to Dashboard
          </button>
        </div>
      </InstructorLayout>
    );
  }

  return (
    <InstructorLayout
      title={t('instructor.course.edit')}
      subtitle={course.title}
      headerActions={
        <button
          onClick={handleCancel}
          className="px-4 py-2.5 rounded-xl text-sm font-semibold border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
        >
          Cancel
        </button>
      }
    >
      <div className="max-w-4xl mx-auto">
        <div className="mb-4 flex items-center gap-2">
          <span
            className={`px-3 py-1 rounded-full text-xs font-semibold ${
              course.status === 'published'
                ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300'
                : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400'
            }`}
          >
            {course.status}
          </span>
          <span className="text-xs text-slate-500 dark:text-slate-400">ID: {course.id}</span>
        </div>
        <CourseForm
          initialData={{
            title: course.title,
            shortDescription: `${course.category} course with ${course.lessons_count} lessons`,
            fullDescription: '',
            category: 'web',
            level: 2,
            tags: [],
            chapters: [],
            pricingModel: 'free',
          }}
          onSubmit={handleSubmit}
          isSubmitting={submitting}
          submitLabel="Save Changes"
        />
      </div>
    </InstructorLayout>
  );
};

export default CourseEditPage;
