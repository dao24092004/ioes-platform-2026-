import React, { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useQuery } from '@tanstack/react-query';
import StudentLayout from '@/components/layout/StudentLayout';
import { studentApi, type StudentPracticeQuestion } from '@/services/api';

type DifficultyFilter = 'all' | 'easy' | 'medium' | 'hard';

interface QuestionState {
  selected: number | null;
  flagged: boolean;
  showResult: boolean;
}

interface MockQuestion {
  id: string;
  question: string;
  options: string[];
  correct_index: number;
  explanation: string;
  difficulty: 'easy' | 'medium' | 'hard';
  topic: string;
}

// Mock fallback nếu API rỗng — dùng để demo UI
const MOCK_QUESTIONS: MockQuestion[] = [
  {
    id: 'q1',
    question: 'Trong thuật toán Gradient Descent, learning rate (tốc độ học) quá lớn có thể gây ra vấn đề gì?',
    options: [
      'Model sẽ hội tụ chậm hơn',
      'Model có thể dao động quanh điểm tối ưu hoặc divergence (phân kỳ)',
      'Model sẽ bị underfitting',
      'Learning rate không ảnh hưởng đến quá trình training',
    ],
    correct_index: 1,
    explanation:
      'Learning rate quá lớn sẽ khiến các bước cập nhật weights quá lớn, dẫn đến việc model "nhảy" qua điểm tối ưu (overshooting) hoặc thậm chí divergence — loss tăng thay vì giảm. Đây là lý do tại sao việc chọn learning rate phù hợp rất quan trọng.',
    difficulty: 'medium',
    topic: 'Optimization',
  },
  {
    id: 'q2',
    question: 'Hàm activation nào sau đây thường được dùng cho output layer của bài toán binary classification?',
    options: ['ReLU', 'Tanh', 'Sigmoid', 'Softmax'],
    correct_index: 2,
    explanation:
      'Sigmoid đưa output về khoảng (0, 1), phù hợp biểu diễn xác suất 2 lớp. Softmax dùng cho multi-class, ReLU cho hidden layers vì giảm vanishing gradient.',
    difficulty: 'easy',
    topic: 'Activation',
  },
  {
    id: 'q3',
    question: 'Overfitting xảy ra khi nào?',
    options: [
      'Model quá đơn giản so với dữ liệu',
      'Model học quá khớp dữ liệu training, kém trên dữ liệu mới',
      'Dữ liệu training quá ít',
      'Learning rate quá nhỏ',
    ],
    correct_index: 1,
    explanation:
      'Overfitting là khi model học cả noise của tập train nên accuracy trên train cao nhưng trên validation/test thấp. Cách giảm: thêm data, regularization (L1/L2), dropout, early stopping.',
    difficulty: 'easy',
    topic: 'Regularization',
  },
  {
    id: 'q4',
    question: 'Công thức nào đúng cho hàm loss Cross-Entropy?',
    options: [
      'L = (y - ŷ)²',
      'L = -Σ y·log(ŷ)',
      'L = |y - ŷ|',
      'L = max(0, 1 - y·ŷ)',
    ],
    correct_index: 1,
    explanation:
      'Cross-entropy đo khác biệt giữa phân phối thật y và dự đoán ŷ: L = -Σ y·log(ŷ). MSE (a) dùng cho regression, hinge loss (d) cho SVM.',
    difficulty: 'medium',
    topic: 'Loss Function',
  },
  {
    id: 'q5',
    question: 'Khi nào nên dùng Batch Normalization?',
    options: [
      'Chỉ ở output layer',
      'Trước activation, giúp ổn định phân phối activations',
      'Sau loss function',
      'Không ảnh hưởng tới huấn luyện',
    ],
    correct_index: 1,
    explanation:
      'Batch Norm chuẩn hoá activations theo batch giúp training ổn định, cho phép dùng learning rate lớn hơn, đẩy nhanh convergence.',
    difficulty: 'medium',
    topic: 'Normalization',
  },
  {
    id: 'q6',
    question: 'Dropout là gì?',
    options: [
      'Một kỹ thuật tăng tốc training',
      'Một kỹ thuật regularization bằng cách ngẫu nhiên "tắt" một số neuron khi training',
      'Một optimizer',
      'Một loss function',
    ],
    correct_index: 1,
    explanation:
      'Dropout ngẫu nhiên zero-out một phần activations trong training, ngăn model phụ thuộc vào một số neuron cụ thể — giảm overfitting.',
    difficulty: 'easy',
    topic: 'Regularization',
  },
  {
    id: 'q7',
    question: 'Transformer sử dụng cơ chế nào làm cốt lõi?',
    options: ['Convolution', 'Recurrence', 'Self-Attention', 'Pooling'],
    correct_index: 2,
    explanation:
      'Self-attention cho phép mỗi vị trí trong sequence "nhìn" tất cả vị trí khác, song song hoá được và nắm bắt long-range dependency tốt hơn RNN/CNN.',
    difficulty: 'hard',
    topic: 'Transformer',
  },
  {
    id: 'q8',
    question: 'Precision và Recall — câu nào đúng?',
    options: [
      'Precision = TP / (TP + FN)',
      'Recall = TP / (TP + FP)',
      'Precision = TP / (TP + FP)',
      'Precision và Recall luôn bằng nhau',
    ],
    correct_index: 2,
    explanation:
      'Precision (độ chính xác) = TP / (TP + FP) — trong số dự đoán positive, bao nhiêu đúng. Recall (độ phủ) = TP / (TP + FN) — trong số thực tế positive, bao nhiêu được tìm ra.',
    difficulty: 'medium',
    topic: 'Metrics',
  },
  {
    id: 'q9',
    question: 'Embedding trong NLP là gì?',
    options: [
      'Một cách mã hoá one-hot',
      'Vector dense biểu diễn từ trong không gian liên tục',
      'Một loại tokenizer',
      'Một kiến trúc mạng',
    ],
    correct_index: 1,
    explanation:
      'Embedding ánh xạ mỗi từ sang vector dense (thường 50–300 chiều), học được ngữ nghĩa — các từ giống nhau nằm gần nhau trong không gian.',
    difficulty: 'easy',
    topic: 'NLP',
  },
  {
    id: 'q10',
    question: 'Vanishing gradient thường gặp khi nào?',
    options: [
      'Mạng nông với ReLU',
      'Mạng sâu với activation saturating (sigmoid/tanh)',
      'Optimizer Adam',
      'Batch size lớn',
    ],
    correct_index: 1,
    explanation:
      'Sigmoid/Tanh có đạo hàm max = 0.25, nhân nhiều lớp dẫn tới gradient tiến về 0 — các layer đầu hầu như không học. Giải pháp: ReLU, residual connections, LSTM gates.',
    difficulty: 'hard',
    topic: 'Optimization',
  },
];

