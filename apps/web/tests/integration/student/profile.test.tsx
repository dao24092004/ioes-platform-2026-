/** Wave 2 — Integration: ProfilePage (student-owned). */
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
        'student.profile.title': 'My Profile',
        'student.profile.subtitle': 'Manage your account info',
        'student.profile.tabs.overview': 'Overview',
        'student.profile.tabs.edit': 'Edit',
        'student.profile.tabs.achievements': 'Achievements',
        'student.profile.tabs.security': 'Security',
        'student.profile.fields.fullName': 'Full name',
        'student.profile.fields.email': 'Email',
        'student.profile.fields.studentId': 'Student ID',
        'student.profile.fields.department': 'Department',
        'student.profile.stats.courses': 'Courses',
        'student.profile.stats.certificates': 'Certificates',
        'student.profile.stats.points': 'Points',
        'student.profile.stats.streak': 'Streak',
        'student.profile.achievements.first_course': 'First Course',
        'student.profile.achievements.streak_7': '7-Day Streak',
        'student.profile.achievements.streak_30': '30-Day Streak',
        'student.profile.achievements.top_10': 'Top 10',
        'student.profile.achievements.perfect_score': 'Perfect Score',
        'student.profile.achievements.fast_learner': 'Fast Learner',
        'common.loadError': 'Failed to load',
        'student.nav.account': 'Account',
        'student.nav.profile': 'Profile',
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

import ProfilePage from '@/pages/student/ProfilePage';
import { apiClient } from '@/config/api.config';

const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: 0 } } });

const renderPage = () => {
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={['/student/profile']}>
        <ProfilePage />
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

const makeMeResponse = () => ({
  id: 'u-1',
  email: 's@ioes.com',
  fullName: 'Student One',
  avatarUrl: null,
  role: 'student' as const,
  status: 'active' as const,
  emailVerified: true,
  createdAt: '2024-01-01T00:00:00.000Z',
});

beforeEach(() => {
  seedStudent();
  queryClient.clear();
  vi.mocked(apiClient.get).mockReset();
  vi.mocked(apiClient.post).mockReset();
});

describe('ProfilePage — loading state', () => {
  it('IT-PROFILE-001: should_showSpinner_When_MeIsPending', () => {
    vi.mocked(apiClient.get).mockReturnValue(new Promise(() => {}));
    renderPage();
    const spinner = document.querySelector('.animate-spin');
    expect(spinner).not.toBeNull();
  });
});

describe('ProfilePage — error state', () => {
  it('IT-PROFILE-002: should_showLoadError_When_MeRejects', async () => {
    vi.mocked(apiClient.get).mockRejectedValue(new Error('boom'));
    renderPage();
    await waitFor(() => {
      expect(screen.getByText(/Failed to load/i)).toBeInTheDocument();
    });
  });
});

describe('ProfilePage — overview tab', () => {
  it('IT-PROFILE-003: should_renderHeadingAndEmail_When_MeReturns', async () => {
    vi.mocked(apiClient.get).mockResolvedValue({
      data: { success: true, message: 'ok', timestamp: 't', data: makeMeResponse() },
    });
    renderPage();
    await waitFor(() => {
      // "Student One" appears as h2 (name) and once in the Card Field row.
      expect(screen.getAllByText('Student One').length).toBeGreaterThanOrEqual(1);
    });
    // Email appears in the heading subtitle and in the Field row.
    expect(screen.getAllByText('s@ioes.com').length).toBeGreaterThanOrEqual(1);
  });
});

describe('ProfilePage — security tab', () => {
  it('IT-PROFILE-004: should_showChangePasswordForm_When_SecurityTabClicked', async () => {
    const user2 = userEvent.setup();
    vi.mocked(apiClient.get).mockResolvedValue({
      data: { success: true, message: 'ok', timestamp: 't', data: makeMeResponse() },
    });
    renderPage();
    await waitFor(() => screen.getByRole('button', { name: /Security/i }));
    await user2.click(screen.getByRole('button', { name: /Security/i }));
    await waitFor(() => {
      expect(screen.getByText(/Đổi mật khẩu/i)).toBeInTheDocument();
    });
  });

  it('IT-PROFILE-005: should_showInlineError_When_PasswordsDoNotMatch', async () => {
    const user2 = userEvent.setup();
    vi.mocked(apiClient.get).mockResolvedValue({
      data: { success: true, message: 'ok', timestamp: 't', data: makeMeResponse() },
    });
    renderPage();
    await waitFor(() => screen.getByRole('button', { name: /Security/i }));
    await user2.click(screen.getByRole('button', { name: /Security/i }));

    const inputs = screen.getAllByPlaceholderText(/Mật khẩu/i);
    await user2.type(inputs[0] as HTMLInputElement, 'old123456');
    await user2.type(inputs[1] as HTMLInputElement, 'new12345678');
    await user2.type(inputs[2] as HTMLInputElement, 'different1234');

    await user2.click(screen.getByRole('button', { name: /Cập nhật mật khẩu/i }));

    await waitFor(() => {
      expect(screen.getByText(/Mật khẩu xác nhận không khớp/i)).toBeInTheDocument();
    });
    expect(apiClient.post).not.toHaveBeenCalled();
  });

  it('IT-PROFILE-006: should_blockShortNewPassword_When_LessThanEightChars', async () => {
    const user2 = userEvent.setup();
    vi.mocked(apiClient.get).mockResolvedValue({
      data: { success: true, message: 'ok', timestamp: 't', data: makeMeResponse() },
    });
    renderPage();
    await waitFor(() => screen.getByRole('button', { name: /Security/i }));
    await user2.click(screen.getByRole('button', { name: /Security/i }));

    const inputs = screen.getAllByPlaceholderText(/Mật khẩu/i);
    await user2.type(inputs[0] as HTMLInputElement, 'old123456');
    await user2.type(inputs[1] as HTMLInputElement, 'short');
    await user2.type(inputs[2] as HTMLInputElement, 'short');

    await user2.click(screen.getByRole('button', { name: /Cập nhật mật khẩu/i }));

    await waitFor(() => {
      expect(screen.getByText(/Mật khẩu mới phải từ 8 ký tự/i)).toBeInTheDocument();
    });
    expect(apiClient.post).not.toHaveBeenCalled();
  });

  it('IT-PROFILE-007: should_callChangePassword_When_AllFieldsValid', async () => {
    const user2 = userEvent.setup();
    vi.mocked(apiClient.get).mockResolvedValue({
      data: { success: true, message: 'ok', timestamp: 't', data: makeMeResponse() },
    });
    vi.mocked(apiClient.post).mockResolvedValue({
      data: { success: true, message: 'ok', timestamp: 't', data: null },
    });
    renderPage();
    await waitFor(() => screen.getByRole('button', { name: /Security/i }));
    await user2.click(screen.getByRole('button', { name: /Security/i }));

    const inputs = screen.getAllByPlaceholderText(/Mật khẩu/i);
    await user2.type(inputs[0] as HTMLInputElement, 'old12345678');
    await user2.type(inputs[1] as HTMLInputElement, 'new12345678');
    await user2.type(inputs[2] as HTMLInputElement, 'new12345678');

    await user2.click(screen.getByRole('button', { name: /Cập nhật mật khẩu/i }));

    await waitFor(() => {
      expect(apiClient.post).toHaveBeenCalledTimes(1);
    });
    const [url, body] = vi.mocked(apiClient.post).mock.calls[0]!;
    expect(url).toBe('/api/auth/change-password');
    expect(body).toEqual({ oldPassword: 'old12345678', newPassword: 'new12345678' });
  });
});
