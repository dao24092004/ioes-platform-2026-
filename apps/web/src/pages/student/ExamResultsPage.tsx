import React from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useQuery, useQueries } from '@tanstack/react-query';
import StudentLayout from '@/components/layout/StudentLayout';
import { Card, CardTitleWithIcon } from '@/components/common/Card';
import { examApi, toResultView, type ResultView } from '@/services/api/exam.api';

const ExamResultsPage: React.FC = () => {
  const { t } = useTranslation();
  const attemptsQuery = useQuery({
    queryKey: ['student', 'attempts'],
    queryFn: () => examApi.listAttempts(),
  });

  const attempts = (attemptsQuery.data ?? []).filter(a => a.submittedAt !== null);

  // Attempt chỉ mang examId, không mang tiêu đề. Nạp từng exam một; danh sách
  // tối đa 50 lượt và số lời gọi thật bằng số exam khác nhau.
  const examQueries = useQueries({
    queries: [...new Set(attempts.map(a => a.examId))].map(examId => ({
      queryKey: ['exam', examId],
      queryFn: () => examApi.getExam(examId),
    })),
  });

  const examById = new Map(
    examQueries.flatMap(q => (q.data ? [[q.data.id, q.data] as const] : [])),
  );

  const results: ResultView[] = attempts.map(a => toResultView(a, examById.get(a.examId)));
  const r = results[0];

  return (
    <StudentLayout title={t('student.results.title')} subtitle={t('student.results.subtitle')}>
      {r ? (
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
          <div className="xl:col-span-2 space-y-6">
            <Card padding="md">
              <div className="flex items-start justify-between gap-4 flex-wrap mb-4">
                <div>
                  <h2 className="text-xl font-bold text-slate-900 dark:text-white">{r.examTitle ?? '—'}</h2>
                  {r.submittedAt && (
                    <div className="text-xs text-slate-500 dark:text-slate-400 mt-1">{t('student.results.submitted')}: {new Date(r.submittedAt).toLocaleString('vi-VN')}</div>
                  )}
                </div>
                <span className={`px-4 py-2 rounded-xl text-sm font-bold ${
                  r.passed === true
                    ? 'bg-emerald-50 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400'
                    : 'bg-red-50 dark:bg-red-900/30 text-red-600 dark:text-red-400'
                }`}>
                  {r.passed === true ? t('student.results.passed') : t('student.results.failed')}
                </span>
              </div>

              <div className="grid grid-cols-3 gap-4 my-6">
                <div className="text-center p-4 rounded-xl bg-slate-50 dark:bg-slate-800/50">
                  <div className="text-3xl font-bold text-slate-900 dark:text-white">
                    {r.score ?? 0}<span className="text-base text-slate-500 dark:text-slate-400">{t('student.results.outOf', { total: r.maxScore ?? 0 })}</span>
                  </div>
                  <div className="text-xs text-slate-500 dark:text-slate-400 mt-1">{t('student.results.score')}</div>
                </div>
                <div className="text-center p-4 rounded-xl bg-slate-50 dark:bg-slate-800/50">
                  <div className="text-3xl font-bold text-slate-900 dark:text-white">{r.questionCount ?? '—'}</div>
                  <div className="text-xs text-slate-500 dark:text-slate-400 mt-1">{t('student.results.questionCount')}</div>
                </div>
                <div className="text-center p-4 rounded-xl bg-slate-50 dark:bg-slate-800/50">
                  <div className="text-3xl font-bold text-slate-900 dark:text-white">{r.timeLimitMinutes ?? '—'}'</div>
                  <div className="text-xs text-slate-500 dark:text-slate-400 mt-1">{t('student.exams.duration')}</div>
                </div>
              </div>

              <div className="flex items-center gap-2 flex-wrap mt-4">
                <Link to="/student/exams" className="px-4 py-2 rounded-lg border border-slate-200 dark:border-slate-700 hover:border-blue-500 text-sm font-semibold transition-colors">
                  {t('student.results.backToExams')}
                </Link>
                <button className="px-4 py-2 rounded-lg border border-slate-200 dark:border-slate-700 hover:border-blue-500 text-sm font-semibold transition-colors">
                  {t('student.results.reviewAnswers')}
                </button>
                <button className="px-4 py-2 rounded-lg border border-slate-200 dark:border-slate-700 hover:border-blue-500 text-sm font-semibold transition-colors">
                  {t('student.results.share')}
                </button>
                <button className="px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold transition-colors">
                  {t('student.results.retakeExam')}
                </button>
              </div>
            </Card>
          </div>

          <div className="space-y-6">
            <Card title={<CardTitleWithIcon color="accent"><ClockIcon /><span>{t('student.results.previousResults')}</span></CardTitleWithIcon>}>
              <div className="space-y-2">
                {results.map((res: ResultView) => (
                  <Link
                    key={res.attemptId}
                    to={`/student/exams/${res.examId}/result`}
                    className="block p-3 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors"
                  >
                    <div className="text-sm font-semibold truncate">{res.examTitle ?? '—'}</div>
                    <div className="mt-1.5 flex items-center gap-2">
                      <span className={`text-xs font-bold ${(res.percentageScore ?? 0) >= 80 ? 'text-emerald-600' : (res.percentageScore ?? 0) >= 60 ? 'text-amber-600' : 'text-red-600'}`}>{Math.round(res.percentageScore ?? 0)}/100</span>
                      <div className="flex-1 h-1 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                        <div className="h-full bg-blue-500" style={{ width: `${res.percentageScore ?? 0}%` }} />
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            </Card>
          </div>
        </div>
      ) : attemptsQuery.error ? (
        <div className="p-12 text-center text-sm text-red-600 dark:text-red-400">{t('common.loadError')}</div>
      ) : attemptsQuery.isLoading ? (
        <div className="p-12 text-center"><div className="inline-block w-8 h-8 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" /></div>
      ) : (
        <div className="p-12 text-center text-sm text-slate-500">{t('student.results.empty')}</div>
      )}
    </StudentLayout>
  );
};

const ClockIcon = () => (
  <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" /></svg>
);

export default ExamResultsPage;
