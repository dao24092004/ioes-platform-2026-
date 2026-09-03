import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import InstructorLayout from '@/components/layout/InstructorLayout';
import CourseForm, { type CourseFormData } from '@/components/instructor/CourseForm';

const CourseCreatePage: React.FC = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (_data: CourseFormData) => {
    setSubmitting(true);
    await new Promise(resolve => setTimeout(resolve, 800));
    setSubmitting(false);
    navigate('/instructor');
  };

  const handleSaveDraft = () => {
    navigate('/instructor');
  };

  return (
    <InstructorLayout
      title={t('instructor.course.create')}
      subtitle={t('instructor.course.subtitle')}
      headerActions={
        <button
          onClick={handleSaveDraft}
          className="px-4 py-2.5 rounded-xl text-sm font-semibold border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
        >
          {t('instructor.course.saveDraft')}
        </button>
      }
    >
      <div className="max-w-4xl mx-auto">
        <CourseForm onSubmit={handleSubmit} isSubmitting={submitting} />
      </div>
    </InstructorLayout>
  );
};

export default CourseCreatePage;
