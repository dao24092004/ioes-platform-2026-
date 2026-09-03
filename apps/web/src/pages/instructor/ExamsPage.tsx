import React, { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useQuery } from '@tanstack/react-query';
import InstructorLayout from '@/components/layout/InstructorLayout';
import PaginationBar from '@/components/common/PaginationBar';
import { examApi, type Exam } from '@/services/api/exam.api';

type StatusFilter = 'all' | 'active' | 'scheduled' | 'completed' | 'draft';

/** Ô chưa có nguồn dữ liệu thật thì hiện dấu này thay vì bịa số. */
const EMPTY = '—';

/**
 * Bảng dưới đây lấy từ `GET /exams` (exam-suite) nên các cột đã có nguồn thật
 * là tiêu đề và mã đề. Entity `Exam` chưa có trường lịch thi, trạng thái, tên
 * khoá học, số người dự thi hay số bài chờ chấm — mấy cột đó để trống cho tới
 * khi backend bổ sung, chứ không suy diễn từ dữ liệu đang có.
 *
 * `ExamService.list()` cũng mới trả dữ liệu thật cho vai trò INSTRUCTOR;
 * STUDENT và ADMIN còn rơi vào nhánh trả mảng rỗng.
 */
const UNAVAILABLE_STATUS_FILTERS: readonly StatusFilter[] = [
  'active',
  'scheduled',
  'completed',
  'draft',
];

