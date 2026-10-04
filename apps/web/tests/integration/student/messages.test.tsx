/** Wave 2 — Integration: MessagesPage (student-owned). */
import '@testing-library/jest-dom/vitest';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useAuthStore } from '@/app/store/authStore';

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string, opts?: Record<string, unknown>) => {
      const map: Record<string, string | string[]> = {
        'comingSoon.badge': 'Coming soon',
        'comingSoon.missingHeading': 'What is missing',
        'comingSoon.noFakeData': 'No sample data.',
        'comingSoon.messages.title': 'Direct messages',
        'comingSoon.messages.description': 'Chat with teachers one-on-one.',
        'comingSoon.messages.missing': ['No messaging backend', 'No chat history'],
        'student.nav.overview': 'Overview',
        'student.nav.community': 'Community',
        'student.nav.messages': 'Messages',
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
        return ['m-1', 'm-2'];
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

import MessagesPage from '@/pages/student/MessagesPage';

const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: 0 } } });

const renderPage = () => {
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={['/student/messages']}>
        <MessagesPage />
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

describe('MessagesPage — ComingSoon wrapper', () => {
  it('IT-MSG-001: should_renderTitle_When_Mounted', async () => {
    renderPage();
    await waitFor(() => {
      // page title appears twice: StudentLayout header + ComingSoon h1
      expect(screen.getAllByText(/Direct messages/i).length).toBeGreaterThanOrEqual(1);
    });
  });

  it('IT-MSG-002: should_renderDescription_When_Mounted', async () => {
    renderPage();
    await waitFor(() => {
      expect(screen.getByText(/Chat with teachers/i)).toBeInTheDocument();
    });
  });

  it('IT-MSG-003: should_renderMissingItems_When_BackendNotReady', async () => {
    renderPage();
    await waitFor(() => {
      expect(screen.getByText(/What is missing/i)).toBeInTheDocument();
    });
    // items come from i18n mock above
    expect(screen.getByText('No messaging backend')).toBeInTheDocument();
    expect(screen.getByText('No chat history')).toBeInTheDocument();
  });

  it('IT-MSG-004: should_renderBadgeAndNoFakeDataCopy_When_ComingSoon', async () => {
    renderPage();
    await waitFor(() => {
      expect(screen.getByText(/Coming soon/i)).toBeInTheDocument();
      expect(screen.getByText(/No sample data/i)).toBeInTheDocument();
    });
  });
});
