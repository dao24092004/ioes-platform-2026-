import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import InstructorLayout from '@/components/layout/InstructorLayout';
import { instructorApi, type InstructorCourseRow } from '@/services/api';
import { useQuery } from '@tanstack/react-query';

type QuestionType = 'mc' | 'essay' | 'coding' | 'tf';

interface OptionDraft {
  id: string;
  text: string;
  correct: boolean;
}

interface QuestionDraft {
  id: string;
  type: QuestionType;
  content: string;
  points: number;
  options: OptionDraft[];
}

const ExamCreatePage: React.FC = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();

  const { data: courses = [] } = useQuery({
    queryKey: ['instructor', 'courses'],
    queryFn: () => instructorApi.myCourses(),
  });

  const [name, setName] = useState('');
  const [courseId, setCourseId] = useState('');
  const [duration, setDuration] = useState<number>(60);
  const [description, setDescription] = useState('');
  const [proctoring, setProctoring] = useState(true);
  const [randomize, setRandomize] = useState(true);
  const [showResults, setShowResults] = useState(false);
  const [autoGrade, setAutoGrade] = useState(true);
  const [questions, setQuestions] = useState<QuestionDraft[]>([]);
  const [activeType, setActiveType] = useState<QuestionType>('mc');
  const [submitting, setSubmitting] = useState(false);

  const timerPresets = [15, 30, 60, 90, 120];

  const newOption = (): OptionDraft => ({
    id: `o-${Math.random().toString(36).slice(2, 9)}`,
    text: '',
    correct: false,
  });

  const newQuestion = (type: QuestionType): QuestionDraft => ({
    id: `q-${Math.random().toString(36).slice(2, 9)}`,
    type,
    content: '',
    points: 10,
    options: type === 'mc' || type === 'tf' ? [newOption(), newOption(), newOption(), newOption()] : [],
  });

  const handleAddQuestion = () => {
    setQuestions([...questions, newQuestion(activeType)]);
  };

  const handleUpdateQuestion = (id: string, field: keyof QuestionDraft, value: string | number) => {
    setQuestions(questions.map(q => (q.id === id ? { ...q, [field]: value } : q)));
  };

  const handleRemoveQuestion = (id: string) => {
    setQuestions(questions.filter(q => q.id !== id));
  };

  const handleUpdateOption = (qId: string, oId: string, field: 'text' | 'correct', value: string | boolean) => {
    setQuestions(
      questions.map(q =>
        q.id === qId
          ? { ...q, options: q.options.map(o => (o.id === oId ? { ...o, [field]: value } : o)) }
          : q,
      ),
    );
  };

  const handleAddOption = (qId: string) => {
    setQuestions(questions.map(q => (q.id === qId ? { ...q, options: [...q.options, newOption()] } : q)));
  };

  const handleRemoveOption = (qId: string, oId: string) => {
    setQuestions(
      questions.map(q => (q.id === qId ? { ...q, options: q.options.filter(o => o.id !== oId) } : q)),
    );
  };

  const handleSubmit = async () => {
    if (!name.trim() || !courseId) return;
    setSubmitting(true);
    await new Promise(resolve => setTimeout(resolve, 800));
    setSubmitting(false);
    navigate('/instructor');
  };

  const handleSaveDraft = () => navigate('/instructor');

  const totalPoints = questions.reduce((sum, q) => sum + q.points, 0);

  return (
    <InstructorLayout
      title={t('instructor.exam.create')}
      subtitle={t('instructor.exam.info.title')}
      headerActions={
        <button
          onClick={handleSaveDraft}
          className="px-4 py-2.5 rounded-xl text-sm font-semibold border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
        >
          {t('instructor.exam.saveDraft')}
        </button>
      }
    >
      <div className="max-w-5xl mx-auto space-y-6">
        <Card title={t('instructor.exam.info.title')} icon={<DocumentIcon />} color="primary">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <Field label={t('instructor.exam.info.name')} required>
              <input
                type="text"
                value={name}
                onChange={e => setName(e.target.value)}
                placeholder={t('instructor.exam.info.namePlaceholder')}
                className="input-base"
              />
            </Field>

            <Field label={t('instructor.exam.info.course')} required>
              <select value={courseId} onChange={e => setCourseId(e.target.value)} className="input-base">
                <option value="">{t('instructor.exam.info.selectCourse')}</option>
                {courses.map((c: InstructorCourseRow) => (
                  <option key={c.id} value={c.id}>
                    {c.title}
                  </option>
                ))}
              </select>
            </Field>
          </div>

          <Field label={t('instructor.exam.info.duration')} required>
            <div className="flex flex-wrap gap-2">
              {timerPresets.map(mins => (
                <button
                  key={mins}
                  type="button"
                  onClick={() => setDuration(mins)}
                  className={`px-4 py-2 rounded-lg text-sm font-semibold border transition-all ${
                    duration === mins
                      ? 'bg-blue-600 text-white border-blue-600'
                      : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:border-blue-400'
                  }`}
                >
                  {t(`instructor.exam.timerOptions.${mins}`)}
                </button>
              ))}
            </div>
          </Field>

          <Field label={t('instructor.exam.info.description')}>
            <textarea
              rows={3}
              value={description}
              onChange={e => setDescription(e.target.value)}
              placeholder={t('instructor.exam.info.descriptionPlaceholder')}
              className="input-base resize-none"
            />
          </Field>

          <div className="space-y-3 pt-2 border-t border-slate-100 dark:border-slate-800">
            <Toggle label={t('instructor.exam.info.options.proctoring')} checked={proctoring} onChange={setProctoring} />
            <Toggle label={t('instructor.exam.info.options.randomize')} checked={randomize} onChange={setRandomize} />
            <Toggle
              label={t('instructor.exam.info.options.showResults')}
              checked={showResults}
              onChange={setShowResults}
            />
            <Toggle label={t('instructor.exam.info.options.autoGrade')} checked={autoGrade} onChange={setAutoGrade} />
          </div>
        </Card>

        <Card title={t('instructor.exam.questionTypes.title')} icon={<SparklesIcon />} color="success">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {(
              [
                { id: 'mc' as const, label: t('instructor.exam.questionTypes.mc'), color: 'blue' },
                { id: 'essay' as const, label: t('instructor.exam.questionTypes.essay'), color: 'purple' },
                { id: 'coding' as const, label: t('instructor.exam.questionTypes.coding'), color: 'orange' },
                { id: 'tf' as const, label: t('instructor.exam.questionTypes.tf'), color: 'emerald' },
              ]
            ).map(qt => (
              <button
                key={qt.id}
                type="button"
                onClick={() => setActiveType(qt.id)}
                className={`p-4 rounded-xl border-2 transition-all flex flex-col items-center gap-2 ${
                  activeType === qt.id
                    ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                    : 'border-slate-200 dark:border-slate-700 hover:border-blue-300'
                }`}
              >
                <QuestionTypeIcon type={qt.id} />
                <span className="text-sm font-semibold text-slate-900 dark:text-white">{qt.label}</span>
              </button>
            ))}
          </div>
        </Card>

        <Card
          title={`${t('instructor.exam.questions.title')} (${questions.length} câu)`}
          icon={<ListIcon />}
          color="warning"
          action={
            <button
              type="button"
              onClick={handleAddQuestion}
              className="px-3 py-2 rounded-lg bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300 text-sm font-semibold hover:bg-blue-200 dark:hover:bg-blue-900/60 transition-colors flex items-center gap-1"
            >
              <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <path d="M12 5v14M5 12h14" />
              </svg>
              {t('instructor.exam.questions.addNew')}
            </button>
          }
        >
          {questions.length === 0 ? (
            <p className="text-sm text-slate-500 dark:text-slate-400 text-center py-6">
              No questions yet. Add one to get started.
            </p>
          ) : (
            <ul className="space-y-4">
              {questions.map((q, idx) => (
                <li
                  key={q.id}
                  className="border border-slate-200 dark:border-slate-700 rounded-xl p-4 space-y-3"
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-xs font-bold text-slate-700 dark:text-slate-300">
                      Câu {idx + 1} — {questionTypeLabel(q.type, t)}
                    </span>
                    <button
                      type="button"
                      onClick={() => handleRemoveQuestion(q.id)}
                      className="w-8 h-8 rounded-lg flex items-center justify-center text-slate-400 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-900/30 transition-colors"
                      aria-label="Remove question"
                    >
                      <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6M1 7h22M9 7V4a1 1 0 011-1h4a1 1 0 011 1v3" />
                      </svg>
                    </button>
                  </div>

                  <textarea
                    value={q.content}
                    onChange={e => handleUpdateQuestion(q.id, 'content', e.target.value)}
                    placeholder={t('instructor.exam.questions.placeholder')}
                    className="input-base resize-none"
                    rows={3}
                  />

                  <div className="flex items-center gap-2">
                    <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                      {t('instructor.exam.questions.points')}
                    </label>
                    <input
                      type="number"
                      min="0"
                      value={q.points}
                      onChange={e => handleUpdateQuestion(q.id, 'points', Number(e.target.value))}
                      className="input-base !w-24 text-sm"
                    />
                  </div>

                  {(q.type === 'mc' || q.type === 'tf') && (
                    <div className="space-y-2 pl-3 border-l-2 border-slate-200 dark:border-slate-700">
                      {q.options.map((opt, oIdx) => (
                        <div key={opt.id} className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => handleUpdateOption(q.id, opt.id, 'correct', !opt.correct)}
                            className={`w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all ${
                              opt.correct
                                ? 'border-emerald-500 bg-emerald-500'
                                : 'border-slate-300 dark:border-slate-600 hover:border-emerald-400'
                            }`}
                            aria-label="Mark as correct"
                          >
                            {opt.correct && (
                              <svg className="w-3 h-3 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                                <path d="M5 13l4 4L19 7" />
                              </svg>
                            )}
                          </button>
                          <input
                            type="text"
                            value={opt.text}
                            onChange={e => handleUpdateOption(q.id, opt.id, 'text', e.target.value)}
                            placeholder={`${t('instructor.exam.questions.optionPlaceholder')} ${String.fromCharCode(65 + oIdx)}`}
                            className="input-base flex-1 text-sm"
                          />
                          <button
                            type="button"
                            onClick={() => handleRemoveOption(q.id, opt.id)}
                            className="w-8 h-8 rounded-lg flex items-center justify-center text-slate-400 hover:text-rose-500 transition-colors"
                            aria-label="Remove option"
                          >
                            ×
                          </button>
                        </div>
                      ))}
                      <button
                        type="button"
                        onClick={() => handleAddOption(q.id)}
                        className="text-sm text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1 py-1"
                      >
                        <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <path d="M12 4v16m8-8H4" />
                        </svg>
                        {t('instructor.exam.questions.addOption')}
                      </button>
                    </div>
                  )}
                </li>
              ))}
            </ul>
          )}
        </Card>

        <div className="flex items-center justify-between bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-4">
          <div className="text-sm text-slate-600 dark:text-slate-400">
            {questions.length} {t('instructor.exam.questions.title').toLowerCase()} • {totalPoints} {t('instructor.exam.questions.points').replace(':', '')}
          </div>
          <button
            type="button"
            onClick={handleSubmit}
            disabled={submitting || !name.trim() || !courseId}
            className="px-6 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed text-white text-sm font-semibold transition-colors flex items-center gap-2"
          >
            {submitting && (
              <svg className="animate-spin w-4 h-4" viewBox="0 0 24 24" fill="none">
                <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" opacity="0.3" />
                <path d="M12 2a10 10 0 0 1 10 10" stroke="currentColor" strokeWidth="3" />
              </svg>
            )}
            {t('instructor.exam.publish')}
          </button>
        </div>
      </div>
    </InstructorLayout>
  );
};

