import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useQuery } from '@tanstack/react-query';
import { contentApi, type LessonType } from '@/services/api/content.api';

/** Backend chỉ có giá (`price`), không có gói subscription. */
export type CoursePricingModel = 'free' | 'paid';
/** Khớp ràng buộc `difficulty_level BETWEEN 1 AND 5` của bảng courses. */
export type CourseLevel = 1 | 2 | 3 | 4 | 5;

export interface LessonDraft {
  id: string;
  title: string;
  type: LessonType;
  duration: string;
}

export interface ChapterDraft {
  id: string;
  title: string;
  lessons: LessonDraft[];
}

export interface CourseFormData {
  title: string;
  shortDescription: string;
  fullDescription: string;
  /** Id danh mục thật, lấy từ `GET /api/v1/categories`. */
  category: string;
  level: CourseLevel;
  /** Backend chưa có API upload ảnh, nên nhận URL ảnh có sẵn. */
  thumbnailUrl: string;
  chapters: ChapterDraft[];
  pricingModel: CoursePricingModel;
  price: string;
}

export interface CourseFormProps {
  initialData?: Partial<CourseFormData>;
  onSubmit: (data: CourseFormData) => Promise<void> | void;
  isSubmitting?: boolean;
  submitLabel?: string;
}

const LEVELS: CourseLevel[] = [1, 2, 3, 4, 5];
const LESSON_TYPES: LessonType[] = ['video', 'document', 'quiz', 'assignment', 'live'];

const newChapter = (): ChapterDraft => ({
  id: `ch-${Math.random().toString(36).slice(2, 9)}`,
  title: '',
  lessons: [],
});

const newLesson = (): LessonDraft => ({
  id: `l-${Math.random().toString(36).slice(2, 9)}`,
  title: '',
  type: 'video',
  duration: '',
});

const CourseForm: React.FC<CourseFormProps> = ({ initialData, onSubmit, isSubmitting, submitLabel }) => {
  const { t } = useTranslation();
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [data, setData] = useState<CourseFormData>({
    title: initialData?.title ?? '',
    shortDescription: initialData?.shortDescription ?? '',
    fullDescription: initialData?.fullDescription ?? '',
    category: initialData?.category ?? '',
    level: initialData?.level ?? 1,
    thumbnailUrl: initialData?.thumbnailUrl ?? '',
    chapters: initialData?.chapters ?? [newChapter()],
    pricingModel: initialData?.pricingModel ?? 'free',
    price: initialData?.price ?? '',
  });

  const [errors, setErrors] = useState<Partial<Record<keyof CourseFormData, string>>>({});

  const handleAddChapter = () => {
    setData({ ...data, chapters: [...data.chapters, newChapter()] });
  };

  const handleRemoveChapter = (id: string) => {
    setData({ ...data, chapters: data.chapters.filter(c => c.id !== id) });
  };

  const handleUpdateChapter = (id: string, field: 'title', value: string) => {
    setData({
      ...data,
      chapters: data.chapters.map(c => (c.id === id ? { ...c, [field]: value } : c)),
    });
  };

  const handleAddLesson = (chapterId: string) => {
    setData({
      ...data,
      chapters: data.chapters.map(c =>
        c.id === chapterId ? { ...c, lessons: [...c.lessons, newLesson()] } : c,
      ),
    });
  };

  const handleUpdateLesson = (
    chapterId: string,
    lessonId: string,
    field: keyof LessonDraft,
    value: string,
  ) => {
    setData({
      ...data,
      chapters: data.chapters.map(c =>
        c.id === chapterId
          ? { ...c, lessons: c.lessons.map(l => (l.id === lessonId ? { ...l, [field]: value } : l)) }
          : c,
      ),
    });
  };

  const handleRemoveLesson = (chapterId: string, lessonId: string) => {
    setData({
      ...data,
      chapters: data.chapters.map(c =>
        c.id === chapterId ? { ...c, lessons: c.lessons.filter(l => l.id !== lessonId) } : c,
      ),
    });
  };

  const validateStep = (s: 1 | 2 | 3): boolean => {
    const newErrors: Partial<Record<keyof CourseFormData, string>> = {};
    if (s === 1) {
      if (!data.title.trim()) newErrors.title = 'Required';
      if (!data.category) newErrors.category = 'Required';
    }
    if (s === 3) {
      if (data.pricingModel === 'paid' && !data.price.trim()) {
        newErrors.price = 'Required';
      }
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleNext = () => {
    if (validateStep(step)) setStep(prev => (prev < 3 ? ((prev + 1) as 1 | 2 | 3) : prev));
  };

  const handleBack = () => setStep(prev => (prev > 1 ? ((prev - 1) as 1 | 2 | 3) : prev));

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateStep(3)) return;
    onSubmit(data);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <Stepper step={step} setStep={setStep} />

      {step === 1 && (
        <BasicInfoStep data={data} setData={setData} errors={errors} />
      )}

      {step === 2 && (
        <CurriculumStep
          chapters={data.chapters}
          onAddChapter={handleAddChapter}
          onRemoveChapter={handleRemoveChapter}
          onUpdateChapter={handleUpdateChapter}
          onAddLesson={handleAddLesson}
          onUpdateLesson={handleUpdateLesson}
          onRemoveLesson={handleRemoveLesson}
        />
      )}

      {step === 3 && (
        <PricingStep data={data} setData={setData} errors={errors} />
      )}

      <div className="flex items-center justify-between pt-4 border-t border-slate-200 dark:border-slate-800">
        <button
          type="button"
          onClick={handleBack}
          disabled={step === 1}
          className="px-5 py-2.5 rounded-xl text-sm font-semibold border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
        >
          ← Back
        </button>
        {step < 3 ? (
          <button
            type="button"
            onClick={handleNext}
            className="px-5 py-2.5 rounded-xl text-sm font-semibold bg-blue-600 hover:bg-blue-700 text-white transition-colors"
          >
            Next →
          </button>
        ) : (
          <button
            type="submit"
            disabled={isSubmitting}
            className="px-5 py-2.5 rounded-xl text-sm font-semibold bg-blue-600 hover:bg-blue-700 disabled:opacity-60 text-white transition-colors flex items-center gap-2"
          >
            {isSubmitting && (
              <svg className="animate-spin w-4 h-4" viewBox="0 0 24 24" fill="none">
                <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" opacity="0.3" />
                <path d="M12 2a10 10 0 0 1 10 10" stroke="currentColor" strokeWidth="3" />
              </svg>
            )}
            {submitLabel ?? t('instructor.course.publish')}
          </button>
        )}
      </div>
    </form>
  );
};

