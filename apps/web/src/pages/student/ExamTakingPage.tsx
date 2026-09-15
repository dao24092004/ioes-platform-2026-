import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useUIStore } from '@/app/store/uiStore';
import ProctoringPanel from '@/components/proctoring/ProctoringPanel';
import { examApi, type AnswerSubmission, type Question } from '@/services/api/exam.api';

/**
 * Làm bài thi — nối vào exam flow thật của exam-suite:
 * 1. `POST /exams/:id/start` tạo lượt mới hoặc trả lại lượt đang làm dở.
 * 2. `GET /attempts/:id` lấy bộ câu hỏi đã chốt cho lượt đó (không kèm đáp án).
 * 3. `POST /exams/:id/submissions` nộp toàn bộ đáp án một lần.
 *
 * Đáp án chỉ giữ trong bộ nhớ trình duyệt tới lúc nộp: endpoint lưu từng câu
 * (`/api/v1/exam-attempts/:id/answers`) đang chặn JWT thật, xem ghi chú trong
 * `exam.api.ts`. Tải lại trang giữa chừng sẽ mất đáp án đã chọn.
 *
 * Đã gỡ bộ 12 câu toán viết cứng, đồng hồ 6670 giây và điểm tập trung 90% cố định.
 */

const SINGLE_CHOICE = new Set(['multiple_choice', 'true_false']);
const MULTI_CHOICE = 'multiple_select';

interface AnswerDraft {
  selectedOptionIds?: string[];
  answerText?: string;
}

const RULES = [
  { kind: 'allow', key: 'rule1' },
  { kind: 'allow', key: 'rule2' },
  { kind: 'deny', key: 'rule3' },
  { kind: 'deny', key: 'rule4' },
];

const isAnswered = (draft: AnswerDraft | undefined) =>
  Boolean(draft && ((draft.selectedOptionIds?.length ?? 0) > 0 || (draft.answerText?.trim().length ?? 0) > 0));

