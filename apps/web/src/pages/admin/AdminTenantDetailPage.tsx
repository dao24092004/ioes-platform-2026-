import React, { useEffect, useMemo } from 'react';
import { Link, Navigate, useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import AdminLayout from '@/components/layout/AdminLayout';
import { TENANTS, type TenantCardData } from '@/pages/tenant/tenantData';

interface Department {
  id: string;
  name: string;
  icon: string;
  students: number;
  instructors: number;
  completion: number;
}

interface TenantUser {
  id: string;
  name: string;
  email: string;
  avatarUrl?: string;
  initials?: string;
  role: 'Student' | 'Instructor' | 'Admin';
  dept: string;
  status: 'active' | 'pending';
}

interface ActivityItem {
  id: string;
  type: 'user' | 'exam' | 'course' | 'alert';
  title: string;
  detail: string;
  time: string;
}

interface UsageMonth {
  month: string;
  logins: number;
}

const DEPARTMENTS: Record<string, Department[]> = {
  'fpt-university': [
    { id: 'cntt', name: 'Khoa Công nghệ thông tin', icon: 'laptop', students: 1240, instructors: 48, completion: 89 },
    { id: 'toan', name: 'Khoa Toán', icon: 'sigma', students: 612, instructors: 24, completion: 76 },
    { id: 'kt', name: 'Khoa Kinh tế', icon: 'chart', students: 995, instructors: 36, completion: 92 },
  ],
  'hcmus': [
    { id: 'cntt', name: 'Khoa CNTT', icon: 'laptop', students: 720, instructors: 28, completion: 84 },
    { id: 'toan', name: 'Khoa Toán - Tin học', icon: 'sigma', students: 803, instructors: 32, completion: 81 },
  ],
  'vnu': [
    { id: 'cntt', name: 'Trường ĐH Công nghệ', icon: 'laptop', students: 1820, instructors: 95, completion: 81 },
    { id: 'us', name: 'Trường ĐH Khoa học Tự nhiên', icon: 'sigma', students: 1450, instructors: 78, completion: 87 },
    { id: 'hnue', name: 'Trường ĐH Sư phạm', icon: 'book', students: 1100, instructors: 52, completion: 84 },
  ],
};

const USERS: Record<string, TenantUser[]> = {
  'fpt-university': [
    { id: 'u1', name: 'Nguyễn Văn Minh', email: 'minh.nv@fpt.edu.vn', initials: 'NM', role: 'Student', dept: 'Khoa CNTT', status: 'active' },
    { id: 'u2', name: 'Trần Thị Hương', email: 'huong.tt@fpt.edu.vn', initials: 'TH', role: 'Instructor', dept: 'Khoa Toán', status: 'active' },
    { id: 'u3', name: 'Lê Hoàng Nam', email: 'nam.lh@fpt.edu.vn', initials: 'LN', role: 'Student', dept: 'Khoa Kinh tế', status: 'pending' },
    { id: 'u4', name: 'Phạm Hùng Cường', email: 'cuong.ph@fpt.edu.vn', initials: 'PC', role: 'Admin', dept: 'Phòng Đào tạo', status: 'active' },
  ],
};

const ACTIVITY: Record<string, ActivityItem[]> = {
  'fpt-university': [
    { id: '1', type: 'user', title: 'Nguyễn Văn Minh đã tham gia khóa học', detail: 'Advanced Machine Learning · CS201', time: '5 phút trước' },
    { id: '2', type: 'exam', title: 'Kỳ thi Pop Quiz AI Ethics kết thúc', detail: '342 sinh viên tham gia · 87% đậu', time: '24 phút trước' },
    { id: '3', type: 'course', title: 'Khóa học mới "Cloud Architecture" được đăng', detail: 'Giảng viên: TS. Trần Văn Hùng', time: '1 giờ trước' },
    { id: '4', type: 'alert', title: 'Cảnh báo: 3 sinh viên đăng nhập bất thường', detail: 'IP 45.33.x.x · đã bị khóa tạm thời', time: '2 giờ trước' },
  ],
  'hcmus': [
    { id: '1', type: 'exam', title: 'Olympic Tin học — vòng 2 kết thúc', detail: '198 thí sinh · 32 vào vòng 3', time: '1 giờ trước' },
    { id: '2', type: 'user', title: '78 tài khoản mới được mời', detail: 'Khóa Toán — lớp K22', time: '3 giờ trước' },
  ],
};

const generateUsage = (tenantId: string): UsageMonth[] => {
  const base = (tenantId.charCodeAt(0) + tenantId.charCodeAt(tenantId.length - 1)) % 4;
  const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  return months.map((m, idx) => {
    const seed = (idx * 7 + base * 13 + 50) % 100;
    return { month: m, logins: 1500 + seed * 38 + idx * 120 };
  });
};

const formatNumber = (n: number): string => n.toLocaleString('en-US');

/* Icons */
const UsersIcon = () => (
  <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75" /></svg>
);
const BookIcon = () => (
  <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" /></svg>
);
const ExamIcon = () => (
  <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" /></svg>
);
const CertificateIcon = () => (
  <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="8" r="6" /><polyline points="8.21 13.89 7 23 12 20 17 23 15.79 13.88" /></svg>
);
const BuildingIcon = () => (
  <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M3 21h18M5 21V7l8-4v18M19 21V11l-6-4" /><line x1="9" y1="9" x2="9" y2="9.01" /><line x1="9" y1="13" x2="9" y2="13.01" /><line x1="9" y1="17" x2="9" y2="17.01" /><path d="M14 13h.01M14 17h.01M14 9h.01" /></svg>
);
const PinIcon = () => (
  <svg className="w-3 h-3 inline" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0z" /><circle cx="12" cy="10" r="3" /></svg>
);
const UserIcon = () => (
  <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2" /><circle cx="12" cy="7" r="4" /></svg>
);
const AlertIcon = () => (
  <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" /><line x1="12" y1="9" x2="12" y2="13" /><line x1="12" y1="17" x2="12.01" y2="17" /></svg>
);
const ClockIcon = () => (
  <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" /></svg>
);
const EditIcon = () => (
  <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7" /><path d="M18.5 2.5a2.121 2.121 0 113 3L12 15l-4 1 1-4z" /></svg>
);
const ArrowUpIcon = () => (
  <svg className="w-3.5 h-3.5 inline" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="18 15 12 9 6 15" /></svg>
);
const PlusIcon = () => (
  <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" /></svg>
);
const UploadIcon = () => (
  <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4" /><polyline points="17 8 12 3 7 8" /><line x1="12" y1="3" x2="12" y2="15" /></svg>
);
const ChevronRightIcon = ({ className = '' }: { className?: string }) => (
  <svg className={`w-4 h-4 inline ${className}`} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="9 18 15 12 9 6" /></svg>
);

const activityTone: Record<ActivityItem['type'], { bg: string; text: string; icon: React.ReactNode }> = {
  user:   { bg: 'bg-blue-50 dark:bg-blue-900/30',       text: 'text-blue-600 dark:text-blue-400',    icon: <UserIcon /> },
  exam:   { bg: 'bg-emerald-50 dark:bg-emerald-900/30', text: 'text-emerald-600 dark:text-emerald-400', icon: <ExamIcon /> },
  course: { bg: 'bg-purple-50 dark:bg-purple-900/30',   text: 'text-purple-600 dark:text-purple-400', icon: <BookIcon /> },
  alert:  { bg: 'bg-red-50 dark:bg-red-900/30',         text: 'text-red-600 dark:text-red-400',       icon: <AlertIcon /> },
};

const AdminTenantDetailPage: React.FC = () => {
  const { tenantId } = useParams<{ tenantId: string }>();
  const { t } = useTranslation();

  useEffect(() => {
    window.scrollTo({ top: 0 });
  }, [tenantId]);

  const tenant = useMemo<TenantCardData | undefined>(
    () => TENANTS.find(tn => tn.id === tenantId),
    [tenantId]
  );

  if (!tenant) {
    return <Navigate to="/admin/tenants" replace />;
  }

  const departments = DEPARTMENTS[tenant.id] ?? [];
  const users = USERS[tenant.id] ?? [];
  const activity = ACTIVITY[tenant.id] ?? [];
  const usage = generateUsage(tenant.id);
  const peakLogins = Math.max(...usage.map(u => u.logins));
  const totalLogins = usage.reduce((s, u) => s + u.logins, 0);

  return (
    <AdminLayout
      title={`${t('admin.adminTenant.detail.title')} · ${tenant.name}`}
      subtitle={`${t('admin.adminTenant.detail.manageOrg')} · ${tenant.domain}`}
      headerActions={
        <>
          <button className="inline-flex items-center gap-2 px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 hover:border-blue-500 text-sm font-medium transition-colors">
            <EditIcon /> {t('admin.adminTenant.detail.editBranding')}
          </button>
          <button className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold transition-colors shadow-sm">
            <EditIcon /> {t('admin.adminTenant.detail.settings')}
          </button>
        </>
      }
    >
      {/* Header card */}
      <div className={`relative overflow-hidden rounded-2xl bg-gradient-to-br ${tenant.logoGradient} p-6 mb-6 text-white`}>
        <div className="flex items-center gap-4">
          <div className="w-16 h-16 rounded-xl bg-white/15 backdrop-blur-sm border border-white/20 flex items-center justify-center font-extrabold text-2xl shadow-lg">
            {tenant.logoText}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h2 className="text-xl font-extrabold">{tenant.name}</h2>
              <span className="px-2 py-0.5 rounded-full bg-white/20 backdrop-blur-sm border border-white/20 text-[10px] font-bold uppercase tracking-wider">
                {tenant.plan}
              </span>
              <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${tenant.status === 'active' ? 'bg-emerald-500/30 text-white' : tenant.status === 'trial' ? 'bg-amber-500/30 text-white' : 'bg-red-500/30 text-white'}`}>
                {tenant.status}
              </span>
            </div>
            <p className="text-white/90 text-sm mt-0.5">{tenant.domain}</p>
            <p className="text-white/80 text-xs mt-0.5 flex items-center gap-1"><PinIcon /> {tenant.region} · {tenant.planExpire}</p>
          </div>
        </div>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <StatBox value={formatNumber(tenant.users)} label={t('admin.adminTenant.metrics.users')} sub="+12% tháng này" tone="blue" />
        <StatBox value={formatNumber(tenant.courses)} label={t('admin.adminTenant.metrics.courses')} sub="+8% tháng này" tone="green" />
        <StatBox value={formatNumber(tenant.exams)} label={t('admin.adminTenant.metrics.exams')} sub="+24% tháng này" tone="orange" />
        <StatBox value={formatNumber(totalLogins)} label={t('admin.adminTenant.detail.loginsThisYear')} sub={`${t('admin.adminTenant.detail.peak')}: ${formatNumber(peakLogins)}`} tone="purple" />
      </div>

      {/* Users + Quick actions */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
        <div className="lg:col-span-2 bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700">
          <div className="px-5 py-4 border-b border-slate-200 dark:border-slate-700 flex items-center justify-between">
            <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <UsersIcon /> {t('admin.adminTenant.detail.recentUsers')}
            </h3>
            <button className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 hover:border-blue-500 text-xs font-medium transition-colors">
              <PlusIcon /> {t('admin.adminTenant.detail.addUser')}
            </button>
          </div>
          {users.length === 0 ? (
            <div className="p-8 text-center text-sm text-slate-500 dark:text-slate-400">
              {t('admin.adminTenant.detail.noUsers')}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="text-xs uppercase text-slate-500 dark:text-slate-400 bg-slate-50 dark:bg-slate-900/40">
                  <tr>
                    <th className="px-5 py-3 text-left">{t('admin.adminTenant.detail.colUser')}</th>
                    <th className="px-5 py-3 text-left">{t('admin.adminTenant.detail.colRole')}</th>
                    <th className="px-5 py-3 text-left">{t('admin.adminTenant.detail.colDept')}</th>
                    <th className="px-5 py-3 text-left">{t('admin.adminTenant.detail.colStatus')}</th>
                    <th className="px-5 py-3 text-right">{t('admin.adminTenant.detail.colAction')}</th>
                  </tr>
                </thead>
                <tbody>
                  {users.map(u => (
                    <tr key={u.id} className="border-t border-slate-100 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-900/40">
                      <td className="px-5 py-3">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-full bg-gradient-to-br from-blue-500 to-cyan-500 text-white flex items-center justify-center text-xs font-bold shrink-0">
                            {u.initials}
                          </div>
                          <div className="min-w-0">
                            <div className="font-semibold text-slate-900 dark:text-white truncate">{u.name}</div>
                            <div className="text-xs text-slate-500 dark:text-slate-400 truncate">{u.email}</div>
                          </div>
                        </div>
                      </td>
                      <td className="px-5 py-3 text-slate-700 dark:text-slate-300">{u.role}</td>
                      <td className="px-5 py-3 text-slate-700 dark:text-slate-300">{u.dept}</td>
                      <td className="px-5 py-3">
                        {u.status === 'active' ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-bold bg-emerald-50 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span> Active
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-bold bg-amber-50 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400">
                            <ClockIcon /> Pending
                          </span>
                        )}
                      </td>
                      <td className="px-5 py-3 text-right">
                        <button className="px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 hover:border-blue-500 hover:text-blue-600 text-xs font-medium transition-colors">
                          {t('admin.adminTenant.detail.detail')}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Quick actions */}
        <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-5">
          <h3 className="text-base font-bold text-slate-900 dark:text-white mb-4 flex items-center gap-2">
            <ClockIcon /> {t('admin.adminTenant.detail.quickActions')}
          </h3>
          <div className="grid grid-cols-2 gap-3">
            {[
              { icon: <UserIcon />, label: t('admin.adminTenant.detail.qaAddUser'), tone: 'blue' },
              { icon: <BookIcon />, label: t('admin.adminTenant.detail.qaCreateCourse'), tone: 'emerald' },
              { icon: <ExamIcon />, label: t('admin.adminTenant.detail.qaCreateExam'), tone: 'orange' },
              { icon: <UploadIcon />, label: t('admin.adminTenant.detail.qaImportData'), tone: 'purple' },
            ].map((qa, i) => (
              <button
                key={i}
                className={`flex flex-col items-center gap-2 p-3 rounded-xl bg-slate-50 dark:bg-slate-900/40 hover:border-blue-500 hover:bg-blue-50 dark:hover:bg-blue-900/20 border-2 border-transparent transition-all`}
              >
                <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${qa.tone === 'blue' ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400' : qa.tone === 'emerald' ? 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400' : qa.tone === 'orange' ? 'bg-orange-100 dark:bg-orange-900/30 text-orange-600 dark:text-orange-400' : 'bg-purple-100 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400'}`}>
                  {qa.icon}
                </div>
                <span className="text-xs font-medium text-slate-700 dark:text-slate-300 text-center leading-tight">{qa.label}</span>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Departments + Usage chart */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
        <div className="lg:col-span-2 bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <BuildingIcon /> {t('admin.adminTenant.detail.departments')}
            </h3>
            <button className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-medium transition-colors">
              <PlusIcon /> {t('admin.adminTenant.detail.addDept')}
            </button>
          </div>
          {departments.length === 0 ? (
            <div className="p-6 text-center text-sm text-slate-500 dark:text-slate-400">
              {t('admin.adminTenant.detail.noDepartments')}
            </div>
          ) : (
            <div className="space-y-3">
              {departments.map(d => (
                <div key={d.id} className="flex items-center gap-4 p-3 rounded-xl bg-slate-50 dark:bg-slate-900/40 hover:bg-slate-100 dark:hover:bg-slate-900/60 transition-colors">
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center bg-gradient-to-br ${tenant.logoGradient} text-white shrink-0`}>
                    <BookIcon />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-semibold text-slate-900 dark:text-white truncate">{d.name}</div>
                    <div className="text-xs text-slate-500 dark:text-slate-400">
                      {d.students} SV · {d.instructors} GV
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    <div className="text-sm font-bold text-emerald-600 dark:text-emerald-400">{d.completion}%</div>
                    <div className="w-24 h-1.5 bg-slate-200 dark:bg-slate-700 rounded-full mt-1 overflow-hidden">
                      <div className="h-full bg-emerald-500 rounded-full" style={{ width: `${d.completion}%` }} />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-5">
          <h3 className="text-base font-bold text-slate-900 dark:text-white mb-1">{t('admin.adminTenant.detail.usageTitle')}</h3>
          <p className="text-xs text-slate-500 dark:text-slate-400 mb-4">{t('admin.adminTenant.detail.usageDesc')}</p>
          <div className="flex items-baseline gap-2 mb-3">
            <div className="text-2xl font-extrabold text-slate-900 dark:text-white">{formatNumber(totalLogins)}</div>
            <span className="inline-flex items-center gap-1 text-xs font-bold text-emerald-600 dark:text-emerald-400">
              <ArrowUpIcon /> +23%
            </span>
          </div>
          <div className="flex items-end gap-1 h-32">
            {usage.map((m) => {
              const height = (m.logins / peakLogins) * 100;
              return (
                <div key={m.month} className="flex-1 flex flex-col items-center justify-end gap-1 group">
                  <div
                    className={`w-full bg-gradient-to-b ${tenant.logoGradient} rounded-t-sm transition-all hover:opacity-80`}
                    style={{ height: `${height}%`, minHeight: '6px' }}
                  />
                </div>
              );
            })}
          </div>
          <div className="grid grid-cols-6 gap-1 mt-1.5 text-[9px] text-slate-500 dark:text-slate-400 text-center">
            {usage.map(m => <span key={m.month}>{m.month}</span>)}
          </div>
        </div>
      </div>

      {/* Recent activity */}
      {activity.length > 0 && (
        <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-5">
          <h3 className="text-base font-bold text-slate-900 dark:text-white mb-4 flex items-center gap-2">
            <ClockIcon /> {t('admin.adminTenant.detail.recentActivity')}
          </h3>
          <ul className="space-y-3">
            {activity.map((it) => {
              const tone = activityTone[it.type];
              return (
                <li key={it.id} className="flex items-start gap-3 pb-3 border-b border-slate-100 dark:border-slate-700 last:border-0 last:pb-0">
                  <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${tone.bg} ${tone.text}`}>
                    {tone.icon}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-slate-900 dark:text-white">{it.title}</p>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">{it.detail}</p>
                  </div>
                  <span className="text-[11px] text-slate-400 dark:text-slate-500 shrink-0">{it.time}</span>
                </li>
              );
            })}
          </ul>
        </div>
      )}

      {/* Back link */}
      <div className="mt-6 flex items-center justify-between">
        <Link to="/admin/tenants" className="inline-flex items-center gap-1 text-sm text-blue-600 dark:text-blue-400 font-semibold hover:underline">
          <ChevronRightIcon className="rotate-180 w-4 h-4" /> {t('admin.adminTenant.detail.backToList')}
        </Link>
      </div>
    </AdminLayout>
  );
};

const StatBox: React.FC<{ value: string; label: string; icon?: React.ReactNode; sub?: string; tone: string }> = ({ value, label, sub, tone }) => {
  const tones: Record<string, string> = {
    blue: 'bg-blue-50 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400',
    green: 'bg-emerald-50 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-400',
    orange: 'bg-orange-50 text-orange-600 dark:bg-orange-900/30 dark:text-orange-400',
    purple: 'bg-purple-50 text-purple-600 dark:bg-purple-900/30 dark:text-purple-400',
  };
  return (
    <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-5">
      <div className={`w-10 h-10 rounded-xl flex items-center justify-center mb-3 ${tones[tone]}`}>
        {tone === 'blue' ? <UsersIcon /> : tone === 'green' ? <BookIcon /> : tone === 'orange' ? <ExamIcon /> : <CertificateIcon />}
      </div>
      <h3 className="text-2xl font-extrabold text-slate-900 dark:text-white">{value}</h3>
      <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">{label}</p>
      {sub && <p className="text-[11px] text-emerald-600 dark:text-emerald-400 mt-1 font-semibold">{sub}</p>}
    </div>
  );
};

export default AdminTenantDetailPage;