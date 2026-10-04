/** Wave 3D — Integration: MessagesPage (instructor, /instructor/messages). */
import '@testing-library/jest-dom/vitest';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, within } from '@testing-library/react';
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

const MISSING = ['Chưa có service nhắn tin', 'Chưa có kênh thời gian thực cho hội thoại'];

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string, opts?: Record<string, unknown>) => {
      const strings: Record<string, string> = {
        'comingSoon.messages.title': 'Tin nhắn',
        'comingSoon.messages.description': 'Nhắn tin trực tiếp giữa học viên và giảng viên.',
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
        return key === 'comingSoon.messages.missing' ? MISSING : [];
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

import MessagesPage from '@/pages/instructor/MessagesPage';
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

describe('MessagesPage — ComingSoon copy', () => {
  it('IT-IMSG-001: should render the inbox placeholder and both missing items instead of a fake conversation list', async () => {
    render(
      <QueryClientProvider client={new QueryClient()}>
        <MemoryRouter initialEntries={['/instructor/messages']}>
          <MessagesPage />
        </MemoryRouter>
      </QueryClientProvider>
    );

    const wrapper = screen.getByTestId('instructor-messages-page');
    expect(within(wrapper).getByTestId('coming-soon-title')).toHaveTextContent('Tin nhắn');
    expect(screen.getByText('Sắp phát triển')).toBeInTheDocument();
    expect(screen.getByText('Nhắn tin trực tiếp giữa học viên và giảng viên.')).toBeInTheDocument();
    expect(screen.getByText('Còn thiếu')).toBeInTheDocument();
    for (const item of MISSING) {
      expect(screen.getByText(item)).toBeInTheDocument();
    }

    // No inbox is fetched and no conversation list is drawn: the only list in
    // the page body is the missing-items list of the placeholder. The sidebar
    // "5" badge belongs to the layout, not to any count from the API.
    expect(apiClient.get).not.toHaveBeenCalled();
    expect(apiClient.post).not.toHaveBeenCalled();
    expect(within(wrapper).getAllByRole('list')).toHaveLength(1);
    expect(within(wrapper).getAllByRole('listitem')).toHaveLength(MISSING.length);
  });
});
