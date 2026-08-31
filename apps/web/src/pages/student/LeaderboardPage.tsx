import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useQuery } from '@tanstack/react-query';
import StudentLayout from '@/components/layout/StudentLayout';
import { Card } from '@/components/common/Card';
import { useAuthStore } from '@/app/store/authStore';
import {
  analyticsApi,
  type LeaderboardEntry as ApiLeaderboardEntry,
  type LeaderboardPeriod,
} from '@/services/api/analytics.api';

const badgeStyles = {
  gold: { bg: 'from-amber-400 to-yellow-500', text: 'text-amber-900', label: '🥇' },
  silver: { bg: 'from-slate-300 to-slate-400', text: 'text-slate-900', label: '🥈' },
  bronze: { bg: 'from-orange-400 to-amber-600', text: 'text-orange-900', label: '🥉' },
  none: { bg: 'from-slate-100 to-slate-200', text: 'text-slate-500', label: '' },
};

type Period = 'weekly' | 'monthly' | 'allTime';

/** Hình dạng mà phần hiển thị bên dưới đang dùng. */
interface LeaderboardEntry {
  rank: number;
  user_id: string;
  /** analytics-service có thể trả null cho hàng seed/demo thiếu hồ sơ. */
  full_name: string | null;
  avatar: string | null;
  points: number;
  courses_completed: number;
  streak_days: number;
  badge: 'gold' | 'silver' | 'bronze' | null;
}

/**
 * Chữ cái đầu để hiển thị khi không có ảnh đại diện.
 *
 * An toàn với `full_name: null` (analytics-service trả null cho hàng
 * seed/demo thiếu hồ sơ) và với chuỗi toàn khoảng trắng.
 */
export const getInitials = (fullName: string | null): string => {
  const trimmed = fullName?.trim();
  if (!trimmed) return '?';
  return trimmed
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((s) => s.charAt(0))
    .join('')
    .toUpperCase();
};

const PERIOD_PARAM: Record<Period, LeaderboardPeriod> = {
  weekly: 'WEEKLY',
  monthly: 'MONTHLY',
  allTime: 'ALL_TIME',
};

/** Huy hiệu suy ra từ hạng, backend không trả trường này. */
const badgeForRank = (rank: number): LeaderboardEntry['badge'] =>
  rank === 1 ? 'gold' : rank === 2 ? 'silver' : rank === 3 ? 'bronze' : null;

const toEntry = (e: ApiLeaderboardEntry): LeaderboardEntry => ({
  rank: e.rank,
  user_id: e.userId,
  full_name: e.displayName,
  avatar: e.avatarUrl,
  points: Math.round(e.score),
  courses_completed: e.coursesCompleted,
  streak_days: e.currentStreak,
  badge: badgeForRank(e.rank),
});

