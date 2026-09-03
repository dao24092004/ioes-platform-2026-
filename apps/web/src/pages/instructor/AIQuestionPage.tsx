import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import InstructorLayout from '@/components/layout/InstructorLayout';
import { questionsApi, type GeneratedQuestion, type GeneratedQuestionSet } from '@/services/api/questions.api';
import { ApiError } from '@/config/api.config';

/**
 * Độ khó phơi ra cho người dùng. Domain có 5 mức (very_easy..very_hard) nhưng
 * form chỉ cho 3 — giữ nguyên form, map thẳng vì tên trùng nhau.
 */
type DifficultyChoice = 'easy' | 'medium' | 'hard';

/** CODING không sinh được: cần test case chạy thật, không suy ra từ tài liệu. */
type TypeChoice = 'multiple_choice' | 'true_false' | 'short_answer' | 'essay';

const difficulties: DifficultyChoice[] = ['easy', 'medium', 'hard'];
const types: TypeChoice[] = ['multiple_choice', 'true_false', 'short_answer', 'essay'];

/** Đáp án dưới dạng chữ, để hiện trong phần "xem đáp án". */
const answerOf = (q: GeneratedQuestion): string => {
  const correct = q.options.filter((o) => o.isCorrect).map((o) => o.optionText);
  if (correct.length > 0) return correct.join('; ');
  return q.answerText ?? '';
};

