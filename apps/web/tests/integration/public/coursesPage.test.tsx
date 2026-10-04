/** Batch Wave 1A — Integration: Courses (public list) + CourseDetailPage */
import '@testing-library/jest-dom/vitest';
import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { render, screen, waitFor, act, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useAuthStore } from '@/app/store/authStore';

// ---------------------------------------------------------------------------
// Mock BEFORE any import that triggers module-level side-effects.
// ---------------------------------------------------------------------------
// Mock the Header component so Courses/CourseDetailPage render without relying on
// the real Header's auth-dependent rendering. The auth state is controlled by
// useAuthStore.setState() in beforeEach/afterEach.
vi.mock('@/components/public/Header', () => ({
  default: function MockHeader() {
    return (
      <nav data-testid="mock-header">
        <a href="/">Home</a>
        <a href="/courses">Courses</a>
        <a href="/auth/login" data-testid="header-login-link">
          Đăng nhập
        </a>
        <a href="/auth/register">Đăng ký</a>
      </nav>
    );
  },
}));

vi.mock('@/config/api.config', () => ({
  apiClient: {
    get: vi.fn(),
    post: vi.fn(),
    patch: vi.fn(),
    delete: vi.fn(),
  },
  toApiError: (e: unknown) => e,
}));

// ---------------------------------------------------------------------------
// Import AFTER mocks.
// ---------------------------------------------------------------------------
import Courses from '@/pages/public/Courses';
import CourseDetailPage from '@/pages/public/CourseDetailPage';
import I18nProvider from '@/app/providers/I18nProvider';
import type { Course, CourseDetail, Category } from '@/services/api/content.api';
import { apiClient } from '@/config/api.config';

/** Build an apiClient.get implementation that returns different fixtures by URL.
 *  Keeps the helper local to this module so other test files are unaffected. */
function makeGetImpl(opts: {
  categories?: Category[];
  courses?: {
    data: Course[];
    meta: { total: number; page: number; perPage: number; totalPages: number };
  };
  detail?: CourseDetail;
}) {
  return (url: string) => {
    const u = String(url ?? '');
    if (u.includes('/api/v1/categories')) {
      return Promise.resolve({ data: opts.categories ?? [] });
    }
    if (u.includes('/detail')) {
      return Promise.resolve({ data: opts.detail });
    }
    if (u.includes('/api/v1/courses') && !u.includes('/detail')) {
      return Promise.resolve({
        data: opts.courses ?? { data: [], meta: { total: 0, page: 1, perPage: 9, totalPages: 1 } },
      });
    }
    return Promise.resolve({ data: null });
  };
}

// ---------------------------------------------------------------------------
// Fixture factories
// ---------------------------------------------------------------------------
const makeCourse = (overrides: Partial<Course> = {}): Course => ({
  id: 'c-1',
  instructorId: 'i-1',
  categoryId: 'cat-1',
  title: 'Test Course One',
  slug: 'test-course-one',
  shortDescription: 'A short description',
  description: 'Full course description',
  thumbnailUrl: null,
  previewVideoUrl: null,
  price: 0,
  currency: 'VND',
  durationHours: 10,
  difficultyLevel: 1,
  language: 'vi',
  status: 'published',
  reviewStatus: 'approved',
  rejectionReason: null,
  publishedAt: '2024-01-01T00:00:00Z',
  stats: { enrollments: 150 },
  createdAt: '2024-01-01T00:00:00Z',
  updatedAt: '2024-01-01T00:00:00Z',
  ...overrides,
});

const makeCategory = (overrides: Partial<Category> = {}): Category => ({
  id: 'cat-1',
  name: 'Programming',
  slug: 'programming',
  description: null,
  parentId: null,
  icon: null,
  sortOrder: 0,
  ...overrides,
});

const PAGE_SIZE = 9; // must match Courses.tsx PAGE_SIZE

const coursesPage = (total: number, overrides: Partial<Course> = {}) =>
  Array.from({ length: total }, (_, i) =>
    makeCourse({
      id: `c-${i + 1}`,
      slug: `course-${i + 1}`,
      title: `Course ${i + 1}`,
      ...overrides,
    })
  );

const makeDetail = (
  courseOverrides: Partial<Course> = {},
  chaptersOverrides: CourseDetail['chapters'] = []
): CourseDetail => ({
  course: makeCourse(courseOverrides),
  chapters: chaptersOverrides,
});

