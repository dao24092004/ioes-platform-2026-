/** Wave 3D — Integration: DiscussionsPage (instructor). */
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

const MISSING = [
  'Chưa có service backend cho thảo luận',
  'Chưa có bảng dữ liệu cho bài đăng và trả lời',
];

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string, opts?: Record<string, unknown>) => {
      const strings: Record<string, string> = {
        'comingSoon.discussion.title': 'Thảo luận',
        'comingSoon.discussion.description': 'Hỏi đáp theo khoá học giữa học viên và giảng viên.',
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
        return key === 'comingSoon.discussion.missing' ? MISSING : [];
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

import DiscussionsPage from '@/pages/instructor/DiscussionsPage';
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

describe('DiscussionsPage — ComingSoon copy at the per-course route', () => {
  it('IT-IDISCUSS-001: should render the discussion placeholder and both missing items without requesting any thread', async () => {
    render(
      <QueryClientProvider client={new QueryClient()}>
        <MemoryRouter initialEntries={['/instructor/discussions/c-1']}>
          <DiscussionsPage />
        </MemoryRouter>
      </QueryClientProvider>
    );

    const wrapper = screen.getByTestId('instructor-discussions-page');
    expect(within(wrapper).getByTestId('coming-soon-title')).toHaveTextContent('Thảo luận');
    expect(screen.getByText('Sắp phát triển')).toBeInTheDocument();
    expect(
      screen.getByText('Hỏi đáp theo khoá học giữa học viên và giảng viên.')
    ).toBeInTheDocument();
    expect(screen.getByText('Còn thiếu')).toBeInTheDocument();
    for (const item of MISSING) {
      expect(screen.getByText(item)).toBeInTheDocument();
    }

    // The `:courseId` segment is rendered but never consumed: no threads
    // endpoint is called, and nothing thread-shaped is printed.
    expect(apiClient.get).not.toHaveBeenCalled();
    expect(apiClient.post).not.toHaveBeenCalled();
    expect(screen.queryByText('c-1')).toBeNull();
  });
});
