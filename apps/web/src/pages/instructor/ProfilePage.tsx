import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useMutation, useQuery } from '@tanstack/react-query';
import InstructorLayout from '@/components/layout/InstructorLayout';
import { authApi } from '@/services/api/auth.api';
import { examApi } from '@/services/api/exam.api';
import { formatRelative } from '@/utils/time';

type Tab = 'overview' | 'security';

const TABS: Tab[] = ['overview', 'security'];

/**
 * Hồ sơ giảng viên — `GET /api/auth/me`, `POST /api/auth/change-password`.
 *
 * Đã gỡ các phần không có backend: chức danh / địa điểm viết cứng, số khoá
 * học / học viên / đánh giá bịa sẵn, tab sửa hồ sơ (auth-service chưa có
 * endpoint cập nhật), 2FA và tuỳ chọn thông báo (không lưu ở đâu cả).
 */
const ProfilePage: React.FC = () => {
  const { t } = useTranslation();
  const [tab, setTab] = useState<Tab>('overview');

  const { data: profile, isLoading, isError } = useQuery({ queryKey: ['auth', 'me'], queryFn: () => authApi.me() });
  const { data: exams } = useQuery({ queryKey: ['instructor', 'exams', 'list'], queryFn: () => examApi.listExams() });
  const { data: gradingStats } = useQuery({ queryKey: ['exams', 'grading', 'stats'], queryFn: () => examApi.getGradingStats() });

  const initials = (profile?.fullName || 'GV').split(' ').filter(Boolean).map(s => s.charAt(0)).slice(0, 2).join('').toUpperCase();

  return (
    <InstructorLayout title={t('instructor.profile.title')} subtitle={t('instructor.profile.subtitle')}>
      {isError && (
        <div className="mb-4 p-3 rounded-xl bg-red-50 dark:bg-red-900/20 text-sm text-red-600 dark:text-red-400">
          {t('common.loadError')}
        </div>
      )}

      <section className="relative bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 overflow-hidden mb-6">
        <div className="h-32 bg-gradient-to-r from-blue-600 via-cyan-500 to-purple-500" />
        <div className="px-6 pb-6 -mt-12">
          <div className="flex items-end gap-4 flex-wrap">
            <div className="w-24 h-24 rounded-2xl bg-white dark:bg-slate-900 p-1 shadow-lg">
              {profile?.avatarUrl ? (
                <img src={profile.avatarUrl} alt={profile.fullName} className="w-full h-full rounded-xl object-cover" />
              ) : (
                <div className="w-full h-full rounded-xl bg-gradient-to-br from-blue-500 to-cyan-500 text-white flex items-center justify-center text-2xl font-bold">
                  {initials}
                </div>
              )}
            </div>
            <div className="flex-1 min-w-0">
              <h2 className="text-xl font-bold">
                {isLoading ? t('common.loading') : profile?.fullName || t('instructor.profile.unknownUser')}
              </h2>
              {profile && (
                <div className="flex items-center gap-3 mt-2 text-xs text-slate-500 flex-wrap">
                  <span>{profile.email}</span>
                  <span>•</span>
                  <span className="inline-flex items-center gap-1">
                    <span className={`w-1.5 h-1.5 rounded-full ${profile.status === 'active' ? 'bg-emerald-500' : 'bg-slate-400'}`} />
                    {profile.status === 'active' ? t('instructor.profile.active') : profile.status}
                  </span>
                </div>
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mt-6">
            <Stat label={t('instructor.profile.stats.exams')} value={exams ? String(exams.length) : '—'} />
            <Stat label={t('examApi.instructorDashboard.stats.pending')} value={gradingStats ? String(gradingStats.pending) : '—'} />
            <Stat label={t('examApi.instructorDashboard.stats.graded')} value={gradingStats ? String(gradingStats.graded) : '—'} />
          </div>
        </div>
      </section>

      <div className="flex flex-wrap gap-1 p-1 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 mb-6 w-fit">
        {TABS.map(tb => (
          <button
            key={tb}
            onClick={() => setTab(tb)}
            className={`px-4 py-2 text-sm font-semibold rounded-xl transition-all ${
              tab === tb ? 'bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400' : 'text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800'
            }`}
          >
            {t(`instructor.profile.tab.${tb}`)}
          </button>
        ))}
      </div>

      {tab === 'overview' && (
        <article className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-6">
          <h3 className="text-sm font-semibold mb-4">{t('examApi.profile.accountTitle')}</h3>
          {profile ? (
            <dl className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
              <Info label={t('instructor.profile.field.fullName')} value={profile.fullName} />
              <Info label={t('instructor.profile.field.email')} value={profile.email} />
              <Info label={t('examApi.profile.role')} value={profile.role} />
              <Info label={t('examApi.profile.status')} value={profile.status} />
              <Info
                label={t('examApi.profile.emailVerified')}
                value={profile.emailVerified ? t('examApi.profile.yes') : t('examApi.profile.no')}
              />
              <Info label={t('examApi.profile.joined')} value={formatRelative(profile.createdAt)} />
            </dl>
          ) : (
            <p className="text-sm text-slate-500">{isLoading ? t('common.loading') : t('common.noData')}</p>
          )}
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-5">{t('examApi.profile.noEditApi')}</p>
        </article>
      )}

      {tab === 'security' && <SecurityTab />}
    </InstructorLayout>
  );
};

const Stat: React.FC<{ label: string; value: string }> = ({ label, value }) => (
  <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60">
    <div className="text-lg font-bold">{value}</div>
    <div className="text-xs text-slate-500">{label}</div>
  </div>
);

const Info: React.FC<{ label: string; value: string }> = ({ label, value }) => (
  <div>
    <dt className="text-xs font-semibold text-slate-500 dark:text-slate-400">{label}</dt>
    <dd className="mt-0.5 text-slate-900 dark:text-white">{value}</dd>
  </div>
);

const SecurityTab: React.FC = () => {
  const { t } = useTranslation();
  const [oldPassword, setOldPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [validationError, setValidationError] = useState<string | null>(null);

  const changePassword = useMutation({
    mutationFn: (vars: { oldPassword: string; newPassword: string }) =>
      authApi.changePassword(vars.oldPassword, vars.newPassword),
    onSuccess: () => {
      setOldPassword('');
      setNewPassword('');
      setConfirmPassword('');
    },
  });

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setValidationError(null);
    changePassword.reset();
    if (newPassword !== confirmPassword) {
      setValidationError(t('examApi.profile.password.mismatch'));
      return;
    }
    // auth-service bắt mật khẩu tối thiểu 8 ký tự.
    if (newPassword.length < 8) {
      setValidationError(t('examApi.profile.password.tooShort'));
      return;
    }
    changePassword.mutate({ oldPassword, newPassword });
  };

  const inputClass =
    'w-full px-3 py-2.5 text-sm rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 focus:outline-none focus:border-blue-500';

  return (
    <article className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-6 max-w-2xl">
      <h3 className="text-sm font-semibold mb-1">{t('instructor.profile.security.password.title')}</h3>
      <p className="text-xs text-slate-500 mb-4">{t('instructor.profile.security.password.desc')}</p>
      <form className="space-y-3" onSubmit={onSubmit}>
        <input type="password" autoComplete="current-password" placeholder={t('examApi.profile.password.current')} value={oldPassword} onChange={e => setOldPassword(e.target.value)} className={inputClass} />
        <input type="password" autoComplete="new-password" placeholder={t('examApi.profile.password.new')} value={newPassword} onChange={e => setNewPassword(e.target.value)} className={inputClass} />
        <input type="password" autoComplete="new-password" placeholder={t('examApi.profile.password.confirm')} value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} className={inputClass} />
        {validationError && <p className="text-sm text-red-600 dark:text-red-400">{validationError}</p>}
        {changePassword.isError && (
          <p className="text-sm text-red-600 dark:text-red-400">
            {t('examApi.profile.password.failed', { message: changePassword.error.message })}
          </p>
        )}
        {changePassword.isSuccess && <p className="text-sm text-emerald-600 dark:text-emerald-400">{t('examApi.profile.password.success')}</p>}
        <button
          type="submit"
          disabled={changePassword.isPending || !oldPassword || !newPassword}
          className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 disabled:opacity-60 text-white text-sm font-semibold transition-colors"
        >
          {changePassword.isPending ? t('examApi.profile.password.submitting') : t('instructor.profile.security.password.change')}
        </button>
      </form>
    </article>
  );
};

export default ProfilePage;
