/** Wave 3D — Integration: ProfilePage (instructor, /instructor/profile). */
import '@testing-library/jest-dom/vitest';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, waitFor, within } from '@testing-library/react';
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
        'instructor.profile.title': 'Profile',
        'instructor.profile.subtitle': 'Manage your personal information and account',
        'instructor.profile.unknownUser': 'User',
        'instructor.profile.active': 'Active',
        'instructor.profile.stats.exams': 'Exams',
        'instructor.profile.tab.overview': 'Overview',
        'instructor.profile.tab.security': 'Security',
        'instructor.profile.field.fullName': 'Full name',
        'instructor.profile.field.email': 'Email',
        'instructor.profile.security.password.title': 'Password',
        'instructor.profile.security.password.desc': 'Change your password periodically.',
        'instructor.profile.security.password.change': 'Change password',
        'instructor.nav.overview': 'Overview',
        'instructor.nav.dashboard': 'Dashboard',
        'instructor.nav.myCourses': 'My courses',
        'instructor.nav.exams': 'Exams',
        'instructor.nav.students': 'Students',
        'instructor.nav.community': 'Community',
        'instructor.nav.discussions': 'Discussions',
        'instructor.nav.messages': 'Messages',
        'instructor.nav.create': 'Create',
        'instructor.nav.createCourse': 'Create course',
        'instructor.nav.createExam': 'Create exam',
        'instructor.nav.analytics': 'Analytics',
        'instructor.nav.stats': 'Stats',
        'instructor.nav.reports': 'Reports',
        'instructor.nav.grading': 'Grading',
        'instructor.nav.aiTools': 'AI tools',
        'instructor.nav.aiQuestion': 'AI question',
        'instructor.nav.aiAssistant': 'AI Assistant',
        'instructor.nav.copyright': 'Copyright',
        'instructor.nav.account': 'Account',
        'instructor.nav.profile': 'Profile',
        'instructor.nav.settings': 'Settings',
        'common.loading': 'Loading...',
        'common.loadError': 'Could not load data. Try again later.',
        'common.noData': 'No data yet',
        'common.close': 'Close',
        'sidebar.role.instructor': 'Instructor',
        'header.logout': 'Logout',
        'header.toggleTheme': 'Toggle theme',
        'header.notifications': 'Notifications',
        'shared.menu': 'Menu',
        'shared.justNow': 'just now',
        'shared.minutesAgo': '{{n}}m ago',
        'shared.hoursAgo': '{{n}}h ago',
        'shared.daysAgo': '{{n}}d ago',
        'examApi.profile.accountTitle': 'Account details',
        'examApi.profile.role': 'Role',
        'examApi.profile.status': 'Status',
        'examApi.profile.emailVerified': 'Email verified',
        'examApi.profile.joined': 'Joined',
        'examApi.profile.yes': 'Yes',
        'examApi.profile.no': 'Not yet',
        'examApi.profile.noEditApi': 'auth-service has no profile update endpoint.',
        'examApi.profile.password.current': 'Current password',
        'examApi.profile.password.new': 'New password',
        'examApi.profile.password.confirm': 'Confirm new password',
        'examApi.profile.password.mismatch': 'The confirmation does not match.',
        'examApi.profile.password.tooShort': 'The new password must be at least 8 characters.',
        'examApi.profile.password.failed': 'Could not change the password: {{message}}',
        'examApi.profile.password.success': 'Password changed.',
        'examApi.profile.password.submitting': 'Updating…',
        'examApi.instructorDashboard.stats.pending': 'Awaiting grading',
        'examApi.instructorDashboard.stats.graded': 'Graded',
      };
      let v = map[key] ?? key;
      if (opts) {
        for (const [k, val] of Object.entries(opts)) {
          v = v.replace(`{{${k}}}`, String(val)).replace(`{${k}}`, String(val));
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

import ProfilePage from '@/pages/instructor/ProfilePage';
import { apiClient } from '@/config/api.config';

const TS = '2026-10-04T00:00:00.000Z';

const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: 0 } } });

const renderPage = () =>
  render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={['/instructor/profile']}>
        <ProfilePage />
      </MemoryRouter>
    </QueryClientProvider>
  );

const instructorMe = () => ({
  id: 'u-inst-1',
  email: 'gv@ioes.com',
  fullName: 'Nguyễn Vân An',
  avatarUrl: null,
  role: 'instructor' as const,
  status: 'active' as const,
  emailVerified: true,
  createdAt: '2023-09-01T02:00:00.000Z',
});

