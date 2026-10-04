/** Wave 2C (student) — Integration: LeaderboardPage (gap-fill only) */
import '@testing-library/jest-dom/vitest';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => {
      const map: Record<string, string> = {
        'student.leaderboard.title': 'Leaderboard',
        'student.leaderboard.subtitle': 'Top learners',
        'student.leaderboard.weekly': 'Weekly',
        'student.leaderboard.monthly': 'Monthly',
        'student.leaderboard.allTime': 'All time',
        'student.leaderboard.rank': 'Rank',
        'student.leaderboard.name': 'Name',
        'student.leaderboard.points': 'Points',
        'student.leaderboard.courses': 'Courses',
        'student.leaderboard.streak': 'Streak',
        'student.leaderboard.points_unit': 'pts',
        'student.leaderboard.days': 'days',
        'student.leaderboard.yourRank': 'Your rank',
        'student.leaderboard.empty': 'No data yet',
        'student.leaderboard.unknownLearner': 'Anonymous',
        'common.loading': 'Loading...',
        'student.nav.overview': 'Overview',
        'student.nav.community': 'Community',
        'student.nav.tools': 'Tools',
        'student.nav.practice': 'Practice',
        'student.nav.account': 'Account',
        'student.nav.dashboard': 'Dashboard',
        'student.nav.myCourses': 'My courses',
        'student.enrollment.title': 'Enrollment',
        'student.nav.myExams': 'Exams',
        'student.nav.learningPath': 'Path',
        'student.nav.leaderboard': 'Leaderboard',
        'student.nav.discussions': 'Discussions',
        'student.nav.messages': 'Messages',
        'student.nav.practiceQuiz': 'Practice',
        'student.nav.recommendations': 'Recommendations',
        'student.nav.aiAssistant': 'AI',
        'student.nav.search': 'Search',
        'student.nav.tokenWallet': 'Wallet',
        'student.nav.ocr': 'OCR',
        'student.nav.speechToText': 'Speech',
        'student.nav.streak': 'Streak',
        'student.nav.certificates': 'Certificates',
        'student.nav.notifications': 'Notifications',
        'student.nav.profile': 'Profile',
        'student.nav.settings': 'Settings',
        'shared.menu': 'Menu',
        'sidebar.role.student': 'Student',
        'header.logout': 'Logout',
        'header.toggleTheme': 'Theme',
        'header.notifications': 'Notifications',
      };
      return map[key] ?? key;
    },
    i18n: { language: 'en', changeLanguage: vi.fn() },
  }),
}));

const { mockGet } = vi.hoisted(() => ({ mockGet: vi.fn() }));
vi.mock('@/config/api.config', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/config/api.config')>();
  return { ...actual, apiClient: { get: mockGet, post: vi.fn(), patch: vi.fn(), delete: vi.fn() } };
});

if (typeof globalThis.IntersectionObserver === 'undefined') {
  (
    globalThis as unknown as { IntersectionObserver: new () => IntersectionObserver }
  ).IntersectionObserver = class MockIntersectionObserver {
    observe = () => undefined;
    unobserve = () => undefined;
    disconnect = () => undefined;
    takeRecords = () => [];
    root = null;
    rootMargin = '';
    thresholds = [];
    scrollMargin = '';
  };
}

import { useAuthStore } from '@/app/store/authStore';
import LeaderboardPage from '@/pages/student/LeaderboardPage';

const queryClient = new QueryClient({
  defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
});

function renderPage() {
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={['/student/leaderboard']}>
        <LeaderboardPage />
      </MemoryRouter>
    </QueryClientProvider>
  );
}

function seedStudent() {
  useAuthStore.setState({
    user: {
      id: 'u-self',
      email: 's@ioes.com',
      full_name: 'Self',
      role: 'student',
      avatar_url: null,
    },
    accessToken: 'student-token',
    refreshToken: null,
    isAuthenticated: true,
    isLoading: false,
  });
}

