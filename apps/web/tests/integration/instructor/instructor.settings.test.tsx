/** Wave 3D — Integration: SettingsPage (instructor, /instructor/settings). */
import '@testing-library/jest-dom/vitest';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, within } from '@testing-library/react';
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

const SETTINGS_MISSING = ['No service stores instructor settings'];

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string, opts?: Record<string, unknown>) => {
      const strings: Record<string, string> = {
        'instructor.settings.title': 'Cài đặt',
        'instructor.settings.subtitle': 'Tuỳ chỉnh tuỳ chọn cho tài khoản giảng viên',
        'instructor.settings.section.general': 'Chung',
        'instructor.settings.section.teaching': 'Giảng dạy',
        'instructor.settings.section.notifications': 'Thông báo',
        'instructor.settings.section.integrations': 'Tích hợp',
        'instructor.settings.section.billing': 'Thanh toán',
        'instructor.settings.general.title': 'Cài đặt chung',
        'instructor.settings.general.language': 'Ngôn ngữ',
        'examApi.settings.languageNote': 'Ngôn ngữ được áp dụng ngay trên trình duyệt này.',
        'examApi.comingSoon.settings.description': 'Cài đặt này chưa được lưu ở đâu cả.',
        'comingSoon.badge': 'Sắp phát triển',
        'comingSoon.missingHeading': 'Còn thiếu',
        'comingSoon.noFakeData':
          'Trang này không hiển thị dữ liệu mẫu, để không ai nhầm là số liệu thật.',
        'sidebar.role.instructor': 'Giảng viên',
        'header.logout': 'Đăng xuất',
        'header.notifications': 'Thông báo',
        'header.toggleTheme': 'Đổi giao diện',
        'shared.menu': 'Menu',
      };
      if (opts?.returnObjects === true) {
        return key === 'examApi.comingSoon.settings.missing' ? SETTINGS_MISSING : [];
      }
      return strings[key] ?? key;
    },
    i18n: { language: 'vi', changeLanguage: vi.fn() },
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

import SettingsPage from '@/pages/instructor/SettingsPage';
import { apiClient } from '@/config/api.config';

beforeEach(() => {
  useAuthStore.setState({
    user: { id: 'u-inst-1', email: 'gv@ioes.com', full_name: 'Nguyễn Vân An', role: 'instructor' },
    accessToken: 't',
    refreshToken: 'r',
    isAuthenticated: true,
    isLoading: false,
  });
  vi.mocked(apiClient.get).mockReset();
  vi.mocked(apiClient.post).mockReset();
});

describe('SettingsPage — section switching', () => {
  it('IT-ISETTINGS-001: should show the language form for general and the ComingSoon box for each of the other four sections', async () => {
    const user = userEvent.setup();
    render(
      <QueryClientProvider client={new QueryClient()}>
        <MemoryRouter initialEntries={['/instructor/settings']}>
          <SettingsPage />
        </MemoryRouter>
      </QueryClientProvider>
    );

    const panel = screen.getByTestId('instructor-settings-panel');
    // Default section: the only one with a real control.
    expect(within(panel).getByTestId('instructor-settings-language')).toBeInTheDocument();
    expect(
      within(panel).getByText('Ngôn ngữ được áp dụng ngay trên trình duyệt này.')
    ).toBeInTheDocument();
    expect(within(panel).queryByTestId('coming-soon-title')).toBeNull();

    const sections = [
      { id: 'teaching', title: 'Giảng dạy' },
      { id: 'notifications', title: 'Thông báo' },
      { id: 'integrations', title: 'Tích hợp' },
      { id: 'billing', title: 'Thanh toán' },
    ] as const;

    for (const section of sections) {
      await user.click(screen.getByTestId(`instructor-settings-section-${section.id}`));
      // The language form is gone and the placeholder carries the section name.
      expect(within(panel).queryByTestId('instructor-settings-language'), section.id).toBeNull();
      expect(within(panel).getByTestId('coming-soon-title'), section.id).toHaveTextContent(
        section.title
      );
      expect(within(panel).getByText('Sắp phát triển'), section.id).toBeInTheDocument();
      expect(within(panel).getByText(SETTINGS_MISSING[0]!), section.id).toBeInTheDocument();
    }

    // Back to general: the form is the only panel that is persisted.
    await user.click(screen.getByTestId('instructor-settings-section-general'));
    expect(within(panel).getByTestId('instructor-settings-language')).toBeInTheDocument();
    expect(within(panel).queryByTestId('coming-soon-title')).toBeNull();

    // Nothing is saved anywhere: switching sections must not send a request.
    expect(apiClient.get).not.toHaveBeenCalled();
    expect(apiClient.post).not.toHaveBeenCalled();
  });
});