const ExamTakingPage: React.FC = () => {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { examId } = useParams<{ examId: string }>();
  const { theme, setTheme } = useUIStore();

  const [activeIdx, setActiveIdx] = useState(0);
  const [answers, setAnswers] = useState<Record<string, AnswerDraft>>({});
  const [flagged, setFlagged] = useState<Set<string>>(new Set());
  const [showSubmitModal, setShowSubmitModal] = useState(false);
  const [violationAlert, setViolationAlert] = useState(false);
  const [now, setNow] = useState(() => Date.now());
  const autoSubmittedRef = useRef(false);

  const examQuery = useQuery({
    queryKey: ['exam', examId],
    queryFn: () => examApi.getExam(examId as string),
    enabled: Boolean(examId),
  });

  // Gọi lại start khi đang có lượt dở thì backend trả đúng lượt đó, nên an toàn
  // khi React Query chạy lại; vẫn tắt retry/refetch để không bắn thêm request.
  const startQuery = useQuery({
    queryKey: ['student', 'exam-start', examId],
    queryFn: () => examApi.startExam(examId as string),
    enabled: Boolean(examId),
    retry: false,
    staleTime: Infinity,
    refetchOnWindowFocus: false,
  });
  const attemptId = startQuery.data?.attempt.id;

  const detailQuery = useQuery({
    queryKey: ['student', 'attempt', attemptId],
    queryFn: () => examApi.getAttempt(attemptId as string),
    enabled: Boolean(attemptId),
    staleTime: Infinity,
    refetchOnWindowFocus: false,
  });

  const exam = examQuery.data;
  const attempt = detailQuery.data?.attempt ?? startQuery.data?.attempt;
  const questions: Question[] = useMemo(() => detailQuery.data?.questions ?? [], [detailQuery.data]);

  const submit = useMutation({
    mutationFn: (auto: boolean) => {
      const payload: AnswerSubmission[] = Object.entries(answers)
        .filter(([, draft]) => isAnswered(draft))
        .map(([questionId, draft]) => ({
          questionId,
          answerText: draft.answerText?.trim() || undefined,
          selectedOptionIds: draft.selectedOptionIds?.length ? draft.selectedOptionIds : undefined,
        }));
      return examApi.submitExam(examId as string, payload, auto);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['student', 'attempts'] });
      queryClient.invalidateQueries({ queryKey: ['student', 'exams', 'list'] });
      queryClient.removeQueries({ queryKey: ['student', 'exam-start', examId] });
      navigate(`/student/exams/${examId}/result`);
    },
  });

  const deadlineMs =
    attempt?.startedAt && exam?.timeLimitMinutes
      ? Date.parse(attempt.startedAt) + exam.timeLimitMinutes * 60_000
      : null;
  const secondsLeft = deadlineMs !== null ? Math.max(0, Math.floor((deadlineMs - now) / 1000)) : null;

  useEffect(() => {
    if (deadlineMs === null) return;
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, [deadlineMs]);

  useEffect(() => {
    if (secondsLeft === 0 && !autoSubmittedRef.current && !submit.isPending) {
      autoSubmittedRef.current = true;
      submit.mutate(true);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [secondsLeft]);

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

  const loadError = examQuery.error ?? startQuery.error ?? detailQuery.error;
  if (loadError) {
    return (
      <FullScreenMessage>
        <p className="text-sm text-red-600 dark:text-red-400 mb-2">{t('examApi.examTaking.startError')}</p>
        <p className="text-xs text-slate-500 mb-6">{loadError.message}</p>
        <Link to="/student/exams" className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold">
          {t('examApi.examTaking.backToExams')}
        </Link>
      </FullScreenMessage>
    );
  }

  if (!exam || !attempt || detailQuery.isLoading) {
    return (
      <FullScreenMessage>
        <div className="inline-block w-8 h-8 border-2 border-blue-600 border-t-transparent rounded-full animate-spin mb-3" />
        <p className="text-sm text-slate-500">{t('examApi.examTaking.loading')}</p>
      </FullScreenMessage>
    );
  }

  if (questions.length === 0) {
    return (
      <FullScreenMessage>
        <p className="text-sm text-slate-600 dark:text-slate-300 mb-6">{t('examApi.examTaking.noQuestions')}</p>
        <Link to="/student/exams" className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold">
          {t('examApi.examTaking.backToExams')}
        </Link>
      </FullScreenMessage>
    );
  }

  const total = questions.length;
  const safeIdx = Math.min(activeIdx, total - 1);
  const currentQ = questions[safeIdx];
  const answeredCount = questions.filter(q => isAnswered(answers[q.id])).length;
  const unansweredCount = total - answeredCount;
  const options = [...(currentQ.options ?? [])].sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0));
  const isChoice = SINGLE_CHOICE.has(currentQ.questionType) || currentQ.questionType === MULTI_CHOICE;
  const draft = answers[currentQ.id];

  const danger = secondsLeft !== null && secondsLeft <= 300;
  const warning = secondsLeft !== null && !danger && secondsLeft <= 900;
  const clock =
    secondsLeft === null
      ? '--:--:--'
      : [Math.floor(secondsLeft / 3600), Math.floor((secondsLeft % 3600) / 60), secondsLeft % 60]
          .map(n => String(n).padStart(2, '0'))
          .join(':');

  const selectOption = (optionId: string) => {
    setAnswers(prev => {
      const current = prev[currentQ.id]?.selectedOptionIds ?? [];
      const next =
        currentQ.questionType === MULTI_CHOICE
          ? current.includes(optionId)
            ? current.filter(id => id !== optionId)
            : [...current, optionId]
          : [optionId];
      return { ...prev, [currentQ.id]: { selectedOptionIds: next } };
    });
  };

  const setText = (value: string) => {
    setAnswers(prev => ({ ...prev, [currentQ.id]: { answerText: value } }));
  };

  const toggleFlag = () => {
    setFlagged(prev => {
      const next = new Set(prev);
      if (next.has(currentQ.id)) next.delete(currentQ.id);
      else next.add(currentQ.id);
      return next;
    });
  };

  const isDark = theme === 'dark';

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100">
      <header className="fixed top-0 left-0 right-0 z-40 h-[72px] bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 px-6 flex items-center justify-between">
        <div className="flex items-center gap-6 min-w-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-600 to-cyan-600 flex items-center justify-center">
              <svg className="w-5 h-5 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M12 14l9-5-9-5-9 5 9 5z" />
                <path d="M12 14l6.16-3.422a12.083 12.083 0 01.665 6.479A11.952 11.952 0 0012 20.055a11.952 11.952 0 00-6.824-2.998 12.078 12.078 0 01.665-6.479L12 14z" />
              </svg>
            </div>
            <span className="text-lg font-bold">IOES</span>
          </div>
          <div className="px-4 py-2 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 min-w-0">
            <div className="text-xs text-slate-500 dark:text-slate-400">{t('student.examTaking.examLabel')}</div>
            <div className="text-sm font-semibold truncate">{exam.title}</div>
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
              {clock}
            </div>
            <div className="text-[11px] text-slate-500 dark:text-slate-400">
              {secondsLeft === null ? t('examApi.examTaking.noTimeLimit') : t('student.examTaking.timeLeft')}
            </div>
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
            {i18n.language === 'vi' ? 'VN' : 'EN'}
          </button>
          {exam.isProctored && (
            <div className="flex items-center gap-2 px-4 py-2 rounded-xl bg-emerald-50 dark:bg-emerald-900/30">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
              <span className="text-sm font-medium text-emerald-700 dark:text-emerald-300">
                {t('student.examTaking.proctoring')}
              </span>
            </div>
          )}
          <button
            onClick={() => setShowSubmitModal(true)}
            disabled={submit.isPending}
            className="flex items-center gap-2 px-6 py-3 rounded-xl bg-blue-600 hover:bg-blue-700 disabled:opacity-60 text-white text-sm font-semibold transition-colors"
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
              {t('student.examTaking.question')} {safeIdx + 1} {t('student.examTaking.of')} {total}
            </span>
            <span className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-300 text-sm font-medium">
              <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="currentColor">
                <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
              </svg>
              {currentQ.points} {t('student.examTaking.pointsUnit')}
            </span>
          </div>

          <div className="p-8">
            <p className="text-lg leading-relaxed text-slate-800 dark:text-slate-100 mb-8 whitespace-pre-line">
              {renderQuestionText(currentQ.questionText)}
            </p>

            {isChoice ? (
              <div className="flex flex-col gap-4">
                {currentQ.questionType === MULTI_CHOICE && (
                  <p className="text-xs text-slate-500 dark:text-slate-400">{t('examApi.examTaking.multiSelectHint')}</p>
                )}
                {options.map((opt, i) => {
                  const selected = draft?.selectedOptionIds?.includes(opt.id) ?? false;
                  const letter = String.fromCharCode(65 + i);
                  return (
                    <button
                      key={opt.id}
                      onClick={() => selectOption(opt.id)}
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
                        {renderQuestionText(opt.optionText)}
                      </span>
                    </button>
                  );
                })}
              </div>
            ) : (
              <textarea
                value={draft?.answerText ?? ''}
                onChange={e => setText(e.target.value)}
                rows={currentQ.questionType === 'short_answer' ? 3 : 10}
                placeholder={t('examApi.examTaking.answerPlaceholder')}
                className={`w-full px-4 py-3 rounded-2xl border-2 border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/40 focus:outline-none focus:border-blue-500 text-base ${
                  currentQ.questionType === 'coding' ? 'font-mono text-sm' : ''
                }`}
              />
            )}
          </div>

          <div className="px-6 py-5 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between">
            <button
              onClick={() => setActiveIdx(Math.max(0, safeIdx - 1))}
              disabled={safeIdx === 0}
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
              onClick={() => setActiveIdx(Math.min(total - 1, safeIdx + 1))}
              disabled={safeIdx === total - 1}
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
          {exam.isProctored && (
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
                attemptId={attempt.id}
                onViolation={() => setViolationAlert(true)}
                onAutoSubmitted={({ submissionId }) =>
                  navigate(`/student/exams/${examId}/result?submissionId=${submissionId}&flagged=1`)
                }
              />
              {violationAlert && (
                <div className="m-4 p-3 rounded-xl bg-amber-50 dark:bg-amber-900/30 flex items-center gap-2.5">
                  <svg className="w-5 h-5 text-amber-500 flex-shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                  </svg>
                  <span className="text-[13px] text-amber-700 dark:text-amber-300">{t('student.examTaking.attentionAlert')}</span>
                </div>
              )}
            </div>
          )}

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
                {questions.map((q, i) => {
                  const answered = isAnswered(answers[q.id]);
                  const flag = flagged.has(q.id);
                  const active = i === safeIdx;
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
              {submit.isError && (
                <p className="mt-4 text-sm text-red-600 dark:text-red-400">
                  {t('examApi.examTaking.submitError', { message: submit.error.message })}
                </p>
              )}
              <div className="flex gap-3 mt-5">
                <button
                  onClick={() => setShowSubmitModal(false)}
                  disabled={submit.isPending}
                  className="flex-1 px-4 py-3.5 rounded-xl border border-slate-200 dark:border-slate-700 text-sm font-semibold hover:bg-slate-50 dark:hover:bg-slate-800 disabled:opacity-60 transition-colors"
                >
                  {t('student.examTaking.submitContinue')}
                </button>
                <button
                  onClick={() => submit.mutate(false)}
                  disabled={submit.isPending}
                  className="flex-1 px-4 py-3.5 rounded-xl bg-blue-600 hover:bg-blue-700 disabled:opacity-60 text-white text-sm font-semibold transition-colors"
                >
                  {submit.isPending ? t('examApi.examTaking.submitting') : t('student.examTaking.submitFinal')}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

const FullScreenMessage: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex items-center justify-center p-6">
    <div className="max-w-md w-full text-center bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-8">
      {children}
    </div>
  </div>
);

export default ExamTakingPage;