const weekly = [
  {
    userId: 'u-1',
    displayName: 'Alice',
    avatarUrl: null,
    score: 1000,
    rank: 1,
    rankDelta: 0,
    period: 'WEEKLY',
    examsCompleted: 5,
    avgExamScore: 80,
    currentStreak: 7,
    longestStreak: 10,
    coursesCompleted: 1,
    lastActivityAt: '2026-10-02T00:00:00Z',
  },
  {
    userId: 'u-2',
    displayName: 'Bob',
    avatarUrl: null,
    score: 800,
    rank: 2,
    rankDelta: 0,
    period: 'WEEKLY',
    examsCompleted: 4,
    avgExamScore: 70,
    currentStreak: 3,
    longestStreak: 8,
    coursesCompleted: 1,
    lastActivityAt: '2026-10-02T00:00:00Z',
  },
  {
    userId: 'u-3',
    displayName: null,
    avatarUrl: null,
    score: 600,
    rank: 3,
    rankDelta: 0,
    period: 'WEEKLY',
    examsCompleted: 3,
    avgExamScore: 65,
    currentStreak: 2,
    longestStreak: 5,
    coursesCompleted: 0,
    lastActivityAt: null,
  },
  {
    userId: 'u-4',
    displayName: 'Carol',
    avatarUrl: null,
    score: 400,
    rank: 4,
    rankDelta: 0,
    period: 'WEEKLY',
    examsCompleted: 2,
    avgExamScore: 50,
    currentStreak: 1,
    longestStreak: 4,
    coursesCompleted: 0,
    lastActivityAt: null,
  },
];

const myRank = {
  userId: 'u-self',
  displayName: 'Self',
  avatarUrl: null,
  score: 350,
  rank: 5,
  rankDelta: -1,
  period: 'WEEKLY',
  examsCompleted: 1,
  avgExamScore: 50,
  currentStreak: 0,
  longestStreak: 2,
  coursesCompleted: 0,
  lastActivityAt: '2026-10-01T00:00:00Z',
};

beforeEach(() => {
  queryClient.clear();
  seedStudent();
  localStorage.clear();
  mockGet.mockReset();
  mockGet.mockImplementation((url: string) => {
    if (url.includes('/leaderboard/me')) {
      return Promise.resolve({
        data: { success: true, message: 'OK', data: myRank, timestamp: '2026-10-03T00:00:00Z' },
      });
    }
    if (url.includes('/leaderboard')) {
      return Promise.resolve({
        data: { success: true, message: 'OK', data: weekly, timestamp: '2026-10-03T00:00:00Z' },
      });
    }
    return Promise.reject(new Error('Unexpected URL ' + url));
  });
});

describe('IT-LEADERBOARD-001: LeaderboardPage renders period filter buttons and re-queries on period change', () => {
  it('should render Weekly / Monthly / All time buttons and the leaderboard table', async () => {
    renderPage();
    // Wait for the leaderboard data to populate the top-3 podium (Alice = rank 1).
    await waitFor(
      () => {
        expect(screen.getByText('Alice')).toBeInTheDocument();
      },
      { timeout: 5000 }
    );
    expect(screen.getByText('Bob')).toBeInTheDocument();
    // Rest-table shows 4th place user
    expect(screen.getByText('Carol')).toBeInTheDocument();
    // Anonymous 3rd place (displayName=null) falls back to "Anonymous"
    expect(screen.getAllByText('Anonymous').length).toBeGreaterThanOrEqual(1);
    // "Your rank" card shows the current user's rank
    expect(screen.getByText(/your rank/i)).toBeInTheDocument();
    expect(screen.getByText('#5')).toBeInTheDocument();
  });

  it('should re-query with period=MONTHLY when the Monthly button is clicked', async () => {
    const user = userEvent.setup();
    renderPage();

    // Wait for the initial weekly load to render Alice.
    await waitFor(() => {
      expect(screen.getByText('Alice')).toBeInTheDocument();
    });

    await user.click(screen.getByRole('button', { name: /monthly/i }));

    // After click, the page should re-issue the leaderboard call with
    // `period=MONTHLY`. The mock records the call URL/params.
    await waitFor(() => {
      const calls = mockGet.mock.calls.filter(
        (c) => typeof c[0] === 'string' && c[0].includes('/leaderboard') && !c[0].includes('/me')
      );
      const hasMonthlyCall = calls.some((c) => {
        const params = (c[1] as { params?: { period?: string } } | undefined)?.params;
        return params?.period === 'MONTHLY';
      });
      expect(hasMonthlyCall).toBe(true);
    });
  });

  it('should re-query with period=ALL_TIME when the All time button is clicked', async () => {
    const user = userEvent.setup();
    renderPage();
    await waitFor(() => {
      expect(screen.getByText('Alice')).toBeInTheDocument();
    });

    await user.click(screen.getByRole('button', { name: /all time/i }));

    await waitFor(() => {
      const calls = mockGet.mock.calls.filter(
        (c) => typeof c[0] === 'string' && c[0].includes('/leaderboard') && !c[0].includes('/me')
      );
      const hasAllTimeCall = calls.some((c) => {
        const params = (c[1] as { params?: { period?: string } } | undefined)?.params;
        return params?.period === 'ALL_TIME';
      });
      expect(hasAllTimeCall).toBe(true);
    });
  });
});
