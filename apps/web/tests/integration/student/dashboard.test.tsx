/** Wave 2A — Integration: DashboardPage (student) */
import '@testing-library/jest-dom/vitest';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

// i18next mock — keys used by DashboardPage + StudentLayout sidebar.
vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string, opts?: Record<string, unknown>) => {
      const map: Record<string, string> = {
        // Dashboard keys
        'student.dashboard.title': 'Dashboard',
        'student.dashboard.subtitle': 'Overview',
        'student.dashboard.welcomeGreeting': 'Good morning',
        'student.dashboard.welcomeTitle': 'Good afternoon',
        'student.dashboard.stats.enrolled': 'Enrolled',
        'student.dashboard.stats.completed': 'Completed',
        'student.dashboard.stats.studyHours': 'Study hours',
        'student.dashboard.continueWhereLeft': 'Continue where you left',
        'student.dashboard.upcomingExams': 'Upcoming exams',
        'student.dashboard.viewAll': 'View all',
        'student.dashboard.achievements': 'Achievements',
        // student.exams.*
        'student.exams.title': 'Exams',
        'student.exams.status.available': 'Available',
        'student.exams.status.in_progress': 'In progress',
        'student.exams.status.completed': 'Completed',
        'student.exams.duration': 'minutes',
        'student.exams.empty': 'No upcoming exams',
        'student.exams.startBtn': 'Start',
        'student.exams.resumeBtn': 'Resume',
        // examApi.studentDashboard.*
        'examApi.studentDashboard.stats.examsPassed': 'Exams passed',
        'examApi.studentDashboard.stats.streak': 'Streak',
        'examApi.studentDashboard.summaryTitle': 'Summary',
        'examApi.studentDashboard.summary.attempted': 'Attempted',
        'examApi.studentDashboard.summary.passRate': 'Pass rate',
        'examApi.studentDashboard.summary.avgScore': 'Avg score',
        'examApi.studentDashboard.summary.longestStreak': 'Longest streak',
        'examApi.studentDashboard.locked': 'Locked',
        'examApi.studentDashboard.achievementsHint': 'Unlock more by learning',
        // student.profile.achievements.*
        'student.profile.achievements.first_course': 'First course',
        'student.profile.achievements.streak_7': '7-day streak',
        'student.profile.achievements.streak_30': '30-day streak',
        'student.profile.achievements.top_10': 'Top 10',
        'student.profile.achievements.perfect_score': 'Perfect score',
        // enrollmentApi.*
        'enrollmentApi.allCompleted': 'All completed',
        'enrollmentApi.noEnrollments': 'No enrollments yet',
        'enrollmentApi.browseCourses': 'Browse courses',
        // common.*
        'common.loadError': 'Failed to load',
        'common.noData': 'No data',
        // StudentLayout nav keys (subset — only what's rendered)
        'student.nav.overview': 'Overview',
        'student.nav.community': 'Community',
        'student.nav.tools': 'Tools',
        'student.nav.practice': 'Practice',
        'student.nav.account': 'Account',
        'student.nav.dashboard': 'Dashboard',
        'student.nav.myCourses': 'My courses',
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
        'sidebar.role.student': 'Student',
        'header.logout': 'Logout',
        'header.toggleTheme': 'Toggle theme',
        'header.notifications': 'Notifications',
        'shared.menu': 'Menu',
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

// Mock the API boundary — DashboardPage calls analytics-service,
// exam-suite, and content-service.
const { mockGet } = vi.hoisted(() => ({ mockGet: vi.fn() }));
vi.mock('@/config/api.config', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/config/api.config')>();
  return {
    ...actual,
    apiClient: { get: mockGet, post: vi.fn(), patch: vi.fn(), delete: vi.fn(), put: vi.fn() },
  };
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
import DashboardPage from '@/pages/student/DashboardPage';

const queryClient = new QueryClient({
  defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
});

function seedStudent(): void {
  useAuthStore.setState({
    user: {
      id: 'u-1',
      email: 's@ioes.com',
      full_name: 'Alice Student',
      role: 'student',
      avatar_url: null,
    },
    accessToken: 'student-token',
    refreshToken: null,
    isAuthenticated: true,
    isLoading: false,
  });
}

function renderPage() {
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={['/student']}>
        <DashboardPage />
      </MemoryRouter>
    </QueryClientProvider>
  );
}

// Fixtures
const analyticsPayload = {
  userId: 'u-1',
  totalExamsAttempted: 5,
  totalExamsPassed: 3,
  totalExamsFailed: 2,
  passRate: 60.0,
  avgScore: 75.5,
  highestScore: 95,
  totalCoursesEnrolled: 3,
  totalCoursesCompleted: 1,
  currentStreak: 4,
  longestStreak: 12,
  totalStudyMinutes: 90,
  lastExamAt: '2026-10-01T00:00:00Z',
  lastLoginAt: '2026-10-04T00:00:00Z',
};

const myRank = {
  userId: 'u-1',
  displayName: 'Alice',
  avatarUrl: null,
  score: 150,
  rank: 5,
  rankDelta: 0,
  period: 'ALL_TIME',
  examsCompleted: 5,
  avgExamScore: 75.5,
  currentStreak: 4,
  longestStreak: 12,
  coursesCompleted: 1,
  lastActivityAt: '2026-10-04T00:00:00Z',
};

const course = {
  id: 'c-1',
  instructorId: 'i-1',
  categoryId: null,
  title: 'Algebra 101',
  slug: 'algebra-101',
  shortDescription: null,
  description: null,
  thumbnailUrl: null,
  previewVideoUrl: null,
  price: 0,
  currency: 'VND',
  durationHours: 10,
  difficultyLevel: 1,
  language: 'vi',
  status: 'published' as const,
  reviewStatus: 'approved' as const,
  rejectionReason: null,
  publishedAt: '2026-01-01T00:00:00Z',
  stats: null,
  createdAt: '2026-01-01T00:00:00Z',
  updatedAt: '2026-01-01T00:00:00Z',
};

const enrollment = {
  enrollment: {
    id: 'en-1',
    courseId: 'c-1',
    userId: 'u-1',
    status: 'active' as const,
    progressPercent: 30,
    enrolledAt: '2026-09-01T00:00:00Z',
    completedAt: null,
    lastAccessedAt: '2026-10-01T00:00:00Z',
  },
  course,
};

const exam = {
  id: 'e-1',
  courseId: 'c-1',
  instructorId: 'i-1',
  title: 'Algebra Midterm',
  description: null,
  examType: 'practice',
  timeLimitMinutes: 30,
  passingScore: 70,
  maxAttempts: 3,
  isRandomized: false,
  showResults: true,
  isProctored: false,
  metadata: {},
  createdAt: '2026-09-01T00:00:00Z',
  updatedAt: '2026-09-01T00:00:00Z',
  deletedAt: null,
  version: 1,
};

const attempt = {
  id: 'a-1',
  examId: 'e-1',
  userId: 'u-1',
  status: 'in_progress',
  startedAt: '2026-10-01T00:00:00Z',
  submittedAt: null,
  gradedAt: null,
  timeRemainingSeconds: 1800,
  score: null,
  maxScore: null,
  percentageScore: null,
  passed: null,
  questionIds: null,
  metadata: {},
  createdAt: '2026-10-01T00:00:00Z',
  updatedAt: '2026-10-01T00:00:00Z',
  version: 1,
};

function setupHappyMocks(): void {
  mockGet.mockReset();
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
    if (url.includes('/api/analytics/leaderboard/me')) {
      return Promise.resolve({
        data: {
          success: true,
          message: 'OK',
          data: myRank,
          timestamp: '2026-10-04T00:00:00Z',
        },
      });
    }
    if (url.includes('/api/v1/courses/enrollments/me')) {
      // content-service body shape (no envelope).
      return Promise.resolve({ data: [enrollment] });
    }
    if (url === '/api/exams' || url.startsWith('/api/exams')) {
      return Promise.resolve({
        data: { success: true, message: 'OK', data: [exam], timestamp: '2026-10-04T00:00:00Z' },
      });
    }
    if (url === '/api/attempts' || url.startsWith('/api/attempts')) {
      return Promise.resolve({
        data: { success: true, message: 'OK', data: [attempt], timestamp: '2026-10-04T00:00:00Z' },
      });
    }
    return Promise.reject(new Error('Unexpected URL ' + url));
  });
}