const LeaderboardPage: React.FC = () => {
  const { t } = useTranslation();
  const [period, setPeriod] = useState<Period>('weekly');

  const currentUserId = useAuthStore((s) => s.user?.id);

  // Đổi mốc thời gian phải gọi lại: xếp hạng tuần và toàn thời gian là hai
  // bảng khác nhau. Trước đây `period` chỉ đổi giao diện nút bấm.
  const { data: entries = [], isLoading } = useQuery({
    queryKey: ['student', 'leaderboard', period],
    queryFn: async () => (await analyticsApi.getLeaderboard(PERIOD_PARAM[period], 50)).map(toEntry),
  });

  // Hạng của chính mình có thể nằm ngoài top 50, nên hỏi riêng thay vì dò
  // trong danh sách.
  const { data: myRankRaw } = useQuery({
    queryKey: ['student', 'leaderboard', 'me', period],
    queryFn: () => analyticsApi.getMyRank(PERIOD_PARAM[period]),
    enabled: Boolean(currentUserId),
  });

  const myRank = myRankRaw ? toEntry(myRankRaw) : undefined;
  const top3 = entries.slice(0, 3);
  const rest = entries.slice(3);

  return (
    <StudentLayout title={t('student.leaderboard.title')} subtitle={t('student.leaderboard.subtitle')}>
      <div className="flex items-center gap-2 mb-6">
        {(['weekly', 'monthly', 'allTime'] as Period[]).map(p => (
          <button
            key={p}
            onClick={() => setPeriod(p)}
            className={`px-4 py-2 rounded-lg text-sm font-semibold transition-colors ${
              period === p
                ? 'bg-blue-600 text-white shadow-sm'
                : 'border border-slate-200 dark:border-slate-700 hover:border-blue-500 text-slate-700 dark:text-slate-300'
            }`}
          >
            {t(`student.leaderboard.${p}`)}
          </button>
        ))}
      </div>

      {isLoading && (
        <Card className="mb-6">
          <div className="py-10 text-center text-sm text-slate-500">
            {t('common.loading', 'Đang tải...')}
          </div>
        </Card>
      )}

      {!isLoading && entries.length === 0 && (
        <Card className="mb-6">
          <div className="py-10 text-center text-sm text-slate-500">
            {t('student.leaderboard.empty', 'Chưa có dữ liệu xếp hạng cho mốc thời gian này.')}
          </div>
        </Card>
      )}

      <Card className="mb-6 overflow-visible">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end px-2">
          {[top3[1], top3[0], top3[2]].map((entry, idx) => {
            if (!entry) return null;
            const actualRank = idx === 0 ? 2 : idx === 1 ? 1 : 3;
            const heights = [120, 160, 100];
            const podiumColors = [
              { bg: 'bg-gradient-to-b from-slate-300 to-slate-400', text: 'text-slate-900' },
              { bg: 'bg-gradient-to-b from-amber-400 to-yellow-500', text: 'text-amber-900' },
              { bg: 'bg-gradient-to-b from-orange-400 to-amber-600', text: 'text-orange-900' },
            ];
            const displayName = entry.full_name ?? t('student.leaderboard.unknownLearner', 'Học viên ẩn danh');
            return (
              <div key={entry.user_id} className="flex flex-col items-center text-center">
                <div className="relative mb-2">
                  {entry.avatar ? (
                    <img src={entry.avatar} alt={displayName} className="w-16 h-16 rounded-full border-4 border-white dark:border-slate-800 shadow-md" />
                  ) : (
                    <div className="w-16 h-16 rounded-full bg-gradient-to-br from-blue-500 to-cyan-500 text-white flex items-center justify-center font-bold text-lg border-4 border-white dark:border-slate-800 shadow-md">
                      {getInitials(entry.full_name)}
                    </div>
                  )}
                  <span className={`absolute -bottom-2 left-1/2 -translate-x-1/2 w-8 h-8 rounded-full ${podiumColors[idx].bg} ${podiumColors[idx].text} flex items-center justify-center font-bold text-sm shadow-md`}>
                    {actualRank}
                  </span>
                </div>
                <div className="text-sm font-bold text-slate-900 dark:text-white mt-2">{displayName}</div>
                <div className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">{entry.points} {t('student.leaderboard.points_unit')}</div>
                <div className={`w-full ${podiumColors[idx].bg} mt-3 rounded-t-xl flex items-center justify-center text-white font-bold`} style={{ height: heights[idx] }}>
                  {entry.points}
                </div>
              </div>
            );
          })}
        </div>
      </Card>

      <Card padding="none">
        <table className="w-full">
          <thead>
            <tr className="border-b border-slate-200 dark:border-slate-800 text-xs uppercase tracking-wider text-slate-500">
              <th className="text-center px-6 py-3 font-semibold w-16">{t('student.leaderboard.rank')}</th>
              <th className="text-left px-6 py-3 font-semibold">{t('student.leaderboard.name')}</th>
              <th className="text-center px-6 py-3 font-semibold">{t('student.leaderboard.points')}</th>
              <th className="text-center px-6 py-3 font-semibold">{t('student.leaderboard.courses')}</th>
              <th className="text-center px-6 py-3 font-semibold">{t('student.leaderboard.streak')}</th>
            </tr>
          </thead>
          <tbody>
            {rest.map((entry: LeaderboardEntry) => {
              const badge = entry.badge ? badgeStyles[entry.badge] : badgeStyles.none;
              const displayName = entry.full_name ?? t('student.leaderboard.unknownLearner', 'Học viên ẩn danh');
              return (
                <tr key={entry.user_id} className="border-b border-slate-100 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/40">
                  <td className="px-6 py-3 text-center">
                    <span className={`inline-flex items-center justify-center w-8 h-8 rounded-lg font-bold text-sm ${badge.bg} ${badge.text}`}>
                      {entry.badge ? badge.label : entry.rank}
                    </span>
                  </td>
                  <td className="px-6 py-3">
                    <div className="flex items-center gap-3">
                      {entry.avatar ? (
                        <img src={entry.avatar} alt={displayName} className="w-9 h-9 rounded-full" />
                      ) : (
                        <div className="w-9 h-9 rounded-full bg-gradient-to-br from-blue-500 to-cyan-500 text-white flex items-center justify-center font-semibold text-xs">
                          {getInitials(entry.full_name)}
                        </div>
                      )}
                      <div className="font-semibold text-sm">{displayName}</div>
                    </div>
                  </td>
                  <td className="px-6 py-3 text-center font-bold text-blue-600 dark:text-blue-400">{entry.points.toLocaleString('en-US')}</td>
                  <td className="px-6 py-3 text-center text-sm">{entry.courses_completed}</td>
                  <td className="px-6 py-3 text-center text-sm">
                    <span className="inline-flex items-center gap-1 text-orange-500">
                      🔥 {entry.streak_days} {t('student.leaderboard.days')}
                    </span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </Card>

      {myRank && (
        <div className="mt-6 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-2xl p-4 flex items-center justify-between">
          <div>
            <div className="text-xs text-blue-600 dark:text-blue-400 font-semibold">{t('student.leaderboard.yourRank')}</div>
            <div className="text-2xl font-bold text-slate-900 dark:text-white">#{myRank.rank}</div>
          </div>
          <div className="text-right">
            <div className="text-xs text-slate-500 dark:text-slate-400">{t('student.leaderboard.points')}</div>
            <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">{myRank.points.toLocaleString('en-US')}</div>
          </div>
        </div>
      )}
    </StudentLayout>
  );
};

export default LeaderboardPage;