/** Fixture for CourseDetail used in chapter toggle tests. */
const makeChapterDetail = (): CourseDetail => ({
  course: makeCourse({ id: 'c-1', slug: 'test-course', title: 'Test Course One' }),
  chapters: [
    {
      id: 'ch-1',
      courseId: 'c-1',
      title: 'Chapter 1: Introduction',
      description: null,
      sortOrder: 1,
      isFree: null,
      lessons: [
        {
          id: 'l-1',
          chapterId: 'ch-1',
          title: 'Lesson 1.1',
          description: null,
          lessonType: 'video',
          contentUrl: null,
          durationMinutes: 10,
          sortOrder: 1,
          isFree: null,
          isPreview: null,
        },
        {
          id: 'l-2',
          chapterId: 'ch-1',
          title: 'Lesson 1.2',
          description: null,
          lessonType: 'video',
          contentUrl: null,
          durationMinutes: 15,
          sortOrder: 2,
          isFree: null,
          isPreview: null,
        },
      ],
    },
  ],
});

// ---------------------------------------------------------------------------
// Render helpers
// ---------------------------------------------------------------------------
const createQueryClient = () =>
  new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: 0 } } });

const renderCourses = (initialRoute = '/courses') => {
  const queryClient = createQueryClient();
  return render(
    <QueryClientProvider client={queryClient}>
      <I18nProvider>
        <MemoryRouter initialEntries={[initialRoute]}>
          <Routes>
            <Route path="/courses" element={<Courses />} />
            <Route path="/courses/:slug" element={<CourseDetailPage />} />
            <Route path="/auth/login" element={<div data-testid="login-page">LOGIN_PAGE</div>} />
            <Route
              path="/auth/register"
              element={<div data-testid="register-page">REGISTER_PAGE</div>}
            />
            <Route path="/student" element={<div data-testid="student-home">STUDENT_HOME</div>} />
            <Route
              path="/instructor"
              element={<div data-testid="instructor-home">INSTRUCTOR_HOME</div>}
            />
            <Route path="/admin" element={<div data-testid="admin-home">ADMIN_HOME</div>} />
          </Routes>
        </MemoryRouter>
      </I18nProvider>
    </QueryClientProvider>
  );
};

const setAuth = (authenticated: boolean) => {
  if (authenticated) {
    useAuthStore.setState({
      user: { id: 'u1', email: 'student@ioes.com', full_name: 'Student', role: 'student' as const },
      accessToken: 'fake-access-token',
      refreshToken: 'fake-refresh-token',
      isAuthenticated: true,
      isLoading: false,
    });
  } else {
    useAuthStore.setState({
      user: null,
      accessToken: null,
      refreshToken: null,
      isAuthenticated: false,
      isLoading: false,
    });
  }
};

beforeEach(() => {
  // Reset authStore to unauthenticated state before each test.
  // Use setAuth to avoid stale persisted state between tests.
  setAuth(false);
  vi.mocked(apiClient.get).mockReset();
});

afterEach(() => {
  vi.restoreAllMocks();
  vi.useRealTimers();
});

// ---------------------------------------------------------------------------
// COURSES — auth gate
// ---------------------------------------------------------------------------
describe('Courses — auth gate', () => {
  it('IT-CONTENT-API-001: should render LoginRequired card when user is not authenticated', async () => {
    // setAuth(false) is called in beforeEach, ensuring isAuthenticated=false.
    renderCourses('/courses');

    // Wait for the LoginRequired heading to appear.
    await waitFor(() => {
      expect(screen.getByText(/đăng nhập để xem|login required/i)).toBeInTheDocument();
    });

    // Find the LoginRequired CTA (not the MockHeader link).
    const loginLinks = screen.getAllByRole('link', { name: /đăng nhập/i });
    expect(loginLinks.length).toBeGreaterThan(0);
    // The CTA in LoginRequired card has the white-bg class; check at least one has the right href.
    const ctaLink = loginLinks.find((l) => l.getAttribute('href') === '/auth/login');
    expect(ctaLink).toBeDefined();
    expect(ctaLink).toHaveAttribute('href', '/auth/login');
  });

  it('IT-CONTENT-API-002: should render Catalog when user is authenticated (isAuthenticated + accessToken)', async () => {
    // Authenticated: setAuth(true) then mock API.
    vi.mocked(apiClient.get).mockImplementation(
      makeGetImpl({
        categories: [makeCategory()],
        courses: {
          data: [makeCourse()],
          meta: { total: 1, page: 1, perPage: PAGE_SIZE, totalPages: 1 },
        },
      })
    );

    setAuth(true);
    renderCourses('/courses');

    // Wait for course card to appear (Catalog renders when authenticated).
    await waitFor(() => {
      expect(screen.getByText('Test Course One')).toBeInTheDocument();
    });

    // Verify search input is visible (part of Catalog, not LoginRequired).
    expect(screen.getByPlaceholderText(/tìm kiếm|search/i)).toBeInTheDocument();
  });
});

