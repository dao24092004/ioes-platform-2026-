/** Wave 3A (instructor) — Integration: DashboardPage (`/instructor`). */
import '@testing-library/jest-dom/vitest';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, waitFor, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

import { useAuthStore } from '@/app/store/authStore';
import { examApi, type Exam, type GradingQueueItem } from '@/services/api/exam.api';
import { analyticsApi, type LeaderboardEntry } from '@/services/api/analytics.api';

// ---------------------------------------------------------------------------
// i18next mock — self-contained, keyed exactly as DashboardPage consumes it.
// ---------------------------------------------------------------------------
vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string, opts?: Record<string, unknown>) => {
      const map: Record<string, string> = {
        'instructor.dashboard.title': 'Dashboard Giảng viên',
        'instructor.dashboard.subtitle': 'Tổng quan hoạt động giảng dạy của bạn',
        'instructor.dashboard.welcomeGreeting': 'Chào buổi sáng',
        'instructor.dashboard.welcomeTitle': 'Chào mừng',
        'instructor.dashboard.myCourses': 'Khóa học của tôi',
        'instructor.dashboard.viewAll': 'Xem tất cả',
        'instructor.dashboard.quickActions': 'Thao tác nhanh',
        'instructor.dashboard.topStudents': 'Top học viên',
        'instructor.dashboard.recentActivity': 'Hoạt động gần đây',
        'instructor.dashboard.stats.exams': 'Bài thi',
        'instructor.dashboard.aiQuestion': 'Tạo câu hỏi AI',
        'instructor.course.create': 'Tạo khóa học mới',
        'instructor.grading.title': 'Chấm điểm',
        'instructor.analytics.title': 'Phân tích',
        'student.exams.type.practice': 'Luyện tập',
        'student.exams.type.graded': 'Có điểm',
        'student.exams.type.certification': 'Chứng chỉ',
        'shared.durationUnit': 'phút',
        'shared.none': '—',
        'common.loadError': 'Không tải được dữ liệu. Thử lại sau.',
        'common.noData': 'Chưa có dữ liệu',
        'examApi.instructorDashboard.stats.pending': 'Bài chờ chấm',
        'examApi.instructorDashboard.stats.graded': 'Bài đã chấm',
        'examApi.instructorDashboard.stats.proctored': 'Đề có giám thị',
        'examApi.instructorDashboard.myExams': 'Bài thi của bạn',
        'examApi.instructorDashboard.noCourseApi': 'Chưa có API danh sách khoá học của giảng viên.',
        'examApi.instructorDashboard.noExams': 'Bạn chưa có bài thi nào',
        'examApi.instructorDashboard.leaderboardScope': 'Bảng xếp hạng tuần của toàn nền tảng.',
        'examApi.instructorDashboard.noPending': 'Không có bài chờ chấm',
        'examApi.instructorDashboard.pendingCount': 'Bài chờ chấm',
        'examApi.instructorDashboard.examsCompleted': 'bài đã làm',
        'examApi.instructorDashboard.noActivityApi': 'Chưa có API hoạt động gần đây.',
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
      const count = opts?.count;
      return typeof count === 'number' ? `${base} (${count})` : base;
    },
    i18n: { language: 'vi', changeLanguage: vi.fn() },
  }),
}));

import DashboardPage from '@/pages/instructor/DashboardPage';

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
  isProctored: false,
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

const leaderboardEntry = (over: Partial<LeaderboardEntry> = {}): LeaderboardEntry => ({
  userId: 'u-1',
  displayName: 'Nguyen Van A',
  avatarUrl: null,
  score: 98,
  rank: 1,
  rankDelta: 2,
  period: 'WEEKLY',
  examsCompleted: 7,
  avgExamScore: 88,
  currentStreak: 4,
  longestStreak: 9,
  coursesCompleted: 2,
  lastActivityAt: null,
  ...over,
});

/** Read the "value" text rendered inside a StatCard by its label. */
const statValueFor = (label: string): string => {
  // Scoped to the stat row: several of these labels are reused by the
  // InstructorLayout nav (e.g. "Bài thi" is both the Exams nav item and the
  // "Exams" KPI label), so a page-wide getByText would be ambiguous.
  const statsSection = screen.getByTestId('instructor-dashboard-stats');
  const labelEl = within(statsSection).getByText(label);
  const card = labelEl.parentElement as HTMLElement;
  return (card.firstElementChild as HTMLElement).textContent ?? '';
};

let listExams: ReturnType<typeof vi.fn>;
let getGradingStats: ReturnType<typeof vi.fn>;
let getGradingQueue: ReturnType<typeof vi.fn>;
let getLeaderboard: ReturnType<typeof vi.fn>;

