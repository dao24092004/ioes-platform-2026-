import React, { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useQuery } from '@tanstack/react-query';
import StudentLayout from '@/components/layout/StudentLayout';
import { StatCard } from '@/components/common/StatCard';
import PaginationBar from '@/components/common/PaginationBar';
import { studentApi, type StudentExam } from '@/services/api';

type StatusFilter = 'all' | 'upcoming' | 'available' | 'in_progress' | 'completed' | 'missed';

const statusStyles: Record<StudentExam['status'], { bg: string; text: string; dot: string; label: string }> = {
  upcoming: { bg: 'bg-blue-50 dark:bg-blue-900/30', text: 'text-blue-600 dark:text-blue-400', dot: 'bg-blue-500', label: 'student.exams.status.upcoming' },
  available: { bg: 'bg-emerald-50 dark:bg-emerald-900/30', text: 'text-emerald-600 dark:text-emerald-400', dot: 'bg-emerald-500 animate-pulse', label: 'student.exams.status.available' },
  in_progress: { bg: 'bg-amber-50 dark:bg-amber-900/30', text: 'text-amber-600 dark:text-amber-400', dot: 'bg-amber-500', label: 'student.exams.status.in_progress' },
  completed: { bg: 'bg-slate-100 dark:bg-slate-800', text: 'text-slate-600 dark:text-slate-400', dot: 'bg-slate-400', label: 'student.exams.status.completed' },
  missed: { bg: 'bg-red-50 dark:bg-red-900/30', text: 'text-red-600 dark:text-red-400', dot: 'bg-red-500', label: 'student.exams.status.missed' },
};

const typeStyles: Record<StudentExam['type'], { bg: string; text: string; label: string }> = {
  midterm: { bg: 'bg-purple-50 dark:bg-purple-900/30', text: 'text-purple-600 dark:text-purple-400', label: 'student.exams.type.midterm' },
  final: { bg: 'bg-red-50 dark:bg-red-900/30', text: 'text-red-600 dark:text-red-400', label: 'student.exams.type.final' },
  quiz: { bg: 'bg-cyan-50 dark:bg-cyan-900/30', text: 'text-cyan-600 dark:text-cyan-400', label: 'student.exams.type.quiz' },
  practice: { bg: 'bg-slate-100 dark:bg-slate-800', text: 'text-slate-600 dark:text-slate-400', label: 'student.exams.type.practice' },
};