// ---------------------------------------------------------------------------
// COURSES — loading / error / empty states
// ---------------------------------------------------------------------------
describe('Courses — data states', () => {
  it('IT-CONTENT-API-003: should show loading spinner while courses are being fetched', async () => {
    // Never resolve → React Query stays in loading state.
    vi.mocked(apiClient.get).mockReturnValue(
      new Promise(() => {}) as unknown as ReturnType<typeof apiClient.get>
    );

    setAuth(true);
    renderCourses('/courses');

    // Spinner should be visible immediately before API resolves.
    const spinner = document.querySelector('.animate-spin');
    expect(spinner).toBeInTheDocument();
  });

  it('IT-CONTENT-API-004: should show error message when the API call fails', async () => {
    vi.mocked(apiClient.get).mockRejectedValue(new Error('network error'));

    setAuth(true);
    renderCourses('/courses');

    await waitFor(() => {
      const errorText = document.querySelector('.text-red-600, .text-red-400');
      expect(errorText).toBeInTheDocument();
    });
  });

  it('IT-CONTENT-API-005: should show empty state when no courses are returned', async () => {
    vi.mocked(apiClient.get).mockImplementation(
      makeGetImpl({
        categories: [],
      })
    );

    setAuth(true);
    renderCourses('/courses');

    await waitFor(() => {
      expect(screen.getByText(/thử tìm kiếm với từ khóa khác/i)).toBeInTheDocument();
    });
  });
});

// ---------------------------------------------------------------------------
// COURSES — pagination
// ---------------------------------------------------------------------------
describe('Courses — pagination', () => {
  it('IT-CONTENT-API-006: should disable the next button on the last page', async () => {
    const totalCourses = PAGE_SIZE; // exactly one page worth → totalPages=1
    vi.mocked(apiClient.get).mockImplementation(
      makeGetImpl({
        categories: [],
        courses: {
          data: coursesPage(totalCourses),
          meta: { total: totalCourses, page: 1, perPage: PAGE_SIZE, totalPages: 1 },
        },
      })
    );

    setAuth(true);
    renderCourses('/courses');

    await waitFor(() => {
      expect(screen.getByText('Course 1')).toBeInTheDocument();
    });

    // Pagination next button should be disabled when on the last page.
    const nextBtn = document.querySelector('button:disabled');
    expect(nextBtn).toBeInTheDocument();
    expect(nextBtn?.getAttribute('disabled')).not.toBeNull();
  });
});

// ---------------------------------------------------------------------------
// COURSES — search debounce
// ---------------------------------------------------------------------------
describe('Courses — search debounce', () => {
  it('IT-CONTENT-API-007: should debounce search input by 300 ms before triggering the query', async () => {
    vi.useFakeTimers();

    vi.mocked(apiClient.get).mockImplementation(
      makeGetImpl({
        categories: [],
      })
    );

    setAuth(true);
    renderCourses('/courses');

    const input = screen.getByPlaceholderText(/tìm kiếm|search/i) as HTMLInputElement;

    // Type the search term — should NOT immediately fire the API with 'react'.
    fireEvent.change(input, { target: { value: 'react' } });

    // Advance by 200 ms — still within debounce.
    act(() => {
      vi.advanceTimersByTime(200);
    });

    const searchCallsBeforeDebounce = vi
      .mocked(apiClient.get)
      .mock.calls.filter(
        (call) => (call[1] as { params?: { search?: string } })?.params?.search === 'react'
      );
    expect(searchCallsBeforeDebounce.length).toBe(0);

    // Advance past 300 ms total — debounce fires.
    await act(async () => {
      vi.advanceTimersByTime(150);
      // Allow microtasks (react-query) to flush.
      await Promise.resolve();
    });

    const searchCallsAfterDebounce = vi
      .mocked(apiClient.get)
      .mock.calls.filter(
        (call) => (call[1] as { params?: { search?: string } })?.params?.search === 'react'
      );
    expect(searchCallsAfterDebounce.length).toBeGreaterThan(0);

    vi.useRealTimers();
  });
});

