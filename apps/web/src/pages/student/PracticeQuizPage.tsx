import React, { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import StudentLayout from '@/components/layout/StudentLayout';
import {
  questionsApi,
  type Difficulty,
  type GeneratedQuestion,
  type GeneratedQuestionSet,
} from '@/services/api/questions.api';
import { ApiError } from '@/config/api.config';

/** Do kho phoi ra cho sinh vien. Domain co 5 muc, form chi dung 3. */
type DifficultyChoice = Extract<Difficulty, 'easy' | 'medium' | 'hard'>;

const DIFFICULTIES: DifficultyChoice[] = ['easy', 'medium', 'hard'];

/**
 * Cau hoi da dung dinh dang ma giao dien lam bai can.
 *
 * `correct_index` suy ra tu `is_correct` cua API. Doi chieu nay chi dung duoc
 * vi de luyen tap chi sinh multiple_choice — dung mot dap an.
 */
interface PracticeQuestion {
  id: string;
  topic: string;
  difficulty: DifficultyChoice;
  question: string;
  options: string[];
  correct_index: number;
  explanation: string;
  sourceTitle: string;
}

const toPracticeQuestion = (
  q: GeneratedQuestion,
  index: number,
  fallbackTopic: string,
): PracticeQuestion => ({
  id: `${q.source.chunkId}-${index}`,
  topic: q.source.title || fallbackTopic,
  difficulty: q.difficulty as DifficultyChoice,
  question: q.questionText,
  options: q.options.map((o) => o.optionText),
  correct_index: q.options.findIndex((o) => o.isCorrect),
  explanation: q.explanation,
  sourceTitle: q.source.title,
});

interface QuestionState {
  selected: number | null;
  flagged: boolean;
  showResult: boolean;
}

const formatMMSS = (totalSeconds: number): string => {
  const safe = Math.max(0, Math.floor(totalSeconds));
  const m = Math.floor(safe / 60);
  const s = safe % 60;
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
};

const PracticeQuizPage: React.FC = () => {
  const { t } = useTranslation();
  const [idx, setIdx] = useState(0);
  const [states, setStates] = useState<QuestionState[]>([]);
  const [showResultsModal, setShowResultsModal] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  // Buoc chon chu de. De luyen tap sinh tu hoc lieu nen phai biet hoc gi truoc;
  // truoc day trang nay nhay thang vao bai vi cau hoi la mang viet cung.
  const [topic, setTopic] = useState('');
  const [difficulty, setDifficulty] = useState<DifficultyChoice>('medium');
  const [count, setCount] = useState(5);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [set, setSet] = useState<GeneratedQuestionSet | null>(null);

  // Timer (15 phút mặc định)
  const TOTAL_TIME = 15 * 60;
  const [timeLeft, setTimeLeft] = useState(TOTAL_TIME);

  const questions: PracticeQuestion[] = useMemo(
    () => (set?.questions ?? []).map((q, i) => toPracticeQuestion(q, i, topic)),
    [set, topic],
  );

  const startPractice = async () => {
    if (!topic.trim() || generating) return;
    setGenerating(true);
    setError(null);
    try {
      setSet(
        await questionsApi.generate({
          topic: topic.trim(),
          questionType: 'multiple_choice',
          difficulty,
          count,
        }),
      );
    } catch (err) {
      setError(err instanceof ApiError ? err.message : String(err));
      setSet(null);
    } finally {
      setGenerating(false);
    }
  };

  // Khởi tạo state khi đổi bộ câu hỏi
  useEffect(() => {
    setStates(questions.map(() => ({ selected: null, flagged: false, showResult: false })));
    setIdx(0);
    setShowResultsModal(false);
    setShowConfirm(false);
    setTimeLeft(TOTAL_TIME);
  }, [questions]);

  // Timer đếm ngược
  useEffect(() => {
    if (showResultsModal) return;
    if (timeLeft <= 0) {
      setShowResultsModal(true);
      return;
    }
    const id = setInterval(() => setTimeLeft((t) => t - 1), 1000);
    return () => clearInterval(id);
  }, [timeLeft, showResultsModal]);

  const timerState: 'normal' | 'warning' | 'danger' = useMemo(() => {
    if (timeLeft <= 60) return 'danger';
    if (timeLeft <= 300) return 'warning';
    return 'normal';
  }, [timeLeft]);

  if (questions.length === 0) {
    return (
      <StudentLayout title={t('student.practice.title')} subtitle={t('student.practice.subtitle')}>
        <div className="max-w-xl mx-auto bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-6 sm:p-8">
          <h2 className="text-lg font-semibold mb-1">{t('student.practice.setup.title')}</h2>
          <p className="text-sm text-slate-500 dark:text-slate-400 mb-5">
            {t('student.practice.setup.desc')}
          </p>

          <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
            {t('student.practice.setup.topic')}
          </label>
          <input
            type="text"
            value={topic}
            onChange={(e) => setTopic(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') void startPractice();
            }}
            placeholder={t('student.practice.setup.topicPlaceholder')}
            className="w-full px-3 py-2.5 text-sm rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 focus:outline-none focus:border-blue-500 mb-4"
          />

          <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
            {t('student.practice.setup.difficulty')}
          </label>
          <div className="flex gap-2 mb-4">
            {DIFFICULTIES.map((d) => (
              <button
                key={d}
                onClick={() => setDifficulty(d)}
                className={`flex-1 px-3 py-2 text-xs font-semibold rounded-lg border transition-colors ${
                  difficulty === d
                    ? 'bg-blue-600 text-white border-blue-600'
                    : 'bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:border-blue-400'
                }`}
              >
                {t(`student.practice.${d}`)}
              </button>
            ))}
          </div>

          <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
            {t('student.practice.setup.count')} <span className="text-slate-400">({count})</span>
          </label>
          <input
            type="range"
            min={1}
            max={20}
            value={count}
            onChange={(e) => setCount(Number(e.target.value))}
            className="w-full accent-blue-600 mb-5"
          />

          {error && (
            <div
              role="alert"
              className="mb-4 rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-900 px-3 py-2 text-sm text-red-700 dark:text-red-300"
            >
              {error}
            </div>
          )}

          {/* Hoc lieu khong phu chu de. Ket qua hop le, khong phai loi - noi ro
              de sinh vien doi chu de thay vi bam lai mai. */}
          {set && !set.grounded && (
            <div className="mb-4 rounded-lg bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-900 px-3 py-2 text-sm text-amber-700 dark:text-amber-300">
              {t('student.practice.setup.notGrounded')}
            </div>
          )}

          <button
            onClick={() => void startPractice()}
            disabled={!topic.trim() || generating}
            className="w-full px-4 py-3 rounded-xl bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold transition-colors"
          >
            {generating ? t('student.practice.setup.generating') : t('student.practice.setup.start')}
          </button>
        </div>
      </StudentLayout>
    );
  }

  const safeIdx = Math.min(idx, questions.length - 1);
  const q = questions[safeIdx];
  const s = states[safeIdx] ?? { selected: null, flagged: false, showResult: false };

  const answeredCount = states.filter((st) => st.selected !== null).length;
  const flaggedCount = states.filter((st) => st.flagged).length;
  const correctCount = states.filter((st, i) => st.selected === questions[i]?.correct_index).length;

  const updateState = (patch: Partial<QuestionState>) => {
    setStates((prev) => {
      const next = [...prev];
      next[safeIdx] = { ...next[safeIdx], ...patch };
      return next;
    });
  };

  const selectOption = (i: number) => {
    if (s.showResult) return;
    updateState({ selected: i, showResult: true });
  };

  const goPrev = () => {
    if (safeIdx > 0) setIdx(safeIdx - 1);
  };

  const goNext = () => {
    if (safeIdx < questions.length - 1) setIdx(safeIdx + 1);
  };

  const jumpTo = (i: number) => setIdx(i);

  const toggleFlag = () => updateState({ flagged: !s.flagged });

  const isCorrect = s.selected === q.correct_index;

  // Tính điểm tổng kết
  const score = Math.round((correctCount / questions.length) * 100);
  const wrongCount = answeredCount - correctCount;
  const skippedCount = questions.length - answeredCount;
  const resultKind: 'excellent' | 'good' | 'needs-work' = score >= 80 ? 'excellent' : score >= 60 ? 'good' : 'needs-work';

  const restart = () => {
    setStates(questions.map(() => ({ selected: null, flagged: false, showResult: false })));
    setIdx(0);
    setShowResultsModal(false);
    setShowConfirm(false);
    setTimeLeft(TOTAL_TIME);
  };

  return (
    <StudentLayout title={t('student.practice.title')} subtitle={t('student.practice.subtitle')}>
      {/* Sticky header */}
      <div className="sticky top-0 z-30 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl mb-4 px-4 sm:px-6 py-3 flex items-center justify-between gap-3 -mx-2">
        <div className="flex items-center gap-3 min-w-0">
          <Link
            to="/student"
            className="w-10 h-10 rounded-xl border border-slate-200 dark:border-slate-700 flex items-center justify-center text-slate-500 hover:border-blue-500 hover:text-blue-600 transition-colors flex-shrink-0"
            title="Back"
          >
            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M15 18l-6-6 6-6" />
            </svg>
          </Link>
          <div className="min-w-0">
            <h1 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white truncate">{t('student.practice.title')}</h1>
            <p className="text-xs text-slate-500 dark:text-slate-400 truncate">
              {t('student.practice.question')} {safeIdx + 1} {t('student.practice.of')} {questions.length}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3 sm:gap-5 flex-shrink-0">
          <div
            className={`flex items-center gap-2 px-3 sm:px-4 py-2 rounded-xl font-semibold text-sm transition-colors ${
              timerState === 'danger'
                ? 'bg-red-50 dark:bg-red-900/30 text-red-600 dark:text-red-400 animate-pulse'
                : timerState === 'warning'
                ? 'bg-amber-50 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400'
                : 'bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-200'
            }`}
          >
            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="12" cy="12" r="10" />
              <polyline points="12 6 12 12 16 14" />
            </svg>
            <span className="font-mono">{formatMMSS(timeLeft)}</span>
          </div>
          <div className="hidden sm:flex items-center gap-3">
            <span className="text-sm font-semibold text-slate-700 dark:text-slate-200">
              {safeIdx + 1}/{questions.length}
            </span>
            <div className="w-28 h-2 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-blue-600 to-cyan-500 rounded-full transition-all duration-300"
                style={{ width: `${((safeIdx + 1) / questions.length) * 100}%` }}
              />
            </div>
          </div>
        </div>
      </div>

      <div className="grid lg:grid-cols-[1fr_300px] gap-4">
        {/* Question area */}
        <div className="max-w-3xl w-full mx-auto">
          {/* Chu de va do kho da chot o buoc chon, khong loc trong bai nua:
              ca bo de deu sinh cho dung mot muc. */}
          <div className="flex items-center gap-2 mb-3 flex-wrap text-xs">
            <span className="px-3 py-1.5 rounded-lg bg-blue-600 text-white font-semibold">{topic}</span>
            <span className="px-3 py-1.5 rounded-lg bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700 font-semibold">
              {t(`student.practice.${difficulty}`)}
            </span>
            {/* Sinh it hon so da xin la binh thuong - hoc lieu du toi dau thi
                soan toi do. Noi ra thay vi im lang. */}
            {set && set.returned < set.requested && (
              <span className="text-amber-600 dark:text-amber-400">
                {t('student.practice.setup.partial', {
                  requested: set.requested,
                  returned: set.returned,
                })}
              </span>
            )}
            <button
              onClick={() => setSet(null)}
              className="ml-auto px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:border-blue-400 font-semibold"
            >
              {t('student.practice.setup.change')}
            </button>
          </div>

          {/* Question card */}
          <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-6 sm:p-8">
            <div className="flex items-center justify-between gap-3 mb-5 flex-wrap">
              <div className="flex items-center gap-3 flex-wrap">
                <span className="px-3 py-1.5 bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 rounded-lg text-xs font-bold">
                  {t('student.practice.question')} {safeIdx + 1}
                </span>
                <span className="text-xs text-slate-500 dark:text-slate-400">
                  {t('student.practice.questionType')} • {t('student.practice.points', { count: 10 })}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={toggleFlag}
                  title={t('student.practice.flagToggle')}
                  className={`w-9 h-9 rounded-lg border flex items-center justify-center transition-colors ${
                    s.flagged
                      ? 'bg-amber-50 dark:bg-amber-900/30 border-amber-400 text-amber-600'
                      : 'border-slate-200 dark:border-slate-700 text-slate-500 hover:border-blue-400 hover:text-blue-600'
                  }`}
                >
                  <svg className="w-4 h-4" viewBox="0 0 24 24" fill={s.flagged ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="2">
                    <path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z" />
                    <line x1="4" y1="22" x2="4" y2="15" />
                  </svg>
                </button>
                <button
                  type="button"
                  onClick={() => updateState({ showResult: true })}
                  title={t('student.practice.showExplanation')}
                  className="w-9 h-9 rounded-lg border border-slate-200 dark:border-slate-700 text-slate-500 hover:border-blue-400 hover:text-blue-600 flex items-center justify-center transition-colors"
                >
                  <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M9 18h6M10 22h4M15.09 14c.18-.98.65-1.74 1.41-2.5A4.65 4.65 0 0018 8 6 6 0 006 8c0 1 .23 2.23 1.5 3.5A4.61 4.61 0 018.91 14" />
                  </svg>
                </button>
              </div>
            </div>

            {/* Question content */}
            <h2 className="text-base sm:text-lg font-semibold text-slate-900 dark:text-white leading-relaxed mb-5">
              {q.question}
            </h2>

            {/* Options */}
            <div className="flex flex-col gap-3 mb-4">
              {q.options.map((opt, i) => {
                const letter = String.fromCharCode(65 + i);
                const isPicked = s.selected === i;
                const isAnswer = i === q.correct_index;
                let itemCls = 'border-slate-200 dark:border-slate-700 hover:border-blue-400 hover:bg-blue-50/40 dark:hover:bg-blue-900/10';
                let letterCls = 'bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300';
                if (s.showResult) {
                  if (isAnswer) {
                    itemCls = 'border-emerald-500 bg-emerald-50 dark:bg-emerald-900/20';
                    letterCls = 'bg-emerald-500 text-white';
                  } else if (isPicked && !isAnswer) {
                    itemCls = 'border-red-500 bg-red-50 dark:bg-red-900/20';
                    letterCls = 'bg-red-500 text-white';
                  } else {
                    itemCls = 'border-slate-200 dark:border-slate-700 opacity-60';
                  }
                } else if (isPicked) {
                  itemCls = 'border-blue-500 bg-blue-50 dark:bg-blue-900/20';
                  letterCls = 'bg-blue-600 text-white';
                }

                return (
                  <button
                    key={i}
                    onClick={() => selectOption(i)}
                    disabled={s.showResult}
                    className={`w-full flex items-start gap-4 px-5 py-4 rounded-2xl border-2 text-left transition-all ${itemCls}`}
                  >
                    <span className={`w-8 h-8 rounded-lg flex items-center justify-center text-sm font-bold flex-shrink-0 transition-colors ${letterCls}`}>
                      {letter}
                    </span>
                    <span className="flex-1 text-sm leading-relaxed text-slate-700 dark:text-slate-200">{opt}</span>
                    {s.showResult && isAnswer && (
                      <span className="text-emerald-500 flex-shrink-0">
                        <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                          <polyline points="20 6 9 17 4 12" />
                        </svg>
                      </span>
                    )}
                    {s.showResult && isPicked && !isAnswer && (
                      <span className="text-red-500 flex-shrink-0">
                        <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                          <line x1="18" y1="6" x2="6" y2="18" />
                          <line x1="6" y1="6" x2="18" y2="18" />
                        </svg>
                      </span>
                    )}
                  </button>
                );
              })}
            </div>

            {/* Explanation */}
            {s.showResult && (
              <div
                className={`rounded-2xl p-5 mb-4 ${
                  isCorrect ? 'bg-emerald-50 dark:bg-emerald-900/20' : 'bg-red-50 dark:bg-red-900/20'
                }`}
              >
                <div className={`flex items-center gap-2 font-bold mb-2 ${isCorrect ? 'text-emerald-700 dark:text-emerald-400' : 'text-red-700 dark:text-red-400'}`}>
                  <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                    {isCorrect ? <polyline points="20 6 9 17 4 12" /> : (
                      <>
                        <circle cx="12" cy="12" r="10" />
                        <line x1="12" y1="8" x2="12" y2="12" />
                        <line x1="12" y1="16" x2="12.01" y2="16" />
                      </>
                    )}
                  </svg>
                  {isCorrect ? t('student.practice.correctAnswer') : t('student.practice.correctAnswer') + `: ${String.fromCharCode(65 + q.correct_index)}`}
                </div>
                <p className="text-sm text-slate-700 dark:text-slate-300 leading-relaxed">{q.explanation}</p>
              </div>
            )}

            {/* Navigation */}
            <div className="flex items-center justify-between gap-2 pt-2">
              <button
                onClick={goPrev}
                disabled={safeIdx === 0}
                className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-200 text-sm font-semibold transition-all hover:-translate-y-0.5 disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:translate-y-0"
              >
                <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M15 18l-6-6 6-6" />
                </svg>
                {t('student.practice.prev')}
              </button>
              {safeIdx < questions.length - 1 ? (
                <button
                  onClick={goNext}
                  className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-blue-600 text-white text-sm font-semibold transition-all hover:-translate-y-0.5"
                >
                  {t('student.practice.next')}
                  <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M9 18l6-6-6-6" />
                  </svg>
                </button>
              ) : (
                <button
                  onClick={() => setShowConfirm(true)}
                  className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-emerald-600 to-cyan-500 text-white text-sm font-semibold transition-all hover:-translate-y-0.5 shadow-lg shadow-emerald-500/30"
                >
                  <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                  {t('student.practice.submitAll')}
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Sidebar */}
        <aside className="space-y-5 lg:sticky lg:top-4 self-start">
          {/* Question grid */}
          <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-5">
            <div className="text-xs uppercase tracking-wider text-slate-500 dark:text-slate-400 font-semibold mb-3">
              {t('student.practice.nav')}
            </div>
            <div className="grid grid-cols-5 gap-2">
              {states.map((st, i) => {
                const isCurrent = i === safeIdx;
                const isAnswered = st.selected !== null;
                const isFlagged = st.flagged;
                let cls = 'bg-slate-100 dark:bg-slate-700 border-slate-200 dark:border-slate-600 text-slate-600 dark:text-slate-300';
                if (isCurrent) {
                  cls = 'bg-blue-600 border-blue-600 text-white';
                } else if (st.showResult) {
                  const isCorrectLocal = st.selected === questions[i]?.correct_index;
                  if (isCorrectLocal) cls = 'bg-emerald-50 dark:bg-emerald-900/30 border-emerald-500 text-emerald-600';
                  else if (st.selected !== null) cls = 'bg-red-50 dark:bg-red-900/30 border-red-500 text-red-600';
                } else if (isAnswered) {
                  cls = 'bg-blue-50 dark:bg-blue-900/30 border-blue-500 text-blue-600';
                } else if (isFlagged) {
                  cls = 'bg-amber-50 dark:bg-amber-900/30 border-amber-500 text-amber-600';
                }
                return (
                  <button
                    key={i}
                    onClick={() => jumpTo(i)}
                    className={`w-10 h-10 rounded-lg border flex items-center justify-center text-xs font-bold transition-all hover:scale-105 ${cls}`}
                  >
                    {i + 1}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Summary */}
          <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-5">
            <div className="text-xs uppercase tracking-wider text-slate-500 dark:text-slate-400 font-semibold mb-3">
              {t('student.practice.summary')}
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="p-3 bg-slate-50 dark:bg-slate-900 rounded-xl text-center">
                <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">{answeredCount}</div>
                <div className="text-xs text-slate-500 dark:text-slate-400">{t('student.practice.answered')}</div>
              </div>
              <div className="p-3 bg-slate-50 dark:bg-slate-900 rounded-xl text-center">
                <div className="text-2xl font-bold text-slate-500 dark:text-slate-400">{questions.length - answeredCount}</div>
                <div className="text-xs text-slate-500 dark:text-slate-400">{t('student.practice.unanswered')}</div>
              </div>
              <div className="p-3 bg-slate-50 dark:bg-slate-900 rounded-xl text-center">
                <div className="text-2xl font-bold text-amber-600 dark:text-amber-400">{flaggedCount}</div>
                <div className="text-xs text-slate-500 dark:text-slate-400">{t('student.practice.flagged')}</div>
              </div>
              <div className="p-3 bg-slate-50 dark:bg-slate-900 rounded-xl text-center">
                <div className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">{correctCount}</div>
                <div className="text-xs text-slate-500 dark:text-slate-400">{t('student.practice.correctCount')}</div>
              </div>
            </div>
          </div>

          {/* Tips */}
          <div className="bg-gradient-to-br from-blue-600 to-cyan-500 rounded-2xl p-5 text-white">
            <h4 className="font-bold text-sm mb-3 flex items-center gap-2">
              <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M9 18h6M10 22h4M15.09 14c.18-.98.65-1.74 1.41-2.5A4.65 4.65 0 0018 8 6 6 0 006 8c0 1 .23 2.23 1.5 3.5A4.61 4.61 0 018.91 14" />
              </svg>
              {t('student.practice.tipsTitle')}
            </h4>
            <ul className="space-y-2 text-xs">
              <li className="flex gap-2"><span>✓</span><span>{t('student.practice.tip1')}</span></li>
              <li className="flex gap-2"><span>✓</span><span>{t('student.practice.tip2')}</span></li>
              <li className="flex gap-2"><span>✓</span><span>{t('student.practice.tip3')}</span></li>
            </ul>
          </div>

          {/* Submit */}
          <button
            onClick={() => setShowConfirm(true)}
            className="w-full py-3.5 bg-gradient-to-r from-emerald-600 to-cyan-500 hover:from-emerald-700 hover:to-cyan-600 text-white rounded-xl font-bold text-sm shadow-lg shadow-emerald-500/30 transition-all hover:-translate-y-0.5 flex items-center justify-center gap-2"
          >
            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <polyline points="20 6 9 17 4 12" />
            </svg>
            {t('student.practice.submitAll')}
          </button>
        </aside>
      </div>

      {/* Confirm modal */}
      {showConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/70 backdrop-blur-sm">
          <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 max-w-sm w-full shadow-2xl">
            <h3 className="text-lg font-bold mb-2 text-slate-900 dark:text-white">{t('student.practice.confirmSubmit')}</h3>
            <p className="text-sm text-slate-500 dark:text-slate-400 mb-5">
              {t('student.practice.summary')}: {answeredCount}/{questions.length} {t('student.practice.answered')}
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setShowConfirm(false)}
                className="flex-1 py-2.5 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 rounded-xl text-sm font-semibold hover:bg-slate-50 dark:hover:bg-slate-700"
              >
                {t('student.practice.confirmNo')}
              </button>
              <button
                onClick={() => {
                  setShowConfirm(false);
                  setShowResultsModal(true);
                }}
                className="flex-1 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-sm font-semibold"
              >
                {t('student.practice.confirmYes')}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Results modal */}
      {showResultsModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/70 backdrop-blur-sm">
          <div className="bg-white dark:bg-slate-800 rounded-3xl p-10 max-w-md w-full text-center shadow-2xl">
            <div
              className={`w-24 h-24 mx-auto rounded-full flex items-center justify-center mb-6 ${
                resultKind === 'excellent'
                  ? 'bg-emerald-100 dark:bg-emerald-900/40 text-emerald-600'
                  : resultKind === 'good'
                  ? 'bg-blue-100 dark:bg-blue-900/40 text-blue-600'
                  : 'bg-amber-100 dark:bg-amber-900/40 text-amber-600'
              }`}
            >
              <svg className="w-12 h-12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M6 9H4.5a2.5 2.5 0 010-5H6M18 9h1.5a2.5 2.5 0 000-5H18M4 22h16M10 22V11a2 2 0 00-2-2H6V4h12v5h-2a2 2 0 00-2 2v11" />
              </svg>
            </div>
            <h2 className="text-3xl font-bold mb-2 text-slate-900 dark:text-white">
              {resultKind === 'excellent'
                ? t('student.practice.results.excellent')
                : resultKind === 'good'
                ? t('student.practice.results.good')
                : t('student.practice.results.needsWork')}
            </h2>
            <p className="text-sm text-slate-500 dark:text-slate-400 mb-7">{t('student.practice.results.completed')}</p>

            <div className="grid grid-cols-3 gap-3 mb-6">
              <div className="p-4 bg-slate-50 dark:bg-slate-900 rounded-xl">
                <div className="text-2xl font-bold text-emerald-600">{correctCount}</div>
                <div className="text-xs text-slate-500 dark:text-slate-400">{t('student.practice.results.review').includes('Review') ? 'Correct' : 'Đúng'}</div>
              </div>
              <div className="p-4 bg-slate-50 dark:bg-slate-900 rounded-xl">
                <div className="text-2xl font-bold text-red-600">{wrongCount}</div>
                <div className="text-xs text-slate-500 dark:text-slate-400">Sai</div>
              </div>
              <div className="p-4 bg-slate-50 dark:bg-slate-900 rounded-xl">
                <div className="text-2xl font-bold text-slate-500">{skippedCount}</div>
                <div className="text-xs text-slate-500 dark:text-slate-400">Bỏ trống</div>
              </div>
            </div>

            <div className="text-4xl font-extrabold text-blue-600 dark:text-blue-400 mb-1">{score}/100</div>
            <p className="text-xs text-slate-500 dark:text-slate-400 mb-6">{t('student.practice.results.yourScore')}</p>

            <button
              onClick={restart}
              className="w-full py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-sm font-bold mb-3 transition-all hover:-translate-y-0.5"
            >
              {t('student.practice.restart')}
            </button>
            <Link
              to="/student/courses"
              className="block w-full py-3 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 rounded-xl text-sm font-semibold hover:bg-slate-50 dark:hover:bg-slate-700"
            >
              {t('student.practice.results.continueLearning')}
            </Link>
          </div>
        </div>
      )}
    </StudentLayout>
  );
};

export default PracticeQuizPage;