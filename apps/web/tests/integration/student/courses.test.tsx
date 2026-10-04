/** Wave 2A — Integration: CoursesPage (student) */
import '@testing-library/jest-dom/vitest';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

// i18next mock — keys used by CoursesPage + StudentLayout.
vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string, opts?: Record<string, unknown>) => {
      const map: Record<string, string> = {
        // Page keys
        'student.courses.title': 'My courses',
        'student.courses.browseAll': 'Browse all courses',
        'student.courses.searchPlaceholder': 'Search courses…',
        'student.search.title': 'Search',
        // enrollmentApi.*
        'enrollmentApi.catalog': 'Catalogue',
        'enrollmentApi.myCourses': 'My courses',
        'enrollmentApi.enrolled': 'Enrolled',
        'enrollmentApi.noEnrollments': 'No enrollments yet',
        'enrollmentApi.status.active': 'Active',
        'enrollmentApi.status.completed': 'Completed',
        'enrollmentApi.status.cancelled': 'Cancelled',
        'enrollmentApi.status.expired': 'Expired',
        // courseApi.*
        'courseApi.uncategorized': 'Uncategorized',
        'courseApi.noCourses': 'No courses found',
        'courseApi.level.1': 'Beginner',
        'courseApi.level.2': 'Elementary',
        'courseApi.level.3': 'Intermediate',
        'courseApi.level.4': 'Advanced',
        'courseApi.level.5': 'Expert',
        // courses.*
        'courses.coursesOf': 'courses',
        'courses.viewDetail': 'View detail',
        // student.courseDetail.students (count label).
        'student.courseDetail.students': 'students',
        // student.dashboard.viewAll.
        'student.dashboard.viewAll': 'View all',
        // student.courses.pagination.* (PaginationBar keys).
        'student.courses.pagination.range': '{from}-{to} of {total}',
        'student.courses.pagination.prev': 'Prev',
        'student.courses.pagination.next': 'Next',
        'student.courses.pagination.pageSize': 'Page size',
        'student.courses.pagination.perPage': '/ page',
        // common.*
        'common.loadError': 'Failed to load',
        // StudentLayout nav keys (subset).
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

// Mock the API boundary.
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
import CoursesPage from '@/pages/student/CoursesPage';

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
      <MemoryRouter initialEntries={['/student/courses']}>
        <CoursesPage />
      </MemoryRouter>
    </QueryClientProvider>
  );
}

const baseCourse = {
  instructorId: 'i-1',
  categoryId: null,
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
  stats: { enrollments: 100 },
  createdAt: '2026-01-01T00:00:00Z',
  updatedAt: '2026-01-01T00:00:00Z',
};

const course1 = {
  ...baseCourse,
  id: 'c-1',
  title: 'Algebra 101',
  slug: 'algebra-101',
  stats: { enrollments: 50 },
};

const course2 = {
  ...baseCourse,
  id: 'c-2',
  title: 'Geometry Foundations',
  slug: 'geometry',
  stats: { enrollments: 200 },
};

const coursePage = {
  data: [course1, course2],
  meta: { total: 2, page: 1, perPage: 6, totalPages: 1 },
};

const myEnrollment = {
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
  course: { ...baseCourse, id: 'c-1', title: 'Algebra 101', slug: 'algebra-101' },
};

const categories = [
  {
    id: 'cat-1',
    name: 'Math',
    slug: 'math',
    description: null,
    parentId: null,
    icon: null,
    sortOrder: 0,
  },
];

function setupHappyMocks(): void {
  mockGet.mockReset();
  mockGet.mockImplementation((url: string) => {
    if (url === '/api/v1/courses' || url.startsWith('/api/v1/courses?')) {
      return Promise.resolve({ data: coursePage });
    }
    if (url === '/api/v1/categories') {
      return Promise.resolve({ data: categories });
    }
    if (url === '/api/v1/courses/enrollments/me') {
      return Promise.resolve({ data: [myEnrollment] });
    }
    return Promise.reject(new Error('Unexpected URL ' + url));
  });
}

// ---------------------------------------------------------------------------
// IT-COURSES-001: happy path — catalogue + my-courses + pagination
// ---------------------------------------------------------------------------
describe('IT-COURSES-001: CoursesPage renders the catalogue heading, both course cards, the search input, and the my-courses section', () => {
  beforeEach(() => {
    seedStudent();
    localStorage.clear();
    setupHappyMocks();
  });

  it('should render catalogue heading, two course cards, search input, and the my-courses section with one enrollment row', async () => {
    renderPage();

    // Catalogue heading.
    await waitFor(() => {
      expect(screen.getByText('Catalogue')).toBeInTheDocument();
    });
    // Both catalogue courses rendered by title (catalogue has 2 courses,
    // my-enrollments has 1; Algebra 101 appears in both — use getAllByText).
    await waitFor(() => {
      expect(screen.getAllByText('Algebra 101').length).toBeGreaterThanOrEqual(1);
    });
    expect(screen.getByText('Geometry Foundations')).toBeInTheDocument();
    // Search input present.
    const searchInput = screen.getByTestId('courses-search-input');
    expect(searchInput).toBeInTheDocument();
    // Header search link points to /student/search.
    const searchLink = screen.getByTestId('courses-search-link');
    expect(searchLink).toHaveAttribute('href', '/student/search');
    // My-courses section heading.
    expect(screen.getByText('My courses', { selector: 'h2' })).toBeInTheDocument();
    // Each course card has a View detail button → link to /student/courses/<id>.
    const viewDetailLinks = screen.getAllByRole('link', { name: 'View detail' });
    expect(viewDetailLinks).toHaveLength(2);
    expect(viewDetailLinks[0]).toHaveAttribute('href', '/student/courses/c-1');
    expect(viewDetailLinks[1]).toHaveAttribute('href', '/student/courses/c-2');
    // PaginationBar range text (uses the i18n template {from}-{to} of {total}).
    expect(screen.getByText('1-2 of 2')).toBeInTheDocument();
  });
});

// ---------------------------------------------------------------------------
// IT-COURSES-002: error path
// ---------------------------------------------------------------------------
describe('IT-COURSES-002: CoursesPage renders the load-error block when the catalogue query errors', () => {
  beforeEach(() => {
    seedStudent();
    localStorage.clear();
    mockGet.mockReset();
    mockGet.mockImplementation((url: string) => {
      if (url === '/api/v1/courses' || url.startsWith('/api/v1/courses?')) {
        return Promise.reject(new Error('Catalogue 500'));
      }
      if (url === '/api/v1/categories') {
        return Promise.resolve({ data: categories });
      }
      if (url === '/api/v1/courses/enrollments/me') {
        return Promise.resolve({ data: [myEnrollment] });
      }
      return Promise.reject(new Error('Unexpected URL ' + url));
    });
  });

  it('should render the load-error message but still render the my-courses section', async () => {
    renderPage();
    await waitFor(() => {
      expect(screen.getByText('Failed to load')).toBeInTheDocument();
    });
    // My-courses section still rendered (enrollment query OK).
    await waitFor(() => {
      // Algebra 101 appears in the my-courses section link.
      expect(screen.getAllByText('Algebra 101').length).toBeGreaterThanOrEqual(1);
    });
  });
});
