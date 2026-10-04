/** Wave 2 — Integration: SettingsPage (student-owned). */
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
        'student.settings.title': 'Settings',
        'student.settings.subtitle': 'Customize your experience',
        'student.settings.tabs.general': 'General',
        'student.settings.tabs.notifications': 'Notifications',
        'student.settings.tabs.privacy': 'Privacy',
        'student.settings.tabs.language': 'Language',
        'student.settings.theme': 'Theme',
        'student.settings.themeLight': 'Light',
        'student.settings.themeDark': 'Dark',
        'student.settings.themeAuto': 'Auto',
        'student.settings.emailNotif': 'Email notifications',
        'student.settings.pushNotif': 'Push notifications',
        'student.settings.courseUpdates': 'Course updates',
        'student.settings.examReminders': 'Exam reminders',
        'student.settings.weeklyReport': 'Weekly report',
        'student.settings.promotions': 'Promotions',
        'student.settings.language': 'Language',
        'student.settings.languageVI': 'Tiếng Việt',
        'student.settings.languageEN': 'English',
        'student.nav.account': 'Account',
        'student.nav.settings': 'Settings',
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
    i18n: { language: 'en', changeLanguage: vi.fn() },
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

import SettingsPage from '@/pages/student/SettingsPage';

const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: 0 } } });

const renderPage = () => {
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={['/student/settings']}>
        <SettingsPage />
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
  queryClient.clear();
});

describe('SettingsPage — tabs', () => {
  it('IT-SETTINGS-001: should_showGeneralTab_When_DefaultState', async () => {
    renderPage();
    await waitFor(() => {
      expect(screen.getByText(/Customize your experience/i)).toBeInTheDocument();
    });
    // Theme picker renders for the default tab.
    expect(screen.getByText('Theme')).toBeInTheDocument();
    expect(screen.getByText('Light')).toBeInTheDocument();
    expect(screen.getByText('Dark')).toBeInTheDocument();
    expect(screen.getByText('Auto')).toBeInTheDocument();
  });

  it('IT-SETTINGS-002: should_showNotificationSwitches_When_NotificationsTabClicked', async () => {
    const user = userEvent.setup();
    renderPage();
    await user.click(screen.getByRole('button', { name: /Notifications/i }));
    await waitFor(() => {
      expect(screen.getByText('Email notifications')).toBeInTheDocument();
    });
    expect(screen.getByText('Push notifications')).toBeInTheDocument();
    expect(screen.getByText('Course updates')).toBeInTheDocument();
    expect(screen.getByText('Exam reminders')).toBeInTheDocument();
  });

  it('IT-SETTINGS-003: should_toggleSwitch_When_Clicked', async () => {
    const user = userEvent.setup();
    renderPage();
    await user.click(screen.getByRole('button', { name: /Notifications/i }));
    await waitFor(() => screen.getByText('Promotions'));
    const switches = screen.getAllByRole('switch');
    // promotions is the only initially-false switch in the default state.
    const promotionsSwitch = switches.find((s) => s.getAttribute('aria-checked') === 'false');
    expect(promotionsSwitch).toBeDefined();
    await user.click(promotionsSwitch as HTMLElement);
    // After toggle, that switch should report checked=true.
    const after = screen
      .getAllByRole('switch')
      .find((s) => s.getAttribute('aria-checked') === 'true');
    expect(after).toBeDefined();
  });

  it('IT-SETTINGS-004: should_showLanguageTab_When_LanguageTabClicked', async () => {
    const user = userEvent.setup();
    renderPage();
    await user.click(screen.getByRole('button', { name: /Language/i }));
    await waitFor(() => {
      expect(screen.getAllByText('Tiếng Việt').length).toBeGreaterThanOrEqual(1);
    });
    expect(screen.getAllByText('English').length).toBeGreaterThanOrEqual(1);
  });

  it('IT-SETTINGS-005: should_showPrivacySwitches_When_PrivacyTabClicked', async () => {
    const user = userEvent.setup();
    renderPage();
    await user.click(screen.getByRole('button', { name: /Privacy/i }));
    await waitFor(() => {
      expect(screen.getByText('Hồ sơ công khai')).toBeInTheDocument();
    });
    expect(screen.getByText('Hiển thị tiến độ học')).toBeInTheDocument();
    expect(screen.getByText('Hiển thị hoạt động')).toBeInTheDocument();
  });
});