// ---------------------------------------------------------------------------
// COURSES — category pill filter
// ---------------------------------------------------------------------------
describe('Courses — category filter', () => {
  it('IT-CONTENT-API-008: should update the active category when a category pill is clicked', async () => {
    const user = userEvent.setup();

    vi.mocked(apiClient.get).mockImplementation(
      makeGetImpl({
        categories: [
          makeCategory({ id: 'cat-1', name: 'Programming' }),
          makeCategory({ id: 'cat-2', name: 'Design' }),
        ],
        courses: {
          data: [makeCourse({ categoryId: 'cat-2' })],
          meta: { total: 1, page: 1, perPage: PAGE_SIZE, totalPages: 1 },
        },
      })
    );

    setAuth(true);
    renderCourses('/courses');

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /programming/i })).toBeInTheDocument();
    });

    // Click the Design pill.
    const designPill = screen.getByRole('button', { name: /design/i });
    await user.click(designPill);

    // API should be re-queried with the new categoryId.
    await waitFor(() => {
      const categoryCalls = vi
        .mocked(apiClient.get)
        .mock.calls.filter(
          (call) =>
            (call[1] as { params?: { categoryId?: string } })?.params?.categoryId === 'cat-2'
        );
      expect(categoryCalls.length).toBeGreaterThan(0);
    });
  });
});

// ---------------------------------------------------------------------------
// COURSEDETAIL — chapter toggle
// ---------------------------------------------------------------------------
describe('CourseDetailPage — chapter toggle', () => {
  const renderCourseDetail = (slug = 'test-course') => {
    const queryClient = createQueryClient();
    return render(
      <QueryClientProvider client={queryClient}>
        <I18nProvider>
          <MemoryRouter initialEntries={[`/courses/${slug}`]}>
            <Routes>
              <Route path="/courses" element={<Courses />} />
              <Route path="/courses/:slug" element={<CourseDetailPage />} />
              <Route path="/auth/login" element={<div data-testid="login-page">LOGIN_PAGE</div>} />
            </Routes>
          </MemoryRouter>
        </I18nProvider>
      </QueryClientProvider>
    );
  };

  it('IT-CONTENT-API-009: should expand a chapter and show its lessons when the chapter button is clicked', async () => {
    const user = userEvent.setup();
    vi.mocked(apiClient.get).mockImplementation(
      makeGetImpl({
        categories: [],
        courses: {
          data: [makeCourse({ slug: 'test-course', title: 'Test Course One' })],
          meta: { total: 1, page: 1, perPage: 9, totalPages: 1 },
        },
        detail: makeChapterDetail(),
      })
    );

    setAuth(true);
    renderCourseDetail('test-course');

    // Switch to curriculum tab (default is overview).
    const curriculumTab = await screen.findByRole('button', { name: /nội dung khóa học/i });
    await user.click(curriculumTab);

    await waitFor(() => {
      expect(screen.getByText('Chapter 1: Introduction')).toBeInTheDocument();
    });

    const chapterBtn = screen.getByRole('button', { name: /chapter 1: introduction/i });

    // Expand.
    await user.click(chapterBtn);

    await waitFor(() => {
      expect(screen.getByText('Lesson 1.1')).toBeInTheDocument();
      expect(screen.getByText('Lesson 1.2')).toBeInTheDocument();
    });
  });

  it('IT-CONTENT-API-010: should collapse a chapter when the expanded chapter button is clicked again', async () => {
    const user = userEvent.setup();
    vi.mocked(apiClient.get).mockImplementation(
      makeGetImpl({
        categories: [],
        courses: {
          data: [makeCourse({ slug: 'test-course', title: 'Test Course One' })],
          meta: { total: 1, page: 1, perPage: 9, totalPages: 1 },
        },
        detail: makeChapterDetail(),
      })
    );

    setAuth(true);
    renderCourseDetail('test-course');

    // Switch to curriculum tab.
    const curriculumTab = await screen.findByRole('button', { name: /nội dung khóa học/i });
    await user.click(curriculumTab);

    await waitFor(() => {
      expect(screen.getByText('Chapter 1: Introduction')).toBeInTheDocument();
    });

    const chapterBtn = screen.getByRole('button', { name: /chapter 1: introduction/i });

    // Expand.
    await user.click(chapterBtn);
    await waitFor(() => {
      expect(screen.getByText('Lesson 1.1')).toBeInTheDocument();
    });

    // Collapse.
    await user.click(chapterBtn);
    await waitFor(() => {
      expect(screen.queryByText('Lesson 1.1')).not.toBeInTheDocument();
    });
  });
});