const ExamsPage: React.FC = () => {
  const { t } = useTranslation();
  const [status, setStatus] = useState<StatusFilter>('all');
  const [search, setSearch] = useState('');
  const [sort, setSort] = useState<'recent' | 'score'>('recent');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  const { data: exams = [], isLoading } = useQuery({
    queryKey: ['student', 'exams', 'list'],
    queryFn: () => studentApi.upcomingExams(),
  });

  const filtered = useMemo(() => {
    let arr = exams;
    if (status !== 'all') arr = arr.filter((e: StudentExam) => e.status === status);
    if (search.trim()) {
      const q = search.toLowerCase();
      arr = arr.filter((e: StudentExam) => e.title.toLowerCase().includes(q) || e.course.toLowerCase().includes(q));
    }
    if (sort === 'score') arr = [...arr].sort((a, b) => (b.best_score ?? 0) - (a.best_score ?? 0));
    else arr = [...arr].sort((a, b) => +new Date(b.scheduled_at ?? 0) - +new Date(a.scheduled_at ?? 0));
    return arr;
  }, [exams, status, search, sort]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const safePage = Math.min(page, totalPages);
  const startIdx = (safePage - 1) * pageSize;
  const endIdx = Math.min(startIdx + pageSize, filtered.length);
  const paged = filtered.slice(startIdx, endIdx);

  React.useEffect(() => {
    setPage(1);
  }, [status, search, sort, pageSize]);

  const stats = useMemo(() => {
    const completed = exams.filter((e: StudentExam) => e.status === 'completed' && e.best_score !== null);
    const avg = completed.length > 0 ? Math.round(completed.reduce((s: number, e: StudentExam) => s + (e.best_score ?? 0), 0) / completed.length) : 0;
    return {
      total: exams.length,
      upcoming: exams.filter((e: StudentExam) => e.status === 'upcoming' || e.status === 'available' || e.status === 'in_progress').length,
      completed: exams.filter((e: StudentExam) => e.status === 'completed').length,
      avgScore: avg,
    };
  }, [exams]);

  return (
    <StudentLayout
      title={t('student.exams.title')}
      subtitle={t('student.exams.subtitle')}
    >
      <section className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <StatCard color="blue" icon={<ExamIcon />} value={stats.total} label={t('student.exams.stats.total')} />
        <StatCard color="amber" icon={<ClockIcon />} value={stats.upcoming} label={t('student.exams.stats.upcoming')} />
        <StatCard color="emerald" icon={<CheckIcon />} value={stats.completed} label={t('student.exams.stats.completed')} />
        <StatCard color="purple" icon={<TrophyIcon />} value={stats.avgScore} label={t('student.exams.stats.avgScore')} />
      </section>

      <section className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-800 flex flex-wrap gap-3 items-center justify-between">
          <div className="flex flex-wrap gap-2">
            {(['all', 'upcoming', 'available', 'in_progress', 'completed', 'missed'] as StatusFilter[]).map(s => (
              <button
                key={s}
                onClick={() => setStatus(s)}
                className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-all ${
                  status === s
                    ? 'bg-blue-600 text-white shadow-sm'
                    : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
                }`}
              >
                {t(`student.exams.filter.${s}`)}
              </button>
            ))}
          </div>
          <div className="flex items-center gap-2">
            <div className="relative">
              <input
                type="search"
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder={t('student.exams.searchPlaceholder')}
                className="pl-9 pr-3 py-2 text-sm rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 focus:outline-none focus:border-blue-500 w-64"
              />
              <svg className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" /></svg>
            </div>
            <select
              value={sort}
              onChange={e => setSort(e.target.value as 'recent' | 'score')}
              className="px-3 py-2 text-sm rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 focus:outline-none focus:border-blue-500"
            >
              <option value="recent">{t('student.exams.sort.recent')}</option>
              <option value="score">{t('student.exams.sort.score')}</option>
            </select>
          </div>
        </div>

        {isLoading ? (
          <div className="p-12 text-center"><div className="inline-block w-8 h-8 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" /></div>
        ) : filtered.length === 0 ? (
          <div className="p-12 text-center text-sm text-slate-500">{t('student.exams.empty')}</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-slate-50 dark:bg-slate-800/50 text-xs uppercase tracking-wider text-slate-500">
                  <th className="text-left px-6 py-3 font-semibold">{t('student.exams.title')}</th>
                  <th className="text-left px-6 py-3 font-semibold">{t('student.courses.title')}</th>
                  <th className="text-center px-6 py-3 font-semibold">{t('student.exams.duration')}</th>
                  <th className="text-center px-6 py-3 font-semibold">{t('student.exams.attempts', { done: 0, max: 0 })}</th>
                  <th className="text-left px-6 py-3 font-semibold">{t('student.exams.status.upcoming')}</th>
                  <th className="text-left px-6 py-3 font-semibold">{t('student.exams.bestScore')}</th>
                  <th className="px-6 py-3"></th>
                </tr>
              </thead>
              <tbody>
                {paged.map((exam: StudentExam) => {
                  const ss = statusStyles[exam.status];
                  const ts = typeStyles[exam.type];
                  return (
                    <tr key={exam.id} className="border-t border-slate-100 dark:border-slate-800 hover:bg-blue-50/50 dark:hover:bg-blue-900/10 transition-colors">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                          <span className={`inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-bold uppercase ${ts.bg} ${ts.text}`}>
                            {t(ts.label)}
                          </span>
                          <span className="font-semibold text-sm">{exam.title}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-sm">{exam.course}</td>
                      <td className="px-6 py-4 text-center">
                        <div className="text-sm font-semibold">{exam.duration_min} min</div>
                        <div className="text-xs text-slate-500">{exam.questions} câu</div>
                      </td>
                      <td className="px-6 py-4 text-center text-sm">
                        {exam.attempts}/{exam.max_attempts}
                      </td>
                      <td className="px-6 py-4">
                        <span className={`inline-flex items-center gap-1.5 px-2 py-1 rounded-md text-xs font-semibold ${ss.bg} ${ss.text}`}>
                          <span className={`w-1.5 h-1.5 rounded-full ${ss.dot}`} />
                          {t(ss.label)}
                        </span>
                        {exam.due_in && (
                          <div className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">{exam.due_in}</div>
                        )}
                      </td>
                      <td className="px-6 py-4">
                        {exam.best_score !== null ? (
                          <span className={`inline-flex items-center px-2 py-0.5 rounded-md text-xs font-bold ${
                            exam.best_score >= 80
                              ? 'bg-emerald-50 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400'
                              : exam.best_score >= 60
                              ? 'bg-amber-50 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400'
                              : 'bg-red-50 dark:bg-red-900/30 text-red-600 dark:text-red-400'
                          }`}>
                            {exam.best_score}
                          </span>
                        ) : (
                          <span className="text-xs text-slate-400">—</span>
                        )}
                      </td>
                      <td className="px-6 py-4 text-right">
                        {exam.status === 'completed' ? (
                          <Link
                            to={`/student/exams/${exam.id}/result`}
                            className="px-3 py-1.5 text-xs font-semibold rounded-lg border border-slate-200 dark:border-slate-700 hover:border-blue-500 hover:text-blue-600 transition-colors"
                          >
                            {t('student.exams.viewResult')}
                          </Link>
                        ) : exam.status === 'missed' ? (
                          <span className="text-xs text-slate-400">—</span>
                        ) : (
                          <Link
                            to={`/student/exams/${exam.id}/take`}
                            className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors ${
                              exam.status === 'in_progress'
                                ? 'bg-amber-500 hover:bg-amber-600 text-white'
                                : 'bg-blue-600 hover:bg-blue-700 text-white'
                            }`}
                          >
                            {exam.status === 'in_progress' ? t('student.exams.resumeBtn') : t('student.exams.startBtn')}
                          </Link>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {!isLoading && filtered.length > 0 && (
          <PaginationBar
            i18nKey="student.exams"
            page={safePage}
            totalPages={totalPages}
            pageSize={pageSize}
            startIdx={startIdx}
            endIdx={endIdx}
            total={filtered.length}
            onPageChange={setPage}
            onPageSizeChange={setPageSize}
          />
        )}
      </section>
    </StudentLayout>
  );
};

const ExamIcon = () => (
  <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" /></svg>
);
const ClockIcon = () => (
  <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" /></svg>
);
const CheckIcon = () => (
  <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="20 6 9 17 4 12" /></svg>
);
const TrophyIcon = () => (
  <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M8 21h8M12 17v4M17 4H7l1 7a5 5 0 0010 0l-1-7zM3 4h4v3a3 3 0 01-3 3V4zM21 4h-4v3a3 3 0 003-3V4z" /></svg>
);

export default ExamsPage;
