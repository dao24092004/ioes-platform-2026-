/** Wave 2 — Integration: RecommendationsPage (student-owned, Recommendations gaps). */
import '@testing-library/jest-dom/vitest';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render as rtlRender, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

const { getCourseRecommendations, listCategories } = vi.hoisted(() => ({
  getCourseRecommendations: vi.fn(),
  listCategories: vi.fn(),
}));

vi.mock('@/services/api/recommendations.api', async () => {
  const actual = await vi.importActual<typeof import('@/services/api/recommendations.api')>(
    '@/services/api/recommendations.api'
  );
  return { ...actual, recommendationsApi: { getCourseRecommendations } };
});

vi.mock('@/services/api/content.api', async () => {
  const actual = await vi.importActual<typeof import('@/services/api/content.api')>(
    '@/services/api/content.api'
  );
  return { ...actual, contentApi: { listCategories } };
});

vi.mock('react-i18next', () => ({
  useTranslation: (ns?: string) => ({
    t: (key: string, opts?: Record<string, unknown>) => {
      // Map uses namespaced keys because i18next prefixes the key with the
      // active namespace when `useTranslation(ns)` is used.
      const k = ns ? `${ns}:${key}` : key;
      const map: Record<string, string> = {
        'recommendations:title': 'Recommended for you',
        'recommendations:subtitle': 'AI-curated',
        'recommendations:loading': 'Loading...',
        'recommendations:empty.title': 'No recommendations yet',
        'recommendations:empty.description': 'Try again later.',
        'recommendations:error.title': 'Could not load recommendations',
        'recommendations:error.description': 'Try refreshing.',
        'recommendations:error.detail': '{{message}}',
        'recommendations:actions.refresh': 'Refresh',
        'recommendations:actions.refreshing': 'Refreshing...',
        'recommendations:actions.retry': 'Retry',
        'recommendations:actions.browseCatalog': 'Browse catalogue',
        'recommendations:actions.viewDetail': 'View detail',
        'recommendations:meta.count': '{{count}} courses',
        'recommendations:meta.generatedAt': 'Generated at {{time}}',
        'recommendations:meta.strategy': 'Strategy: {{strategy}}',
        'recommendations:card.duration': '{{hours}}h',
        'recommendations:card.reasonLabel': 'Why this course?',
        'recommendations:card.match': 'Match: {{percent}}%',
        'recommendations:card.free': 'Free',
        'recommendations:card.uncategorized': 'Uncategorised',
        'recommendations:reasonCode.POPULAR': 'Popular',
        'recommendations:reasonCode.NEW': 'New',
        'recommendations:reasonCode.SAME_CATEGORY': 'Same category',
        'recommendations:reasonCode.SIMILAR_CONTENT': 'Similar',
        'recommendations:reasonCode.NEXT_LEVEL': 'Next level',
        'recommendations:level.beginner': 'Beginner',
        'recommendations:level.intermediate': 'Intermediate',
        'recommendations:level.advanced': 'Advanced',
      };
      let v = map[k] ?? '??';
      if (opts) {
        for (const [optK, optVal] of Object.entries(opts)) {
          v = v.replace(`{{${optK}}}`, String(optVal));
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

import RecommendationsPage from '@/pages/student/RecommendationsPage';

/**
 * QueryClient dựng đúng như `App.tsx` (`retry: 1`), để test thật sự chứng minh
 * trang tự ghi đè chứ không ăn may vì client trong test đã tắt retry sẵn.
 */
function renderPage() {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { staleTime: 1000 * 60 * 5, retry: 1, refetchOnWindowFocus: false },
    },
  });
  return rtlRender(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={['/student/recommendations']}>
        <Routes>
          <Route path="/student/recommendations" element={<RecommendationsPage />} />
          <Route
            path="/student/courses/:id"
            element={<div data-testid="course-detail">COURSE_DETAIL</div>}
          />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>
  );
}

beforeEach(() => {
  getCourseRecommendations.mockReset();
  listCategories.mockReset();
  listCategories.mockResolvedValue([]);
});

describe('RecommendationsPage — loading + list', () => {
  it('IT-RECS-001: should_showSpinner_When_RequestPending', () => {
    getCourseRecommendations.mockReturnValue(new Promise(() => {}));
    renderPage();
    const spinner = document.querySelector('.animate-spin');
    expect(spinner).not.toBeNull();
  });

  it('IT-RECS-002: should_renderCards_When_ItemsReturned', async () => {
    getCourseRecommendations.mockResolvedValue({
      items: [
        {
          courseId: 'c-1',
          title: 'Algebra Crash Course',
          thumbnailUrl: null,
          categoryId: 'cat-1',
          level: 'beginner' as const,
          durationHours: 6,
          price: 0,
          currency: null,
          score: 0.92,
          reason: 'Top match',
          reasonCode: 'POPULAR' as const,
        },
      ],
      strategy: 'embedding+rules',
      generatedAt: '2026-10-04T00:00:00.000Z',
    });
    listCategories.mockResolvedValue([{ id: 'cat-1', name: 'Math' }]);
    renderPage();
    await waitFor(() => {
      expect(screen.getByText('Algebra Crash Course')).toBeInTheDocument();
    });
    expect(screen.getByText('Match: 92%')).toBeInTheDocument();
    expect(screen.getByText('Top match')).toBeInTheDocument();
  });
});

describe('RecommendationsPage — error + recovery', () => {
  it('IT-RECS-003: should_showErrorMessage_When_RequestRejects', async () => {
    getCourseRecommendations.mockRejectedValue(new Error('boom'));
    renderPage();
    await waitFor(() => {
      expect(screen.getByText(/Could not load recommendations/i)).toBeInTheDocument();
    });
    expect(screen.getByRole('button', { name: /Retry/i })).toBeInTheDocument();
  });

  it('IT-RECS-004: should_callRefetch_When_RefreshClicked', async () => {
    getCourseRecommendations.mockResolvedValue({
      items: [],
      strategy: 'embedding+rules',
      generatedAt: '2026-10-04T00:00:00.000Z',
    });
    const user = userEvent.setup();
    renderPage();
    await waitFor(() => screen.getByText(/No recommendations yet/i));
    // Click the header refresh button (not the empty-state browse button).
    const refreshBtn = screen.getAllByRole('button', { name: /Refresh/i })[0];
    expect(refreshBtn).toBeDefined();
    await user.click(refreshBtn as HTMLElement);
    await waitFor(() => {
      expect(getCourseRecommendations).toHaveBeenCalledTimes(2);
    });
  });

  it('IT-RECS-005: should_navigateToCourse_When_ViewDetailClicked', async () => {
    getCourseRecommendations.mockResolvedValue({
      items: [
        {
          courseId: 'c-99',
          title: 'Algebra Crash Course',
          thumbnailUrl: null,
          categoryId: null,
          level: null,
          durationHours: null,
          price: 0,
          currency: null,
          score: 0.92,
          reason: 'Top match',
          reasonCode: 'POPULAR' as const,
        },
      ],
      strategy: 'embedding+rules',
      generatedAt: '2026-10-04T00:00:00.000Z',
    });
    const user = userEvent.setup();
    renderPage();
    await waitFor(() => screen.getByText('Algebra Crash Course'));
    const link = screen.getByRole('link', { name: /View detail/i });
    expect(link.getAttribute('href')).toBe('/student/courses/c-99');
    await user.click(link);
    await waitFor(() => {
      expect(screen.getByTestId('course-detail')).toBeInTheDocument();
    });
  });
});
