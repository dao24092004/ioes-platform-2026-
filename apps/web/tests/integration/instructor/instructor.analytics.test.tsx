/** Wave 3A (instructor) — Integration: AnalyticsPage (`/instructor/analytics`). */
import '@testing-library/jest-dom/vitest';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, waitFor, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

import { useAuthStore } from '@/app/store/authStore';
import { examApi, type Exam, type GradingQueueItem } from '@/services/api/exam.api';

// ---------------------------------------------------------------------------
// i18next mock — self-contained, keyed exactly as AnalyticsPage consumes it.
// ---------------------------------------------------------------------------
vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string, opts?: Record<string, unknown>) => {
      const map: Record<string, string> = {
        'instructor.analytics.title': 'Phân tích',
        'instructor.analytics.subtitle': 'Thống kê và phân tích hiệu quả giảng dạy',
        'instructor.analytics.charts.enrollmentTrend': 'Xu hướng ghi danh',
        'instructor.dashboard.stats.exams': 'Bài thi',
        'student.exams.type.practice': 'Luyện tập',
        'student.exams.type.graded': 'Có điểm',
        'student.exams.type.certification': 'Chứng chỉ',
        'shared.durationUnit': 'phút',
        'shared.none': '—',
        'shared.on': 'Bật',
        'shared.off': 'Tắt',
        'common.loadError': 'Không tải được dữ liệu. Thử lại sau.',
        'examApi.instructorDashboard.stats.pending': 'Bài chờ chấm',
        'examApi.instructorDashboard.stats.graded': 'Bài đã chấm',
        'examApi.instructorDashboard.myExams': 'Bài thi của bạn',
        'examApi.instructorDashboard.noExams': 'Bạn chưa có bài thi nào',
        'examApi.grading.stats.oldestPending': 'Bài chờ lâu nhất nộp',
        'examApi.instructorAnalytics.noTimeSeries': 'Chưa có biểu đồ.',
        'examApi.instructorAnalytics.proctored': 'Giám thị',
        'examAdmin.table.exam': 'Bài thi',
        'examAdmin.table.duration': 'Thời lượng',
        'examApi.adminExams.table.type': 'Loại đề',
        'shared.justNow': 'vừa xong',
        'shared.minutesAgo': '{{n}} phút trước',
        'shared.hoursAgo': '{{n}} giờ trước',
        'shared.daysAgo': '{{n}} ngày trước',
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
      const base = map[key];
      if (base === undefined) return key;
      const n = opts?.n;
      return typeof n === 'number' ? base.replace('{{n}}', String(n)) : base;
    },
    i18n: { language: 'vi', changeLanguage: vi.fn() },
  }),
}));

import AnalyticsPage from '@/pages/instructor/AnalyticsPage';

// ---------------------------------------------------------------------------
// Fixtures / helpers
// ---------------------------------------------------------------------------

const exam = (id: string, over: Partial<Exam> = {}): Exam => ({
  id,
  courseId: 'c-1',
  instructorId: 'i-1',
  title: `Exam ${id}`,
  description: null,
  examType: 'graded',
  timeLimitMinutes: 45,
  passingScore: 60,
  maxAttempts: 3,
  isRandomized: true,
  showResults: false,
  isProctored: true,
  metadata: {},
  createdAt: '2026-08-30T00:00:00Z',
  updatedAt: '2026-09-02T00:00:00Z',
  deletedAt: null,
  version: 1,
  ...over,
});

const queueItem = (examId: string, over: Partial<GradingQueueItem> = {}): GradingQueueItem => ({
  attemptId: `att-${examId}`,
  examId,
  userId: 'u-1',
  submittedAt: '2026-10-01T00:00:00Z',
  waitingSeconds: 120,
  score: null,
  maxScore: null,
  ...over,
});

/** Read the KPI "value" text rendered in a KpiCard by its label. */
const kpiValueFor = (label: string): string => {
  // Scoped to the KPI row: "Bài thi" is also the InstructorLayout nav label
  // for Exams, so a page-wide getByText would match both.
  const kpis = screen.getByTestId('instructor-analytics-kpis');
  const labelEl = within(kpis).getByText(label);
  const card = labelEl.parentElement as HTMLElement;
  return (card.firstElementChild as HTMLElement).textContent ?? '';
};