const examRow = (id: string, title: string) => ({
  id,
  courseId: null,
  instructorId: 'u-inst-1',
  title,
  description: null,
  examType: 'MULTIPLE_CHOICE',
  timeLimitMinutes: 30,
  passingScore: 5,
  maxAttempts: 3,
  isRandomized: true,
  showResults: true,
});

/** Route the three reads the page performs on mount to canned envelopes. */
const mockReads = (opts: { meFails?: boolean } = {}) => {
  vi.mocked(apiClient.get).mockImplementation((url: string) => {
    if (url === '/api/auth/me') {
      return opts.meFails
        ? Promise.reject({
            isAxiosError: true,
            message: 'Request failed with status code 500',
            response: { status: 500, data: { success: false, message: 'Hồ sơ không tải được' } },
          })
        : Promise.resolve({
            data: { success: true, message: 'ok', timestamp: TS, data: instructorMe() },
          });
    }
    if (url === '/api/exams') {
      return Promise.resolve({
        data: {
          success: true,
          message: 'ok',
          timestamp: TS,
          data: [examRow('e-1', 'Kiểm tra giữa kỳ'), examRow('e-2', 'Bài cuối khóa')],
        },
      });
    }
    if (url === '/api/exams/grading/stats') {
      return Promise.resolve({
        data: {
          success: true,
          message: 'ok',
          timestamp: TS,
          data: { pending: 3, graded: 7, oldestPendingSubmittedAt: null },
        },
      });
    }
    return Promise.resolve({ data: { success: true, message: 'ok', timestamp: TS, data: [] } });
  });
};

/**
 * Fill a controlled input with ONE input event.
 *
 * `user.type()` re-reads the element's DOM `value` before every character and
 * inserts `value + key`. The three password inputs are React-controlled, so
 * under a loaded event loop React's re-render lands after the read and the
 * characters interleave (`' O l dPass!23'` for `'OldPass!23'`). Typing 3
 * fields x 3 rows char-by-char also costs one timer per character and pushed
 * IT-IPROFILE-003 past vitest's 5 s timeout. `paste()` is still a real user
 * gesture but dispatches a single input event, so the value is exact and the
 * test is both deterministic and fast.
 */
const fill = async (
  user: ReturnType<typeof userEvent.setup>,
  el: HTMLElement,
  text: string
): Promise<void> => {
  await user.clear(el);
  await user.paste(text);
};

const openSecurityTab = async (user: ReturnType<typeof userEvent.setup>) => {
  await user.click(await screen.findByTestId('instructor-profile-tab-security'));
  return {
    old: screen.getByTestId('instructor-profile-old-password'),
    next: screen.getByTestId('instructor-profile-new-password'),
    confirm: screen.getByTestId('instructor-profile-confirm-password'),
    submit: screen.getByTestId('instructor-profile-change-password-submit'),
  };
};

beforeEach(() => {
  useAuthStore.setState({
    user: {
      id: 'u-inst-1',
      email: 'gv@ioes.com',
      full_name: 'Nguyễn Vân An',
      role: 'instructor',
      avatar_url: null,
    },
    accessToken: 't',
    refreshToken: 'r',
    isAuthenticated: true,
    isLoading: false,
  });
  queryClient.clear();
  vi.mocked(apiClient.get).mockReset();
  vi.mocked(apiClient.post).mockReset();
});

describe('ProfilePage — overview tab', () => {
  it('IT-IPROFILE-001: should render the account details and the exam/grading stat tiles when every read resolves', async () => {
    mockReads();
    renderPage();

    expect(await screen.findByRole('heading', { name: 'Account details' })).toBeInTheDocument();
    // Header card: full name + email from GET /api/auth/me. The address is
    // printed twice (card header + overview list), so match every occurrence.
    expect((await screen.findAllByText('gv@ioes.com')).length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText('Nguyễn Vân An').length).toBeGreaterThanOrEqual(1);
    // Overview list: role + status come straight from the AuthUser record.
    expect(screen.getByText('Role')).toBeInTheDocument();
    expect(screen.getByText('instructor')).toBeInTheDocument();
    expect(screen.getByText('Status')).toBeInTheDocument();
    expect(screen.getByText('active')).toBeInTheDocument();
    expect(screen.getByText('Email verified')).toBeInTheDocument();
    expect(screen.getByText('Yes')).toBeInTheDocument();
    // Stat tiles: 2 exams, 3 pending, 7 graded. Scoped to the card because the
    // sidebar nav also carries a "3" badge on the Exams link.
    const card = within(screen.getByTestId('instructor-profile-card'));
    expect(card.getByText('2')).toBeInTheDocument();
    expect(card.getByText('3')).toBeInTheDocument();
    expect(card.getByText('7')).toBeInTheDocument();
  });
});

