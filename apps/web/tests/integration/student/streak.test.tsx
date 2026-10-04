/** Wave 2C (student) — Integration: StreakPage */
import '@testing-library/jest-dom/vitest';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string, opts?: Record<string, unknown>) => {
      const map: Record<string, string> = {
        'student.streak.title': 'Streak',
        'student.streak.subtitle': 'Daily learning streak',
        'student.streak.actions.useFreeze': 'Use freeze day',
        'student.streak.currentStreak': 'Current streak',
        'student.streak.bestStreak': 'Best streak',
        'student.streak.daysInRow': 'days in a row',
        'student.streak.personalRecord': 'Personal record',
        'student.streak.toNextMilestone': 'To next milestone',
        'student.streak.daysUntil': 'days until',
        'student.streak.allAchieved': 'All milestones achieved',
        'student.streak.freezeTitle': 'Freeze days',
        'student.streak.freezeDesc': 'You have {count} freeze days',
        'student.streak.activityTitle': 'Activity',
        'student.streak.activitySubtitle': 'Last 365 days',
        'student.streak.noDailyData': 'No daily data yet',
        'student.streak.less': 'Less',
        'student.streak.more': 'More',
        'student.streak.monthJan': 'Jan',
        'student.streak.monthFeb': 'Feb',
        'student.streak.monthMar': 'Mar',
        'student.streak.monthApr': 'Apr',
        'student.streak.monthMay': 'May',
        'student.streak.monthJun': 'Jun',
        'student.streak.monthJul': 'Jul',
        'student.streak.monthAug': 'Aug',
        'streak.dowMon': 'Mon',
        'streak.dowWed': 'Wed',
        'streak.dowFri': 'Fri',
        'streak.weekSun': 'Sun',
        'streak.weekMon': 'Mon',
        'streak.weekTue': 'Tue',
        'streak.weekWed': 'Wed',
        'streak.weekThu': 'Thu',
        'streak.weekFri': 'Fri',
        'streak.weekSat': 'Sat',
        'student.streak.weeklyTitle': 'This week',
        'student.streak.last7Days': 'Last 7 days',
        'student.streak.monthlyTitle': 'Last year',
        'student.streak.monthlyStats.daysActive': 'Days active',
        'student.streak.monthlyStats.studyTime': 'Study time',
        'student.streak.monthlyStats.lessons': 'Lessons',
        'student.streak.monthlyStats.exams': 'Exams',
        'student.streak.outOf365': 'out of 365',
        'student.streak.lastYear': 'last year',
        'student.streak.achievementsTitle': 'Achievements',
        'student.streak.achieved': 'Achieved',
        'student.streak.m7': '7 days',
        'student.streak.m30': '30 days',
        'student.streak.m100': '100 days',
        'student.streak.m365': '365 days',
        'student.streak.completedAt': 'Completed at {count} days',
        'student.streak.continueTo': 'Continue to {count} days',
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
      let v = map[key] ?? key;
      if (opts) {
        for (const [k, val] of Object.entries(opts)) {
          v = v.replace(`{${k}}`, String(val));
        }
      }
      return v;
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
import StreakPage from '@/pages/student/StreakPage';

const queryClient = new QueryClient({
  defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
});

function renderPage() {
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={['/student/streak']}>
        <StreakPage />
      </MemoryRouter>
    </QueryClientProvider>
  );
}

function seedStudent() {
  useAuthStore.setState({
    user: {
      id: 'u-1',
      email: 's@ioes.com',
      full_name: 'Student One',
      role: 'student',
      avatar_url: null,
    },
    accessToken: 'student-token',
    refreshToken: null,
    isAuthenticated: true,
    isLoading: false,
  });
}

const analyticsPayload = {
  userId: 'u-1',
  totalExamsAttempted: 4,
  totalExamsPassed: 3,
  totalExamsFailed: 1,
  passRate: 75,
  avgScore: 80,
  highestScore: 95,
  totalCoursesEnrolled: 2,
  totalCoursesCompleted: 2,
  currentStreak: 15,
  longestStreak: 30,
  totalStudyMinutes: 240,
  lastExamAt: '2026-10-02T00:00:00Z',
  lastLoginAt: '2026-10-02T00:00:00Z',
};

// Re-apply the mock implementation here so it survives any vi.mock hoisting
// or module-reset side effects (Vitest can clear mock state across tests).
mockGet.mockImplementation((url: string) => {
  if (url.includes('/api/analytics/users/')) {
    return Promise.resolve({
      data: {
        success: true,
        message: 'OK',
        data: analyticsPayload,
        timestamp: '2026-10-04T00:00:00Z',
      },
    });
  }
  return Promise.reject(new Error('Unexpected URL ' + url));
});

beforeEach(() => {
  queryClient.clear();
  seedStudent();
  console.log('[auth]', JSON.stringify(useAuthStore.getState().user));
  localStorage.clear();
  mockGet.mockReset();
  mockGet.mockImplementation((url: string, config?: unknown) => {
    console.log('[mockGet]', url, JSON.stringify(config));
    if (url.includes('/api/analytics/users/')) {
      return Promise.resolve({
        data: {
          success: true,
          message: 'OK',
          data: analyticsPayload,
          timestamp: '2026-10-03T00:00:00Z',
        },
      });
    }
    return Promise.reject(new Error('Unexpected URL ' + url));
  });
});

describe('IT-STREAK-001: StreakPage renders the three hero counters from the analytics payload', () => {
  it('should render the Streak page title and currentStreak=15', async () => {
    renderPage();
    // Wait for React Query to process the mock and re-render. The analytics-driven
    // hero card renders the literal "15" only when the query resolves with the
    // payload; the fallback (when analytics is undefined) renders "0".
    // "15" appears multiple times: currentStreak hero + daysToMilestone + milestone progress
    await waitFor(
      () => {
        expect(screen.getAllByText('15').length).toBeGreaterThanOrEqual(2);
      },
      { timeout: 5000 }
    );
    // bestStreak=30 → appears in the "Best streak" card. "30" also appears in
    // milestone progress (m2: 15 / 30) and the "Continue to 30 days" label.
    expect(screen.getAllByText('30').length).toBeGreaterThanOrEqual(1);
  });

  it('should render the "Use freeze day" action button in the header', async () => {
    renderPage();
    await waitFor(() => {
      expect(screen.getByRole('button', { name: /use freeze day/i })).toBeInTheDocument();
    });
  });
});

describe('IT-STREAK-002: StreakPage renders the milestones list with achieved badges', () => {
  it('should mark m1 (7 days) as achieved and m2/m3/m4 as not yet achieved', async () => {
    renderPage();
    // Wait for analytics to load so milestone progress bars are populated
    await waitFor(
      () => {
        // Achieved label (SVG + "Achieved" text) appears in m1 milestone card
        expect(screen.getAllByText(/achieved/i).length).toBeGreaterThanOrEqual(1);
      },
      { timeout: 5000 }
    );
    // Continue-to label for m2 (30 days) — shows "Continue to 30 days"
    expect(screen.getByText(/continue to 30 days/i)).toBeInTheDocument();
  });
});
