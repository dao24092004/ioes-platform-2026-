/** Wave 2A — Integration: EnrollmentPage (student) */
import '@testing-library/jest-dom/vitest';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

// i18next mock — keys used by EnrollmentPage + StudentLayout sidebar
// (StudentLayout is rendered as the page's outer wrapper).
vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string, opts?: Record<string, unknown>) => {
      const map: Record<string, string> = {
        // Page keys
        'student.enrollment.title': 'Enrollment',
        'student.enrollment.subtitle': 'Your enrollments',
        'student.enrollment.course': 'Course',
        'student.enrollment.status': 'Status',
        // enrollmentApi.*
        'enrollmentApi.progress': 'Progress',
        'enrollmentApi.enrolledAt': 'Enrolled',
        'enrollmentApi.lastAccessed': 'Last accessed',
        'enrollmentApi.cancel': 'Cancel',
        'enrollmentApi.cancelConfirm': 'Are you sure you want to cancel?',
        'enrollmentApi.continue': 'Continue',
        'enrollmentApi.noEnrollments': 'No enrollments yet',
        'enrollmentApi.browseCourses': 'Browse courses',
        'enrollmentApi.status.active': 'Active',
        'enrollmentApi.status.completed': 'Completed',
        'enrollmentApi.status.cancelled': 'Cancelled',
        'enrollmentApi.status.expired': 'Expired',
        'enrollmentApi.filter.all': 'All',
        'enrollmentApi.filter.active': 'Active',
        'enrollmentApi.filter.completed': 'Completed',
        // common.*
        'common.cancel': 'Cancel',
        'common.loadError': 'Failed to load',
        // StudentLayout nav keys
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

// Mock the API boundary — EnrollmentPage uses content-api.listMyEnrollments
// (no envelope) and content-api.cancelEnrollment (no envelope).
const { mockGet, mockDelete } = vi.hoisted(() => ({
  mockGet: vi.fn(),
  mockDelete: vi.fn(),
}));
vi.mock('@/config/api.config', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/config/api.config')>();
  return {
    ...actual,
    apiClient: { get: mockGet, post: vi.fn(), patch: vi.fn(), delete: mockDelete, put: vi.fn() },
  };
});

// jsdom polyfills (StudentLayout → Header uses IntersectionObserver).
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
import EnrollmentPage from '@/pages/student/EnrollmentPage';

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
      <MemoryRouter initialEntries={['/student/enrollment']}>
        <EnrollmentPage />
      </MemoryRouter>
    </QueryClientProvider>
  );
}

// Fixtures
const baseCourse = {
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

const activeEnrollment = {
  enrollment: {
    id: 'en-1',
    courseId: 'c-1',
    userId: 'u-1',
    status: 'active' as const,
    progressPercent: 50,
    enrolledAt: '2026-09-01T00:00:00Z',
    completedAt: null,
    lastAccessedAt: '2026-10-01T00:00:00Z',
  },
  course: baseCourse,
};

const completedEnrollment = {
  enrollment: {
    id: 'en-2',
    courseId: 'c-2',
    userId: 'u-1',
    status: 'completed' as const,
    progressPercent: 100,
    enrolledAt: '2026-08-01T00:00:00Z',
    completedAt: '2026-09-15T00:00:00Z',
    lastAccessedAt: '2026-09-15T00:00:00Z',
  },
  course: { ...baseCourse, id: 'c-2', title: 'Geometry', slug: 'geometry' },
};

// ---------------------------------------------------------------------------
// IT-ENROLL-001: empty-state path
// ---------------------------------------------------------------------------
describe('IT-ENROLL-001: EnrollmentPage renders the empty state and the Browse courses link', () => {
  beforeEach(() => {
    seedStudent();
    localStorage.clear();
    mockGet.mockReset();
    mockDelete.mockReset();
    mockGet.mockResolvedValue({ data: [] });
  });

  it('should show the no-enrollments message and the browse-courses link when the list is empty', async () => {
    renderPage();
    await waitFor(() => {
      expect(screen.getByText('No enrollments yet')).toBeInTheDocument();
    });
    // Browse link is in the empty-state row.
    const browseLinks = screen.getAllByRole('link', { name: 'Browse courses' });
    expect(browseLinks.length).toBeGreaterThan(0);
    expect(browseLinks[0]).toHaveAttribute('href', '/student/courses');
  });
});

// ---------------------------------------------------------------------------
// IT-ENROLL-002: mixed enrollments + two-step cancel confirmation
// ---------------------------------------------------------------------------
describe('IT-ENROLL-002: EnrollmentPage renders mixed enrollments and the cancel button shows a confirm step before firing DELETE', () => {
  beforeEach(() => {
    seedStudent();
    localStorage.clear();
    mockGet.mockReset();
    mockDelete.mockReset();
    mockGet.mockResolvedValue({ data: [activeEnrollment, completedEnrollment] });
    mockDelete.mockResolvedValue({});
  });

  it('should render a Continue link per row and the two-step cancel confirmation (first click reveals confirm block, second fires DELETE)', async () => {
    const user = userEvent.setup();
    renderPage();

    await waitFor(() => {
      expect(screen.getByText('Algebra 101')).toBeInTheDocument();
    });

    // Two rows × one Continue link each.
    const continueLinks = screen.getAllByRole('link', { name: 'Continue' });
    expect(continueLinks).toHaveLength(2);
    expect(continueLinks[0]).toHaveAttribute('href', '/student/learn/c-1');
    // Two Cancel buttons (initial state — no confirm shown).
    const cancelButtons = screen.getAllByTestId('enrollment-cancel-button');
    expect(cancelButtons).toHaveLength(2);

    // First click on Cancel (first row) — does NOT call DELETE yet.
    await user.click(cancelButtons[0]);

    // Confirm block visible for the first row.
    await waitFor(() => {
      expect(screen.getByTestId('enrollment-cancel-confirm')).toBeInTheDocument();
    });
    expect(screen.getByText('Are you sure you want to cancel?')).toBeInTheDocument();
    expect(mockDelete).not.toHaveBeenCalled();

    // Second click on the Confirm button — fires DELETE on the first row's course.
    const confirmButton = screen.getByTestId('enrollment-cancel-confirm-button');
    await user.click(confirmButton);

    await waitFor(() => {
      expect(mockDelete).toHaveBeenCalledTimes(1);
    });
    expect(mockDelete).toHaveBeenCalledWith('/api/v1/courses/c-1/enrollment');
  });
});
