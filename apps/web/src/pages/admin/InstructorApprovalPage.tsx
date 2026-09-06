import React, { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import AdminLayout from '@/components/layout/AdminLayout';

type InstructorApprovalStatus = 'pending' | 'approved' | 'rejected';

interface InstructorApplication {
  id: string;
  fullName: string;
  email: string;
  phone?: string;
  department: string;
  title: string;          // Lecturer / Professor / Dr. ...
  expertise: string;      // e.g. "Machine Learning, Python"
  experienceYears: number;
  bio: string;
  cvUrl?: string;
  portfolioUrl?: string;
  status: InstructorApprovalStatus;
  submittedAt: string;
  rejectionReason?: string;
}

const MOCK_APPLICATIONS: InstructorApplication[] = [
  {
    id: 'ia-001',
    fullName: 'Nguyễn Minh Khoa',
    email: 'khoa.nguyen@ioes.edu.vn',
    phone: '0912 345 678',
    department: 'Khoa CNTT',
    title: 'Tiến sĩ',
    expertise: 'AI / Machine Learning, Python',
    experienceYears: 8,
    bio: 'Nghiên cứu về Deep Learning và Computer Vision, đã công bố hơn 15 bài báo tại các hội nghị quốc tế.',
    cvUrl: '#',
    status: 'pending',
    submittedAt: '2026-08-20T09:30:00Z',
  },
  {
    id: 'ia-002',
    fullName: 'Trần Thị Hương',
    email: 'huong.tran@ioes.edu.vn',
    phone: '0987 654 321',
    department: 'Khoa Kinh tế',
    title: 'Thạc sĩ',
    expertise: 'Marketing, Data Analytics',
    experienceYears: 5,
    bio: 'Giảng viên Marketing số, chuyên về phân tích dữ liệu hành vi khách hàng.',
    cvUrl: '#',
    portfolioUrl: '#',
    status: 'pending',
    submittedAt: '2026-08-21T14:15:00Z',
  },
  {
    id: 'ia-003',
    fullName: 'Lê Hoàng Nam',
    email: 'nam.le@ioes.edu.vn',
    department: 'Khoa Điện - Điện tử',
    title: 'Kỹ sư',
    expertise: 'IoT, Embedded Systems',
    experienceYears: 3,
    bio: 'Kỹ sư điện tử với 3 năm kinh nghiệm phát triển thiết bị IoT công nghiệp.',
    status: 'pending',
    submittedAt: '2026-08-22T08:45:00Z',
  },
  {
    id: 'ia-004',
    fullName: 'Phạm Quỳnh Anh',
    email: 'quynhanh.pham@ioes.edu.vn',
    department: 'Khoa Ngoại ngữ',
    title: 'Thạc sĩ',
    expertise: 'Tiếng Anh, IELTS',
    experienceYears: 6,
    bio: 'Giảng viên IELTS với chứng chỉ Cambridge, hơn 6 năm đào tạo luyện thi.',
    status: 'approved',
    submittedAt: '2026-08-15T10:00:00Z',
  },
  {
    id: 'ia-005',
    fullName: 'Đỗ Văn Hùng',
    email: 'hung.do@ioes.edu.vn',
    department: 'Khoa CNTT',
    title: 'Thạc sĩ',
    expertise: 'Web Development, React',
    experienceYears: 4,
    bio: 'Full-stack developer với 4 năm kinh nghiệm tại các startup công nghệ.',
    status: 'rejected',
    submittedAt: '2026-08-10T13:20:00Z',
    rejectionReason: 'Thiếu bằng cấp liên quan đến sư phạm. Vui lòng bổ sung chứng chỉ nghiệp vụ giảng viên.',
  },
];

const getInitials = (name: string) =>
  name.split(' ').filter(Boolean).map(s => s.charAt(0)).slice(0, 2).join('').toUpperCase();

const formatDate = (iso: string) => {
  const d = new Date(iso);
  return `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear()}`;
};

const InstructorApprovalPage: React.FC = () => {
  const { t } = useTranslation();
  const [filter, setFilter] = useState<'all' | InstructorApprovalStatus>('pending');
  const [search, setSearch] = useState('');
  const [preview, setPreview] = useState<InstructorApplication | null>(null);
  const [reason, setReason] = useState('');

  const [apps, setApps] = useState<InstructorApplication[]>(MOCK_APPLICATIONS);

  const stats = useMemo(() => ({
    total: apps.length,
    pending: apps.filter(a => a.status === 'pending').length,
    approved: apps.filter(a => a.status === 'approved').length,
    rejected: apps.filter(a => a.status === 'rejected').length,
  }), [apps]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return apps.filter(a => {
      if (filter !== 'all' && a.status !== filter) return false;
      if (q) {
        const hay = `${a.fullName} ${a.email} ${a.department} ${a.expertise}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }, [apps, filter, search]);

  const handleApprove = (id: string) => {
    setApps(prev => prev.map(a => a.id === id ? { ...a, status: 'approved', rejectionReason: undefined } : a));
    setPreview(null);
  };

  const handleReject = (id: string) => {
    const finalReason = reason.trim() || 'No reason provided';
    setApps(prev => prev.map(a => a.id === id ? { ...a, status: 'rejected', rejectionReason: finalReason } : a));
    setPreview(null);
    setReason('');
  };

  const statusBadge = (status: InstructorApprovalStatus) => {
    if (status === 'pending') return (
      <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium bg-amber-50 text-amber-600 dark:bg-amber-900/30 dark:text-amber-400">
        <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-[pulse_2s_infinite]" />
        {t('admin.status.pending')}
      </span>
    );
    if (status === 'approved') return (
      <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium bg-emerald-50 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-400">
        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
        {t('admin.status.approved')}
      </span>
    );
    return (
      <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium bg-red-50 text-red-600 dark:bg-red-900/30 dark:text-red-400">
        <span className="w-1.5 h-1.5 rounded-full bg-red-500" />
        {t('admin.status.rejected')}
      </span>
    );
  };

  const statsCards = [
    { value: stats.total,    label: t('admin.instructorApproval.stats.total'),    color: 'blue',   key: 'all' as const, icon: (
      <svg className="w-6 h-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75" /></svg>
    )},
    { value: stats.pending,  label: t('admin.instructorApproval.stats.pending'),  color: 'orange', key: 'pending' as const, icon: (
      <svg className="w-6 h-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" /></svg>
    )},
    { value: stats.approved, label: t('admin.instructorApproval.stats.approved'), color: 'green',  key: 'approved' as const, icon: (
      <svg className="w-6 h-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M22 11.08V12a10 10 0 11-5.93-9.14" /><polyline points="22 4 12 14.01 9 11.01" /></svg>
    )},
    { value: stats.rejected, label: t('admin.instructorApproval.stats.rejected'), color: 'red',    key: 'rejected' as const, icon: (
      <svg className="w-6 h-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10" /><line x1="15" y1="9" x2="9" y2="15" /><line x1="9" y1="9" x2="15" y2="15" /></svg>
    )},
  ];

  return (
    <AdminLayout
      title={t('admin.instructorApproval.title')}
      subtitle={t('admin.instructorApproval.subtitle')}
      headerActions={
        <button className="hidden sm:inline-flex items-center gap-2 px-4 py-2 text-sm font-semibold rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 transition-all hover:-translate-y-0.5">
          <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M7 10l5 5 5-5M12 15V3" /></svg>
          {t('admin.instructorApproval.export')}
        </button>
      }
    >
      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        {statsCards.map((s, i) => {
          const map = {
            blue:   'bg-blue-50 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400',
            orange: 'bg-amber-50 text-amber-600 dark:bg-amber-900/30 dark:text-amber-400',
            green:  'bg-emerald-50 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-400',
            red:    'bg-red-50 text-red-600 dark:bg-red-900/30 dark:text-red-400',
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
              <div className="text-3xl font-bold mb-1">{s.value}</div>
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
            placeholder={t('admin.instructorApproval.searchPlaceholder')}
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full pl-11 pr-4 py-2.5 text-sm bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all"
          />
        </div>
      </div>

      {/* Cards grid */}
      {filtered.length === 0 && (
        <div className="text-center py-16 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800">
          <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center">
            <svg className="w-8 h-8 text-slate-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="8" /><path d="M21 21l-4.35-4.35" /></svg>
          </div>
          <p className="text-slate-500 dark:text-slate-400">{t('admin.instructorApproval.noResults')}</p>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {filtered.map((a, i) => (
          <div
            key={a.id}
            className="group bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-5 transition-all hover:-translate-y-1 hover:shadow-xl hover:shadow-blue-500/5 hover:border-blue-200 dark:hover:border-blue-800 opacity-0 animate-[fadeInUp_.6s_ease-out_forwards]"
            style={{ animationDelay: `${i * 0.05}s` }}
          >
            <div className="flex items-start gap-4 mb-3">
              <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-purple-500 to-pink-500 text-white flex items-center justify-center font-bold text-sm flex-shrink-0 transition-all group-hover:rotate-[10deg] group-hover:scale-110 group-hover:shadow-lg group-hover:shadow-purple-500/30">
                {getInitials(a.fullName)}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between gap-2 mb-1">
                  <h3 className="font-bold text-base group-hover:text-blue-600 transition-colors line-clamp-1">{a.fullName}</h3>
                  {statusBadge(a.status)}
                </div>
                <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400 mb-2 flex-wrap">
                  <span className="truncate max-w-[160px]">{a.title} • {a.department}</span>
                </div>
                <p className="text-sm text-slate-600 dark:text-slate-400 line-clamp-2">{a.bio}</p>
              </div>
            </div>

            <div className="flex items-center gap-4 py-3 border-y border-slate-100 dark:border-slate-800 mb-3 flex-wrap">
              <div className="flex items-center gap-1.5 text-xs text-slate-500">
                <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M2 3h6a4 4 0 014 4v14a3 3 0 00-3-3H2zM22 3h-6a4 4 0 00-4 4v14a3 3 0 013-3h7z" /></svg>
                <span className="line-clamp-1 max-w-[180px]">{a.expertise}</span>
              </div>
              <div className="flex items-center gap-1.5 text-xs text-slate-500">
                <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" /></svg>
                {a.experienceYears} {t('admin.instructorApproval.yearsExp')}
              </div>
              <div className="flex items-center gap-1.5 text-xs text-slate-500 ml-auto">
                <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" /><polyline points="22,6 12,13 2,6" /></svg>
                <span className="truncate max-w-[160px]">{a.email}</span>
              </div>
            </div>

            {a.rejectionReason && a.status === 'rejected' && (
              <div className="mb-3 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl text-xs text-red-700 dark:text-red-300">
                <strong className="block mb-1">{t('admin.instructorApproval.rejectionReason')}:</strong>{a.rejectionReason}
              </div>
            )}

            {a.status === 'pending' ? (
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setPreview(a)}
                  className="flex-1 inline-flex items-center justify-center gap-1.5 px-3 py-2 text-sm font-medium rounded-xl border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 transition-all hover:-translate-y-0.5"
                >
                  <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" /><circle cx="12" cy="12" r="3" /></svg>
                  {t('admin.instructorApproval.preview')}
                </button>
                <button
                  onClick={() => { setPreview(a); setReason(''); }}
                  className="flex-1 inline-flex items-center justify-center gap-1.5 px-3 py-2 text-sm font-semibold rounded-xl bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 text-white shadow-md shadow-red-500/30 hover:shadow-red-500/50 transition-all hover:-translate-y-0.5"
                >
                  <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>
                  {t('admin.instructorApproval.reject')}
                </button>
                <button
                  onClick={() => handleApprove(a.id)}
                  className="flex-1 inline-flex items-center justify-center gap-1.5 px-3 py-2 text-sm font-semibold rounded-xl bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-600 hover:to-emerald-700 text-white shadow-md shadow-emerald-500/30 hover:shadow-emerald-500/50 transition-all hover:-translate-y-0.5"
                >
                  <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="20 6 9 17 4 12" /></svg>
                  {t('admin.instructorApproval.approve')}
                </button>
              </div>
            ) : (
              <button
                onClick={() => setPreview(a)}
                className="w-full inline-flex items-center justify-center gap-1.5 px-3 py-2 text-sm font-medium rounded-xl border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 transition-all"
              >
                <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" /><circle cx="12" cy="12" r="3" /></svg>
                {t('admin.instructorApproval.viewDetail')}
              </button>
            )}
          </div>
        ))}
      </div>

      {/* Preview modal */}
      {preview && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-[fadeIn_.2s_ease-out]" onClick={() => { setPreview(null); setReason(''); }}>
          <div onClick={e => e.stopPropagation()} className="w-full max-w-2xl bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden animate-[fadeInUp_.3s_ease-out] max-h-[90vh] overflow-y-auto">
            <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between sticky top-0 bg-white dark:bg-slate-900 z-10">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-purple-500 to-pink-500 text-white flex items-center justify-center font-bold text-sm">
                  {getInitials(preview.fullName)}
                </div>
                <div>
                  <h2 className="text-lg font-bold">{preview.fullName}</h2>
                  <p className="text-xs text-slate-500">{preview.title} • {preview.department}</p>
                </div>
              </div>
              <button onClick={() => { setPreview(null); setReason(''); }} className="w-8 h-8 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 flex items-center justify-center transition-all">
                <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>
              </button>
            </div>

            <div className="p-6">
              <div className="flex items-center gap-3 mb-4">
                {statusBadge(preview.status)}
                <span className="px-3 py-1 rounded-lg bg-slate-100 dark:bg-slate-800 text-xs font-semibold">{preview.experienceYears} {t('admin.instructorApproval.yearsExp')}</span>
              </div>

              <div className="space-y-3 mb-6">
                <InfoRow label={t('admin.instructorApproval.email')} value={preview.email} />
                {preview.phone && <InfoRow label={t('admin.instructorApproval.phone')} value={preview.phone} />}
                <InfoRow label={t('admin.instructorApproval.expertise')} value={preview.expertise} />
                <InfoRow label={t('admin.instructorApproval.submitted')} value={formatDate(preview.submittedAt)} />
              </div>

              <div className="mb-6">
                <h3 className="text-sm font-semibold mb-2">{t('admin.instructorApproval.bio')}</h3>
                <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed bg-slate-50 dark:bg-slate-800/50 rounded-xl p-4">{preview.bio}</p>
              </div>

              {(preview.cvUrl || preview.portfolioUrl) && (
                <div className="flex items-center gap-2 mb-6">
                  {preview.cvUrl && (
                    <a href={preview.cvUrl} className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 transition-all">
                      <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M7 10l5 5 5-5M12 15V3" /></svg>
                      {t('admin.instructorApproval.downloadCV')}
                    </a>
                  )}
                  {preview.portfolioUrl && (
                    <a href={preview.portfolioUrl} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 transition-all">
                      <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 13v6a2 2 0 01-2 2H5a2 2 0 01-2-2V8a2 2 0 012-2h6M15 3h6v6M10 14L21 3" /></svg>
                      {t('admin.instructorApproval.viewPortfolio')}
                    </a>
                  )}
                </div>
              )}

              {preview.rejectionReason && preview.status === 'rejected' && (
                <div className="mb-4 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl text-xs text-red-700 dark:text-red-300">
                  <strong className="block mb-1">{t('admin.instructorApproval.rejectionReason')}:</strong>{preview.rejectionReason}
                </div>
              )}

              {preview.status === 'pending' && (
                <div>
                  <label className="block text-sm font-semibold mb-2">{t('admin.instructorApproval.reasonLabel')}</label>
                  <textarea
                    rows={3}
                    value={reason}
                    onChange={e => setReason(e.target.value)}
                    placeholder={t('admin.instructorApproval.reasonPlaceholder')}
                    className="w-full px-4 py-2.5 text-sm bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all resize-none"
                  />
                </div>
              )}
            </div>

            <div className="px-6 py-4 border-t border-slate-200 dark:border-slate-800 flex items-center justify-end gap-2 bg-slate-50 dark:bg-slate-800/30">
              <button onClick={() => { setPreview(null); setReason(''); }} className="px-4 py-2 text-sm font-semibold rounded-xl border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 transition-all">
                {t('common.cancel')}
              </button>
              {preview.status === 'pending' && (
                <>
                  <button
                    onClick={() => handleReject(preview.id)}
                    className="inline-flex items-center gap-2 px-4 py-2 text-sm font-semibold rounded-xl bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 text-white shadow-lg shadow-red-500/30 transition-all"
                  >
                    <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>
                    {t('admin.instructorApproval.reject')}
                  </button>
                  <button
                    onClick={() => handleApprove(preview.id)}
                    className="inline-flex items-center gap-2 px-4 py-2 text-sm font-semibold rounded-xl bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-600 hover:to-emerald-700 text-white shadow-lg shadow-emerald-500/30 transition-all"
                  >
                    <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="20 6 9 17 4 12" /></svg>
                    {t('admin.instructorApproval.approve')}
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

const InfoRow: React.FC<{ label: string; value: string }> = ({ label, value }) => (
  <div className="flex items-start gap-3 text-sm">
    <span className="w-28 shrink-0 text-slate-500 dark:text-slate-400">{label}</span>
    <span className="flex-1 font-medium text-slate-900 dark:text-white break-words">{value}</span>
  </div>
);

export default InstructorApprovalPage;