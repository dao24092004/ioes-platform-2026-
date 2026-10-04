/** Wave 2 — Integration: SearchPage (student-owned). */
import '@testing-library/jest-dom/vitest';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useAuthStore } from '@/app/store/authStore';

vi.mock('@/config/api.config', async () => {
  const actual = await vi.importActual<typeof import('@/config/api.config')>('@/config/api.config');
  return {
    ...actual,
    apiClient: { get: vi.fn(), post: vi.fn(), patch: vi.fn(), delete: vi.fn(), put: vi.fn() },
  };
});

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string, opts?: Record<string, unknown>) => {
      const map: Record<string, string> = {
        'student.search.title': 'Search',
        'student.search.subtitle': 'Find published courses',
        'student.search.results': 'Results',
        'student.search.empty': 'No results found',
        'student.search.type.course': 'Course',
        'student.courses.searchPlaceholder': 'Search courses...',
        'common.loadError': 'Failed to load',
        'common.loading': 'Loading...',
        'courseApi.search.hint': 'Type to search.',
        'courseApi.search.coursesOnly': 'Search across the catalogue.',
        'courseApi.uncategorized': 'Uncategorized',
        'student.nav.practice': 'Practice',
        'student.nav.search': 'Search',
        'shared.menu': 'Menu',
        'header.toggleTheme': 'Toggle theme',
        'header.notifications': 'Notifications',
        'header.logout': 'Logout',
        'sidebar.role.student': 'Student',
      };
      let v = map[key] ?? key;
      if (opts) {
        for (const [k, val] of Object.entries(opts)) {
          v = v.replace(`{${k}}`, String(val));
        }
      }
      return v;
    },
    i18n: { language: 'en' },
  }),
}));

if (typeof globalThis.IntersectionObserver === 'undefined') {
  (
    globalThis as unknown as { IntersectionObserver: new () => IntersectionObserver }
  ).IntersectionObserver = class {
    observe() {}
    unobserve() {}
    disconnect() {}
    takeRecords() {
      return [];
    }
    root = null;
    rootMargin = '';
    thresholds: number[] = [];
    scrollMargin = '';
  };
}

import SearchPage from '@/pages/student/SearchPage';
import { apiClient } from '@/config/api.config';

const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: 0 } } });

const renderPage = () => {
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={['/student/search']}>
        <Routes>
          <Route path="/student/search" element={<SearchPage />} />
          <Route
            path="/student/courses/:id"
            element={<div data-testid="course-detail">COURSE_DETAIL</div>}
          />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>
  );
};

const makeCourse = (over: Record<string, unknown> = {}) => ({
  id: 'c-1',
  instructorId: 'i-1',
  categoryId: 'cat-1',
  title: 'React Fundamentals',
  slug: 'react-fundamentals',
  shortDescription: 'Learn React',
  description: null,
  thumbnailUrl: null,
  previewVideoUrl: null,
  price: null,
  currency: null,
  durationHours: null,
  difficultyLevel: null,
  language: null,
  status: 'published',
  reviewStatus: null,
  rejectionReason: null,
  publishedAt: '2026-01-01T00:00:00.000Z',
  stats: null,
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-01-01T00:00:00.000Z',
  ...over,
});

const seedStudent = () => {
  useAuthStore.setState({
    user: {
      id: 'u-1',
      email: 's@ioes.com',
      full_name: 'Student',
      role: 'student',
      avatar_url: null,
    },
    accessToken: 't',
    refreshToken: 'r',
    isAuthenticated: true,
    isLoading: false,
  });
};

beforeEach(() => {
  seedStudent();
  queryClient.clear();
  vi.mocked(apiClient.get).mockReset();
});

describe('SearchPage — empty / hint state', () => {
  it('IT-SEARCH-001: should_showHint_When_NoQueryTyped', () => {
    renderPage();
    expect(screen.getByText(/Type to search\./)).toBeInTheDocument();
  });
});

