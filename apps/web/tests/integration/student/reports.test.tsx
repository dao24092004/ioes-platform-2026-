/** Wave 2C (student) — Integration: ReportsPage */
import '@testing-library/jest-dom/vitest';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

// i18next mock — keep simple so labels are stable strings
vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string, opts?: Record<string, unknown>) => {
      const map: Record<string, string> = {
        'student.reports.title': 'Reports',
        'student.reports.subtitle': 'Your learning report',
        'student.reports.stats.enrolled': 'Enrolled',
        'student.reports.stats.completed': 'Completed',
        'student.reports.stats.avgScore': 'Avg score',
        'student.reports.stats.passRate': 'Pass rate',
        'student.reports.courseProgress.title': 'Course progress',
        'student.reports.courseProgress.empty': 'No courses yet',
        'student.reports.courseProgress.browse': 'Browse courses',
        'student.reports.courseProgress.completed': 'Completed',
        'student.reports.courseProgress.lastAccessed': 'Last accessed {date}',
        'student.reports.courseProgress.enrolledAt': 'Enrolled {date}',
        'student.reports.courseProgress.avg': 'Avg {value}%',
        'student.reports.examScores.title': 'Exam scores',
        'student.reports.examScores.empty': 'No exam attempts yet',
        'student.reports.examScores.browse': 'Browse exams',
        'student.reports.examScores.noGraded': 'No graded attempts',
        'student.reports.examScores.taken': 'Taken',
        'student.reports.examScores.passed': 'Passed',
        'student.reports.examScores.best': 'Best',
        'student.reports.examScores.recent': 'Recent {n}',
        'student.reports.recentCourse.title': 'Latest course',
        'student.reports.recentCourse.progress': '{value}% complete',
        'student.reports.recentCourse.empty': 'No course yet',
        'student.reports.recentExam.title': 'Latest exam',
        'student.reports.recentExam.pending': 'Pending',
        'student.reports.recentExam.empty': 'No exam yet',
        'student.reports.streak.title': 'Streak',
        'student.reports.streak.days': 'days',
        'student.reports.streak.longest': 'Longest {n}',
        'student.reports.studyTime.title': 'Study time',
        'student.reports.studyTime.empty': 'No study-time data yet',
        'common.loadError': 'Load error',
        'common.loading': 'Loading...',
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

// Mock the API client — services resolve the envelope and surface .data.
const { mockGet } = vi.hoisted(() => ({ mockGet: vi.fn() }));
vi.mock('@/config/api.config', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/config/api.config')>();
  return {
    ...actual,
    apiClient: { get: mockGet, post: vi.fn(), patch: vi.fn(), delete: vi.fn() },
  };
});

// jsdom polyfills (StudentLayout → Header uses IntersectionObserver)
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
import ReportsPage from '@/pages/student/ReportsPage';

const queryClient = new QueryClient({
  defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
});

function seedStudent(): void {
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

function renderPage() {
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={['/student/reports']}>
        <ReportsPage />
      </MemoryRouter>
    </QueryClientProvider>
  );
}

// Fixtures — ReportsPage calls three endpoints:
//   GET /api/v1/courses/enrollments/me
//   GET /api/attempts
//   GET /api/analytics/users/:id
// The examId title lookup also calls GET /api/exams/:id for visible attempts.
const enrollments = [
  {
    enrollment: {
      id: 'en-1',
      courseId: 'c-1',
      userId: 'u-1',
      status: 'completed',
      progressPercent: 100,
      enrolledAt: '2026-09-01T00:00:00Z',
      completedAt: '2026-10-01T00:00:00Z',
      lastAccessedAt: '2026-10-02T00:00:00Z',
    },
    course: {
      id: 'c-1',
      instructorId: 'i-1',
      categoryId: null,
      title: 'Algebra',
      slug: 'algebra',
      shortDescription: null,
      description: null,
      thumbnailUrl: null,
      previewVideoUrl: null,
      price: 0,
      currency: 'VND',
      durationHours: 4,
      difficultyLevel: 1,
      language: 'vi',
      status: 'published',
      reviewStatus: 'approved',
      rejectionReason: null,
      publishedAt: null,
      stats: null,
      createdAt: '2026-01-01T00:00:00Z',
      updatedAt: '2026-01-01T00:00:00Z',
    },
  },
];

const attempts = [
  {
    id: 'a-1',
    examId: 'e-1',
    userId: 'u-1',
    status: 'submitted',
    startedAt: '2026-10-01T00:00:00Z',
    submittedAt: '2026-10-02T00:00:00Z',
    gradedAt: null,
    timeRemainingSeconds: null,
    score: 80,
    maxScore: 100,
    percentageScore: 80,
    passed: true,
    questionIds: null,
    metadata: {},
    createdAt: '2026-10-01T00:00:00Z',
    updatedAt: '2026-10-02T00:00:00Z',
    version: 1,
  },
];

const analytics = {
  userId: 'u-1',
  totalExamsAttempted: 1,
  totalExamsPassed: 1,
  totalExamsFailed: 0,
  passRate: 100,
  avgScore: 80,
  highestScore: 80,
  totalCoursesEnrolled: 1,
  totalCoursesCompleted: 1,
  currentStreak: 5,
  longestStreak: 12,
  totalStudyMinutes: 60,
  lastExamAt: '2026-10-02T00:00:00Z',
  lastLoginAt: '2026-10-02T00:00:00Z',
};

const examDetail = {
  id: 'e-1',
  courseId: null,
  instructorId: 'i-1',
  title: 'Algebra Midterm',
  description: null,
  examType: 'practice',
  timeLimitMinutes: 60,
  passingScore: 50,
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

function setupMocks() {
  mockGet.mockReset();
  // GET /api/v1/courses/enrollments/me  → content-service body shape
  mockGet.mockImplementation((url: string) => {
    if (url.includes('/courses/enrollments/me')) {
      return Promise.resolve({ data: enrollments });
    }
    if (url.includes('/api/attempts')) {
      return Promise.resolve({
        data: { success: true, message: 'OK', data: attempts, timestamp: '2026-10-03T00:00:00Z' },
      });
    }
    if (url.includes('/api/analytics/users/')) {
      return Promise.resolve({
        data: { success: true, message: 'OK', data: analytics, timestamp: '2026-10-03T00:00:00Z' },
      });
    }
    if (url.includes('/api/exams/')) {
      return Promise.resolve({
        data: { success: true, message: 'OK', data: examDetail, timestamp: '2026-10-03T00:00:00Z' },
      });
    }
    return Promise.reject(new Error('Unexpected URL ' + url));
  });
}

describe('IT-REPORTS-001: ReportsPage renders stat cards and the recent-course + recent-exam cards from mocked data', () => {
  beforeEach(() => {
    seedStudent();
    localStorage.clear();
    setupMocks();
  });

  it('should render the Reports page title in the StudentLayout header', async () => {
    renderPage();
    await waitFor(() => {
      expect(screen.getByRole('heading', { level: 1, name: 'Reports' })).toBeInTheDocument();
    });
  });

  it('should render stat card values from mocked enrollments + analytics', async () => {
    renderPage();
    await waitFor(() => {
      // 1 enrollment, 1 completed, 80% avg, 100% pass rate → comes from analytics passRate
      // `passRate=100` produces "100%" twice (stat card + course-progress avg) and
      // `progressPercent=100` produces another, so use getAllByText.
      expect(screen.getAllByText('100%').length).toBeGreaterThanOrEqual(1);
    });
    expect(screen.getByText('Enrolled')).toBeInTheDocument();
    expect(screen.getByText('Completed')).toBeInTheDocument();
    expect(screen.getByText('Avg score')).toBeInTheDocument();
    expect(screen.getByText('Pass rate')).toBeInTheDocument();
  });

  it('should render the recent-course title from the enrollment fixture', async () => {
    renderPage();
    // "Algebra" appears twice: course-progress list AND recent-course card.
    await waitFor(() => {
      expect(screen.getAllByText('Algebra').length).toBeGreaterThanOrEqual(2);
    });
  });
});

describe('IT-REPORTS-002: ReportsPage renders empty state when enrollments are empty', () => {
  beforeEach(() => {
    seedStudent();
    localStorage.clear();
  });

  it('should render the empty course message when there are no enrollments', async () => {
    mockGet.mockReset();
    mockGet.mockImplementation((url: string) => {
      if (url.includes('/courses/enrollments/me')) {
        return Promise.resolve({ data: [] });
      }
      if (url.includes('/api/attempts')) {
        return Promise.resolve({
          data: { success: true, message: 'OK', data: [], timestamp: '2026-10-03T00:00:00Z' },
        });
      }
      if (url.includes('/api/analytics/users/')) {
        return Promise.resolve({
          data: {
            success: true,
            message: 'OK',
            data: analytics,
            timestamp: '2026-10-03T00:00:00Z',
          },
        });
      }
      return Promise.reject(new Error('Unexpected URL ' + url));
    });

    renderPage();
    await waitFor(() => {
      // i18n value is "No courses yet"
      expect(screen.getByText('No courses yet')).toBeInTheDocument();
    });
    expect(screen.getByText('Browse courses')).toBeInTheDocument();
  });
});