interface CardProps {
  title: string;
  icon: React.ReactNode;
  color: 'primary' | 'success' | 'warning';
  children: React.ReactNode;
  action?: React.ReactNode;
}

const Card: React.FC<CardProps> = ({ title, icon, color, children, action }) => {
  const colorMap: Record<CardProps['color'], string> = {
    primary: 'bg-blue-100 text-blue-600 dark:bg-blue-900/40 dark:text-blue-300',
    success: 'bg-emerald-100 text-emerald-600 dark:bg-emerald-900/40 dark:text-emerald-300',
    warning: 'bg-amber-100 text-amber-600 dark:bg-amber-900/40 dark:text-amber-300',
  };
  return (
    <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 overflow-hidden">
      <div className="px-5 py-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between gap-3">
        <h2 className="flex items-center gap-3 text-base font-bold text-slate-900 dark:text-white">
          <span className={`w-8 h-8 rounded-lg flex items-center justify-center ${colorMap[color]}`}>{icon}</span>
          {title}
        </h2>
        {action}
      </div>
      <div className="p-5 space-y-5">{children}</div>
    </div>
  );
};

interface FieldProps {
  label: string;
  required?: boolean;
  children: React.ReactNode;
}

const Field: React.FC<FieldProps> = ({ label, required, children }) => (
  <div>
    <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
      {label}
      {required && <span className="text-rose-500 ml-0.5">*</span>}
    </label>
    {children}
  </div>
);