// ---------------------------------------------------------------------------
// IT-DASH-001: happy path — analytics, enrollments, exams all OK
// ---------------------------------------------------------------------------
describe('IT-DASH-001: DashboardPage renders greeting, continue-learning, and upcoming-exam start link with mocked APIs', () => {
  beforeEach(() => {
    seedStudent();
    localStorage.clear();
    setupHappyMocks();
  });

  it('should render greeting with user name, continue-learning link, upcoming exam start link, and the header Exams button navigates to /student/exams', async () => {
    const user = userEvent.setup();
    renderPage();

    // Greeting (h2 with data-testid="dashboard-greeting").
    await waitFor(() => {
      expect(screen.getByTestId('dashboard-greeting')).toHaveTextContent('Alice Student');
    });
    // Continue-learning link points at /student/learn/<courseId>.
    const continueLink = await screen.findByTestId('dashboard-continue-learning-link');
    expect(continueLink).toHaveAttribute('href', '/student/learn/c-1');
    // Upcoming exam start link points at /student/exams/<examId>/take.
    const examLink = await screen.findByTestId('dashboard-exam-start-link');
    expect(examLink).toHaveAttribute('href', '/student/exams/e-1/take');
    // Header Exams button navigates to /student/exams (route, not full URL).
    const headerLink = await screen.findByTestId('dashboard-header-exams-link');
    expect(headerLink).toHaveAttribute('href', '/student/exams');
    // Click resolves without error.
    await user.click(headerLink);
    expect(headerLink).toHaveAttribute('href', '/student/exams');
  });
});

