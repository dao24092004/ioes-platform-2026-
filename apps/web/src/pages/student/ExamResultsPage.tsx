import React from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useQuery } from '@tanstack/react-query';
import StudentLayout from '@/components/layout/StudentLayout';
import { Card, CardTitleWithIcon } from '@/components/common/Card';
import { studentApi, type StudentExamResult } from '@/services/api';

const ExamResultsPage: React.FC = () => {
  const { t } = useTranslation();
  const { data: results = [] } = useQuery({
    queryKey: ['student', 'results'],
    queryFn: () => studentApi.recentResults(),
  });
  const r = results[0];

  return (
    <StudentLayout title={t('student.results.title')} subtitle={t('student.results.subtitle')}>
      {r ? (
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
          <div className="xl:col-span-2 space-y-6">
            <Card padding="md">
              <div className="flex items-start justify-between gap-4 flex-wrap mb-4">
                <div>
                  <div className="text-sm text-slate-500 dark:text-slate-400">{r.course}</div>
                  <h2 className="text-xl font-bold text-slate-900 dark:text-white">{r.exam_title}</h2>
                  <div className="text-xs text-slate-500 dark:text-slate-400 mt-1">{t('student.results.submitted')}: {new Date(r.submitted_at).toLocaleString('vi-VN')}</div>
                </div>
                <span className={`px-4 py-2 rounded-xl text-sm font-bold ${
                  r.passed
                    ? 'bg-emerald-50 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400'
                    : 'bg-red-50 dark:bg-red-900/30 text-red-600 dark:text-red-400'
                }`}>
                  {r.passed ? t('student.results.passed') : t('student.results.failed')}
                </span>
              </div>

              <div className="grid grid-cols-3 gap-4 my-6">
                <div className="text-center p-4 rounded-xl bg-slate-50 dark:bg-slate-800/50">
                  <div className="text-3xl font-bold text-slate-900 dark:text-white">
                    {r.score}<span className="text-base text-slate-500 dark:text-slate-400">{t('student.results.outOf', { total: r.max_score })}</span>
                  </div>
                  <div className="text-xs text-slate-500 dark:text-slate-400 mt-1">{t('student.results.score')}</div>
                </div>
                <div className="text-center p-4 rounded-xl bg-slate-50 dark:bg-slate-800/50">
                  <div className="text-3xl font-bold text-slate-900 dark:text-white">#{r.rank}</div>
                  <div className="text-xs text-slate-500 dark:text-slate-400 mt-1">{t('student.results.rank')} / {r.total_participants}</div>
                </div>
                <div className="text-center p-4 rounded-xl bg-slate-50 dark:bg-slate-800/50">
                  <div className="text-3xl font-bold text-slate-900 dark:text-white">{r.time_used_min}'</div>
                  <div className="text-xs text-slate-500 dark:text-slate-400 mt-1">{t('student.results.timeUsed')} / {r.duration_min}'</div>
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

            <Card title={<CardTitleWithIcon color="primary"><ChartIcon /><span>{t('student.results.breakdown')}</span></CardTitleWithIcon>}>
              <div className="space-y-3">
                {r.breakdown.map((b: { section: string; score: number; max: number }, i: number) => {
                  const pct = Math.round((b.score / b.max) * 100);
                  return (
                    <div key={i}>
                      <div className="flex items-center justify-between text-sm mb-1">
                        <span className="font-semibold">{b.section}</span>
                        <span className="text-slate-500 dark:text-slate-400">{b.score}/{b.max} · {pct}%</span>
                      </div>
                      <div className="h-2 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                        <div
                          className={`h-full ${pct >= 80 ? 'bg-gradient-to-r from-emerald-500 to-green-500' : pct >= 60 ? 'bg-gradient-to-r from-amber-500 to-orange-500' : 'bg-gradient-to-r from-red-500 to-rose-500'}`}
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </Card>
          </div>

          <div className="space-y-6">
            <Card title={<CardTitleWithIcon color="success"><ChatIcon /><span>{t('student.results.feedback')}</span></CardTitleWithIcon>}>
              <p className="text-sm text-slate-700 dark:text-slate-300 leading-relaxed">{r.feedback}</p>
            </Card>

            <Card title={<CardTitleWithIcon color="accent"><ClockIcon /><span>{t('student.results.previousResults')}</span></CardTitleWithIcon>}>
              <div className="space-y-2">
                {results.map((res: StudentExamResult) => (
                  <Link
                    key={res.exam_id}
                    to={`/student/exams/${res.exam_id}/result`}
                    className="block p-3 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors"
                  >
                    <div className="text-sm font-semibold truncate">{res.exam_title}</div>
                    <div className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">{res.course} · #{res.rank}/{res.total_participants}</div>
                    <div className="mt-1.5 flex items-center gap-2">
                      <span className={`text-xs font-bold ${res.score >= 80 ? 'text-emerald-600' : res.score >= 60 ? 'text-amber-600' : 'text-red-600'}`}>{res.score}/100</span>
                      <div className="flex-1 h-1 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                        <div className="h-full bg-blue-500" style={{ width: `${res.score}%` }} />
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            </Card>
          </div>
        </div>
      ) : (
        <div className="p-12 text-center"><div className="inline-block w-8 h-8 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" /></div>
      )}
    </StudentLayout>
  );
};

const ChartIcon = () => (
  <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" /></svg>
);
const ChatIcon = () => (
  <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z" /></svg>
);
const ClockIcon = () => (
  <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" /></svg>
);

export default ExamResultsPage;
