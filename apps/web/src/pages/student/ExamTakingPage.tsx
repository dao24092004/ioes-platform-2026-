import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useUIStore } from '@/app/store/uiStore';
import { useAuthStore } from '@/app/store/authStore';
import ProctoringPanel from '@/components/proctoring/ProctoringPanel';

type Question = {
  id: string;
  question: string;
  options: string[];
  correct: number;
};

const QUESTIONS: Question[] = [
  {
    id: 'mq-1',
    question: 'Cho hàm số \\( f(x) = x^3 - 3x^2 + 2 \\). Tính đạo hàm của hàm số và xác định các điểm cực trị của nó.',
    options: [
      "\\( f'(x) = 3x^2 - 6x \\); Điểm cực tiểu tại \\( x = 0 \\); Điểm cực đại tại \\( x = 2 \\)",
      "\\( f'(x) = 3x^2 - 6x \\); Điểm cực đại tại \\( x = 0 \\); Điểm cực tiểu tại \\( x = 2 \\)",
      "\\( f'(x) = 3x^2 - 6x + 2 \\); Không có điểm cực trị",
      "\\( f'(x) = 3x^2 - 6 \\); Điểm cực trị tại \\( x = \\pm \\sqrt{2} \\)",
    ],
    correct: 1,
  },
  {
    id: 'mq-2',
    question: 'Nguyên hàm của hàm số \\( f(x) = 2x \\) là:',
    options: ['\\( x^2 + C \\)', '\\( x^2 \\)', '\\( 2 + C \\)', '\\( 2x + C \\)'],
    correct: 0,
  },
  {
    id: 'mq-3',
    question: 'Giới hạn \\( \\lim_{x \\to 0} \\dfrac{\\sin x}{x} \\) bằng:',
    options: ['0', '1', '\\( \\infty \\)', 'Không tồn tại'],
    correct: 1,
  },
  {
    id: 'mq-4',
    question: 'Cho cấp số cộng có \\( u_1 = 3, d = 5 \\). Số hạng \\( u_{10} \\) bằng:',
    options: ['45', '48', '50', '53'],
    correct: 1,
  },
  {
    id: 'mq-5',
    question: 'Đạo hàm của hàm số \\( y = \\ln(x^2 + 1) \\) là:',
    options: ['\\( \\dfrac{1}{x^2 + 1} \\)', '\\( \\dfrac{2x}{x^2 + 1} \\)', '\\( 2x \\ln(x^2 + 1) \\)', '\\( \\dfrac{x}{x^2 + 1} \\)'],
    correct: 1,
  },
  {
    id: 'mq-6',
    question: 'Tích phân \\( \\int_0^1 x^2 dx \\) bằng:',
    options: ['\\( \\dfrac{1}{2} \\)', '\\( \\dfrac{1}{3} \\)', '1', '\\( \\dfrac{1}{4} \\)'],
    correct: 1,
  },
  {
    id: 'mq-7',
    question: 'Ma trận đơn vị cấp 3 có định thức bằng:',
    options: ['0', '1', '3', '-1'],
    correct: 1,
  },
  {
    id: 'mq-8',
    question: 'Phương trình \\( e^x = 5 \\) có nghiệm là:',
    options: ['\\( \\ln 5 \\)', '\\( \\log_5 e \\)', '\\( 5 \\)', '\\( e^5 \\)'],
    correct: 0,
  },
  {
    id: 'mq-9',
    question: 'Với hai số phức \\( z_1 = 1 + i \\), \\( z_2 = 2 - i \\). Tổng \\( z_1 + z_2 \\) bằng:',
    options: ['\\( 3 \\)', '\\( 3 + 2i \\)', '\\( -1 + 2i \\)', '\\( 3 - 2i \\)'],
    correct: 0,
  },
  {
    id: 'mq-10',
    question: 'Trong không gian Oxyz, mặt phẳng (P): x + 2y - z + 1 = 0 có vectơ pháp tuyến là:',
    options: ['(1, 2, -1)', '(1, -2, 1)', '(1, 2, 1)', '(-1, 2, 1)'],
    correct: 0,
  },
  {
    id: 'mq-11',
    question: 'Hàm số nào sau đây đồng biến trên \\( \\mathbb{R} \\)?',
    options: ['\\( y = x^2 \\)', '\\( y = x^3 + x \\)', '\\( y = -x + 1 \\)', '\\( y = \\dfrac{1}{x} \\)'],
    correct: 1,
  },
  {
    id: 'mq-12',
    question: 'Số hoán vị của 5 phần tử là:',
    options: ['60', '120', '24', '720'],
    correct: 1,
  },
];

