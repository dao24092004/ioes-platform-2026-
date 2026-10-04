/** Wave 3D — Integration: CopyrightPage (instructor, /instructor/copyright). */
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

const MISSING = ['Chưa có backend cho đăng ký bản quyền', 'Chưa có dịch vụ đối chiếu đạo văn'];

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string, opts?: Record<string, unknown>) => {
      const strings: Record<string, string> = {
        'comingSoon.copyright.title': 'Bản quyền và chống đạo văn',
        'comingSoon.copyright.description':
          'Đăng ký quyền sở hữu nội dung, cấp phép và xử lý tranh chấp.',
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
      // `missing` is looked up with `{ returnObjects: true }`: i18next hands
      // the array back instead of a string, and `ComingSoon` calls
      // `missing.length` / `missing.map()` on it.
      if (opts?.returnObjects === true) {
        return key === 'comingSoon.copyright.missing' ? MISSING : [];
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

import CopyrightPage from '@/pages/instructor/CopyrightPage';
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

describe('CopyrightPage — ComingSoon copy', () => {
  it('IT-ICOPYRIGHT-001: should render the documented title, description, badge and both missing items without calling the API', async () => {
    render(
      <QueryClientProvider client={new QueryClient()}>
        <MemoryRouter initialEntries={['/instructor/copyright']}>
          <CopyrightPage />
        </MemoryRouter>
      </QueryClientProvider>
    );

    // The page wrapper plus the ComingSoon heading use the same title.
    const wrapper = screen.getByTestId('instructor-copyright-page');
    expect(within(wrapper).getByTestId('coming-soon-title')).toHaveTextContent(
      'Bản quyền và chống đạo văn'
    );
    expect(
      screen.getAllByRole('heading', { level: 1, name: 'Bản quyền và chống đạo văn' }).length
    ).toBe(2);

    expect(screen.getByText('Sắp phát triển')).toBeInTheDocument();
    expect(
      screen.getByText('Đăng ký quyền sở hữu nội dung, cấp phép và xử lý tranh chấp.')
    ).toBeInTheDocument();
    expect(screen.getByText('Còn thiếu')).toBeInTheDocument();
    for (const item of MISSING) {
      expect(screen.getByText(item)).toBeInTheDocument();
    }
    expect(
      screen.getByText('Trang này không hiển thị dữ liệu mẫu, để không ai nhầm là số liệu thật.')
    ).toBeInTheDocument();

    // The wrapper used to fabricate copyright statistics. It must issue no
    // request at all now, so a stale cache can never show invented numbers.
    expect(apiClient.get).not.toHaveBeenCalled();
    expect(apiClient.post).not.toHaveBeenCalled();
  });
});