describe('SearchPage — search behaviour', () => {
  it('IT-SEARCH-002: should_callListCoursesWithStatusPublished_When_TypedAndDebounced', async () => {
    const user = userEvent.setup();
    vi.mocked(apiClient.get).mockImplementation((url: string | unknown) => {
      const u = String(url ?? '');
      if (u.includes('/api/v1/courses')) {
        return Promise.resolve({
          data: { data: [], meta: { total: 0, page: 1, perPage: 50, totalPages: 1 } },
        });
      }
      return Promise.resolve({ data: [] });
    });
    renderPage();
    const input = screen.getByPlaceholderText(/Search courses/i);
    await user.type(input, 'react');
    // 300ms debounce; wait a bit longer.
    await waitFor(
      () => {
        const calls = vi.mocked(apiClient.get).mock.calls;
        expect(calls.some((c) => String(c[0]).includes('/api/v1/courses'))).toBe(true);
      },
      { timeout: 1000 }
    );
    const call = vi
      .mocked(apiClient.get)
      .mock.calls.find((c) => String(c[0]).includes('/api/v1/courses'))!;
    const params = (call[1]?.params ?? {}) as Record<string, unknown>;
    expect(params.search).toBe('react');
    expect(params.status).toBe('published');
  });

  it('IT-SEARCH-003: should_renderResultLinks_When_ResultsReturned', async () => {
    const user = userEvent.setup();
    vi.mocked(apiClient.get).mockImplementation((url: string | unknown) => {
      const u = String(url ?? '');
      if (u.includes('/api/v1/courses')) {
        return Promise.resolve({
          data: { data: [makeCourse()], meta: { total: 1, page: 1, perPage: 50, totalPages: 1 } },
        });
      }
      return Promise.resolve({ data: [{ id: 'cat-1', name: 'Web Dev' }] });
    });
    renderPage();
    await user.type(screen.getByPlaceholderText(/Search courses/i), 'react');
    await waitFor(() => {
      expect(screen.getByText('React Fundamentals')).toBeInTheDocument();
    });
    const link = screen.getByText('React Fundamentals').closest('a');
    expect(link?.getAttribute('href')).toBe('/student/courses/c-1');
  });

  it('IT-SEARCH-004: should_showEmptyMessage_When_NoResults', async () => {
    const user = userEvent.setup();
    vi.mocked(apiClient.get).mockImplementation((url: string | unknown) => {
      const u = String(url ?? '');
      if (u.includes('/api/v1/courses')) {
        return Promise.resolve({
          data: { data: [], meta: { total: 0, page: 1, perPage: 50, totalPages: 1 } },
        });
      }
      // categories endpoint: return a real array (the helper unwraps `data`)
      return Promise.resolve({ data: [] });
    });
    renderPage();
    await user.type(screen.getByPlaceholderText(/Search courses/i), 'xyz-not-found');
    await waitFor(() => {
      expect(screen.getByText(/No results found/i)).toBeInTheDocument();
    });
  });

  it('IT-SEARCH-005: should_showLoadError_When_ListCoursesRejects', async () => {
    const user = userEvent.setup();
    vi.mocked(apiClient.get).mockRejectedValue(new Error('boom'));
    renderPage();
    await user.type(screen.getByPlaceholderText(/Search courses/i), 'react');
    await waitFor(() => {
      expect(screen.getByText(/Failed to load/i)).toBeInTheDocument();
    });
  });
});

describe('SearchPage — category resolver', () => {
  it('IT-SEARCH-006: should_resolveCategoryName_When_ListCategoriesReturns', async () => {
    const user = userEvent.setup();
    vi.mocked(apiClient.get).mockImplementation((url: string | unknown) => {
      const u = String(url ?? '');
      if (u.includes('/api/v1/courses')) {
        return Promise.resolve({
          data: { data: [makeCourse()], meta: { total: 1, page: 1, perPage: 50, totalPages: 1 } },
        });
      }
      if (u.includes('/api/v1/categories')) {
        return Promise.resolve({
          data: [{ id: 'cat-1', name: 'Web Development' }],
        });
      }
      return Promise.resolve({ data: null });
    });
    renderPage();
    await user.type(screen.getByPlaceholderText(/Search courses/i), 'react');
    await waitFor(() => {
      expect(screen.getByText('Web Development')).toBeInTheDocument();
    });
  });
});