describe('ProfilePage — error state', () => {
  it('IT-IPROFILE-002: should show the load-error banner and keep the tab bar when the profile request fails', async () => {
    mockReads({ meFails: true });
    renderPage();

    const banner = await screen.findByTestId('instructor-profile-load-error');
    expect(banner).toHaveTextContent('Could not load data. Try again later.');
    // The page stays usable: the tabs and the placeholder are still rendered.
    expect(screen.getByTestId('instructor-profile-tab-overview')).toBeInTheDocument();
    expect(screen.getByTestId('instructor-profile-tab-security')).toBeInTheDocument();
    expect(screen.getByText('No data yet')).toBeInTheDocument();
  });
});

describe('ProfilePage — Security tab validation', () => {
  it('IT-IPROFILE-003: should block the submit with the mismatch or the length message and post nothing for every invalid pair', async () => {
    // Every row is a submit the page must refuse locally. The page compares
    // the raw strings (no trim, no blank check), so the whitespace-only row
    // is rejected by the length rule alone; an 8-space password would pass
    // that rule and be left to the auth-service to reject.
    const rows: { next: string; confirm: string; message: string }[] = [
      { next: 'NewPass!45', confirm: 'NewPass!46', message: 'The confirmation does not match.' },
      {
        next: 'NewPas4',
        confirm: 'NewPas4',
        message: 'The new password must be at least 8 characters.',
      },
      {
        next: '       ',
        confirm: '       ',
        message: 'The new password must be at least 8 characters.',
      },
    ];

    for (const row of rows) {
      queryClient.clear();
      vi.mocked(apiClient.get).mockReset();
      vi.mocked(apiClient.post).mockReset();
      mockReads();
      const user = userEvent.setup();
      const view = renderPage();
      const fields = await openSecurityTab(user);

      await fill(user, fields.old, 'OldPass!23');
      await fill(user, fields.next, row.next);
      await fill(user, fields.confirm, row.confirm);
      await user.click(fields.submit);

      expect(await screen.findByText(row.message), row.next).toBeInTheDocument();
      expect(apiClient.post, row.next).not.toHaveBeenCalled();
      view.unmount();
    }
  });

  it('IT-IPROFILE-004: should send exactly 8 characters, clear the three fields and show the success line', async () => {
    const user = userEvent.setup();
    mockReads();
    vi.mocked(apiClient.post).mockResolvedValue({
      data: { success: true, message: 'ok', timestamp: TS, data: null },
    });
    renderPage();
    const fields = await openSecurityTab(user);

    // Exactly on the documented auth-service minimum.
    await fill(user, fields.old, 'OldPass!23');
    await fill(user, fields.next, 'Passw0rd');
    await fill(user, fields.confirm, 'Passw0rd');
    await user.click(fields.submit);

    expect(await screen.findByTestId('instructor-profile-password-success')).toHaveTextContent(
      'Password changed.'
    );
    const [url, body] = vi.mocked(apiClient.post).mock.calls[0]!;
    expect(url).toBe('/api/auth/change-password');
    expect(body).toEqual({ oldPassword: 'OldPass!23', newPassword: 'Passw0rd' });
    // The mutation's onSuccess resets all three controlled inputs.
    expect(fields.old).toHaveValue('');
    expect(fields.next).toHaveValue('');
    expect(fields.confirm).toHaveValue('');
  });

  it('IT-IPROFILE-005: should show the backend failure message and post an SQL/XSS-like password verbatim', async () => {
    const user = userEvent.setup();
    mockReads();
    vi.mocked(apiClient.post).mockResolvedValue({
      data: {
        success: false,
        message: 'Mật khẩu cũ không đúng',
        timestamp: TS,
      },
    });
    renderPage();
    const fields = await openSecurityTab(user);

    const injection = `'; DROP TABLE users; -- <img src=x onerror=alert(1)>`;
    await fill(user, fields.old, injection);
    await fill(user, fields.next, injection);
    await fill(user, fields.confirm, injection);
    await user.click(fields.submit);

    expect(await screen.findByTestId('instructor-profile-password-error')).toHaveTextContent(
      'Could not change the password: Mật khẩu cũ không đúng'
    );
    // Sent as text, not as markup: no element was created from the payload.
    expect(document.querySelector('img')).toBeNull();
    expect(vi.mocked(apiClient.post).mock.calls[0]![1]).toEqual({
      oldPassword: injection,
      newPassword: injection,
    });
    await waitFor(() =>
      expect(screen.queryByTestId('instructor-profile-password-success')).toBeNull()
    );
  });
});