const AIQuestionPage: React.FC = () => {
  const { t } = useTranslation();
  const [topic, setTopic] = useState('');
  const [difficulty, setDifficulty] = useState<DifficultyChoice>('medium');
  const [type, setType] = useState<TypeChoice>('multiple_choice');
  const [count, setCount] = useState(5);
  const [language, setLanguage] = useState<'vi' | 'en'>('vi');
  const [extra, setExtra] = useState('');
  const [generating, setGenerating] = useState(false);
  const [result, setResult] = useState<GeneratedQuestionSet | null>(null);
  const [error, setError] = useState<string | null>(null);

  const questions = result?.questions ?? [];

  const handleGenerate = async () => {
    if (!topic.trim() || generating) return;
    setGenerating(true);
    setError(null);

    try {
      setResult(
        await questionsApi.generate({
          topic: topic.trim(),
          questionType: type,
          difficulty,
          count,
          language,
          instructions: extra.trim() || undefined,
        }),
      );
    } catch (err) {
      setError(err instanceof ApiError ? err.message : String(err));
      setResult(null);
    } finally {
      setGenerating(false);
    }
  };

  return (
    <InstructorLayout
      title={t('instructor.aiQuestion.title')}
      subtitle={t('instructor.aiQuestion.subtitle')}
    >
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-6">
        {/* Form */}
        <section className="xl:col-span-4 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-6 h-fit sticky top-20">
          <div className="flex items-center gap-2 mb-5">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-purple-500 to-blue-500 flex items-center justify-center text-white">
              <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
              </svg>
            </div>
            <div>
              <h2 className="text-base font-semibold">{t('instructor.aiQuestion.config.title')}</h2>
              <p className="text-xs text-slate-500">{t('instructor.aiQuestion.config.subtitle')}</p>
            </div>
          </div>

          <div className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">{t('instructor.aiQuestion.config.topic')}</label>
              <input
                type="text"
                value={topic}
                onChange={(e) => setTopic(e.target.value)}
                placeholder={t('instructor.aiQuestion.config.topicPlaceholder')}
                className="w-full px-3 py-2.5 text-sm rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 focus:outline-none focus:border-blue-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">{t('instructor.aiQuestion.config.type')}</label>
              <div className="grid grid-cols-2 gap-2">
                {types.map((tp) => (
                  <button
                    key={tp}
                    onClick={() => setType(tp)}
                    className={`px-3 py-2 text-xs font-semibold rounded-lg border transition-all ${
                      type === tp
                        ? 'bg-blue-50 dark:bg-blue-900/30 border-blue-500 text-blue-600 dark:text-blue-400'
                        : 'border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:border-blue-400'
                    }`}
                  >
                    {t(`instructor.aiQuestion.types.${tp}`)}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">{t('instructor.aiQuestion.config.difficulty')}</label>
              <div className="flex gap-2">
                {difficulties.map((d) => (
                  <button
                    key={d}
                    onClick={() => setDifficulty(d)}
                    className={`flex-1 px-3 py-2 text-xs font-semibold rounded-lg border transition-all ${
                      difficulty === d
                        ? 'bg-blue-50 dark:bg-blue-900/30 border-blue-500 text-blue-600 dark:text-blue-400'
                        : 'border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:border-blue-400'
                    }`}
                  >
                    {t(`instructor.aiQuestion.difficulty.${d}`)}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                {t('instructor.aiQuestion.config.count')} <span className="text-slate-400">({count})</span>
              </label>
              <input
                type="range"
                min={1}
                max={20}
                value={count}
                onChange={(e) => setCount(Number(e.target.value))}
                className="w-full accent-blue-600"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">{t('instructor.aiQuestion.config.language')}</label>
              <div className="flex gap-2">
                {(['vi', 'en'] as const).map((l) => (
                  <button
                    key={l}
                    onClick={() => setLanguage(l)}
                    className={`flex-1 px-3 py-2 text-xs font-semibold rounded-lg border transition-all ${
                      language === l
                        ? 'bg-blue-50 dark:bg-blue-900/30 border-blue-500 text-blue-600 dark:text-blue-400'
                        : 'border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400'
                    }`}
                  >
                    {l === 'vi' ? 'Tiếng Việt' : 'English'}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">{t('instructor.aiQuestion.config.extra')}</label>
              <textarea
                rows={3}
                value={extra}
                onChange={(e) => setExtra(e.target.value)}
                placeholder={t('instructor.aiQuestion.config.extraPlaceholder')}
                className="w-full px-3 py-2 text-sm rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 focus:outline-none focus:border-blue-500 resize-none"
              />
            </div>

            <button
              onClick={handleGenerate}
              disabled={!topic.trim() || generating}
              className="w-full inline-flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold shadow-md transition-all"
            >
              {generating ? (
                <>
                  <svg className="w-4 h-4 animate-spin" viewBox="0 0 24 24" fill="none">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                  {t('instructor.aiQuestion.generating')}
                </>
              ) : (
                <>
                  <SparkleSvg /> {t('instructor.aiQuestion.generate')}
                </>
              )}
            </button>
          </div>
        </section>

        {/* Output */}
        <section className="xl:col-span-8 space-y-4">
          {error && (
            <div
              role="alert"
              className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-900 text-red-700 dark:text-red-300 rounded-2xl px-5 py-3 text-sm"
            >
              {error}
            </div>
          )}

          {/* Hoc lieu khong phu chu de. Day la ket qua hop le, khong phai loi -
              noi ro de giang vien biet can nap them tai lieu. */}
          {result && !result.grounded && (
            <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-900 rounded-2xl p-8 text-center">
              <h3 className="text-base font-semibold mb-1 text-amber-800 dark:text-amber-300">
                {t('instructor.aiQuestion.notGrounded.title')}
              </h3>
              <p className="text-sm text-amber-700 dark:text-amber-400 max-w-md mx-auto">
                {t('instructor.aiQuestion.notGrounded.desc')}
              </p>
            </div>
          )}

          {!result && !generating && !error && (
            <div className="bg-white dark:bg-slate-900 rounded-2xl border-2 border-dashed border-slate-200 dark:border-slate-800 p-12 text-center">
              <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-gradient-to-br from-purple-500/20 to-blue-500/20 flex items-center justify-center text-purple-600 dark:text-purple-400">
                <SparkleSvg />
              </div>
              <h3 className="text-base font-semibold mb-1">{t('instructor.aiQuestion.empty.title')}</h3>
              <p className="text-sm text-slate-500 max-w-md mx-auto">{t('instructor.aiQuestion.empty.desc')}</p>
            </div>
          )}

          {result && questions.length > 0 && (
            <div className="flex items-center justify-between gap-3 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 px-5 py-3">
              <div className="text-sm min-w-0">
                <span className="font-semibold">{questions.length}</span> {t('instructor.aiQuestion.questionsReady')}
                {/* Tra it hon so da xin la binh thuong: hoc lieu du can cu toi
                    dau thi soan toi do. Noi ra thay vi im lang dua it cau hon. */}
                {result.returned < result.requested && (
                  <span className="block text-xs text-amber-600 dark:text-amber-400 mt-0.5">
                    {t('instructor.aiQuestion.partial', {
                      requested: result.requested,
                      returned: result.returned,
                    })}
                  </span>
                )}
              </div>
              <div className="flex gap-2">
                <button className="px-3 py-1.5 text-xs font-semibold rounded-lg border border-slate-200 dark:border-slate-700 hover:border-blue-500 hover:text-blue-600">
                  {t('instructor.aiQuestion.copy')}
                </button>
                <button className="px-3 py-1.5 text-xs font-semibold rounded-lg bg-blue-600 hover:bg-blue-700 text-white">
                  {t('instructor.aiQuestion.saveToBank')}
                </button>
              </div>
            </div>
          )}

          {questions.map((q, idx) => (
            <article key={`${q.source.chunkId}-${idx}`} className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-5">
              <header className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <span className="w-7 h-7 rounded-lg bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 flex items-center justify-center text-xs font-bold">{idx + 1}</span>
                  <span className="text-xs px-2 py-0.5 rounded-md font-semibold bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400">
                    {t(`instructor.aiQuestion.types.${q.questionType}`)}
                  </span>
                  <span className={`text-xs px-2 py-0.5 rounded-md font-semibold ${
                    q.difficulty === 'easy' ? 'bg-emerald-50 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400'
                    : q.difficulty === 'medium' ? 'bg-amber-50 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400'
                    : 'bg-red-50 dark:bg-red-900/30 text-red-600 dark:text-red-400'
                  }`}>
                    {t(`instructor.aiQuestion.difficulty.${q.difficulty}`)}
                  </span>
                </div>
              </header>
              <p className="text-sm font-medium mb-3 leading-relaxed">{q.questionText}</p>
              {q.options.length > 0 && (
                <ol className="space-y-1.5 mb-3 pl-1">
                  {q.options.map((opt, i) => (
                    <li key={i} className="flex items-start gap-2 text-sm">
                      <span className="w-5 h-5 rounded-md bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-xs font-bold flex-shrink-0 mt-0.5">
                        {String.fromCharCode(65 + i)}
                      </span>
                      <span>{opt.optionText}</span>
                    </li>
                  ))}
                </ol>
              )}
              <details className="bg-slate-50 dark:bg-slate-800/50 rounded-lg px-3 py-2 text-xs">
                <summary className="cursor-pointer font-semibold text-blue-600 dark:text-blue-400">{t('instructor.aiQuestion.showAnswer')}</summary>
                <div className="mt-2 space-y-1.5">
                  <div><span className="font-semibold">{t('instructor.aiQuestion.answer')}: </span>{answerOf(q)}</div>
                  <div className="text-slate-600 dark:text-slate-400"><span className="font-semibold">{t('instructor.aiQuestion.explanation')}: </span>{q.explanation}</div>
                  {/* Doan hoc lieu da chong lung cho cau nay. Hien ra de giang
                      vien doi chieu duoc thay vi phai tin vao mo hinh. */}
                  <div className="pt-1.5 border-t border-slate-200 dark:border-slate-700 text-slate-500">
                    <span className="font-semibold">{t('instructor.aiQuestion.source')}: </span>
                    {q.source.title}
                    <p className="mt-1 italic break-words">{q.source.excerpt}</p>
                  </div>
                </div>
              </details>
            </article>
          ))}
        </section>
      </div>
    </InstructorLayout>
  );
};

const SparkleSvg = () => (
  <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
  </svg>
);

export default AIQuestionPage;
