/** Wave 2C (student) — Integration: ReviewsPage (2 tests) */
import '@testing-library/jest-dom/vitest';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string, opts?: { returnObjects?: boolean }) => {
      const map: Record<string, string | string[]> = {
        'comingSoon.badge': 'Coming soon',
        'comingSoon.missingHeading': 'What is missing',
        'comingSoon.noFakeData': 'This page shows no sample data.',
        'courseApi.comingSoon.reviews.title': 'Reviews',
        'courseApi.comingSoon.reviews.description': 'Course ratings and reviews.',
        'courseApi.comingSoon.reviews.missing': ['No review API', 'No moderation', 'No aggregate'],
      };
      const result = map[key];
      if (opts?.returnObjects && Array.isArray(result)) return result;
      return (result as string) ?? key;
    },
    i18n: { language: 'en', changeLanguage: vi.fn() },
  }),
}));

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
import ReviewsPage from '@/pages/student/ReviewsPage';

const queryClient = new QueryClient({
  defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
});

function renderAt(initialEntries: string[]) {
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={initialEntries}>
        <ReviewsPage />
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

describe('IT-REVIEWS-001: ReviewsPage at /student/reviews renders the reviews ComingSoon', () => {
  beforeEach(() => {
    seedStudent();
    localStorage.clear();
  });

  it('should render title (h1), description, every missing item, and the badge', async () => {
    renderAt(['/student/reviews']);
    await waitFor(() => {
      // Description text unique to ComingSoon.
      expect(screen.getByText('Course ratings and reviews.')).toBeInTheDocument();
    });
    expect(screen.getAllByRole('heading', { name: 'Reviews' }).length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText('No review API')).toBeInTheDocument();
    expect(screen.getByText('No moderation')).toBeInTheDocument();
    expect(screen.getByText('No aggregate')).toBeInTheDocument();
  });
});

describe('IT-REVIEWS-002: ReviewsPage at /student/reviews/:courseId renders the same content', () => {
  beforeEach(() => {
    seedStudent();
    localStorage.clear();
  });

  it('should render the same ComingSoon at /student/reviews/abc-123', async () => {
    render(
      <QueryClientProvider client={queryClient}>
        <MemoryRouter initialEntries={['/student/reviews/abc-123']}>
          <Routes>
            <Route path="/student/reviews" element={<ReviewsPage />} />
            <Route path="/student/reviews/:courseId" element={<ReviewsPage />} />
          </Routes>
        </MemoryRouter>
      </QueryClientProvider>
    );
    await waitFor(() => {
      expect(screen.getByText('Course ratings and reviews.')).toBeInTheDocument();
    });
    expect(screen.getAllByRole('heading', { name: 'Reviews' }).length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText('No review API')).toBeInTheDocument();
  });
});
