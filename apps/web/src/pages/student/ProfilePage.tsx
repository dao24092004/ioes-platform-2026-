import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import StudentLayout from '@/components/layout/StudentLayout';
import { Card } from '@/components/common/Card';
import { StatCard } from '@/components/common/StatCard';
import { useAuthStore } from '@/app/store/authStore';

type Tab = 'overview' | 'edit' | 'achievements' | 'security';

const ProfilePage: React.FC = () => {
  const { t } = useTranslation();
  const { user } = useAuthStore();
  const [tab, setTab] = useState<Tab>('overview');
  const [name, setName] = useState(user?.full_name || 'Nguyễn Hoàng Nam');
  const [phone, setPhone] = useState('+84-905-777-888');
  const [bio, setBio] = useState('Sinh viên năm 3 chuyên ngành CNTT. Đam mê lập trình web và AI.');
  const [saved, setSaved] = useState(false);

  const tabs: { id: Tab; label: string }[] = [
    { id: 'overview', label: t('student.profile.tabs.overview') },
    { id: 'edit', label: t('student.profile.tabs.edit') },
    { id: 'achievements', label: t('student.profile.tabs.achievements') },
    { id: 'security', label: t('student.profile.tabs.security') },
  ];

  const initials = (name).split(' ').slice(0, 2).map(s => s.charAt(0)).join('').toUpperCase();

  return (
    <StudentLayout title={t('student.profile.title')} subtitle={t('student.profile.subtitle')}>
      <Card padding="md" className="mb-6">
        <div className="flex items-center gap-6 flex-wrap">
          <div className="relative">
            <div className="w-24 h-24 rounded-2xl bg-gradient-to-br from-blue-500 to-cyan-500 text-white flex items-center justify-center text-2xl font-bold shadow-lg">
              {initials}
            </div>
            <button className="absolute -bottom-1 -right-1 w-8 h-8 rounded-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow flex items-center justify-center hover:scale-110 transition-transform">
              <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M23 19a2 2 0 01-2 2H3a2 2 0 01-2-2V8a2 2 0 012-2h4l2-3h6l2 3h4a2 2 0 012 2z" /><circle cx="12" cy="13" r="4" /></svg>
            </button>
          </div>
          <div className="flex-1 min-w-0">
            <h2 className="text-2xl font-bold text-slate-900 dark:text-white">{name}</h2>
            <p className="text-sm text-slate-500 dark:text-slate-400">{user?.email || 'nam.nh@fpt.edu.vn'}</p>
            <p className="text-sm text-slate-600 dark:text-slate-400 mt-2">{bio}</p>
          </div>
        </div>
      </Card>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <StatCard color="blue" icon={<BookIcon />} value={8} label={t('student.profile.stats.courses')} />
        <StatCard color="purple" icon={<AwardIcon />} value={3} label={t('student.profile.stats.certificates')} />
        <StatCard color="amber" icon={<StarIcon />} value={2840} label={t('student.profile.stats.points')} />
        <StatCard color="orange" icon={<FireIcon />} value={47} label={t('student.profile.stats.streak')} />
      </div>

      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 overflow-hidden">
        <div className="border-b border-slate-200 dark:border-slate-800 flex overflow-x-auto">
          {tabs.map(tb => (
            <button
              key={tb.id}
              onClick={() => setTab(tb.id)}
              className={`px-5 py-3.5 text-sm font-semibold whitespace-nowrap transition-colors ${
                tab === tb.id
                  ? 'border-b-2 border-blue-600 text-blue-600 dark:text-blue-400'
                  : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              {tb.label}
            </button>
          ))}
        </div>
        <div className="p-6">
          {tab === 'overview' && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Card padding="md">
                <h3 className="font-bold text-slate-900 dark:text-white mb-3">Thông tin cá nhân</h3>
                <div className="space-y-3 text-sm">
                  <Field label={t('student.profile.fields.fullName')} value={name} />
                  <Field label={t('student.profile.fields.email')} value={user?.email || 'nam.nh@fpt.edu.vn'} />
                  <Field label={t('student.profile.fields.phone')} value={phone} />
                  <Field label={t('student.profile.fields.studentId')} value="SE173001" />
                  <Field label={t('student.profile.fields.department')} value="Công nghệ thông tin" />
                </div>
              </Card>
              <Card padding="md">
                <h3 className="font-bold text-slate-900 dark:text-white mb-3">Hoạt động gần đây</h3>
                <ul className="space-y-3 text-sm">
                  <ActivityRow text="Hoàn thành khóa học Machine Learning" date="2 ngày trước" />
                  <ActivityRow text="Đạt 92 điểm bài thi DSA Weekly Quiz" date="1 tuần trước" />
                  <ActivityRow text="Nhận huy hiệu 30-day Streak" date="2 tuần trước" />
                  <ActivityRow text="Đăng ký khóa học UI/UX Design" date="3 tuần trước" />
                </ul>
              </Card>
            </div>
          )}

          {tab === 'edit' && (
            <div className="max-w-2xl space-y-4">
              <FieldInput label={t('student.profile.fields.fullName')} value={name} onChange={setName} />
              <FieldInput label={t('student.profile.fields.phone')} value={phone} onChange={setPhone} />
              <FieldInput label={t('student.profile.fields.email')} value={user?.email || 'nam.nh@fpt.edu.vn'} disabled />
              <div>
                <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1">{t('student.profile.fields.bio')}</label>
                <textarea
                  rows={4}
                  value={bio}
                  onChange={e => setBio(e.target.value)}
                  className="w-full px-4 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm focus:outline-none focus:border-blue-500 resize-none"
                />
              </div>
              <div className="flex items-center gap-3 pt-2">
                <button
                  onClick={() => { setSaved(true); setTimeout(() => setSaved(false), 2000); }}
                  className="px-5 py-2.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold transition-colors"
                >
                  {t('student.profile.save')}
                </button>
                {saved && <span className="text-sm text-emerald-600 dark:text-emerald-400">✓ {t('student.profile.saved')}</span>}
              </div>
            </div>
          )}

          {tab === 'achievements' && (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
              {[
                { id: 'first_course', icon: '🎓', color: 'from-blue-500 to-cyan-500', unlocked: true },
                { id: 'streak_7', icon: '🔥', color: 'from-orange-500 to-red-500', unlocked: true },
                { id: 'streak_30', icon: '⚡', color: 'from-amber-500 to-yellow-500', unlocked: true },
                { id: 'top_10', icon: '🏆', color: 'from-purple-500 to-fuchsia-500', unlocked: true },
                { id: 'perfect_score', icon: '💯', color: 'from-emerald-500 to-green-500', unlocked: true },
                { id: 'fast_learner', icon: '🚀', color: 'from-pink-500 to-rose-500', unlocked: false },
              ].map(a => (
                <div
                  key={a.id}
                  className={`flex flex-col items-center gap-2 p-5 rounded-2xl bg-gradient-to-br ${a.color} text-white ${!a.unlocked ? 'opacity-30 grayscale' : 'hover:scale-105 transition-transform cursor-pointer'}`}
                >
                  <div className="text-5xl">{a.icon}</div>
                  <div className="text-xs font-semibold text-center">{t(`student.profile.achievements.${a.id}`)}</div>
                </div>
              ))}
            </div>
          )}

          {tab === 'security' && (
            <div className="max-w-2xl space-y-4">
              <Card padding="md">
                <h3 className="font-bold text-slate-900 dark:text-white mb-3">Đổi mật khẩu</h3>
                <div className="space-y-3">
                  <input type="password" placeholder="Mật khẩu hiện tại" className="w-full px-4 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm" />
                  <input type="password" placeholder="Mật khẩu mới" className="w-full px-4 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm" />
                  <input type="password" placeholder="Xác nhận mật khẩu mới" className="w-full px-4 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm" />
                  <button className="px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold transition-colors">
                    Cập nhật mật khẩu
                  </button>
                </div>
              </Card>
              <Card padding="md">
                <h3 className="font-bold text-slate-900 dark:text-white mb-3">Xác thực 2 yếu tố (2FA)</h3>
                <p className="text-sm text-slate-600 dark:text-slate-400 mb-3">Bảo vệ tài khoản với lớp bảo mật bổ sung.</p>
                <button className="px-4 py-2 rounded-lg border border-emerald-500 text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-900/30 text-sm font-semibold transition-colors">
                  Kích hoạt 2FA
                </button>
              </Card>
            </div>
          )}
        </div>
      </div>
    </StudentLayout>
  );
};

const Field: React.FC<{ label: string; value: string }> = ({ label, value }) => (
  <div className="flex items-center justify-between">
    <span className="text-slate-500 dark:text-slate-400">{label}</span>
    <span className="font-semibold text-slate-900 dark:text-white">{value}</span>
  </div>
);

const FieldInput: React.FC<{ label: string; value: string; onChange?: (v: string) => void; disabled?: boolean }> = ({ label, value, onChange, disabled }) => (
  <div>
    <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1">{label}</label>
    <input
      type="text"
      value={value}
      onChange={e => onChange?.(e.target.value)}
      disabled={disabled}
      className="w-full px-4 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm focus:outline-none focus:border-blue-500 disabled:opacity-60"
    />
  </div>
);

const ActivityRow: React.FC<{ text: string; date: string }> = ({ text, date }) => (
  <li className="flex items-start gap-3">
    <span className="w-1.5 h-1.5 rounded-full bg-blue-500 mt-2" />
    <div className="flex-1">
      <div className="text-slate-700 dark:text-slate-300">{text}</div>
      <div className="text-xs text-slate-500 dark:text-slate-400">{date}</div>
    </div>
  </li>
);

const BookIcon = () => (<svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253" /></svg>);
const AwardIcon = () => (<svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="8" r="6" /><polyline points="8.21 13.89 7 23 12 20 17 23 15.79 13.88" /></svg>);
const StarIcon = () => (<svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" /></svg>);
const FireIcon = () => (<svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M8.5 14.5A2.5 2.5 0 0011 12c0-1.38-.5-2-1-3-1.072-2.143-.224-4.054 2-6 .5 2.5 2 4.9 4 6.5 2 1.6 3 3.5 3 5.5a7 7 0 11-14 0c0-1.153.433-2.294 1-3a2.5 2.5 0 002.5 2.5z" /></svg>);

export default ProfilePage;
