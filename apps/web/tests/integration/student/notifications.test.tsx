/** Wave 2 — Integration: NotificationsPage (student-owned). */
import '@testing-library/jest-dom/vitest';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
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
        'student.notifications.title': 'Notifications',
        'student.notifications.subtitle': 'Latest updates',
        'student.notifications.empty': 'No notifications.',
        'student.notifications.filter.all': 'All',
        'notificationsAdmin.inbox.error': 'Failed to load notifications',
        'notificationsAdmin.inbox.filters.all': 'All',
        'notificationsAdmin.inbox.filters.pending': 'Pending',
        'notificationsAdmin.inbox.filters.sent': 'Sent',
        'notificationsAdmin.inbox.filters.failed': 'Failed',
        'notificationsAdmin.inbox.filters.retrying': 'Retrying',
        'student.nav.account': 'Account',
        'student.nav.notifications': 'Notifications',
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

import NotificationsPage from '@/pages/student/NotificationsPage';
import { apiClient } from '@/config/api.config';

const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: 0 } } });

const renderPage = () => {
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={['/student/notifications']}>
        <NotificationsPage />
      </MemoryRouter>
    </QueryClientProvider>
  );
};

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

const record = (over: Record<string, unknown> = {}) => ({
  id: 'n-1',
  userId: 'u-1',
  type: 'email' as const,
  recipient: 'a@b.com',
  subject: 'Welcome',
  status: 'sent' as const,
  sentAt: '2026-01-01T00:00:00.000Z',
  createdAt: '2026-01-01T00:00:00.000Z',
  ...over,
});

beforeEach(() => {
  seedStudent();
  queryClient.clear();
  vi.mocked(apiClient.get).mockReset();
});

describe('NotificationsPage — heading', () => {
  it('IT-NOTIF-001: should_renderHeading_When_Mounted', () => {
    renderPage();
    // page title appears in StudentLayout header
    expect(screen.getAllByText(/Notifications/i).length).toBeGreaterThanOrEqual(1);
  });
});

describe('NotificationsPage — loading state', () => {
  it('IT-NOTIF-002: should_showSpinner_When_InboxIsPending', () => {
    vi.mocked(apiClient.get).mockReturnValue(new Promise(() => {}));
    renderPage();
    // loading spinner is a div with border-2 border-blue-600 (animate-spin)
    const spinner = document.querySelector('.animate-spin');
    expect(spinner).not.toBeNull();
  });
});

describe('NotificationsPage — filters', () => {
  it('IT-NOTIF-003: should_showOnlyMatchingRows_When_FilterPillClicked', async () => {
    const user = userEvent.setup();
    vi.mocked(apiClient.get).mockResolvedValue({
      data: {
        success: true,
        message: 'ok',
        timestamp: 't',
        data: [
          record({ id: 'n-1', subject: 'Sent one' }),
          record({ id: 'n-2', subject: 'Pending one', status: 'pending' }),
        ],
      },
    });
    renderPage();
    await waitFor(() => {
      expect(screen.getByText('Sent one')).toBeInTheDocument();
    });
    expect(screen.getByText('Pending one')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: /^Pending$/ }));
    await waitFor(() => {
      expect(screen.queryByText('Sent one')).not.toBeInTheDocument();
    });
    expect(screen.getByText('Pending one')).toBeInTheDocument();
  });
});

describe('NotificationsPage — empty / error', () => {
  it('IT-NOTIF-004: should_showEmptyState_When_NoRecords', async () => {
    vi.mocked(apiClient.get).mockResolvedValue({
      data: { success: true, message: 'ok', timestamp: 't', data: [] },
    });
    renderPage();
    await waitFor(() => {
      expect(screen.getByText(/No notifications\./)).toBeInTheDocument();
    });
  });

  it('IT-NOTIF-005: should_showErrorMessage_When_InboxRejects', async () => {
    vi.mocked(apiClient.get).mockRejectedValue(new Error('boom'));
    renderPage();
    await waitFor(() => {
      expect(screen.getByText(/Failed to load notifications/i)).toBeInTheDocument();
    });
  });
});

describe('NotificationsPage — row rendering', () => {
  it('IT-NOTIF-006: should_renderSubjectAndStatusBadge_When_RecordExists', async () => {
    vi.mocked(apiClient.get).mockResolvedValue({
      data: { success: true, message: 'ok', timestamp: 't', data: [record()] },
    });
    renderPage();
    await waitFor(() => {
      expect(screen.getByText('Welcome')).toBeInTheDocument();
    });
    // status pill text appears at least once (uppercased in UI)
    expect(screen.getAllByText(/Sent/i).length).toBeGreaterThanOrEqual(1);
  });
});
