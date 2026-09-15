import React, { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import InstructorLayout from '@/components/layout/InstructorLayout';
import { examApi, type GradeResult, type GradingQueueItem } from '@/services/api/exam.api';
import { formatRelative } from '@/utils/time';

/**
 * Hàng đợi chấm bài — `GET /exams/grading/stats`, `/exams/grading/queue` và
 * `POST /exams/:examId/submissions/:attemptId/grade`.
 *
 * Bảng cũ có điểm tập trung, số vi phạm và trạng thái clean/warning/flagged
 * cho từng phiên; backend không lưu mấy số đó xuống bảng (vi phạm chỉ nằm
 * trong Redis) nên đã bỏ. Hàng đợi chỉ trả `userId`, chưa có tên học viên.
 */
const GradingPage: React.FC = () => {
  const { t } = useTranslation();
  const queryClient = useQueryClient();

  const { data: stats, isError: statsError } = useQuery({
    queryKey: ['exams', 'grading', 'stats'],
    queryFn: () => examApi.getGradingStats(),
  });
  const { data: queue = [], isLoading, isError } = useQuery({
    queryKey: ['exams', 'grading', 'queue'],
    queryFn: () => examApi.getGradingQueue(),
  });
  // Tên đề lấy từ danh sách đề giảng viên nhìn thấy; hàng đợi chỉ có examId.
  const { data: exams = [] } = useQuery({
    queryKey: ['instructor', 'exams', 'list'],
    queryFn: () => examApi.listExams(),
  });
  const titleById = useMemo(() => new Map(exams.map(e => [e.id, e.title])), [exams]);

  const grade = useMutation<GradeResult, Error, GradingQueueItem>({
    mutationFn: item => examApi.gradeAttempt(item.examId, item.attemptId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['exams', 'grading'] });
    },
  });

  return (
    <InstructorLayout title={t('instructor.grading.title')} subtitle={t('instructor.grading.subtitle')}>
      <section className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
        <StatBox color="amber" value={stats?.pending ?? '—'} label={t('examApi.grading.stats.pending')} />
        <StatBox color="emerald" value={stats?.graded ?? '—'} label={t('examApi.grading.stats.graded')} />
        <StatBox
          color="blue"
          value={stats?.oldestPendingSubmittedAt ? formatRelative(stats.oldestPendingSubmittedAt) : t('shared.none')}
          label={t('examApi.grading.stats.oldestPending')}
        />
      </section>

      {(statsError || isError) && (
        <div className="mb-4 p-3 rounded-xl bg-red-50 dark:bg-red-900/20 text-sm text-red-600 dark:text-red-400">
          {t('common.loadError')}
        </div>
      )}

      {grade.isError && (
        <div className="mb-4 p-3 rounded-xl bg-red-50 dark:bg-red-900/20 text-sm text-red-600 dark:text-red-400">
          {t('examApi.grading.gradeError', { message: grade.error.message })}
        </div>
      )}
      {grade.isSuccess && (
        <div className="mb-4 p-3 rounded-xl bg-emerald-50 dark:bg-emerald-900/20 text-sm text-emerald-700 dark:text-emerald-300">
          {t('examApi.grading.gradeSuccess', {
            score: grade.data.score,
            max: grade.data.maxScore,
            pct: grade.data.percentageScore.toFixed(1),
          })}
        </div>
      )}

      <section className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-100 dark:border-slate-800">
          <h2 className="text-base font-bold text-slate-900 dark:text-white">{t('examApi.grading.queueTitle')}</h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">{t('examApi.grading.note')}</p>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 dark:bg-slate-800/50 text-xs text-slate-500 dark:text-slate-400 uppercase tracking-wider">
              <tr>
                <th className="text-left px-5 py-3">{t('examApi.grading.table.student')}</th>
                <th className="text-left px-5 py-3">{t('examApi.grading.table.exam')}</th>
                <th className="text-left px-5 py-3">{t('examApi.grading.table.submittedAt')}</th>
                <th className="text-left px-5 py-3">{t('examApi.grading.table.score')}</th>
                <th className="text-right px-5 py-3">{t('examApi.grading.table.actions')}</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr>
                  <td colSpan={5} className="px-5 py-12 text-center">
                    <div className="inline-block w-8 h-8 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
                  </td>
                </tr>
              ) : queue.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-5 py-12 text-center text-slate-500 dark:text-slate-400">
                    {t('examApi.grading.empty')}
                  </td>
                </tr>
              ) : (
                queue.map(item => {
                  const busy = grade.isPending && grade.variables?.attemptId === item.attemptId;
                  return (
                    <tr
                      key={item.attemptId}
                      className="border-t border-slate-100 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/40"
                    >
                      <td className="px-5 py-3 font-mono text-xs text-slate-700 dark:text-slate-300">{item.userId.slice(0, 8)}</td>
                      <td className="px-5 py-3 font-semibold text-slate-900 dark:text-white">
                        {titleById.get(item.examId) ?? <span className="font-mono text-xs">{item.examId.slice(0, 8)}</span>}
                      </td>
                      <td className="px-5 py-3 text-slate-700 dark:text-slate-300">
                        {item.submittedAt ? formatRelative(item.submittedAt) : t('shared.none')}
                      </td>
                      <td className="px-5 py-3 tabular-nums text-slate-700 dark:text-slate-300">
                        {item.score !== null && item.maxScore !== null ? `${item.score}/${item.maxScore}` : t('shared.none')}
                      </td>
                      <td className="px-5 py-3 text-right">
                        <button
                          type="button"
                          onClick={() => grade.mutate(item)}
                          disabled={grade.isPending}
                          className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300 hover:bg-blue-200 dark:hover:bg-blue-900/60 disabled:opacity-60 transition-colors"
                        >
                          {busy ? t('examApi.grading.grading') : t('examApi.grading.grade')}
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </section>
    </InstructorLayout>
  );
};

interface StatBoxProps {
  color: 'blue' | 'emerald' | 'amber';
  value: string | number;
  label: string;
}

const StatBox: React.FC<StatBoxProps> = ({ color, value, label }) => {
  const colorMap: Record<StatBoxProps['color'], string> = {
    blue: 'border-blue-200 dark:border-blue-900/50 bg-blue-50 dark:bg-blue-900/20',
    emerald: 'border-emerald-200 dark:border-emerald-900/50 bg-emerald-50 dark:bg-emerald-900/20',
    amber: 'border-amber-200 dark:border-amber-900/50 bg-amber-50 dark:bg-amber-900/20',
  };
  return (
    <div className={`rounded-2xl p-4 border ${colorMap[color]}`}>
      <div className="text-3xl font-bold text-slate-900 dark:text-white">{value}</div>
      <div className="text-sm text-slate-600 dark:text-slate-400 mt-1">{label}</div>
    </div>
  );
};

export default GradingPage;