const formatMMSS = (totalSeconds: number): string => {
  const safe = Math.max(0, Math.floor(totalSeconds));
  const m = Math.floor(safe / 60);
  const s = safe % 60;
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
};

const PracticeQuizPage: React.FC = () => {
  const { t } = useTranslation();
  const [difficulty, setDifficulty] = useState<DifficultyFilter>('all');
  const [idx, setIdx] = useState(0);
  const [states, setStates] = useState<QuestionState[]>([]);
  const [showResultsModal, setShowResultsModal] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  // Timer (15 phút mặc định)
  const TOTAL_TIME = 15 * 60;
  const [timeLeft, setTimeLeft] = useState(TOTAL_TIME);

  const { data: apiQuestions } = useQuery({
    queryKey: ['student', 'practice', difficulty],
    queryFn: () => studentApi.practiceQuestions(undefined),
    retry: false,
  });

  const questions: StudentPracticeQuestion[] = useMemo(() => {
    const source: StudentPracticeQuestion[] =
      apiQuestions && apiQuestions.length > 0 ? apiQuestions : (MOCK_QUESTIONS as unknown as StudentPracticeQuestion[]);
    if (difficulty === 'all') return source;
    return source.filter((q) => q.difficulty === difficulty);
  }, [apiQuestions, difficulty]);

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
        <div className="text-center py-16 bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700">
          <div className="text-slate-500 dark:text-slate-400">No questions.</div>
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
          {/* Difficulty filter */}
          <div className="flex items-center gap-2 mb-3 flex-wrap">
            {(['all', 'easy', 'medium', 'hard'] as DifficultyFilter[]).map((d) => (
              <button
                key={d}
                onClick={() => setDifficulty(d)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                  difficulty === d
                    ? 'bg-blue-600 text-white'
                    : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700 hover:border-blue-400'
                }`}
              >
                {t(`student.practice.${d}`)}
              </button>
            ))}
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