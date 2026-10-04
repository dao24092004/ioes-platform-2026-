/** Wave 3A (instructor) — Integration: ReportsPage (`/instructor/reports`). */
import '@testing-library/jest-dom/vitest';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

import { useAuthStore } from '@/app/store/authStore';

// ---------------------------------------------------------------------------
// i18next mock — self-contained. `returnObjects: true` mirrors what the page
// asks for so the missing-items list reaches ComingSoon as a string[].
// ---------------------------------------------------------------------------
vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string, opts?: Record<string, unknown>) => {
      const map: Record<string, string | string[]> = {
        'instructor.reports.title': 'Báo cáo',
        'instructor.reports.subtitle': 'Phân tích chi tiết hiệu quả giảng dạy và doanh thu',
        'comingSoon.badge': 'Sắp phát triển',
        'comingSoon.missingHeading': 'Còn thiếu',
        'comingSoon.noFakeData':
          'Trang này không hiển thị dữ liệu mẫu, để không ai nhầm là số liệu thật.',
        'examApi.comingSoon.reports.title': 'Báo cáo giảng dạy',
        'examApi.comingSoon.reports.description':
          'Báo cáo ghi danh, hoàn thành, doanh thu và tương tác theo khoảng thời gian.',
        'examApi.comingSoon.reports.missing': [
          'Chưa có service tổng hợp số liệu theo giảng viên và theo thời gian',
          'Chưa có payment-service cho doanh thu',
        ],
        // InstructorLayout chrome
        'instructor.nav.overview': 'Tổng quan',
        'instructor.nav.community': 'Cộng đồng',
        'instructor.nav.create': 'Tạo mới',
        'instructor.nav.analytics': 'Phân tích',
        'instructor.nav.aiTools': 'AI Tools',
        'instructor.nav.account': 'Tài khoản',
        'instructor.nav.dashboard': 'Dashboard',
        'instructor.nav.myCourses': 'Khóa học của tôi',
        'instructor.nav.exams': 'Bài thi',
        'instructor.nav.students': 'Học viên',
        'instructor.nav.discussions': 'Thảo luận',
        'instructor.nav.messages': 'Tin nhắn',
        'instructor.nav.createCourse': 'Tạo khóa học',
        'instructor.nav.createExam': 'Tạo đề thi',
        'instructor.nav.stats': 'Thống kê',
        'instructor.nav.reports': 'Báo cáo',
        'instructor.nav.grading': 'Chấm điểm',
        'instructor.nav.aiQuestion': 'Tạo câu hỏi AI',
        'instructor.nav.aiAssistant': 'AI Assistant',
        'instructor.nav.copyright': 'Bản quyền',
        'instructor.nav.profile': 'Hồ sơ',
        'instructor.nav.settings': 'Cài đặt',
        'sidebar.role.instructor': 'Giảng viên',
        'shared.menu': 'Menu',
        'header.toggleTheme': 'Đổi giao diện',
        'header.notifications': 'Thông báo',
        'header.logout': 'Đăng xuất',
      };
      const result = map[key];
      if (Array.isArray(result)) return result;
      if (typeof result === 'string') return result;
      if (opts && 'returnObjects' in opts && opts.returnObjects === true) return [];
      return key;
    },
    i18n: { language: 'vi', changeLanguage: vi.fn() },
  }),
}));

import ReportsPage from '@/pages/instructor/ReportsPage';

const renderPage = () => {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false, gcTime: 0 } },
  });
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={['/instructor/reports']}>
        <ReportsPage />
      </MemoryRouter>
    </QueryClientProvider>
  );
};

beforeEach(() => {
  useAuthStore.setState({
    user: {
      id: 'i-1',
      email: 'gv@ioes.com',
      full_name: 'Giang Vien Mot',
      role: 'instructor',
      avatar_url: null,
    },
    accessToken: 'instructor-token',
    refreshToken: 'refresh-token',
    isAuthenticated: true,
    isLoading: false,
  });
});

// ---------------------------------------------------------------------------
// IT-IREPORTS-001 — the ComingSoon block renders inside <main>
// ---------------------------------------------------------------------------
describe('IT-IREPORTS-001: ReportsPage ComingSoon block', () => {
  it('IT-IREPORTS-001: should render the layout title, the ComingSoon heading, the badge and both missing items', () => {
    renderPage();

    // Two h1s exist by design: the InstructorLayout header title and the
    // ComingSoon heading. Assert both rather than assuming a single h1.
    const h1s = screen.getAllByRole('heading', { level: 1 });
    expect(h1s).toHaveLength(2);
    expect(h1s.map((h) => h.textContent)).toEqual(
      expect.arrayContaining(['Báo cáo', 'Báo cáo giảng dạy'])
    );

    const block = screen.getByTestId('instructor-reports-coming-soon');
    expect(block).toBeInTheDocument();

    // ComingSoon exposes its own heading as coming-soon-title (h1).
    expect(screen.getByTestId('coming-soon-title')).toHaveTextContent('Báo cáo giảng dạy');
    expect(screen.getByText('Sắp phát triển')).toBeInTheDocument();
    expect(
      screen.getByText(
        'Báo cáo ghi danh, hoàn thành, doanh thu và tương tác theo khoảng thời gian.'
      )
    ).toBeInTheDocument();

    // The missing-items list is rendered as two bullet <li> items.
    expect(screen.getByText('Còn thiếu')).toBeInTheDocument();
    expect(
      screen.getByText('Chưa có service tổng hợp số liệu theo giảng viên và theo thời gian')
    ).toBeInTheDocument();
    expect(screen.getByText('Chưa có payment-service cho doanh thu')).toBeInTheDocument();

    // The whole block lives inside the layout's <main> landmark.
    const main = screen.getByRole('main');
    expect(main).toContainElement(block);
  });
});

// ---------------------------------------------------------------------------
// IT-IREPORTS-002 — the page shows no fabricated report data
// ---------------------------------------------------------------------------
describe('IT-IREPORTS-002: ReportsPage shows no fabricated data', () => {
  it('IT-IREPORTS-002: should render no figures, chart or download control and state that no sample data is shown', () => {
    renderPage();

    // Scoped to the ComingSoon block: the InstructorLayout chrome legitimately
    // contains nav/theme SVG icons, which say nothing about the report body.
    const block = screen.getByTestId('instructor-reports-coming-soon');
    expect(block.querySelector('table')).toBeNull();
    expect(block.querySelector('canvas')).toBeNull();
    expect(block.querySelector('svg')).toBeNull();
    // No download/export control anywhere in the block.
    expect(within(block).queryByRole('link')).not.toBeInTheDocument();
    expect(within(block).queryByRole('button')).not.toBeInTheDocument();
    expect(screen.queryByRole('link', { name: /Tải|Export|download/i })).not.toBeInTheDocument();

    // ComingSoon's own footer states this explicitly.
    expect(
      screen.getByText('Trang này không hiển thị dữ liệu mẫu, để không ai nhầm là số liệu thật.')
    ).toBeInTheDocument();
  });
});