interface StepperProps {
  step: 1 | 2 | 3;
  setStep: (s: 1 | 2 | 3) => void;
}

const Stepper: React.FC<StepperProps> = ({ step, setStep }) => {
  const { t } = useTranslation();
  const steps = [
    { id: 1 as const, key: 'instructor.course.steps.basic' },
    { id: 2 as const, key: 'instructor.course.steps.content' },
    { id: 3 as const, key: 'instructor.course.steps.pricing' },
  ];
  return (
    <div className="flex items-center gap-2 mb-2">
      {steps.map((s, idx) => (
        <React.Fragment key={s.id}>
          <button
            type="button"
            onClick={() => setStep(s.id)}
            className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-semibold transition-colors ${
              step === s.id
                ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300'
                : step > s.id
                ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300'
                : 'bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400'
            }`}
          >
            <span className="w-6 h-6 rounded-full bg-white dark:bg-slate-900 flex items-center justify-center text-xs">
              {step > s.id ? '✓' : s.id}
            </span>
            <span className="hidden sm:inline">{t(s.key)}</span>
          </button>
          {idx < steps.length - 1 && (
            <div className={`flex-1 h-0.5 ${step > s.id ? 'bg-emerald-300' : 'bg-slate-200 dark:bg-slate-700'}`} />
          )}
        </React.Fragment>
      ))}
    </div>
  );
};

interface BasicInfoStepProps {
  data: CourseFormData;
  setData: (data: CourseFormData) => void;
  errors: Partial<Record<keyof CourseFormData, string>>;
}

const BasicInfoStep: React.FC<BasicInfoStepProps> = ({ data, setData, errors }) => {
  const { t } = useTranslation();
  const { data: categories = [], isLoading: categoriesLoading } = useQuery({
    queryKey: ['content', 'categories'],
    queryFn: contentApi.listCategories,
    staleTime: 5 * 60_000,
  });
  return (
    <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-6 space-y-5">
      <h2 className="text-base font-bold text-slate-900 dark:text-white">{t('instructor.course.info.title')}</h2>

      <Field label={t('instructor.course.info.courseTitle')} error={errors.title} required>
        <input
          type="text"
          value={data.title}
          onChange={e => setData({ ...data, title: e.target.value })}
          placeholder={t('instructor.course.info.courseTitlePlaceholder')}
          className="input-base"
        />
      </Field>

      <Field label={t('instructor.course.info.shortDesc')} required>
        <textarea
          rows={2}
          maxLength={200}
          value={data.shortDescription}
          onChange={e => setData({ ...data, shortDescription: e.target.value })}
          placeholder={t('instructor.course.info.shortDescPlaceholder')}
          className="input-base resize-none"
        />
        <div className="text-xs text-slate-500 dark:text-slate-400 mt-1 text-right">
          {data.shortDescription.length}/200
        </div>
      </Field>

      <Field label={t('instructor.course.info.fullDesc')}>
        <textarea
          rows={5}
          value={data.fullDescription}
          onChange={e => setData({ ...data, fullDescription: e.target.value })}
          placeholder={t('instructor.course.info.fullDescPlaceholder')}
          className="input-base resize-none"
        />
      </Field>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        <Field label={t('instructor.course.info.category')} error={errors.category} required>
          <select
            value={data.category}
            onChange={e => setData({ ...data, category: e.target.value })}
            className="input-base"
            disabled={categoriesLoading}
          >
            <option value="">{t('instructor.course.info.selectCategory')}</option>
            {categories.map(c => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </Field>

        <Field label={t('instructor.course.info.level')} required>
          <select
            value={data.level}
            onChange={e => setData({ ...data, level: Number(e.target.value) as CourseLevel })}
            className="input-base"
          >
            {LEVELS.map(level => (
              <option key={level} value={level}>
                {t(`courseApi.level.${level}`)}
              </option>
            ))}
          </select>
        </Field>
      </div>

      <Field label={t('instructor.course.info.thumbnail')}>
        <input
          type="url"
          maxLength={500}
          value={data.thumbnailUrl}
          onChange={e => setData({ ...data, thumbnailUrl: e.target.value })}
          placeholder="https://"
          className="input-base"
        />
        {data.thumbnailUrl.trim() && (
          <img
            src={data.thumbnailUrl.trim()}
            alt={data.title}
            className="mt-3 w-full max-w-sm aspect-video object-cover rounded-xl border border-slate-200 dark:border-slate-700"
          />
        )}
      </Field>
    </div>
  );
};

interface CurriculumStepProps {
  chapters: ChapterDraft[];
  onAddChapter: () => void;
  onRemoveChapter: (id: string) => void;
  onUpdateChapter: (id: string, field: 'title', value: string) => void;
  onAddLesson: (chapterId: string) => void;
  onUpdateLesson: (chapterId: string, lessonId: string, field: keyof LessonDraft, value: string) => void;
  onRemoveLesson: (chapterId: string, lessonId: string) => void;
}

const CurriculumStep: React.FC<CurriculumStepProps> = ({
  chapters,
  onAddChapter,
  onRemoveChapter,
  onUpdateChapter,
  onAddLesson,
  onUpdateLesson,
  onRemoveLesson,
}) => {
  const { t } = useTranslation();
  return (
    <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-6 space-y-5">
      <div className="flex items-center justify-between">
        <h2 className="text-base font-bold text-slate-900 dark:text-white">{t('instructor.course.curriculum.title')}</h2>
        <button
          type="button"
          onClick={onAddChapter}
          className="px-3 py-2 rounded-lg bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300 text-sm font-semibold hover:bg-blue-200 dark:hover:bg-blue-900/60 transition-colors flex items-center gap-1"
        >
          <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <path d="M12 5v14M5 12h14" />
          </svg>
          {t('instructor.course.curriculum.addChapter')}
        </button>
      </div>

      <ul className="space-y-4">
        {chapters.map((chapter, cIdx) => (
          <li key={chapter.id} className="border border-slate-200 dark:border-slate-700 rounded-xl p-4">
            <div className="flex items-start gap-3 mb-3">
              <span className="w-8 h-8 rounded-lg bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-sm font-bold text-slate-600 dark:text-slate-300 flex-shrink-0">
                {cIdx + 1}
              </span>
              <input
                type="text"
                value={chapter.title}
                onChange={e => onUpdateChapter(chapter.id, 'title', e.target.value)}
                placeholder={t('instructor.course.curriculum.chapterPlaceholder')}
                className="input-base flex-1"
              />
              <button
                type="button"
                onClick={() => onRemoveChapter(chapter.id)}
                className="w-10 h-10 rounded-lg flex items-center justify-center text-slate-400 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-900/30 transition-colors flex-shrink-0"
                aria-label="Remove chapter"
              >
                <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6M1 7h22M9 7V4a1 1 0 011-1h4a1 1 0 011 1v3" />
                </svg>
              </button>
            </div>

            <ul className="space-y-2 pl-11">
              {chapter.lessons.map(lesson => (
                <li key={lesson.id} className="flex items-center gap-2">
                  <select
                    value={lesson.type}
                    onChange={e => onUpdateLesson(chapter.id, lesson.id, 'type', e.target.value)}
                    className="input-base !w-auto text-xs py-2"
                  >
                    {LESSON_TYPES.map(type => (
                      <option key={type} value={type}>
                        {t(`courseApi.lessonType.${type}`)}
                      </option>
                    ))}
                  </select>
                  <input
                    type="text"
                    value={lesson.title}
                    onChange={e => onUpdateLesson(chapter.id, lesson.id, 'title', e.target.value)}
                    placeholder={t('instructor.course.curriculum.lessonPlaceholder')}
                    className="input-base flex-1 text-sm"
                  />
                  <input
                    type="text"
                    value={lesson.duration}
                    onChange={e => onUpdateLesson(chapter.id, lesson.id, 'duration', e.target.value)}
                    placeholder={t('instructor.course.curriculum.durationPlaceholder')}
                    className="input-base !w-24 text-sm"
                  />
                  <button
                    type="button"
                    onClick={() => onRemoveLesson(chapter.id, lesson.id)}
                    className="w-9 h-9 rounded-lg flex items-center justify-center text-slate-400 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-900/30 transition-colors flex-shrink-0"
                    aria-label="Remove lesson"
                  >
                    ×
                  </button>
                </li>
              ))}
              <li>
                <button
                  type="button"
                  onClick={() => onAddLesson(chapter.id)}
                  className="text-sm text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1 py-1"
                >
                  <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M12 5v14M5 12h14" />
                  </svg>
                  {t('instructor.course.curriculum.addLesson')}
                </button>
              </li>
            </ul>
          </li>
        ))}
      </ul>
    </div>
  );
};

interface PricingStepProps {
  data: CourseFormData;
  setData: (data: CourseFormData) => void;
  errors: Partial<Record<keyof CourseFormData, string>>;
}

const PricingStep: React.FC<PricingStepProps> = ({ data, setData, errors }) => {
  const { t } = useTranslation();
  return (
    <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-6 space-y-5">
      <h2 className="text-base font-bold text-slate-900 dark:text-white">{t('instructor.course.pricing.title')}</h2>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <PricingCard
          selected={data.pricingModel === 'free'}
          onClick={() => setData({ ...data, pricingModel: 'free' })}
          color="emerald"
          title={t('instructor.course.pricing.free')}
          desc={t('instructor.course.pricing.freeDesc')}
          icon={<GiftIcon />}
        />
        <PricingCard
          selected={data.pricingModel === 'paid'}
          onClick={() => setData({ ...data, pricingModel: 'paid' })}
          color="blue"
          title={t('instructor.course.pricing.paid')}
          desc={t('instructor.course.pricing.paidDesc')}
          icon={<DollarIcon />}
        />
      </div>

      {data.pricingModel === 'paid' && (
        <Field label={`${t('instructor.course.pricing.paid')} (VND)`} error={errors.price} required>
          <input
            type="number"
            min="0"
            step="1000"
            value={data.price}
            onChange={e => setData({ ...data, price: e.target.value })}
            className="input-base"
            placeholder="499000"
          />
        </Field>
      )}
    </div>
  );
};

interface PricingCardProps {
  selected: boolean;
  onClick: () => void;
  color: 'emerald' | 'blue';
  title: string;
  desc: string;
  icon: React.ReactNode;
}

const PricingCard: React.FC<PricingCardProps> = ({ selected, onClick, color, title, desc, icon }) => {
  const colorMap: Record<PricingCardProps['color'], string> = {
    emerald: 'text-emerald-600 bg-emerald-100 dark:bg-emerald-900/40 dark:text-emerald-300',
    blue: 'text-blue-600 bg-blue-100 dark:bg-blue-900/40 dark:text-blue-300',
  };
  return (
    <button
      type="button"
      onClick={onClick}
      className={`text-left p-4 rounded-xl border-2 transition-all ${
        selected
          ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
          : 'border-slate-200 dark:border-slate-700 hover:border-blue-300'
      }`}
    >
      <div className={`w-10 h-10 rounded-lg flex items-center justify-center mb-3 ${colorMap[color]}`}>{icon}</div>
      <div className="font-bold text-slate-900 dark:text-white">{title}</div>
      <div className="text-xs text-slate-500 dark:text-slate-400 mt-1">{desc}</div>
    </button>
  );
};

interface FieldProps {
  label: string;
  hint?: string;
  error?: string;
  required?: boolean;
  children: React.ReactNode;
}

const Field: React.FC<FieldProps> = ({ label, hint, error, required, children }) => (
  <div>
    <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
      {label}
      {required && <span className="text-rose-500 ml-0.5">*</span>}
    </label>
    {children}
    {hint && !error && <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">{hint}</p>}
    {error && <p className="text-xs text-rose-500 mt-1">{error}</p>}
  </div>
);

const GiftIcon = () => (
  <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M20 12v10H4V12M2 7h20v5H2zM12 22V7M12 7H7.5a2.5 2.5 0 010-5C11 2 12 7 12 7zM12 7h4.5a2.5 2.5 0 000-5C13 2 12 7 12 7z" />
  </svg>
);

const DollarIcon = () => (
  <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <line x1="12" y1="1" x2="12" y2="23" />
    <path d="M17 5H9.5a3.5 3.5 0 000 7h5a3.5 3.5 0 010 7H6" />
  </svg>
);

export default CourseForm;