// ---------------------------------------------------------------------------
// IT-DASH-002: analytics error path
// ---------------------------------------------------------------------------
describe('IT-DASH-002: DashboardPage renders the analytics error block when the analytics API fails', () => {
  beforeEach(() => {
    seedStudent();
    localStorage.clear();
    mockGet.mockReset();
    mockGet.mockImplementation((url: string) => {
      if (url.includes('/api/analytics/users/')) {
        // Analytics failure → isError.
        return Promise.reject(new Error('Analytics service down'));
      }
      if (url.includes('/api/analytics/leaderboard/me')) {
        return Promise.resolve({
          data: { success: true, message: 'OK', data: myRank, timestamp: '2026-10-04T00:00:00Z' },
        });
      }
      if (url.includes('/api/v1/courses/enrollments/me')) {
        return Promise.resolve({ data: [enrollment] });
      }
      if (url === '/api/exams' || url.startsWith('/api/exams')) {
        return Promise.resolve({
          data: { success: true, message: 'OK', data: [exam], timestamp: '2026-10-04T00:00:00Z' },
        });
      }
      if (url === '/api/attempts' || url.startsWith('/api/attempts')) {
        return Promise.resolve({
          data: {
            success: true,
            message: 'OK',
            data: [attempt],
            timestamp: '2026-10-04T00:00:00Z',
          },
        });
      }
      return Promise.reject(new Error('Unexpected URL ' + url));
    });
  });

  it('should render the analytics-error block (data-testid="dashboard-analytics-error") and still render the greeting and continue-learning', async () => {
    renderPage();
    await waitFor(() => {
      expect(screen.getByTestId('dashboard-analytics-error')).toBeInTheDocument();
    });
    expect(screen.getByText('Failed to load')).toBeInTheDocument();
    // Greeting still renders with the seeded name.
    expect(screen.getByTestId('dashboard-greeting')).toHaveTextContent('Alice Student');
    // Continue-learning still renders from the enrollment data.
    expect(await screen.findByTestId('dashboard-continue-learning-link')).toBeInTheDocument();
  });
});
