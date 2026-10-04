/** Wave 3A (instructor) — Integration: StudentsPage (`/instructor/students`). */
import '@testing-library/jest-dom/vitest';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, waitFor, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

import { useAuthStore } from '@/app/store/authStore';
import { contentApi, type StudentEnrollment } from '@/services/api/content.api';

// ---------------------------------------------------------------------------
// i18next mock — self-contained, keyed exactly as StudentsPage consumes it.
// ---------------------------------------------------------------------------
vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string, opts?: Record<string, unknown>) => {
      const map: Record<string, string> = {
        'instructor.students.title': 'Học viên',
        'instructor.students.subtitle': 'Danh sách học viên đã đăng ký khóa học của bạn',
        'enrollmentApi.students.total': 'Tổng học viên',
        'enrollmentApi.students.completed': 'Đã hoàn thành',
        'enrollmentApi.students.avgProgress': 'Tiến độ trung bình',
        'enrollmentApi.students.course': 'Khoá học',
        'enrollmentApi.students.allCourses': 'Tất cả khoá học của tôi',
        'enrollmentApi.students.student': 'Học viên',
        'enrollmentApi.students.unknownName': 'Không có tên',
        'enrollmentApi.students.empty': 'Chưa có học viên nào ghi danh.',
        'enrollmentApi.progress': 'Tiến độ',
        'enrollmentApi.enrolledAt': 'Ngày ghi danh',
        'enrollmentApi.status.active': 'Đang học',
        'enrollmentApi.status.completed': 'Hoàn thành',
        'enrollmentApi.status.cancelled': 'Đã huỷ',
        'enrollmentApi.status.expired': 'Hết hạn',
        'student.enrollment.status': 'Trạng thái',
        'common.loadError': 'Không tải được dữ liệu. Thử lại sau.',
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

import StudentsPage from '@/pages/instructor/StudentsPage';

// ---------------------------------------------------------------------------
// Fixtures / helpers
// ---------------------------------------------------------------------------

/** Build one `StudentEnrollment` row with only the fields the page reads. */
const student = (
  id: string,
  status: StudentEnrollment['enrollment']['status'],
  progressPercent: number,
  over: Partial<StudentEnrollment> = {}
): StudentEnrollment => ({
  enrollment: {
    id,
    courseId: 'c-1',
    userId: `u-${id}`,
    status,
    progressPercent,
    enrolledAt: '2026-01-02T00:00:00Z',
    completedAt: null,
    lastAccessedAt: null,
  },
  studentName: `Student ${id}`,
  studentEmail: `${id}@ioes.com`,
  courseTitle: 'React',
  ...over,
});

/** Read the "value" text rendered inside a StatCard by its label. */
const statValueFor = (label: string): string => {
  const labelEl = screen.getByText(label);
  // StatCard renders the value in the sibling div above the label.
  const card = labelEl.parentElement as HTMLElement;
  return (card.firstElementChild as HTMLElement).textContent ?? '';
};

let listStudents: ReturnType<typeof vi.fn>;
let listCourses: ReturnType<typeof vi.fn>;

const renderPage = () => {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false, gcTime: 0 } },
  });
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={['/instructor/students']}>
        <StudentsPage />
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

  listStudents = vi.fn().mockResolvedValue([]);
  listCourses = vi.fn().mockResolvedValue({
    data: [{ id: 'c-1', title: 'React' }],
    meta: { total: 1, page: 1, perPage: 100, totalPages: 1 },
  });
  vi.spyOn(contentApi, 'listStudents').mockImplementation(listStudents);
  vi.spyOn(contentApi, 'listCourses').mockImplementation(listCourses);
});

// ---------------------------------------------------------------------------
// IT-STUDENTS-001 — LOCKED LOGIC: the `stats` useMemo (StudentsPage.tsx:38)
// ---------------------------------------------------------------------------
describe('IT-STUDENTS-001: StudentsPage stat cards', () => {
  it('IT-STUDENTS-001: should render total, completed and Math.round average progress when students are loaded', async () => {
    // 100 + 50 + 25 = 175 / 3 = 58.33 -> Math.round -> 58
    listStudents.mockResolvedValue([
      student('en-1', 'completed', 100),
      student('en-2', 'active', 50),
      student('en-3', 'active', 25),
    ]);

    renderPage();

    await waitFor(() => {
      expect(screen.getAllByTestId('instructor-students-row')).toHaveLength(3);
    });

    expect(statValueFor('Tổng học viên')).toBe('3');
    // Only status === 'completed' counts — 'active' students with 100% would not.
    expect(statValueFor('Đã hoàn thành')).toBe('1');
    expect(statValueFor('Tiến độ trung bình')).toBe('58%');
  });
});

// ---------------------------------------------------------------------------
// IT-STUDENTS-002 — LOCKED LOGIC: the 0-when-no-students boundary
// ---------------------------------------------------------------------------
describe('IT-STUDENTS-002: StudentsPage stat cards with no students', () => {
  it('IT-STUDENTS-002: should render 0, 0 and 0% and the empty state when there are no students', async () => {
    listStudents.mockResolvedValue([]);

    renderPage();

    await waitFor(() => {
      expect(screen.getByText('Chưa có học viên nào ghi danh.')).toBeInTheDocument();
    });

    // Explicit `total ? ... : 0` branch — must not be NaN.
    expect(statValueFor('Tổng học viên')).toBe('0');
    expect(statValueFor('Đã hoàn thành')).toBe('0');
    expect(statValueFor('Tiến độ trung bình')).toBe('0%');
  });
});

// ---------------------------------------------------------------------------
// IT-STUDENTS-003 — table rows, course filter and the unknown-name fallback
// ---------------------------------------------------------------------------
describe('IT-STUDENTS-003: StudentsPage table', () => {
  it('IT-STUDENTS-003: should render one row per student and the unknown-name fallback when the backend sends a null name', async () => {
    listStudents.mockResolvedValue([
      student('en-1', 'completed', 100),
      student('en-2', 'active', 40, { studentName: null, studentEmail: null }),
    ]);

    renderPage();

    await waitFor(() => {
      expect(screen.getAllByTestId('instructor-students-row')).toHaveLength(2);
    });

    expect(
      within(screen.getByTestId('instructor-students-rows')).getByText('Student en-1')
    ).toBeInTheDocument();
    // studentName is a nullable snapshot column — the page must fall back.
    expect(screen.getByText('Không có tên')).toBeInTheDocument();
    // The course filter offers "all courses" plus one option per course.
    const filter = screen.getByTestId('instructor-students-course-filter');
    expect(
      within(filter).getByRole('option', { name: 'Tất cả khoá học của tôi' })
    ).toBeInTheDocument();
    expect(within(filter).getByRole('option', { name: 'React' })).toBeInTheDocument();
  });
});

// ---------------------------------------------------------------------------
// IT-STUDENTS-004 — error state
// ---------------------------------------------------------------------------
describe('IT-STUDENTS-004: StudentsPage error state', () => {
  it('IT-STUDENTS-004: should render the load-error message and no table when the students read fails', async () => {
    listStudents.mockRejectedValue(new Error('Forbidden'));

    renderPage();

    await waitFor(() => {
      expect(screen.getByText('Không tải được dữ liệu. Thử lại sau.')).toBeInTheDocument();
    });

    expect(screen.queryByTestId('instructor-students-rows')).not.toBeInTheDocument();
  });
});
