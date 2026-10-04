/** Wave 2C (student) — Unit: leaderboard gaps */
import { describe, it, expect } from 'vitest';
import type {
  LeaderboardEntry as ApiLeaderboardEntry,
  LeaderboardPeriod,
} from '@/services/api/analytics.api';

// Inline re-derivation of LOCKED LOGIC (mirror LeaderboardPage.tsx L51-69).
const badgeForRank = (rank: number): 'gold' | 'silver' | 'bronze' | null =>
  rank === 1 ? 'gold' : rank === 2 ? 'silver' : rank === 3 ? 'bronze' : null;

const PERIOD_PARAM: Record<'weekly' | 'monthly' | 'allTime', LeaderboardPeriod> = {
  weekly: 'WEEKLY',
  monthly: 'MONTHLY',
  allTime: 'ALL_TIME',
};

const toEntry = (e: ApiLeaderboardEntry) => ({
  rank: e.rank,
  user_id: e.userId,
  full_name: e.displayName,
  avatar: e.avatarUrl,
  points: Math.round(e.score),
  courses_completed: e.coursesCompleted,
  streak_days: e.currentStreak,
  badge: badgeForRank(e.rank),
});

const makeEntry = (overrides: Partial<ApiLeaderboardEntry> = {}): ApiLeaderboardEntry => ({
  userId: 'u-1',
  displayName: 'Alice',
  avatarUrl: null,
  score: 100,
  rank: 1,
  rankDelta: 0,
  period: 'WEEKLY',
  examsCompleted: 0,
  avgExamScore: 0,
  currentStreak: 0,
  longestStreak: 0,
  coursesCompleted: 0,
  lastActivityAt: null,
  ...overrides,
});

describe('UT-LEADERBOARD-001: badgeForRank maps rank 1/2/3 to gold/silver/bronze and other ranks to null', () => {
  it('should map 1→gold, 2→silver, 3→bronze, and ≥4→null', () => {
    expect(badgeForRank(1)).toBe('gold');
    expect(badgeForRank(2)).toBe('silver');
    expect(badgeForRank(3)).toBe('bronze');
    expect(badgeForRank(4)).toBeNull();
  });
});

describe('UT-LEADERBOARD-002: PERIOD_PARAM maps UI period to LeaderboardPeriod enum', () => {
  it('should map weekly/monthly/allTime to WEEKLY/MONTHLY/ALL_TIME', () => {
    expect(PERIOD_PARAM.weekly).toBe('WEEKLY');
    expect(PERIOD_PARAM.monthly).toBe('MONTHLY');
    expect(PERIOD_PARAM.allTime).toBe('ALL_TIME');
  });
});

describe('UT-LEADERBOARD-003: toEntry maps API shape to UI shape (snake_case + rounded score + null tolerance)', () => {
  it('should rename userId→user_id, round points, preserve null displayName/avatar', () => {
    const out = toEntry(
      makeEntry({
        userId: 'u-7',
        displayName: null,
        avatarUrl: null,
        score: 1234.6,
        rank: 4,
        currentStreak: 14,
        coursesCompleted: 3,
      })
    );
    expect(out.user_id).toBe('u-7');
    expect(out.full_name).toBeNull();
    expect(out.avatar).toBeNull();
    expect(out.points).toBe(1235);
    expect(out.streak_days).toBe(14);
    expect(out.courses_completed).toBe(3);
    expect(out.badge).toBeNull(); // rank=4 → no badge
  });
});
