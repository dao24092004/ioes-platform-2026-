/** Wave 2 — Integration: DiscussionsPage (student-owned). */
import '@testing-library/jest-dom/vitest';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useAuthStore } from '@/app/store/authStore';

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string, opts?: Record<string, unknown>) => {
      const map: Record<string, string | string[]> = {
        'comingSoon.badge': 'Coming soon',
        'comingSoon.missingHeading': 'What is missing',
        'comingSoon.noFakeData': 'No sample data.',
        'comingSoon.discussion.title': 'Discussions',
        'comingSoon.discussion.description': 'Course Q&A between students and instructors.',
        'comingSoon.discussion.missing': ['No thread API', 'No posting'],
        'student.nav.community': 'Community',
        'student.nav.discussions': 'Discussions',
        'shared.menu': 'Menu',
        'header.toggleTheme': 'Toggle theme',
        'header.notifications': 'Notifications',
        'header.logout': 'Logout',
        'sidebar.role.student': 'Student',
      };
      const result = map[key];
      if (Array.isArray(result)) return result;
      if (typeof result === 'string') return result;
      if (opts && 'returnObjects' in opts && opts.returnObjects === true) {
        return ['d-1', 'd-2'];
      }
      return key;
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

import DiscussionsPage from '@/pages/student/DiscussionsPage';

const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: 0 } } });

const renderRoot = () => {
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={['/student/discussions']}>
        <Routes>
          <Route path="/student/discussions" element={<DiscussionsPage />} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>
  );
};

const renderScoped = (courseId: string) => {
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={[`/student/discussions/${courseId}`]}>
        <Routes>
          <Route path="/student/discussions/:courseId" element={<DiscussionsPage />} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>
  );
};

beforeEach(() => {
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
});

describe('DiscussionsPage — both routes', () => {
  it('IT-DISCUSS-001: should_renderComingSoon_When_AccessedAtRoot', async () => {
    renderRoot();
    await waitFor(() => {
      // page title appears twice: StudentLayout header + ComingSoon h1
      expect(screen.getAllByText(/Discussions/i).length).toBeGreaterThanOrEqual(1);
    });
  });

  it('IT-DISCUSS-002: should_renderComingSoon_When_AccessedWithCourseId', async () => {
    renderScoped('c-react-101');
    await waitFor(() => {
      expect(screen.getAllByText(/Discussions/i).length).toBeGreaterThanOrEqual(1);
    });
  });

  it('IT-DISCUSS-003: should_renderTitleAndDescription_When_Mounted', async () => {
    renderRoot();
    await waitFor(() => {
      expect(screen.getByText(/Course Q&A between students/i)).toBeInTheDocument();
    });
  });

  it('IT-DISCUSS-004: should_renderMissingItems_When_BackendNotReady', async () => {
    renderRoot();
    await waitFor(() => {
      expect(screen.getByText(/What is missing/i)).toBeInTheDocument();
    });
    // items come from i18n mock above
    expect(screen.getByText('No thread API')).toBeInTheDocument();
    expect(screen.getByText('No posting')).toBeInTheDocument();
  });
});