const ExamsPage: React.FC = () => {
  const { t } = useTranslation();
  const [status, setStatus] = useState<StatusFilter>('all');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  const { data: exams = [], isLoading } = useQuery({
    queryKey: ['instructor', 'exams', 'list'],
    queryFn: () => examApi.listExams(),
  });

  const filtered = useMemo(() => {
    // Không lọc theo trạng thái được: entity chưa có trường đó, mà lọc theo
    // giá trị rỗng thì bảng sẽ trắng trơn. Các nút lọc kia cũng bị khoá.
    let arr = exams;
    if (search.trim()) {
      const q = search.toLowerCase();
      arr = arr.filter((e: Exam) => e.title.toLowerCase().includes(q));
    }
    return arr;
  }, [exams, search]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const safePage = Math.min(page, totalPages);
  const startIdx = (safePage - 1) * pageSize;
  const endIdx = Math.min(startIdx + pageSize, filtered.length);
  const paged = filtered.slice(startIdx, endIdx);

  React.useEffect(() => {
    setPage(1);
  }, [status, search, pageSize]);

  // Chỉ tổng số đề là đếm được từ dữ liệu thật; ba ô còn lại chưa có nguồn.
  const totalExams = exams.length;

  return (
    <InstructorLayout
      title={t('instructor.exams.title')}
      subtitle={t('instructor.exams.subtitle')}
      headerActions={
        <Link
          to="/instructor/exams/create"
          className="hidden sm:inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold shadow-sm transition-colors"
        >
          <PlusSvg /> {t('instructor.exams.createNew')}
        </Link>
      }
    >
      <section className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <StatBox color="blue" label={t('instructor.exams.stats.total')} value={totalExams} icon={<ExamSvg />} />
        <StatBox color="emerald" label={t('instructor.exams.stats.active')} value={EMPTY} icon={<BoltSvg />} />
        <StatBox color="amber" label={t('instructor.exams.stats.pendingGrading')} value={EMPTY} icon={<ClipboardSvg />} />
        <StatBox color="cyan" label={t('instructor.exams.stats.participants')} value={EMPTY} icon={<UsersSvg />} />
      </section>

      <section className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-800 flex flex-wrap gap-3 items-center justify-between">
          <div className="flex flex-wrap gap-2">
            {(['all', 'active', 'scheduled', 'completed', 'draft'] as StatusFilter[]).map((s) => {
              const unavailable = UNAVAILABLE_STATUS_FILTERS.includes(s);
              return (
                <button
                  key={s}
                  onClick={() => setStatus(s)}
                  disabled={unavailable}
                  title={unavailable ? t('instructor.exams.statusUnavailable') : undefined}
                  className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-all disabled:opacity-40 disabled:cursor-not-allowed ${
                    status === s
                      ? 'bg-blue-600 text-white shadow-sm'
                      : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
                  }`}
                >
                  {t(`instructor.exams.filter.${s}`)}
                </button>
              );
            })}
          </div>
          <div className="relative">
            <input
              type="search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={t('instructor.exams.searchPlaceholder')}
              className="pl-9 pr-3 py-2 text-sm rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 focus:outline-none focus:border-blue-500 w-64"
            />
            <svg className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="11" cy="11" r="8" />
              <line x1="21" y1="21" x2="16.65" y2="16.65" />
            </svg>
          </div>
        </div>

        {isLoading ? (
          <div className="p-12 text-center">
            <div className="inline-block w-8 h-8 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="p-12 text-center">
            <div className="w-14 h-14 mx-auto mb-3 rounded-xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-400">
              <ExamSvg />
            </div>
            <p className="text-sm text-slate-500 mb-4">{t('instructor.exams.empty')}</p>
            <Link
              to="/instructor/exams/create"
              className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold transition-colors"
            >
              <PlusSvg /> {t('instructor.exams.createNew')}
            </Link>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <p className="px-6 py-3 text-xs text-slate-500 dark:text-slate-400 border-b border-slate-100 dark:border-slate-800">
              {t('instructor.exams.columnsPending')}
            </p>
            <table className="w-full">
              <thead>
                <tr className="bg-slate-50 dark:bg-slate-800/50 text-xs uppercase tracking-wider text-slate-500">
                  <th className="text-left px-6 py-3 font-semibold">{t('instructor.exams.table.exam')}</th>
                  <th className="text-left px-6 py-3 font-semibold">{t('instructor.exams.table.course')}</th>
                  <th className="text-center px-6 py-3 font-semibold">{t('instructor.exams.table.participants')}</th>
                  <th className="text-center px-6 py-3 font-semibold">{t('instructor.exams.table.pending')}</th>
                  <th className="text-left px-6 py-3 font-semibold">{t('instructor.exams.table.expires')}</th>
                  <th className="text-left px-6 py-3 font-semibold">{t('instructor.exams.table.status')}</th>
                  <th className="px-6 py-3"></th>
                </tr>
              </thead>
              <tbody>
                {paged.map((e: Exam) => (
                  <tr key={e.id} className="border-t border-slate-100 dark:border-slate-800 hover:bg-blue-50/50 dark:hover:bg-blue-900/10 transition-colors group">
                    <td className="px-6 py-4">
                      <div className="font-semibold text-sm">{e.title}</div>
                      <div className="text-xs text-slate-500">#{e.id}</div>
                    </td>
                    <td className="px-6 py-4 text-sm text-slate-400">{EMPTY}</td>
                    <td className="px-6 py-4 text-center text-sm text-slate-400">{EMPTY}</td>
                    <td className="px-6 py-4 text-center text-xs text-slate-400">{EMPTY}</td>
                    <td className="px-6 py-4 text-sm text-slate-400">{EMPTY}</td>
                    <td className="px-6 py-4 text-sm text-slate-400">{EMPTY}</td>
                    <td className="px-6 py-4 text-right">
                      <button
                        className="p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500 transition-colors"
                        title={t('instructor.exams.table.actions')}
                      >
                        <MoreSvg />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {!isLoading && filtered.length > 0 && (
          <PaginationBar
            i18nKey="instructor.exams"
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
    </InstructorLayout>
  );
};

interface StatBoxProps { color: 'blue' | 'emerald' | 'amber' | 'cyan'; label: string; value: string | number; icon: React.ReactNode; }

const colorMap: Record<StatBoxProps['color'], string> = {
  blue: 'bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400',
  emerald: 'bg-emerald-50 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400',
  amber: 'bg-amber-50 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400',
  cyan: 'bg-cyan-50 dark:bg-cyan-900/30 text-cyan-600 dark:text-cyan-400',
};

const StatBox: React.FC<StatBoxProps> = ({ color, label, value, icon }) => (
  <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-5 hover:-translate-y-1 transition-all hover:shadow-lg hover:shadow-blue-500/5">
    <div className={`w-11 h-11 rounded-xl flex items-center justify-center mb-3 ${colorMap[color]}`}>{icon}</div>
    <div className="text-2xl font-bold tabular-nums mb-1">{value}</div>
    <div className="text-xs text-slate-500 dark:text-slate-400">{label}</div>
  </div>
);

const ExamSvg = () => (
  <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
  </svg>
);
const BoltSvg = () => (
  <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
  </svg>
);
const ClipboardSvg = () => (
  <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 14l2 2 4-4" />
  </svg>
);
const UsersSvg = () => (
  <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2" />
    <circle cx="9" cy="7" r="4" />
  </svg>
);
const PlusSvg = () => (
  <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <line x1="12" y1="5" x2="12" y2="19" />
    <line x1="5" y1="12" x2="19" y2="12" />
  </svg>
);
const MoreSvg = () => (
  <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <circle cx="12" cy="12" r="1" />
    <circle cx="19" cy="12" r="1" />
    <circle cx="5" cy="12" r="1" />
  </svg>
);

export default ExamsPage;