const RULES = [
  { kind: 'allow', key: 'rule1' },
  { kind: 'allow', key: 'rule2' },
  { kind: 'deny', key: 'rule3' },
  { kind: 'deny', key: 'rule4' },
];

const ExamTakingPage: React.FC = () => {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const { examId } = useParams<{ examId: string }>();
  const { theme, setTheme } = useUIStore();
  const { user } = useAuthStore();

  const [activeIdx, setActiveIdx] = useState(4);
  const [answers, setAnswers] = useState<Record<string, number>>({});
  const [flagged, setFlagged] = useState<Set<string>>(new Set(['mq-4', 'mq-9']));
  const [secondsLeft, setSecondsLeft] = useState(6670);
  const [showSubmitModal, setShowSubmitModal] = useState(false);
  const [attentionAlert, setAttentionAlert] = useState(false);

  // attemptId đến từ luồng bắt đầu bài thi (Epic 3). Chưa có thì giám thị chạy
  // ở chế độ chỉ xem: camera bật nhưng không gửi khung nào đi.
  const [searchParams] = useSearchParams();
  const attemptId = searchParams.get('attemptId') ?? undefined;
  const attentionTimerRef = React.useRef<number | null>(null);

  useEffect(() => {
    setAttentionAlert(true);
    attentionTimerRef.current = window.setTimeout(() => setAttentionAlert(false), 4500);
    return () => {
      if (attentionTimerRef.current) window.clearTimeout(attentionTimerRef.current);
    };
  }, [activeIdx]);

  useEffect(() => {
    const id = setInterval(() => setSecondsLeft((s) => Math.max(0, s - 1)), 1000);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    if (secondsLeft === 0) handleSubmit();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [secondsLeft]);

  const hh = String(Math.floor(secondsLeft / 3600)).padStart(2, '0');
  const mm = String(Math.floor((secondsLeft % 3600) / 60)).padStart(2, '0');
  const ss = String(secondsLeft % 60).padStart(2, '0');
  const danger = secondsLeft <= 300;
  const warning = !danger && secondsLeft <= 900;

  const total = QUESTIONS.length;
  const answeredCount = Object.keys(answers).length;
  const unansweredCount = total - answeredCount;
  const currentQ = QUESTIONS[activeIdx];

  const selectAnswer = (qid: string, optIdx: number) => {
    setAnswers((prev) => ({ ...prev, [qid]: optIdx }));
  };

  const toggleFlag = () => {
    setFlagged((prev) => {
      const next = new Set(prev);
      if (next.has(currentQ.id)) next.delete(currentQ.id);
      else next.add(currentQ.id);
      return next;
    });
  };

  const toggleTheme = () => {
    const next = theme === 'dark' ? 'light' : 'dark';
    setTheme(next as 'light' | 'dark' | 'system');
    document.documentElement.classList.toggle('dark', next === 'dark');
  };

  const toggleLang = () => {
    const next = i18n.language === 'vi' ? 'en' : 'vi';
    i18n.changeLanguage(next);
    localStorage.setItem('ioes-lang', next);
  };

  const handleSubmit = () => {
    setShowSubmitModal(false);
    navigate(`/student/exams/${examId}/result`);
  };

  const attentionPct = 90;
  const attentionCircum = 2 * Math.PI * 15.5;
  const attentionOffset = attentionCircum * (1 - attentionPct / 100);

  const langText = i18n.language === 'vi' ? 'VN' : 'EN';
  const isDark = theme === 'dark';
  const userInitials = useMemo(() => {
    const name = user?.full_name || 'Student';
    return name.split(' ').slice(0, 2).map((s: string) => s.charAt(0)).join('').toUpperCase();
  }, [user]);

  const renderQuestionText = (text: string) => {
    const parts = text.split(/(\\\([^]+?\\\))/g);
    return parts.map((p, i) =>
      p.startsWith('\\(') && p.endsWith('\\)') ? (
        <code key={i} className="bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded text-sm font-mono">
          {p.slice(2, -2)}
        </code>
      ) : (
        <React.Fragment key={i}>{p}</React.Fragment>
      )
    );
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100">
      <header className="fixed top-0 left-0 right-0 z-40 h-[72px] bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 px-6 flex items-center justify-between">
        <div className="flex items-center gap-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-600 to-cyan-600 flex items-center justify-center">
              <svg className="w-5 h-5 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M12 14l9-5-9-5-9 5 9 5z" />
                <path d="M12 14l6.16-3.422a12.083 12.083 0 01.665 6.479A11.952 11.952 0 0012 20.055a11.952 11.952 0 00-6.824-2.998 12.078 12.078 0 01.665-6.479L12 14z" />
              </svg>
            </div>
            <span className="text-lg font-bold">IOES</span>
          </div>
          <div className="px-4 py-2 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700">
            <div className="text-xs text-slate-500 dark:text-slate-400">{t('student.examTaking.examLabel')}</div>
            <div className="text-sm font-semibold">{t('student.examTaking.courseName')}</div>
          </div>
        </div>

        <div
          className={`flex items-center gap-3 px-6 py-3 rounded-xl border-2 ${
            danger
              ? 'bg-red-100 dark:bg-red-900/40 border-red-500 text-red-600 dark:text-red-300 animate-pulse'
              : warning
              ? 'bg-amber-100 dark:bg-amber-900/30 border-amber-500 text-amber-700 dark:text-amber-300'
              : 'bg-slate-50 dark:bg-slate-800/60 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200'
          }`}
        >
          <div className="w-8 h-8 rounded-lg bg-white dark:bg-slate-900 flex items-center justify-center">
            <svg className={`w-4 h-4 ${danger ? 'text-red-500' : warning ? 'text-amber-500' : 'text-blue-500'}`} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="12" cy="12" r="10" />
              <path d="M12 6v6l4 2" />
            </svg>
          </div>
          <div>
            <div className={`text-2xl font-bold tabular-nums ${danger ? 'text-red-600 dark:text-red-300' : warning ? 'text-amber-700 dark:text-amber-300' : 'text-slate-900 dark:text-white'}`}>
              {hh}:{mm}:{ss}
            </div>
            <div className="text-[11px] text-slate-500 dark:text-slate-400">{t('student.examTaking.timeLeft')}</div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={toggleTheme}
            className="w-10 h-10 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 flex items-center justify-center transition-colors"
            title="Toggle theme"
          >
            {isDark ? (
              <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="12" cy="12" r="5" />
                <path d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42" />
              </svg>
            ) : (
              <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M21 12.79A9 9 0 1111.21 3 7 7 0 0021 12.79z" />
              </svg>
            )}
          </button>
          <button
            onClick={toggleLang}
            className="px-3 h-10 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-sm font-bold transition-colors"
          >
            {langText}
          </button>
          <div className="flex items-center gap-2 px-4 py-2 rounded-xl bg-emerald-50 dark:bg-emerald-900/30">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
            <span className="text-sm font-medium text-emerald-700 dark:text-emerald-300">
              {t('student.examTaking.proctoring')}
            </span>
          </div>
          <button
            onClick={() => setShowSubmitModal(true)}
            className="flex items-center gap-2 px-6 py-3 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold transition-colors"
          >
            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M5 13l4 4L19 7" />
            </svg>
            {t('student.examTaking.submit')}
          </button>
        </div>
      </header>

      <main className="pt-[88px] px-6 pb-6 flex gap-6 max-w-[1600px] mx-auto">
        <div className="flex-1 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 overflow-hidden">
          <div className="px-6 py-5 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
            <span className="text-base font-semibold">
              {t('student.examTaking.question')} {activeIdx + 1} {t('student.examTaking.of')} {total}
            </span>
            <span className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-300 text-sm font-medium">
              <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="currentColor">
                <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
              </svg>
              5 {t('student.examTaking.pointsUnit')}
            </span>
          </div>

          <div className="p-8">
            <p className="text-lg leading-relaxed text-slate-800 dark:text-slate-100 mb-8">
              {renderQuestionText(currentQ.question)}
            </p>

            <div className="flex flex-col gap-4">
              {currentQ.options.map((opt, i) => {
                const selected = answers[currentQ.id] === i;
                const letter = String.fromCharCode(65 + i);
                return (
                  <button
                    key={i}
                    onClick={() => selectAnswer(currentQ.id, i)}
                    className={`flex items-start gap-4 px-5 py-4 rounded-2xl border-2 text-left transition-all ${
                      selected
                        ? 'border-blue-600 bg-blue-50 dark:bg-blue-900/20'
                        : 'border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/40 hover:border-blue-300 hover:bg-blue-50/50 dark:hover:bg-blue-900/10'
                    }`}
                  >
                    <span
                      className={`w-6 h-6 rounded-full border-2 flex items-center justify-center flex-shrink-0 mt-0.5 ${
                        selected ? 'border-blue-600 bg-blue-600' : 'border-slate-300 dark:border-slate-600'
                      }`}
                    >
                      {selected && <svg className="w-3.5 h-3.5 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><path d="M5 13l4 4L19 7" /></svg>}
                    </span>
                    <span
                      className={`w-7 h-7 rounded-lg flex items-center justify-center text-sm font-semibold flex-shrink-0 ${
                        selected ? 'bg-blue-600 text-white' : 'bg-white dark:bg-slate-700 text-slate-600 dark:text-slate-300'
                      }`}
                    >
                      {letter}
                    </span>
                    <span className={`text-base leading-relaxed flex-1 ${selected ? 'font-semibold text-slate-900 dark:text-white' : 'text-slate-700 dark:text-slate-300'}`}>
                      {renderQuestionText(opt)}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="px-6 py-5 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between">
            <button
              onClick={() => setActiveIdx(Math.max(0, activeIdx - 1))}
              disabled={activeIdx === 0}
              className="flex items-center gap-2 px-5 py-3 rounded-xl border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 text-sm font-semibold transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M15 19l-7-7 7-7" />
              </svg>
              {t('student.examTaking.prev')}
            </button>

            <button
              onClick={toggleFlag}
              className={`flex items-center gap-2 px-5 py-3 rounded-xl text-sm font-medium transition-colors ${
                flagged.has(currentQ.id)
                  ? 'bg-amber-100 dark:bg-amber-900/30 border border-amber-500 text-amber-700 dark:text-amber-300'
                  : 'border border-slate-200 dark:border-slate-700 hover:bg-amber-50 hover:border-amber-500 hover:text-amber-600'
              }`}
            >
              <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z" />
                <line x1="4" y1="22" x2="4" y2="15" />
              </svg>
              {t('student.examTaking.flag')}
            </button>

            <button
              onClick={() => setActiveIdx(Math.min(total - 1, activeIdx + 1))}
              disabled={activeIdx === total - 1}
              className="flex items-center gap-2 px-5 py-3 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
            >
              {t('student.examTaking.next')}
              <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M9 5l7 7-7 7" />
              </svg>
            </button>
          </div>
        </div>

        <aside className="w-[340px] flex-shrink-0 flex flex-col gap-6">
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 overflow-hidden">
            <div className="px-5 py-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
              <span className="text-sm font-semibold flex items-center gap-2">
                <svg className="w-4 h-4 text-blue-600" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                </svg>
                {t('student.examTaking.cameraTitle')}
              </span>
            </div>
            <ProctoringPanel
              attemptId={attemptId}
              onViolation={() => setAttentionAlert(true)}
              onAutoSubmitted={({ submissionId }) =>
                navigate(`/student/exams/${examId}/result?submissionId=${submissionId}&flagged=1`)
              }
            />
          </div>

          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 overflow-hidden">
            <div className="px-5 py-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
              <span className="text-sm font-semibold flex items-center gap-2">
                <svg className="w-4 h-4 text-blue-600" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                </svg>
                {t('student.examTaking.attentionTitle')}
              </span>
            </div>
            <div className="p-5">
              <div className="flex items-center gap-4">
                <div className="relative w-20 h-20">
                  <svg className="w-full h-full -rotate-90" viewBox="0 0 36 36">
                    <circle cx="18" cy="18" r="15.5" fill="none" stroke="currentColor" strokeWidth="3" className="text-slate-200 dark:text-slate-700" />
                    <circle
                      cx="18"
                      cy="18"
                      r="15.5"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="3"
                      strokeLinecap="round"
                      strokeDasharray={attentionCircum}
                      strokeDashoffset={attentionOffset}
                      className="text-emerald-500"
                    />
                  </svg>
                  <span className="absolute inset-0 flex items-center justify-center text-xl font-bold text-emerald-500">
                    {attentionPct}%
                  </span>
                </div>
                <div className="flex-1">
                  <div className="text-sm font-semibold">{t('student.examTaking.attentionGreat')}</div>
                  <div className="text-[13px] text-slate-500 dark:text-slate-400">{t('student.examTaking.attentionDesc')}</div>
                </div>
              </div>
              {attentionAlert && (
                <div className="mt-4 p-3 rounded-xl bg-amber-50 dark:bg-amber-900/30 flex items-center gap-2.5">
                  <svg className="w-5 h-5 text-amber-500 flex-shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                  </svg>
                  <span className="text-[13px] text-amber-700 dark:text-amber-300">{t('student.examTaking.attentionAlert')}</span>
                </div>
              )}
            </div>
          </div>

          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 overflow-hidden">
            <div className="px-5 py-4 border-b border-slate-200 dark:border-slate-800">
              <span className="text-sm font-semibold flex items-center gap-2">
                <svg className="w-4 h-4 text-blue-600" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                </svg>
                {t('student.examTaking.navigator')}
              </span>
            </div>
            <div className="p-5">
              <div className="grid grid-cols-5 gap-2">
                {QUESTIONS.map((q, i) => {
                  const answered = answers[q.id] !== undefined;
                  const flag = flagged.has(q.id);
                  const active = i === activeIdx;
                  return (
                    <button
                      key={q.id}
                      onClick={() => setActiveIdx(i)}
                      className={`aspect-square rounded-lg text-sm font-semibold flex items-center justify-center transition-all ${
                        active
                          ? 'border-2 border-blue-600 bg-white dark:bg-slate-800 text-blue-600 ring-4 ring-blue-500/20'
                          : answered
                          ? 'bg-blue-600 text-white hover:bg-blue-700 border-2 border-blue-600'
                          : flag
                          ? 'bg-amber-100 dark:bg-amber-900/30 border-2 border-amber-500 text-amber-700 dark:text-amber-300'
                          : 'bg-white dark:bg-slate-800 border-2 border-slate-200 dark:border-slate-700 text-slate-500 dark:text-slate-400 hover:border-blue-500 hover:text-blue-600'
                      }`}
                    >
                      {i + 1}
                    </button>
                  );
                })}
              </div>
              <div className="flex items-center gap-4 mt-5 pt-5 border-t border-slate-200 dark:border-slate-800">
                <div className="flex-1 flex items-center gap-2 text-[13px]">
                  <span className="w-3 h-3 rounded bg-blue-600" />
                  <span>{t('student.examTaking.summaryAnswered')}: <strong>{answeredCount}</strong></span>
                </div>
                <div className="flex-1 flex items-center gap-2 text-[13px]">
                  <span className="w-3 h-3 rounded bg-slate-300 dark:bg-slate-600" />
                  <span>{t('student.examTaking.summaryUnanswered')}: <strong>{unansweredCount}</strong></span>
                </div>
                <div className="flex-1 flex items-center gap-2 text-[13px]">
                  <span className="w-3 h-3 rounded bg-amber-500" />
                  <span>{t('student.examTaking.summaryFlagged')}: <strong>{flagged.size}</strong></span>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 overflow-hidden">
            <div className="px-5 py-4 border-b border-slate-200 dark:border-slate-800">
              <span className="text-sm font-semibold flex items-center gap-2">
                <svg className="w-4 h-4 text-blue-600" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                </svg>
                {t('student.examTaking.rulesTitle')}
              </span>
            </div>
            <div className="p-5">
              <div className="flex flex-col gap-3">
                {RULES.map((r, i) => (
                  <div key={i} className="flex items-start gap-3">
                    <span
                      className={`w-6 h-6 rounded-md flex items-center justify-center flex-shrink-0 ${
                        r.kind === 'allow' ? 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400' : 'bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400'
                      }`}
                    >
                      {r.kind === 'allow' ? (
                        <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                          <path d="M5 13l4 4L19 7" />
                        </svg>
                      ) : (
                        <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                          <path d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      )}
                    </span>
                    <span className="text-[13px] text-slate-600 dark:text-slate-300 leading-relaxed">
                      {t(`student.examTaking.${r.key}`)}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </aside>
      </main>

      {showSubmitModal && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 transition-opacity">
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 w-full max-w-md overflow-hidden animate-fadeInUp">
            <div className="pt-7 pb-3 text-center">
              <div className="w-16 h-16 rounded-full bg-blue-50 dark:bg-blue-900/30 mx-auto mb-4 flex items-center justify-center">
                <svg className="w-8 h-8 text-blue-600" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <h2 className="text-xl font-bold mb-1">{t('student.examTaking.submitConfirmTitle')}</h2>
              <p className="text-sm text-slate-500 dark:text-slate-400">{t('student.examTaking.submitConfirmDesc')}</p>
            </div>
            <div className="px-6 pb-6">
              <div className="grid grid-cols-3 gap-3 mb-5">
                <div className="text-center py-4 bg-slate-50 dark:bg-slate-800/60 rounded-xl">
                  <div className="text-2xl font-bold text-blue-600">{answeredCount}</div>
                  <div className="text-xs text-slate-500 dark:text-slate-400 mt-1">{t('student.examTaking.answeredStat')}</div>
                </div>
                <div className="text-center py-4 bg-slate-50 dark:bg-slate-800/60 rounded-xl">
                  <div className="text-2xl font-bold text-slate-500">{unansweredCount}</div>
                  <div className="text-xs text-slate-500 dark:text-slate-400 mt-1">{t('student.examTaking.unansweredStat')}</div>
                </div>
                <div className="text-center py-4 bg-slate-50 dark:bg-slate-800/60 rounded-xl">
                  <div className="text-2xl font-bold text-amber-500">{flagged.size}</div>
                  <div className="text-xs text-slate-500 dark:text-slate-400 mt-1">{t('student.examTaking.flaggedStat')}</div>
                </div>
              </div>
              {unansweredCount > 0 && (
                <div className="p-4 rounded-xl bg-amber-50 dark:bg-amber-900/30 flex items-start gap-3">
                  <svg className="w-5 h-5 text-amber-500 flex-shrink-0 mt-0.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                  </svg>
                  <span className="text-sm text-amber-700 dark:text-amber-300">
                    {t('student.examTaking.warning', { count: unansweredCount })}
                  </span>
                </div>
              )}
              <div className="flex gap-3 mt-5">
                <button
                  onClick={() => setShowSubmitModal(false)}
                  className="flex-1 px-4 py-3.5 rounded-xl border border-slate-200 dark:border-slate-700 text-sm font-semibold hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
                >
                  {t('student.examTaking.submitContinue')}
                </button>
                <button
                  onClick={handleSubmit}
                  className="flex-1 px-4 py-3.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold transition-colors"
                >
                  {t('student.examTaking.submitFinal')}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="sr-only" aria-hidden>{userInitials}</div>
    </div>
  );
};

export default ExamTakingPage;