// ---------------------------------------------------------------------------
// COURSEDETAIL — tab switching
// ---------------------------------------------------------------------------
describe('CourseDetailPage — tab switching', () => {
  const renderCourseDetail = (slug = 'test-course') => {
    const queryClient = createQueryClient();
    return render(
      <QueryClientProvider client={queryClient}>
        <I18nProvider>
          <MemoryRouter initialEntries={[`/courses/${slug}`]}>
            <Routes>
              <Route path="/courses" element={<Courses />} />
              <Route path="/courses/:slug" element={<CourseDetailPage />} />
              <Route path="/auth/login" element={<div data-testid="login-page">LOGIN_PAGE</div>} />
            </Routes>
          </MemoryRouter>
        </I18nProvider>
      </QueryClientProvider>
    );
  };

  it('IT-CONTENT-API-011: should switch to the curriculum tab and show chapters when the Nội dung button is clicked', async () => {
    const user = userEvent.setup();
    vi.mocked(apiClient.get).mockImplementation(
      makeGetImpl({
        categories: [],
        courses: {
          data: [makeCourse({ id: 'c-1', slug: 'test-course', title: 'Test Course One' })],
          meta: { total: 1, page: 1, perPage: 9, totalPages: 1 },
        },
        detail: makeDetail({ id: 'c-1', slug: 'test-course' }, [
          {
            id: 'ch-1',
            courseId: 'c-1',
            title: 'Chapter 1',
            description: null,
            sortOrder: 1,
            isFree: null,
            lessons: [],
          },
        ]),
      })
    );

    setAuth(true);
    renderCourseDetail('test-course');

    // Wait for course to load.
    await waitFor(() => {
      expect(screen.getByText('Test Course One')).toBeInTheDocument();
    });

    const curriculumTab = screen.getByRole('button', { name: /nội dung khóa học/i });
    await user.click(curriculumTab);

    await waitFor(() => {
      expect(screen.getByText('Chapter 1')).toBeInTheDocument();
    });
  });

  it('IT-CONTENT-API-012: should switch to the reviews tab and show the unavailable message when clicked', async () => {
    const user = userEvent.setup();
    vi.mocked(apiClient.get).mockImplementation(
      makeGetImpl({
        categories: [],
        courses: {
          data: [makeCourse({ id: 'c-1', slug: 'test-course', title: 'Test Course One' })],
          meta: { total: 1, page: 1, perPage: 9, totalPages: 1 },
        },
        detail: makeDetail({ id: 'c-1', slug: 'test-course' }, []),
      })
    );

    setAuth(true);
    renderCourseDetail('test-course');

    await waitFor(() => {
      expect(screen.getByText('Test Course One')).toBeInTheDocument();
    });

    const reviewsTab = screen.getByRole('button', { name: /đánh giá/i });
    await user.click(reviewsTab);

    await waitFor(() => {
      expect(screen.getByText(/đánh giá từ học viên/i)).toBeInTheDocument();
    });
  });

  it('IT-CONTENT-API-013: should default to the overview tab and show course stats', async () => {
    vi.mocked(apiClient.get).mockImplementation(
      makeGetImpl({
        categories: [],
        courses: {
          data: [
            makeCourse({
              id: 'c-1',
              slug: 'test-course',
              title: 'Test Course One',
              stats: { enrollments: 99 },
            }),
          ],
          meta: { total: 1, page: 1, perPage: 9, totalPages: 1 },
        },
        detail: makeDetail({ id: 'c-1', slug: 'test-course', stats: { enrollments: 99 } }, []),
      })
    );

    setAuth(true);
    renderCourseDetail('test-course');

    await waitFor(() => {
      expect(screen.getByText('Test Course One')).toBeInTheDocument();
    });

    // Overview tab content should be visible by default.
    expect(screen.getByText(/mô tả khóa học/i)).toBeInTheDocument();
  });
});
