import { apiClient, toApiError, unwrap, type ApiEnvelope } from '@/config/api.config';

/**
 * Epic 7 — bảng xếp hạng và thống kê học tập.
 *
 * Gateway khai `Path=/api/analytics/**` kèm `StripPrefix=1`, nên chỉ đoạn
 * `/api` bị cắt và service nhận đúng `/analytics/...` như `@RequestMapping`
 * của `AnalyticsController` mong đợi. Đường dẫn ở đây giữ nguyên một lần
 * `/analytics`; viết `/api/analytics/analytics/...` là thừa.
 */

const BASE = '/api/analytics';

export type LeaderboardPeriod = 'DAILY' | 'WEEKLY' | 'MONTHLY' | 'ALL_TIME';

/** Ánh xạ 1-1 với record `LeaderboardEntryResponse` phía Java. */
export interface LeaderboardEntry {
  userId: string;
  displayName: string;
  avatarUrl: string | null;
  score: number;
  rank: number;
  /** Dương là lên hạng, âm là xuống hạng. */
  rankDelta: number;
  period: LeaderboardPeriod;
  examsCompleted: number;
  avgExamScore: number;
  currentStreak: number;
  longestStreak: number;
  coursesCompleted: number;
  lastActivityAt: string | null;
}

/** Ánh xạ 1-1 với record `UserAnalyticsResponse` phía Java. */
export interface UserAnalytics {
  userId: string;
  totalExamsAttempted: number;
  totalExamsPassed: number;
  totalExamsFailed: number;
  /** Phần trăm, 0..100. */
  passRate: number;
  avgScore: number;
  highestScore: number;
  totalCoursesEnrolled: number;
  totalCoursesCompleted: number;
  currentStreak: number;
  longestStreak: number;
  totalStudyMinutes: number;
  lastExamAt: string | null;
  lastLoginAt: string | null;
}

export function getLeaderboard(
  period: LeaderboardPeriod = 'WEEKLY',
  limit = 10,
): Promise<LeaderboardEntry[]> {
  return unwrap(
    apiClient.get<ApiEnvelope<LeaderboardEntry[]>>(`${BASE}/leaderboard`, {
      params: { period, limit },
    }),
  );
}

/**
 * Hạng của người đang đăng nhập.
 *
 * Backend trả `success` kèm `data: null` khi người dùng chưa có hạng, nên hàm
 * này trả `null` chứ không ném lỗi — chưa xếp hạng là trạng thái bình thường,
 * không phải hỏng.
 */
export async function getMyRank(
  period: LeaderboardPeriod = 'WEEKLY',
): Promise<LeaderboardEntry | null> {
  try {
    const { data: envelope } = await apiClient.get<ApiEnvelope<LeaderboardEntry | null>>(
      `${BASE}/leaderboard/me`,
      { params: { period } },
    );
    return envelope.data ?? null;
  } catch (err) {
    // Không đi qua unwrap nên phải tự chuẩn hoá lỗi, nếu không phía gọi bắt
    // `instanceof ApiError` sẽ trượt và lỗi mạng lọt ra ngoài dạng AxiosError.
    throw toApiError(err);
  }
}

export function getUserAnalytics(userId: string): Promise<UserAnalytics> {
  return unwrap(apiClient.get<ApiEnvelope<UserAnalytics>>(`${BASE}/users/${userId}`));
}

export const analyticsApi = { getLeaderboard, getMyRank, getUserAnalytics };
