import React, { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import StudentLayout from '@/components/layout/StudentLayout';
import PaginationBar from '@/components/common/PaginationBar';

interface RecommendedCourse {
  id: string;
  title: string;
  instructor: string;
  rating: number;
  enrolled: number;
  duration_hours: number;
  category: string;
  thumbnail: string;
  reason: 'basedOnHistory' | 'trending' | 'similarStudents' | 'newRelease' | 'instructor';
}

const RECOMMENDED: RecommendedCourse[] = [
  { id: 'r-001', title: 'Advanced TypeScript Patterns', instructor: 'TS. Nguyễn Văn A', rating: 4.9, enrolled: 1248, duration_hours: 18, category: 'Web Dev', thumbnail: 'https://images.unsplash.com/photo-1516116216624-53e697fedbea?w=800&q=70', reason: 'instructor' },
  { id: 'r-002', title: 'System Design Interview', instructor: 'Trần Thị Hương', rating: 4.8, enrolled: 892, duration_hours: 24, category: 'System', thumbnail: 'https://images.unsplash.com/photo-1518770660439-4636190af475?w=800&q=70', reason: 'trending' },
  { id: 'r-003', title: 'Deep Learning với PyTorch', instructor: 'TS. Nguyễn Văn A', rating: 4.9, enrolled: 1567, duration_hours: 36, category: 'AI/ML', thumbnail: 'https://images.unsplash.com/photo-1555949963-aa79dcee981c?w=800&q=70', reason: 'basedOnHistory' },
  { id: 'r-004', title: 'DevOps with Kubernetes', instructor: 'Phạm Văn Quang', rating: 4.7, enrolled: 654, duration_hours: 22, category: 'DevOps', thumbnail: 'https://images.unsplash.com/photo-1667372393119-3d4c48d07fc9?w=800&q=70', reason: 'similarStudents' },
  { id: 'r-005', title: 'TailwindCSS Mastery', instructor: 'Trần Thị Hương', rating: 4.8, enrolled: 2103, duration_hours: 12, category: 'Web Dev', thumbnail: 'https://images.unsplash.com/photo-1547658719-da2b51169166?w=800&q=70', reason: 'trending' },
  { id: 'r-006', title: 'GraphQL từ cơ bản đến nâng cao', instructor: 'TS. Nguyễn Văn A', rating: 4.7, enrolled: 423, duration_hours: 16, category: 'Backend', thumbnail: 'https://images.unsplash.com/photo-1551288049-bebda4e38f71?w=800&q=70', reason: 'newRelease' },
  { id: 'r-007', title: 'React Performance Optimization', instructor: 'TS. Nguyễn Văn A', rating: 4.9, enrolled: 1532, duration_hours: 14, category: 'Web Dev', thumbnail: 'https://images.unsplash.com/photo-1633356122544-f134324a6cee?w=800&q=70', reason: 'basedOnHistory' },
  { id: 'r-008', title: 'AWS Solutions Architect', instructor: 'Trần Anh Tuấn', rating: 4.8, enrolled: 1876, duration_hours: 30, category: 'Cloud', thumbnail: 'https://images.unsplash.com/photo-1451187580459-43490279c0fa?w=800&q=70', reason: 'trending' },
  { id: 'r-009', title: 'MongoDB toàn tập', instructor: 'Nguyễn Phương Thảo', rating: 4.6, enrolled: 743, duration_hours: 20, category: 'Database', thumbnail: 'https://images.unsplash.com/photo-1544383835-bda2bc66a55d?w=800&q=70', reason: 'similarStudents' },
  { id: 'r-010', title: 'Penetration Testing cơ bản', instructor: 'Lê Minh Đức', rating: 4.7, enrolled: 612, duration_hours: 28, category: 'Security', thumbnail: 'https://images.unsplash.com/photo-1550751827-4bd374c3f58b?w=800&q=70', reason: 'newRelease' },
  { id: 'r-011', title: 'UI/UX Design Thinking', instructor: 'Lê Quốc Bảo', rating: 4.8, enrolled: 1102, duration_hours: 16, category: 'Design', thumbnail: 'https://images.unsplash.com/photo-1561070791-2526d30994b8?w=800&q=70', reason: 'instructor' },
  { id: 'r-012', title: 'Cấu trúc dữ liệu & Giải thuật', instructor: 'Phạm Văn Quang', rating: 4.9, enrolled: 2341, duration_hours: 40, category: 'CS', thumbnail: 'https://images.unsplash.com/photo-1517694712202-14dd9538aa97?w=800&q=70', reason: 'trending' },
];

const reasonBadge: Record<RecommendedCourse['reason'], { color: string; icon: string }> = {
  basedOnHistory: { color: 'bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400', icon: '📚' },
  trending: { color: 'bg-red-50 dark:bg-red-900/30 text-red-600 dark:text-red-400', icon: '🔥' },
  similarStudents: { color: 'bg-purple-50 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400', icon: '👥' },
  newRelease: { color: 'bg-emerald-50 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400', icon: '✨' },
  instructor: { color: 'bg-amber-50 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400', icon: '⭐' },
};

const RecommendationsPage: React.FC = () => {
  const { t } = useTranslation();
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(6);

  const totalPages = Math.max(1, Math.ceil(RECOMMENDED.length / pageSize));
  const safePage = Math.min(page, totalPages);
  const startIdx = (safePage - 1) * pageSize;
  const endIdx = Math.min(startIdx + pageSize, RECOMMENDED.length);
  const paged = useMemo(() => RECOMMENDED.slice(startIdx, endIdx), [startIdx, endIdx]);

  useEffect(() => {
    setPage(1);
  }, [pageSize]);

  return (
    <StudentLayout
      title={t('student.recommendations.title')}
      subtitle={t('student.recommendations.subtitle')}
      headerActions={
        <button className="hidden sm:inline-flex items-center gap-2 px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 hover:border-blue-500 text-sm font-semibold transition-colors">
          <RefreshIcon /> {t('student.recommendations.refresh')}
        </button>
      }
    >
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
        {paged.map(r => {
          const rb = reasonBadge[r.reason];
          return (
            <div key={r.id} className="group bg-white dark:bg-slate-800/40 border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden hover:shadow-xl hover:-translate-y-1 transition-all">
              <div className="relative h-32 bg-slate-100 dark:bg-slate-900 overflow-hidden">
                <img
                  src={r.thumbnail}
                  alt={r.title}
                  loading="lazy"
                  className="absolute inset-0 w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                />
                <div className="absolute inset-x-0 bottom-0 h-14 bg-gradient-to-t from-black/55 to-transparent pointer-events-none" />
                <span className={`absolute top-3 left-3 px-2 py-1 rounded-md ${rb.color} text-[10px] font-bold uppercase flex items-center gap-1 backdrop-blur-sm`}>
                  <span>{rb.icon}</span> {t(`student.recommendations.reason.${r.reason}`)}
                </span>
                <span className="absolute top-3 right-3 px-2 py-1 rounded bg-white/25 backdrop-blur text-white text-[10px] font-bold uppercase">
                  {r.category}
                </span>
              </div>
              <div className="p-4">
                <h3 className="font-bold text-sm text-slate-900 dark:text-white line-clamp-2 mb-1">{r.title}</h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 mb-3">{r.instructor}</p>
                <div className="flex items-center gap-3 text-xs text-slate-500 dark:text-slate-400 mb-4">
                  <span className="flex items-center gap-1 text-amber-500">★ {r.rating}</span>
                  <span>•</span>
                  <span>{r.enrolled.toLocaleString('en-US')} học viên</span>
                  <span>•</span>
                  <span>{r.duration_hours}h</span>
                </div>
                <div className="flex items-center gap-2">
                  <button className="flex-1 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold transition-colors">
                    {t('student.recommendations.enroll')}
                  </button>
                  <Link
                    to={`/student/courses/sc-001`}
                    className="px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 hover:border-blue-500 hover:text-blue-600 text-xs font-semibold transition-colors"
                  >
                    {t('student.recommendations.viewDetail')}
                  </Link>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <div className="mt-6 bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 overflow-hidden">
        <PaginationBar
          i18nKey="student.recommendations"
          page={safePage}
          totalPages={totalPages}
          pageSize={pageSize}
          startIdx={startIdx}
          endIdx={endIdx}
          total={RECOMMENDED.length}
          onPageChange={setPage}
          onPageSizeChange={setPageSize}
          pageSizeOptions={[6, 9, 12, 24]}
        />
      </div>
    </StudentLayout>
  );
};

const RefreshIcon = () => (
  <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="23 4 23 10 17 10" /><polyline points="1 20 1 14 7 14" /><path d="M3.51 9a9 9 0 0114.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0020.49 15" /></svg>
);

export default RecommendationsPage;
