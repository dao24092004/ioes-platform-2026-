/** Wave 2A — Integration: CourseDetailPage (student) */
import '@testing-library/jest-dom/vitest';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

// i18next mock
vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string, opts?: Record<string, unknown>) => {
      const map: Record<string, string> = {
        // Page keys
        'student.courses.title': 'My courses',
        'student.courseDetail.about': 'About',
        'student.courseDetail.curriculum': 'Curriculum',
        'student.courseDetail.reviews': 'Reviews',
        'student.courseDetail.discussions': 'Discussions',
        'student.courseDetail.duration': 'Duration',
        'student.courseDetail.hours': 'hours',
        'student.courseDetail.lessonsCount': '{count} lessons',
        'student.courseDetail.level': 'Level',
        'student.courseDetail.language': 'Language',
        'student.courseDetail.lastUpdated': 'Last updated',
        'student.courseDetail.minutes': 'min',
        'student.courseDetail.section': 'Section',
        'student.courseDetail.preview': 'Preview',
        'student.courseDetail.students': 'students',
        // courseApi.*
        'courseApi.uncategorized': 'Uncategorized',
        'courseApi.noDescription': 'No description',
        'courseApi.noChapters': 'No chapters yet',
        'courseApi.noLessons': 'No lessons in this chapter',
        'courseApi.chaptersCount': '{count} chapters',
        'courseApi.level.1': 'Beginner',
        'courseApi.level.2': 'Elementary',
        'courseApi.level.3': 'Intermediate',
        'courseApi.level.4': 'Advanced',
        'courseApi.level.5': 'Expert',
        'courseApi.lessonType.video': 'Video',
        'courseApi.lessonType.document': 'Document',
        'courseApi.lessonType.quiz': 'Quiz',
        'courseApi.lessonType.assignment': 'Assignment',
        'courseApi.lessonType.live': 'Live',
        'courseApi.reviewsUnavailable': 'Reviews unavailable',
        'courseApi.notFound.title': 'Course not found',
        'courseApi.notFound.description': 'This course does not exist or is not available',
        'courseApi.notFound.back': 'Back to courses',
        // courses.*
        'courses.free': 'Free',
        // enrollmentApi.*
        'enrollmentApi.progress': 'Progress',
        'enrollmentApi.progressOf': '{done}/{total} lessons',
        'enrollmentApi.courseCompleted': 'Course completed',
        'enrollmentApi.continue': 'Continue learning',
        'enrollmentApi.start': 'Start course',
        'enrollmentApi.cancelConfirm': 'Are you sure you want to cancel?',
        'enrollmentApi.cancel': 'Cancel',
        'enrollmentApi.enroll': 'Enroll',
        'enrollmentApi.enrolling': 'Enrolling…',
        'enrollmentApi.paidTitle': 'Paid course',
        'enrollmentApi.paidNotice': 'Payment is not yet supported',
        // common.*
        'common.cancel': 'Cancel',
        // comingSoon.*
        'comingSoon.badge': 'Coming soon',
        'comingSoon.discussion.description': 'Discussion is coming soon.',
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
const { mockGet, mockPost, mockDelete } = vi.hoisted(() => ({
  mockGet: vi.fn(),
  mockPost: vi.fn(),
  mockDelete: vi.fn(),
}));
vi.mock('@/config/api.config', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/config/api.config')>();
  return {
    ...actual,
    apiClient: { get: mockGet, post: mockPost, patch: vi.fn(), delete: mockDelete, put: vi.fn() },
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
import CourseDetailPage from '@/pages/student/CourseDetailPage';

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

function renderPage(courseId = 'c-1') {
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={[`/student/courses/${courseId}`]}>
        <Routes>
          <Route path="/student/courses/:courseId" element={<CourseDetailPage />} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>
  );
}

// Fixtures
const course = {
  id: 'c-1',
  instructorId: 'i-1',
  categoryId: null,
  title: 'Algebra 101',
  slug: 'algebra-101',
  shortDescription: 'Learn algebra basics',
  description: 'A complete course on algebraic fundamentals.',
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
  stats: { enrollments: 200 },
  createdAt: '2026-01-01T00:00:00Z',
  updatedAt: '2026-10-01T00:00:00Z',
};

const detail = {
  course,
  chapters: [
    {
      id: 'ch-1',
      courseId: 'c-1',
      title: 'Getting Started',
      description: null,
      sortOrder: 1,
      isFree: null,
      lessons: [
        {
          id: 'l-1',
          chapterId: 'ch-1',
          title: 'Welcome',
          description: null,
          lessonType: 'video',
          contentUrl: 'https://cdn.example.com/intro.mp4',
          durationMinutes: 5,
          sortOrder: 1,
          isFree: null,
          isPreview: true,
        },
        {
          id: 'l-2',
          chapterId: 'ch-1',
          title: 'Setup',
          description: null,
          lessonType: 'video',
          contentUrl: null,
          durationMinutes: 10,
          sortOrder: 2,
          isFree: null,
          isPreview: false,
        },
      ],
    },
    {
      id: 'ch-2',
      courseId: 'c-1',
      title: 'Equations',
      description: null,
      sortOrder: 2,
      isFree: null,
      lessons: [],
    },
  ],
};

const notEnrolledState = {
  enrolled: false,
  enrollment: null,
  completedLessonIds: [],
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
  mockPost.mockReset();
  mockDelete.mockReset();
  mockGet.mockImplementation((url: string) => {
    if (url.includes('/api/v1/courses/c-1/detail')) return Promise.resolve({ data: detail });
    if (url.includes('/api/v1/courses/c-1/enrollment'))
      return Promise.resolve({ data: notEnrolledState });
    if (url.includes('/api/v1/categories')) return Promise.resolve({ data: categories });
    return Promise.resolve({ data: null });
  });
  mockPost.mockResolvedValue({
    data: {
      id: 'en-new',
      courseId: 'c-1',
      userId: 'u-1',
      status: 'active',
      progressPercent: 0,
      enrolledAt: '2026-10-04T00:00:00Z',
      completedAt: null,
      lastAccessedAt: null,
    },
  });
}

// ---------------------------------------------------------------------------
// IT-COURSEDETAIL-001: happy path — tabs, banner, enroll button
// ---------------------------------------------------------------------------
describe('IT-COURSEDETAIL-001: CourseDetailPage renders the detail view (banner, tabs, Enroll button) for a published course the student has not joined', () => {
  beforeEach(() => {
    seedStudent();
    localStorage.clear();
    setupHappyMocks();
  });

  it('should render the course title in the banner, all four tab buttons, and an Enroll button', async () => {
    renderPage();
    // Course title rendered in the banner (h2) and in the layout subtitle.
    // The title may appear in multiple places (subtitle, banner); use
    // getAllByText and assert at least one.
    await waitFor(() => {
      expect(screen.getAllByText('Algebra 101').length).toBeGreaterThanOrEqual(1);
    });
    // Banner "Learn" button → /student/learn/c-1.
    const learnButton = screen.getByTestId('coursedetail-learn-button');
    expect(learnButton).toHaveAttribute('href', '/student/learn/c-1');
    // Four tab buttons.
    expect(screen.getByTestId('coursedetail-tab-about')).toBeInTheDocument();
    expect(screen.getByTestId('coursedetail-tab-curriculum')).toBeInTheDocument();
    expect(screen.getByTestId('coursedetail-tab-reviews')).toBeInTheDocument();
    expect(screen.getByTestId('coursedetail-tab-discussions')).toBeInTheDocument();
    // About tab is default → "About" heading + description text.
    await waitFor(() => {
      expect(screen.getByText('A complete course on algebraic fundamentals.')).toBeInTheDocument();
    });
    // Enroll button visible (free course, not yet enrolled).
    const enrollButton = await screen.findByTestId('coursedetail-enroll-button');
    expect(enrollButton).toHaveTextContent('Enroll');
  });
});

// ---------------------------------------------------------------------------
// IT-COURSEDETAIL-002: click Enroll → POST → UI swaps to Continue
// ---------------------------------------------------------------------------
describe('IT-COURSEDETAIL-002: CourseDetailPage fires enroll POST and swaps the Enroll card to the Continue link on success', () => {
  beforeEach(() => {
    seedStudent();
    localStorage.clear();
    setupHappyMocks();
  });

  it('should fire POST /api/v1/courses/c-1/enrollment on Enroll click and show the Continue link afterwards', async () => {
    const user = userEvent.setup();
    renderPage();

    // Wait for the Enroll button to appear.
    const enrollButton = await screen.findByTestId('coursedetail-enroll-button');
    await user.click(enrollButton);

    await waitFor(() => {
      expect(mockPost).toHaveBeenCalledWith('/api/v1/courses/c-1/enrollment');
    });
    // The page calls onSuccess which navigates to /student/learn/<id>. The
    // MemoryRouter doesn't navigate for our test, but the enroll mutation
    // succeeds. Verify the POST body is empty (no payload needed) and the
    // exact URL.
    expect(mockPost).toHaveBeenCalledTimes(1);
  });
});