const renderPage = () => {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false, gcTime: 0 } },
  });
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={['/instructor']}>
        <DashboardPage />
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
  getLeaderboard = vi.fn().mockResolvedValue([]);

  vi.spyOn(examApi, 'listExams').mockImplementation(listExams);
  vi.spyOn(examApi, 'getGradingStats').mockImplementation(getGradingStats);
  vi.spyOn(examApi, 'getGradingQueue').mockImplementation(getGradingQueue);
  vi.spyOn(analyticsApi, 'getLeaderboard').mockImplementation(getLeaderboard);
});

// ---------------------------------------------------------------------------
// IT-INSTRDASH-001 — sections, KPIs and LOCKED LOGIC pendingByExam
// ---------------------------------------------------------------------------
describe('IT-INSTRDASH-001: DashboardPage main content', () => {
  it('IT-INSTRDASH-001: should render the exam list with per-exam pending counts and the leaderboard when data loads', async () => {
    listExams.mockResolvedValue([
      exam('e-1', { title: 'React Midterm', isProctored: true }),
      exam('e-2', { title: 'Node Final', isProctored: false, timeLimitMinutes: null }),
    ]);
    getGradingStats.mockResolvedValue({ pending: 3, graded: 12, oldestPendingSubmittedAt: null });
    // Two attempts for e-1, none for e-2 — exercises the pendingByExam map.
    getGradingQueue.mockResolvedValue([queueItem('e-1'), queueItem('e-1', { attemptId: 'att-2' })]);
    getLeaderboard.mockResolvedValue([leaderboardEntry()]);

    renderPage();

    await waitFor(() => {
      expect(screen.getAllByTestId('instructor-dashboard-exam-item')).toHaveLength(2);
    });

    // h1 comes from InstructorLayout and the greeting greets the seeded user.
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('Dashboard Giảng viên');
    expect(screen.getByRole('heading', { name: 'Giang Vien Mot' })).toBeInTheDocument();

    // KPI cards: 2 exams, 1 of them proctored, 3 pending and 12 graded.
    expect(statValueFor('Bài thi')).toBe('2');
    expect(statValueFor('Đề có giám thị')).toBe('1');
    expect(statValueFor('Bài chờ chấm')).toBe('3');
    expect(statValueFor('Bài đã chấm')).toBe('12');

    const examList = screen.getByTestId('instructor-dashboard-exam-list');
    expect(within(examList).getByText('React Midterm')).toBeInTheDocument();
    expect(within(examList).getByText('Node Final')).toBeInTheDocument();
    // LOCKED LOGIC (pendingByExam, DashboardPage.tsx:40): only e-1 has queue rows.
    expect(within(examList).getByText('Bài chờ chấm (2)')).toHaveAttribute(
      'href',
      '/instructor/grading'
    );
    expect(within(examList).getByText('Không có bài chờ chấm')).toBeInTheDocument();

    // LOCKED LOGIC (getInitials, DashboardPage.tsx:379): the first two
    // whitespace-separated words of "Nguyen Van A" give "NV" (the third word
    // "A" is sliced off), upper-cased.
    const leaderboard = screen.getByTestId('instructor-dashboard-leaderboard');
    expect(
      within(leaderboard).getByTestId('instructor-dashboard-leaderboard-item')
    ).toHaveTextContent('NV');
    expect(within(leaderboard).getByText('Nguyen Van A')).toBeInTheDocument();

    // Quick actions carry the four documented hrefs.
    const quickActions = screen.getByTestId('instructor-dashboard-quick-actions');
    expect(within(quickActions).getByRole('link', { name: /Tạo khóa học/ })).toHaveAttribute(
      'href',
      '/instructor/courses/create'
    );
    expect(within(quickActions).getByRole('link', { name: /Chấm điểm/ })).toHaveAttribute(
      'href',
      '/instructor/grading'
    );
    expect(within(quickActions).getByRole('link', { name: /Tạo câu hỏi AI/ })).toHaveAttribute(
      'href',
      '/instructor/ai-question'
    );
    expect(within(quickActions).getByRole('link', { name: 'Phân tích' })).toHaveAttribute(
      'href',
      '/instructor/analytics'
    );
  });
});

// ---------------------------------------------------------------------------
// IT-INSTRDASH-002 — empty and error states
// ---------------------------------------------------------------------------
describe('IT-INSTRDASH-002: DashboardPage empty and error states', () => {
  it('IT-INSTRDASH-002: should render the no-exams and no-leaderboard empty states when every read returns empty', async () => {
    renderPage();

    await waitFor(() => {
      expect(screen.getByText('Bạn chưa có bài thi nào')).toBeInTheDocument();
    });

    // "My courses" and "recent activity" have no backend at all.
    expect(screen.getByText('Chưa có API danh sách khoá học của giảng viên.')).toBeInTheDocument();
    expect(screen.getByText('Chưa có API hoạt động gần đây.')).toBeInTheDocument();
    // Empty leaderboard -> the documented "no data" copy, not the error tone.
    expect(screen.getByText('Chưa có dữ liệu')).toBeInTheDocument();
    expect(screen.queryByTestId('instructor-dashboard-leaderboard')).not.toBeInTheDocument();
  });
});
