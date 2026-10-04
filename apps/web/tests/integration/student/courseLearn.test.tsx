/** Wave 2A — Integration: CourseLearnPage (student) */
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
        'student.learn.lesson': 'Lesson',
        'student.learn.of': 'of',
        'student.learn.current': 'current',
        'student.learn.backToCourse': 'Back to course',
        'student.learn.actions.nextLesson': 'Next lesson',
        // student.courseDetail.*
        'student.courseDetail.lessonsCount': '{count} lessons',
        'student.courseDetail.minutes': 'min',
        // courseApi.*
        'courseApi.noChapters': 'No chapters yet',
        'courseApi.noLessons': 'No lessons in this chapter',
        'courseApi.selectLesson': 'Select a lesson to start',
        'courseApi.noContentUrl': 'No content URL',
        'courseApi.openContent': 'Open content',
        'courseApi.lessonType.video': 'Video',
        'courseApi.lessonType.document': 'Document',
        'courseApi.lessonType.quiz': 'Quiz',
        'courseApi.lessonType.assignment': 'Assignment',
        'courseApi.lessonType.live': 'Live',
        'courseApi.notFound.title': 'Course not found',
        'courseApi.notFound.description': 'This course does not exist or is not available',
        'courseApi.notFound.back': 'Back to courses',
        // enrollmentApi.*
        'enrollmentApi.progress': 'Progress',
        'enrollmentApi.progressOf': '{done}/{total} lessons',
        'enrollmentApi.lockedTitle': 'Locked lesson',
        'enrollmentApi.lockedDescription': 'Enroll to view this lesson',
        'enrollmentApi.markComplete': 'Mark complete',
        'enrollmentApi.completedLesson': 'Completed',
        'enrollmentApi.enroll': 'Enroll',
        'enrollmentApi.enrolling': 'Enrolling…',
        'enrollmentApi.paidNotice': 'Payment is not yet supported',
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
const { mockGet, mockPut, mockPost } = vi.hoisted(() => ({
  mockGet: vi.fn(),
  mockPut: vi.fn(),
  mockPost: vi.fn(),
}));
vi.mock('@/config/api.config', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/config/api.config')>();
  return {
    ...actual,
    apiClient: { get: mockGet, post: mockPost, patch: vi.fn(), delete: vi.fn(), put: mockPut },
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
import CourseLearnPage from '@/pages/student/CourseLearnPage';

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

function renderPage(courseId = 'c-1', lessonId?: string) {
  const path = lessonId
    ? `/student/learn/${courseId}?lesson=${lessonId}`
    : `/student/learn/${courseId}`;
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={[path]}>
        <Routes>
          <Route path="/student/learn/:courseId" element={<CourseLearnPage />} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>
  );
}

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
  ],
};

const enrolledState = {
  enrolled: true,
  enrollment: {
    id: 'en-1',
    courseId: 'c-1',
    userId: 'u-1',
    status: 'active' as const,
    progressPercent: 0,
    enrolledAt: '2026-09-01T00:00:00Z',
    completedAt: null,
    lastAccessedAt: '2026-10-01T00:00:00Z',
  },
  completedLessonIds: [],
};

const notEnrolledState = {
  enrolled: false,
  enrollment: null,
  completedLessonIds: [],
};

function setupEnrolledMocks(): void {
  mockGet.mockReset();
  mockPut.mockReset();
  mockPost.mockReset();
  mockGet.mockImplementation((url: string) => {
    if (url.includes('/api/v1/courses/c-1/detail')) return Promise.resolve({ data: detail });
    if (url.includes('/api/v1/courses/c-1/enrollment'))
      return Promise.resolve({ data: enrolledState });
    return Promise.resolve({ data: null });
  });
  // Mark complete → return updated state with the lesson in completedLessonIds.
  mockPut.mockImplementation(async (_url: string, body: { completed: boolean }) => {
    const next = body.completed ? ['l-1'] : [];
    return Promise.resolve({
      data: {
        enrolled: true,
        enrollment: enrolledState.enrollment,
        completedLessonIds: next,
      },
    });
  });
}

function setupNotEnrolledMocks(): void {
  mockGet.mockReset();
  mockPut.mockReset();
  mockPost.mockReset();
  mockGet.mockImplementation((url: string) => {
    if (url.includes('/api/v1/courses/c-1/detail')) return Promise.resolve({ data: detail });
    if (url.includes('/api/v1/courses/c-1/enrollment'))
      return Promise.resolve({ data: notEnrolledState });
    return Promise.resolve({ data: null });
  });
}

// ---------------------------------------------------------------------------
// IT-LEARN-001: enrolled — sidebar + first lesson + Mark complete button
// ---------------------------------------------------------------------------
describe('IT-LEARN-001: CourseLearnPage renders the sidebar (chapter + lessons) and the Mark complete button for an enrolled student', () => {
  beforeEach(() => {
    seedStudent();
    localStorage.clear();
    setupEnrolledMocks();
  });

  it('should render the back-to-course link, two lesson entries, and the Mark complete button', async () => {
    renderPage();
    // Back-to-course link.
    const backLink = await screen.findByTestId('learn-back-to-course');
    expect(backLink).toHaveAttribute('href', '/student/courses/c-1');
    // Both lesson entries in the sidebar.
    await waitFor(() => {
      expect(screen.getByTestId('learn-lesson-l-1')).toBeInTheDocument();
      expect(screen.getByTestId('learn-lesson-l-2')).toBeInTheDocument();
    });
    // The Mark complete button (the first lesson is active by default).
    const markComplete = await screen.findByTestId('learn-mark-complete-button');
    expect(markComplete).toHaveTextContent('Mark complete');
  });
});

// ---------------------------------------------------------------------------
// IT-LEARN-002: Mark complete fires PUT with the right URL + body
// ---------------------------------------------------------------------------
describe('IT-LEARN-002: CourseLearnPage fires PUT /api/v1/courses/:c/lessons/:l/progress on Mark complete click', () => {
  beforeEach(() => {
    seedStudent();
    localStorage.clear();
    setupEnrolledMocks();
  });

  it('should call apiClient.put with the correct URL and { completed: true } and swap the button label to Completed', async () => {
    const user = userEvent.setup();
    renderPage('c-1', 'l-1');

    const markComplete = await screen.findByTestId('learn-mark-complete-button');
    await user.click(markComplete);

    await waitFor(() => {
      expect(mockPut).toHaveBeenCalledWith('/api/v1/courses/c-1/lessons/l-1/progress', {
        completed: true,
      });
    });
  });
});

// ---------------------------------------------------------------------------
// IT-LEARN-003: not enrolled + non-preview lesson → locked screen
// ---------------------------------------------------------------------------
describe('IT-LEARN-003: CourseLearnPage shows the locked lesson screen with Enroll button when the student is not enrolled and the lesson is not preview', () => {
  beforeEach(() => {
    seedStudent();
    localStorage.clear();
    setupNotEnrolledMocks();
  });

  it('should render the locked title and the Enroll button when navigating to a non-preview lesson without enrollment', async () => {
    renderPage('c-1', 'l-2');
    await waitFor(() => {
      expect(screen.getByText('Locked lesson')).toBeInTheDocument();
    });
    // Enroll button has data-testid="learn-locked-enroll-button".
    const enrollBtn = await screen.findByTestId('learn-locked-enroll-button');
    expect(enrollBtn).toHaveTextContent('Enroll');
  });
});