let listExams: ReturnType<typeof vi.fn>;
let getGradingStats: ReturnType<typeof vi.fn>;
let getGradingQueue: ReturnType<typeof vi.fn>;

const renderPage = () => {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false, gcTime: 0 } },
  });
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={['/instructor/analytics']}>
        <AnalyticsPage />
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

  listExams = vi.fn().mockResolvedValue([]);
  getGradingStats = vi.fn().mockResolvedValue({
    pending: 0,
    graded: 0,
    oldestPendingSubmittedAt: null,
  });
  getGradingQueue = vi.fn().mockResolvedValue([]);

  vi.spyOn(examApi, 'listExams').mockImplementation(listExams);
  vi.spyOn(examApi, 'getGradingStats').mockImplementation(getGradingStats);
  vi.spyOn(examApi, 'getGradingQueue').mockImplementation(getGradingQueue);
});

// ---------------------------------------------------------------------------
// IT-IANALYTICS-001 — KPI row, the no-time-series block and LOCKED pendingByExam
// ---------------------------------------------------------------------------
describe('IT-IANALYTICS-001: AnalyticsPage main content', () => {
  it('IT-IANALYTICS-001: should render KPIs and one table row per exam with its pending count', async () => {
    listExams.mockResolvedValue([
      exam('e-1', {
        title: 'React Midterm',
        examType: 'graded',
        timeLimitMinutes: 45,
        isProctored: true,
      }),
      exam('e-2', {
        title: 'Node Final',
        examType: 'practice',
        timeLimitMinutes: null,
        isProctored: false,
      }),
    ]);
    getGradingStats.mockResolvedValue({ pending: 2, graded: 9, oldestPendingSubmittedAt: null });
    // Only e-1 has queue rows — the second row must fall back to 0.
    getGradingQueue.mockResolvedValue([queueItem('e-1'), queueItem('e-1', { attemptId: 'att-2' })]);

    renderPage();

    await waitFor(() => {
      expect(screen.getAllByTestId('instructor-analytics-row')).toHaveLength(2);
    });

    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('Phân tích');
    // KPIs: exam count, pending, graded, and the em-dash when nothing is pending.
    expect(kpiValueFor('Bài thi')).toBe('2');
    expect(kpiValueFor('Bài chờ chấm')).toBe('2');
    expect(kpiValueFor('Bài đã chấm')).toBe('9');
    expect(kpiValueFor('Bài chờ lâu nhất nộp')).toBe('—');

    // The page states plainly that no time-series endpoint exists.
    expect(screen.getByTestId('instructor-analytics-trend-empty')).toHaveTextContent(
      'Chưa có biểu đồ.'
    );

    const rows = screen.getByTestId('instructor-analytics-rows');
    const [first, second] = within(rows).getAllByTestId('instructor-analytics-row');
    expect(first).toHaveTextContent('React Midterm');
    expect(first).toHaveTextContent('Có điểm');
    expect(first).toHaveTextContent('45 phút');
    expect(first).toHaveTextContent('Bật');
    // LOCKED LOGIC (pendingByExam, AnalyticsPage.tsx:35).
    expect(first).toHaveTextContent('2');

    expect(second).toHaveTextContent('Node Final');
    expect(second).toHaveTextContent('Luyện tập');
    // timeLimitMinutes === null renders the em-dash, not "null phút".
    expect(second).toHaveTextContent('—');
    expect(second).toHaveTextContent('Tắt');
    expect(second).toHaveTextContent('0');
  });
});

// ---------------------------------------------------------------------------
// IT-IANALYTICS-002 — empty and error states
// ---------------------------------------------------------------------------
describe('IT-IANALYTICS-002: AnalyticsPage empty and error states', () => {
  it('IT-IANALYTICS-002: should render the no-exams copy in the table and the em-dash KPIs when the instructor has no exams', async () => {
    renderPage();

    await waitFor(() => {
      expect(screen.getByText('Bạn chưa có bài thi nào')).toBeInTheDocument();
    });

    expect(kpiValueFor('Bài thi')).toBe('0');
    expect(kpiValueFor('Bài chờ chấm')).toBe('0');
    expect(kpiValueFor('Bài đã chấm')).toBe('0');
    // No exam rows at all in the empty state.
    expect(screen.queryAllByTestId('instructor-analytics-row')).toHaveLength(0);
  });
});
