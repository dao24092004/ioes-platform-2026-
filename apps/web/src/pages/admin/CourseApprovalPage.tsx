import React, { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import AdminLayout from '@/components/layout/AdminLayout';
import {
  contentApi,
  countLessons,
  courseStat,
  type Course,
  type ReviewStatus,
} from '@/services/api/content.api';

type Filter = 'all' | ReviewStatus;

const getInitials = (title: string) =>
  title.split(' ').filter(Boolean).map(s => s.charAt(0)).slice(0, 2).join('').toUpperCase();

const formatDate = (iso: string | null | undefined) => {
  if (!iso) return '—';
  const d = new Date(iso);
  return `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear()}`;
};

const CourseApprovalPage: React.FC = () => {
  const { t } = useTranslation();
  const qc = useQueryClient();
  const [filter, setFilter] = useState<Filter>('pending');
  const [search, setSearch] = useState('');
  const [preview, setPreview] = useState<Course | null>(null);
  const [reason, setReason] = useState('');

  const { data: stats } = useQuery({
    queryKey: ['content', 'courses', 'stats'],
    queryFn: () => contentApi.getCourseStats(),
  });

  const { data: categories = [] } = useQuery({
    queryKey: ['content', 'categories'],
    queryFn: () => contentApi.listCategories(),
    staleTime: 5 * 60_000,
  });

  const { data: listData, isLoading, isError } = useQuery({
    queryKey: ['content', 'courses', 'approval-list', { filter, search }],
    queryFn: () => contentApi.listCourses({
      page: 1,
      perPage: 50,
      search: search || undefined,
      reviewStatus: filter,
    }),
  });

  // Danh sách không kèm cây chương, nên số bài học chỉ lấy khi mở xem trước.
  const { data: previewDetail } = useQuery({
    queryKey: ['content', 'course', preview?.id, 'detail'],
    queryFn: () => contentApi.getCourseDetail(preview!.id),
    enabled: !!preview,
  });

  const closePreview = () => {
    setPreview(null);
    setReason('');
    approveMut.reset();
    rejectMut.reset();
  };

  const approveMut = useMutation({
    mutationFn: (id: string) => contentApi.approveCourse(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['content', 'courses'] });
      closePreview();
    },
  });

  const rejectMut = useMutation({
    mutationFn: ({ id, reason }: { id: string; reason: string }) => contentApi.rejectCourse(id, reason),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['content', 'courses'] });
      closePreview();
    },
  });

  const courses = listData?.data ?? [];
  const categoryName = useMemo(() => {
    const byId = new Map(categories.map(c => [c.id, c.name]));
    return (id: string | null) => (id ? byId.get(id) : undefined);
  }, [categories]);

  const mutationError = (approveMut.error ?? rejectMut.error) as Error | null;

  const statusBadge = (course: Course) => {
    const status = course.reviewStatus;
    if (status === 'pending') return (
      <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium bg-amber-50 text-amber-600 dark:bg-amber-900/30 dark:text-amber-400 transition-transform hover:scale-105">
        <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-[pulse_2s_infinite]" />{t('admin.status.pending')}
      </span>
    );
    if (status === 'approved') return (
      <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium bg-emerald-50 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-400 transition-transform hover:scale-105">
        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />{t('admin.stats.approved')}
      </span>
    );
    if (status === 'rejected') return (
      <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium bg-red-50 text-red-600 dark:bg-red-900/30 dark:text-red-400 transition-transform hover:scale-105">
        <span className="w-1.5 h-1.5 rounded-full bg-red-500" />{t('admin.status.rejected')}
      </span>
    );
    return (
      <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400">
        <span className="w-1.5 h-1.5 rounded-full bg-slate-400" />{t('courseApi.reviewStatus.none')}
      </span>
    );
  };

  const statsCards = [
    { value: stats?.total ?? 0, label: t('admin.stats.allCourses'), color: 'blue', key: 'all' as const, icon: <svg className="w-6 h-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M4 19.5A2.5 2.5 0 016.5 17H20M6.5 2H20v20H6.5A2.5 2.5 0 014 19.5v-15A2.5 2.5 0 016.5 2z" /></svg> },
    { value: stats?.pendingReview ?? 0, label: t('admin.stats.pendingApproval'), color: 'orange', key: 'pending' as const, icon: <svg className="w-6 h-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" /></svg> },
    { value: stats?.approved ?? 0, label: t('admin.stats.approved'), color: 'green', key: 'approved' as const, icon: <svg className="w-6 h-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M22 11.08V12a10 10 0 11-5.93-9.14" /><polyline points="22 4 12 14.01 9 11.01" /></svg> },
    { value: stats?.rejected ?? 0, label: t('admin.stats.rejected'), color: 'red', key: 'rejected' as const, icon: <svg className="w-6 h-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10" /><line x1="15" y1="9" x2="9" y2="15" /><line x1="9" y1="9" x2="15" y2="15" /></svg> },
  ];

  const renderThumb = (c: Course, size: 'lg' | 'sm') => {
    const box = size === 'lg' ? 'w-14 h-14 rounded-2xl text-sm' : 'w-10 h-10 rounded-xl text-sm';
    return c.thumbnailUrl ? (
      <img src={c.thumbnailUrl} alt={c.title} loading="lazy" className={`${box} object-cover flex-shrink-0`} />
    ) : (
      <div className={`${box} bg-gradient-to-br from-blue-500 to-cyan-500 text-white flex items-center justify-center font-bold flex-shrink-0`}>
        {getInitials(c.title)}
      </div>
    );
  };

  return (
    <AdminLayout
      title={t('admin.approval.title')}
      subtitle={t('admin.approval.subtitle')}
    >
      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        {statsCards.map((s, i) => {
          const map = {
            blue: 'bg-blue-50 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400',
            orange: 'bg-amber-50 text-amber-600 dark:bg-amber-900/30 dark:text-amber-400',
            green: 'bg-emerald-50 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-400',
            red: 'bg-red-50 text-red-600 dark:bg-red-900/30 dark:text-red-400',
          };
          const active = filter === s.key;
          return (
            <button
              key={s.key}
              onClick={() => setFilter(s.key)}
              className={`group text-left bg-white dark:bg-slate-900 rounded-2xl border p-5 transition-all hover:-translate-y-1 hover:shadow-lg hover:shadow-blue-500/5 opacity-0 animate-[fadeInUp_.6s_ease-out_forwards] ${
                active ? 'border-blue-500 ring-2 ring-blue-500/20' : 'border-slate-200 dark:border-slate-800 hover:border-blue-200 dark:hover:border-blue-800'
              }`}
              style={{ animationDelay: `${(i + 1) * 0.1}s` }}
            >
              <div className={`w-12 h-12 rounded-xl flex items-center justify-center mb-3 transition-all group-hover:rotate-[10deg] group-hover:scale-110 ${map[s.color as keyof typeof map]}`}>
                {s.icon}
              </div>
              <div className="text-3xl font-bold mb-1 animate-[countUp_.5s_ease_forwards]">{s.value}</div>
              <div className="text-sm text-slate-500 dark:text-slate-400">{s.label}</div>
            </button>
          );
        })}
      </div>

      {/* Filters */}
      <div className="flex flex-col md:flex-row gap-3 mb-4">
        <div className="relative flex-1 md:max-w-xs">
          <svg className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="8" /><path d="M21 21l-4.35-4.35" /></svg>
          <input
            type="text"
            placeholder={t('admin.approval.searchPlaceholder')}
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full pl-11 pr-4 py-2.5 text-sm bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all"
          />
        </div>
      </div>

      {/* Cards grid */}
      {isLoading && (
        <div className="text-center py-16">
          <div className="inline-block w-10 h-10 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
        </div>
      )}
      {isError && (
        <div className="text-center py-16 bg-white dark:bg-slate-900 rounded-2xl border border-red-200 dark:border-red-900 text-sm text-red-600">
          {t('common.loadError')}
        </div>
      )}
      {!isLoading && !isError && courses.length === 0 && (
        <div className="text-center py-16 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800">
          <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center">
            <svg className="w-8 h-8 text-slate-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="8" /><path d="M21 21l-4.35-4.35" /></svg>
          </div>
          <p className="text-slate-500 dark:text-slate-400">{t('admin.approval.noResults')}</p>
        </div>
      )}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {courses.map((c: Course, i: number) => {
          const enrollments = courseStat(c, 'enrollments');
          const category = categoryName(c.categoryId);
          return (
            <div
              key={c.id}
              className="group bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-5 transition-all hover:-translate-y-1 hover:shadow-xl hover:shadow-blue-500/5 hover:border-blue-200 dark:hover:border-blue-800 opacity-0 animate-[fadeInUp_.6s_ease-out_forwards]"
              style={{ animationDelay: `${i * 0.05}s` }}
            >
              <div className="flex items-start gap-4 mb-3">
                {renderThumb(c, 'lg')}
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2 mb-1">
                    <h3 className="font-bold text-base group-hover:text-blue-600 transition-colors line-clamp-1">{c.title}</h3>
                    {statusBadge(c)}
                  </div>
                  <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400 mb-2 flex-wrap">
                    <span className="px-2 py-0.5 bg-slate-100 dark:bg-slate-800 rounded">{category ?? t('courseApi.uncategorized')}</span>
                    <span>•</span>
                    <span>{t(`instructor.courses.status.${c.status}`)}</span>
                  </div>
                  <p className="text-sm text-slate-600 dark:text-slate-400 line-clamp-2">{c.shortDescription ?? c.description ?? ''}</p>
                </div>
              </div>

              <div className="flex items-center gap-4 py-3 border-y border-slate-100 dark:border-slate-800 mb-3">
                {enrollments !== null && (
                  <div className="flex items-center gap-1.5 text-xs text-slate-500">
                    <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2" /><circle cx="9" cy="7" r="4" /></svg>
                    {enrollments} {t('admin.approval.students')}
                  </div>
                )}
                <div className="flex items-center gap-1.5 text-xs text-slate-500 ml-auto">
                  <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" /></svg>
                  {t('instructor.courses.updated')} {formatDate(c.updatedAt)}
                </div>
              </div>

              {c.rejectionReason && c.reviewStatus === 'rejected' && (
                <div className="mb-3 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl text-xs text-red-700 dark:text-red-300">
                  <strong className="block mb-1">{t('admin.approval.rejectionReason')}:</strong>{c.rejectionReason}
                </div>
              )}

              {c.reviewStatus === 'pending' ? (
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setPreview(c)}
                    className="flex-1 inline-flex items-center justify-center gap-1.5 px-3 py-2 text-sm font-medium rounded-xl border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 transition-all hover:-translate-y-0.5"
                  >
                    <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" /><circle cx="12" cy="12" r="3" /></svg>
                    {t('admin.approval.preview')}
                  </button>
                  <button
                    // Từ chối cần lý do, nên mở hộp xem trước để nhập thay vì gửi ngay.
                    onClick={() => { setPreview(c); setReason(''); }}
                    className="flex-1 inline-flex items-center justify-center gap-1.5 px-3 py-2 text-sm font-semibold rounded-xl bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 text-white shadow-md shadow-red-500/30 hover:shadow-red-500/50 transition-all hover:-translate-y-0.5"
                  >
                    <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>
                    {t('admin.approval.reject')}
                  </button>
                  <button
                    onClick={() => { setPreview(c); approveMut.mutate(c.id); }}
                    disabled={approveMut.isPending}
                    className="flex-1 inline-flex items-center justify-center gap-1.5 px-3 py-2 text-sm font-semibold rounded-xl bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-600 hover:to-emerald-700 text-white shadow-md shadow-emerald-500/30 hover:shadow-emerald-500/50 transition-all hover:-translate-y-0.5 disabled:opacity-50"
                  >
                    <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="20 6 9 17 4 12" /></svg>
                    {t('admin.approval.approve')}
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => setPreview(c)}
                  className="w-full inline-flex items-center justify-center gap-1.5 px-3 py-2 text-sm font-medium rounded-xl border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 transition-all"
                >
                  <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" /><circle cx="12" cy="12" r="3" /></svg>
                  {t('admin.approval.viewDetail')}
                </button>
              )}
            </div>
          );
        })}
      </div>

      {/* Preview modal */}
      {preview && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-[fadeIn_.2s_ease-out]" onClick={closePreview}>
          <div onClick={e => e.stopPropagation()} className="w-full max-w-2xl bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden animate-[fadeInUp_.3s_ease-out] max-h-[90vh] overflow-y-auto">
            <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between sticky top-0 bg-white dark:bg-slate-900 z-10">
              <div className="flex items-center gap-3">
                {renderThumb(preview, 'sm')}
                <div>
                  <h2 className="text-lg font-bold">{preview.title}</h2>
                  <p className="text-xs text-slate-500">{categoryName(preview.categoryId) ?? t('courseApi.uncategorized')}</p>
                </div>
              </div>
              <button onClick={closePreview} className="w-8 h-8 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 flex items-center justify-center transition-all">
                <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>
              </button>
            </div>
            <div className="p-6">
              <div className="flex items-center gap-3 mb-4">
                {statusBadge(preview)}
                {preview.difficultyLevel && (
                  <span className="px-3 py-1 rounded-lg bg-blue-50 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400 text-xs font-semibold">
                    {t(`courseApi.level.${preview.difficultyLevel}`)}
                  </span>
                )}
              </div>
              <p className="text-sm text-slate-600 dark:text-slate-400 mb-6 leading-relaxed">{preview.description ?? preview.shortDescription ?? t('courseApi.noDescription')}</p>
              <div className="grid grid-cols-3 gap-3 mb-6">
                <div className="bg-slate-50 dark:bg-slate-800/50 rounded-xl p-4 text-center">
                  <div className="text-2xl font-bold text-blue-600">{previewDetail ? countLessons(previewDetail.chapters) : '…'}</div>
                  <div className="text-xs text-slate-500 mt-1">{t('admin.approval.lessons')}</div>
                </div>
                <div className="bg-slate-50 dark:bg-slate-800/50 rounded-xl p-4 text-center">
                  <div className="text-2xl font-bold text-emerald-600">{previewDetail ? previewDetail.chapters.length : '…'}</div>
                  <div className="text-xs text-slate-500 mt-1">{t('student.courseDetail.section')}</div>
                </div>
                <div className="bg-slate-50 dark:bg-slate-800/50 rounded-xl p-4 text-center">
                  <div className="text-sm font-bold text-amber-600">{formatDate(preview.updatedAt)}</div>
                  <div className="text-xs text-slate-500 mt-1">{t('instructor.courses.updated')}</div>
                </div>
              </div>
              {preview.reviewStatus === 'pending' && (
                <div>
                  <label className="block text-sm font-semibold mb-2">{t('admin.approval.reasonLabel')}</label>
                  <textarea
                    rows={3}
                    maxLength={1000}
                    value={reason}
                    onChange={e => setReason(e.target.value)}
                    placeholder={t('admin.approval.reasonPlaceholder')}
                    className="w-full px-4 py-2.5 text-sm bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all resize-none"
                  />
                  <p className="mt-1 text-xs text-slate-500">{t('courseApi.rejectReasonRequired')}</p>
                </div>
              )}
              {mutationError && (
                <div className="mt-4 p-3 rounded-xl bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-sm text-red-700 dark:text-red-300">
                  {mutationError.message}
                </div>
              )}
            </div>
            <div className="px-6 py-4 border-t border-slate-200 dark:border-slate-800 flex items-center justify-end gap-2 bg-slate-50 dark:bg-slate-800/30">
              <button onClick={closePreview} className="px-4 py-2 text-sm font-semibold rounded-xl border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 transition-all">
                {t('common.cancel')}
              </button>
              {preview.reviewStatus === 'pending' && (
                <>
                  <button
                    onClick={() => rejectMut.mutate({ id: preview.id, reason: reason.trim() })}
                    disabled={rejectMut.isPending || !reason.trim()}
                    className="inline-flex items-center gap-2 px-4 py-2 text-sm font-semibold rounded-xl bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 text-white shadow-lg shadow-red-500/30 transition-all disabled:opacity-50"
                  >
                    <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>
                    {t('admin.approval.reject')}
                  </button>
                  <button
                    onClick={() => approveMut.mutate(preview.id)}
                    disabled={approveMut.isPending}
                    className="inline-flex items-center gap-2 px-4 py-2 text-sm font-semibold rounded-xl bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-600 hover:to-emerald-700 text-white shadow-lg shadow-emerald-500/30 transition-all disabled:opacity-50"
                  >
                    <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="20 6 9 17 4 12" /></svg>
                    {t('admin.approval.approve')}
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </AdminLayout>
  );
};

export default CourseApprovalPage;