interface ToggleProps {
  label: string;
  checked: boolean;
  onChange: (v: boolean) => void;
}

const Toggle: React.FC<ToggleProps> = ({ label, checked, onChange }) => (
  <label className="flex items-center gap-3 cursor-pointer py-1">
    <button
      type="button"
      onClick={() => onChange(!checked)}
      className={`relative w-11 h-6 rounded-full transition-colors flex-shrink-0 overflow-hidden ${
        checked ? 'bg-blue-600' : 'bg-slate-300 dark:bg-slate-700'
      }`}
      aria-label={label}
      aria-pressed={checked}
    >
      <span
        className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform duration-200 ${
          checked ? 'translate-x-5' : 'translate-x-0'
        }`}
      />
    </button>
    <span className="text-sm text-slate-700 dark:text-slate-300 flex-1">{label}</span>
  </label>
);

const questionTypeLabel = (type: QuestionType, t: (k: string) => string) => {
  switch (type) {
    case 'mc':
      return t('instructor.exam.questionTypes.mc');
    case 'essay':
      return t('instructor.exam.questionTypes.essay');
    case 'coding':
      return t('instructor.exam.questionTypes.coding');
    case 'tf':
      return t('instructor.exam.questionTypes.tf');
  }
};

const QuestionTypeIcon: React.FC<{ type: QuestionType }> = ({ type }) => {
  switch (type) {
    case 'mc':
      return (
        <div className="w-10 h-10 rounded-lg bg-blue-100 dark:bg-blue-900/40 text-blue-600 dark:text-blue-300 flex items-center justify-center">
          <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="12" cy="12" r="10" />
            <path d="M8 12l2 2 4-4" />
          </svg>
        </div>
      );
    case 'essay':
      return (
        <div className="w-10 h-10 rounded-lg bg-purple-100 dark:bg-purple-900/40 text-purple-600 dark:text-purple-300 flex items-center justify-center">
          <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
          </svg>
        </div>
      );
    case 'coding':
      return (
        <div className="w-10 h-10 rounded-lg bg-amber-100 dark:bg-amber-900/40 text-amber-600 dark:text-amber-300 flex items-center justify-center">
          <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" />
          </svg>
        </div>
      );
    case 'tf':
      return (
        <div className="w-10 h-10 rounded-lg bg-emerald-100 dark:bg-emerald-900/40 text-emerald-600 dark:text-emerald-300 flex items-center justify-center">
          <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        </div>
      );
  }
};

const DocumentIcon = () => (
  <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
  </svg>
);

const SparklesIcon = () => (
  <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
  </svg>
);

const ListIcon = () => (
  <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M4 6h16M4 10h16M4 14h16M4 18h16" />
  </svg>
);

export default ExamCreatePage;
