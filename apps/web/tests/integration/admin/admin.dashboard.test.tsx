/** Wave 4A (admin) — Integration: AdminDashboardPage (`/admin`). */
import '@testing-library/jest-dom/vitest';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, waitFor, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

import { useAuthStore } from '@/app/store/authStore';
import {
  usersApi,
  type AdminUser,
  type PagedUsers,
  type UserStats,
} from '@/services/api/users.api';
import { analyticsApi, type AdminKpi } from '@/services/api/analytics.api';

// ---------------------------------------------------------------------------
// i18next mock — self-contained, keyed exactly as AdminDashboardPage and
// AdminLayout consume it.
// ---------------------------------------------------------------------------
vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string, opts?: Record<string, unknown>) => {
      const map: Record<string, string> = {
        'admin.dashboard.title': 'Bảng điều khiển Admin',
        'admin.dashboard.subtitle': 'Tổng quan toàn hệ thống và các chỉ số quan trọng',
        'admin.dashboard.recentUsers': 'Người dùng mới',
        'admin.dashboard.viewAll': 'Xem tất cả',
        'admin.dashboard.quickActions': 'Hành động nhanh',
        'admin.dashboard.recentActivity': 'Hoạt động gần đây',
        'admin.dashboard.systemStatus': 'Trạng thái hệ thống',
        'admin.noDataSource': 'Phần này chưa có nguồn dữ liệu',
        'shared.none': '—',
        'admin.stats.users': 'Người dùng',
        'admin.stats.allUsers': 'Tổng người dùng',
        'admin.analyticsKpi.passRate': 'Tỷ lệ đạt',
        'analytics.kpi.activeUsers': 'Người dùng hoạt động',
        'analytics.kpi.examSubmits': 'Bài thi nộp',
        'admin.quick.addUser': 'Thêm người dùng',
        'admin.quick.createCourse': 'Duyệt khóa học',
        'admin.quick.createExam': 'Duyệt bài thi',
        'admin.quick.deployToken': 'Triển khai Token',
        'admin.role.superAdmin': 'Super Admin',
        'admin.role.admin': 'Quản trị viên',
        'admin.role.instructor': 'Giảng viên',
        'admin.role.student': 'Học viên',
        'admin.role.guest': 'Khách',
        'admin.status.active': 'Đang hoạt động',
        'admin.status.pending': 'Chờ duyệt',
        'admin.status.suspended': 'Tạm khóa',
        'admin.status.deleted': 'Đã xóa',
        'admin.table.user': 'Người dùng',
        'admin.table.role': 'Vai trò',
        'admin.table.status': 'Trạng thái',
        'admin.table.joined': 'Ngày tham gia',
        'admin.users.noResults': 'Không tìm thấy người dùng',
        // AdminLayout chrome
        'admin.nav.overview': 'Tổng quan',
        'admin.nav.management': 'Quản lý',
        'admin.nav.analytics': 'Phân tích',
        'admin.nav.tenantsSection': 'Tổ chức',
        'admin.nav.system': 'Hệ thống',
        'admin.nav.dashboard': 'Bảng điều khiển',
        'admin.nav.users': 'Người dùng',
        'admin.nav.courses': 'Khóa học',
        'admin.nav.instructorApproval': 'Phê duyệt GV',
        'admin.nav.exams': 'Bài thi',
        'admin.nav.discussions': 'Thảo luận',
        'admin.nav.blockchain': 'Blockchain',
        'admin.nav.tenants': 'Danh sách tổ chức',
        'admin.nav.heatmaps': 'Heatmaps',
        'admin.nav.funnels': 'Funnels',
        'admin.nav.wallet': 'Ví token',
        'admin.nav.security': 'Bảo mật',
        'admin.nav.auditLog': 'Nhật ký',
        'admin.nav.notifications': 'Thông báo',
        'admin.nav.settings': 'Cài đặt',
        'header.logout': 'Đăng xuất',
        'header.toggleTheme': 'Đổi giao diện',
      };
      let out = map[key] ?? key;
      for (const [k, v] of Object.entries(opts ?? {})) {
        out = out.split(`{{${k}}}`).join(String(v));
      }
      return out;
    },
    i18n: { language: 'vi', changeLanguage: vi.fn() },
  }),
}));

import AdminDashboardPage from '@/pages/admin/AdminDashboardPage';

// ---------------------------------------------------------------------------
// Fixtures / helpers
// ---------------------------------------------------------------------------

const adminUser = (id: string, over: Partial<AdminUser> = {}): AdminUser => ({
  id,
  email: `${id}@ioes.com`,
  fullName: `User ${id}`,
  avatarUrl: null,
  phone: null,
  bio: null,
  role: 'student',
  status: 'active',
  emailVerified: false,
  mfaEnabled: false,
  lastLoginAt: null,
  lastLoginIp: null,
  createdAt: '2026-01-05T00:00:00Z',
  updatedAt: '2026-01-05T00:00:00Z',
  deletedAt: null,
  ...over,
});

const userStats = (over: Partial<UserStats> = {}): UserStats => ({
  total: 12_345,
  students: 10,
  instructors: 5,
  admins: 2,
  superAdmins: 1,
  suspended: 2,
  pending: 1,
  active: 15,
  ...over,
});

const adminKpi = (over: Partial<AdminKpi> = {}): AdminKpi => ({
  trackedUsers: 18,
  activeUsers: 1_234,
  activeWithinDays: 30,
  examAttempts: 3_400,
  examsPassed: 2_500,
  examsFailed: 900,
  passRate: 73.5,
  avgScore: 7.4,
  courseEnrollments: 96,
  courseCompletions: 40,
  studyMinutes: 12_500,
  ...over,
});

const paged = (data: AdminUser[]): PagedUsers => ({
  data,
  meta: { total: 18, page: 1, perPage: 4, totalPages: 5 },
});

let stats: ReturnType<typeof vi.fn>;
let getAdminKpi: ReturnType<typeof vi.fn>;
let list: ReturnType<typeof vi.fn>;

/** The four KPI values, indexed the same way the page's `statCards` array is. */
const statValue = (i: number): string =>
  screen.getByTestId(`admin-dashboard-stat-value-${i}`).textContent ?? '';

const statLabel = (i: number): string =>
  screen.getByTestId(`admin-dashboard-stat-label-${i}`).textContent ?? '';

const renderPage = () => {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false, gcTime: 0 } },
  });
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={['/admin']}>
        <AdminDashboardPage />
      </MemoryRouter>
    </QueryClientProvider>
  );
};

beforeEach(() => {
  useAuthStore.setState({
    user: {
      id: 'adm-1',
      email: 'admin@ioes.com',
      full_name: 'Quan Tri Vien',
      role: 'admin',
      avatar_url: null,
    },
    accessToken: 'admin-token',
    refreshToken: 'refresh-token',
    isAuthenticated: true,
    isLoading: false,
  });

  stats = vi.fn().mockResolvedValue(userStats());
  getAdminKpi = vi.fn().mockResolvedValue(adminKpi());
  list = vi.fn().mockResolvedValue(paged([]));

  vi.spyOn(usersApi, 'stats').mockImplementation(stats);
  vi.spyOn(usersApi, 'list').mockImplementation(list);
  vi.spyOn(analyticsApi, 'getAdminKpi').mockImplementation(getAdminKpi);
});

// ---------------------------------------------------------------------------
// IT-ADMDASH-001 — populated dashboard: KPI formatting + recent-users table
// ---------------------------------------------------------------------------
describe('IT-ADMDASH-001: AdminDashboardPage KPI cards and recent users', () => {
  it('IT-ADMDASH-001: should render the four locale-formatted KPI cards and one recent-user row per user with the role badge, the active-fallback status badge and a vi-VN joined date', async () => {
    list.mockResolvedValue(
      paged([
        adminUser('u-1', { fullName: 'Nguyen Van A', role: 'super_admin', status: 'active' }),
        adminUser('u-2', {
          fullName: 'Tran Thi B',
          role: 'instructor',
          status: 'suspended',
          avatarUrl: 'https://cdn.ioes.com/b.png',
        }),
        // Out-of-contract role and status: both fall back to the student/active
        // palette, and the status LABEL falls back too (unlike the users page).
        adminUser('u-3', {
          fullName: 'Le Quoc C',
          role: 'wizard' as AdminUser['role'],
          status: 'blocked' as AdminUser['status'],
        }),
      ])
    );

    renderPage();

    await waitFor(() => {
      expect(screen.getAllByTestId('admin-dashboard-recent-row')).toHaveLength(3);
    });

    // KPI cards. `toLocaleString()` is locale dependent, so the expectation is
    // computed the same way the page must compute it — a raw "12345" would fail.
    expect(statLabel(0)).toMatch(/^Người dùng$|^Users$/);
    expect(statValue(0)).toBe((12_345).toLocaleString());
    expect(statValue(1)).toBe((1_234).toLocaleString());
    expect(statValue(2)).toBe((3_400).toLocaleString());
    // LOCKED LOGIC (KPI formatting, :68) — passRate is a raw 0..100 number and
    // the page appends the percent sign itself; a pre-scaled value would be 7350%.
    expect(statValue(3)).toBe('73.5%');
    expect(statLabel(3)).toMatch(/^Tỷ lệ đạt$|^Pass rate$/);
    // The window the KPI read was asked for is part of the query key.
    expect(getAdminKpi).toHaveBeenCalledWith(30);
    // The recent-users read is fixed at four newest rows.
    expect(list).toHaveBeenCalledWith({ page: 1, perPage: 4, sort: 'newest' });

    const tbody = screen.getByTestId('admin-dashboard-recent-tbody');
    // Role badges: super_admin -> admin.role.superAdmin.
    expect(within(tbody).getByText('Super Admin')).toBeInTheDocument();
    expect(within(tbody).getByText(/^Giảng viên$|^Instructor$/)).toBeInTheDocument();
    // LOCKED LOGIC (roleBadge, :42) — the palette falls back to student but the
    // label still prints the raw key.
    expect(within(tbody).getByText('admin.role.wizard')).toBeInTheDocument();

    // LOCKED LOGIC (statusBadge, :48) — the fallback reuses the whole `active`
    // entry, so the unknown status reads "Active" instead of leaking a key.
    expect(within(tbody).getByText(/^Tạm khóa$|^Suspended$/)).toBeInTheDocument();
    expect(within(tbody).getAllByText(/^Đang hoạt động$|^Active$/)).toHaveLength(2);

    // LOCKED LOGIC (getInitials, :39) — "Nguyen Van A" -> "NV"; the row with an
    // avatarUrl renders the <img> instead of the initials block.
    expect(screen.getByTestId('admin-dashboard-recent-initials-u-1')).toHaveTextContent('NV');
    expect(screen.getByTestId('admin-dashboard-recent-avatar-u-2')).toHaveAttribute(
      'src',
      'https://cdn.ioes.com/b.png'
    );
    expect(screen.getByTestId('admin-dashboard-recent-initials-u-3')).toHaveTextContent('LQ');

    // LOCKED LOGIC (joined date, :165) — an explicit vi-VN locale, so the
    // rendered value is pinned to dd/MM/yyyy and not the browser default.
    const expectedJoined = new Date('2026-01-05T00:00:00Z').toLocaleDateString('vi-VN');
    expect(screen.getByTestId('admin-dashboard-recent-joined-u-1')).toHaveTextContent(
      expectedJoined
    );
    expect(expectedJoined).toMatch(/^\d{1,2}\/\d{1,2}\/\d{4}$/);

    // Every recent row links back to the full user list.
    expect(screen.getByTestId('admin-dashboard-recent-row-link-u-1')).toHaveAttribute(
      'href',
      '/admin/users'
    );
    expect(screen.getByTestId('admin-dashboard-view-all')).toHaveAttribute('href', '/admin/users');
  });
});

// ---------------------------------------------------------------------------
// IT-ADMDASH-002 — the `shared.none` placeholder for unresolved KPI reads
// ---------------------------------------------------------------------------
describe('IT-ADMDASH-002: AdminDashboardPage KPI placeholder', () => {
  it('IT-ADMDASH-002: should render the em-dash placeholder on all four KPI cards when both the stats and the KPI reads fail', async () => {
    stats.mockRejectedValue(new Error('Forbidden'));
    getAdminKpi.mockRejectedValue(new Error('Forbidden'));

    renderPage();

    await waitFor(() => {
      expect(screen.getByTestId('admin-dashboard-recent-empty')).toBeInTheDocument();
    });

    // The page has no isError branch for these two reads, so a failed read must
    // degrade to the placeholder rather than showing a stale zero.
    expect(statValue(0)).toBe('—');
    expect(statValue(1)).toBe('—');
    expect(statValue(2)).toBe('—');
    expect(statValue(3)).toBe('—');
    // The labels stay put so the grid never collapses.
    expect(statLabel(0)).toMatch(/^Người dùng$|^Users$/);
    expect([0, 1, 2, 3].map((i) => screen.getByTestId(`admin-dashboard-stat-${i}`))).toHaveLength(
      4
    );
  });
});

// ---------------------------------------------------------------------------
// IT-ADMDASH-003 — recent users loading guard and empty state
// ---------------------------------------------------------------------------
describe('IT-ADMDASH-003: AdminDashboardPage recent users loading and empty', () => {
  it('IT-ADMDASH-003: should not flash the no-results row while the recent read is in flight, then show it once the read resolves empty', async () => {
    let release: ((v: PagedUsers) => void) | undefined;
    list.mockImplementation(
      () =>
        new Promise<PagedUsers>((res) => {
          release = res;
        })
    );

    renderPage();

    // LOCKED LOGIC (empty-row guard, :139) — `!isRecentLoading && length === 0`.
    expect(screen.queryByTestId('admin-dashboard-recent-empty')).not.toBeInTheDocument();
    expect(screen.queryAllByTestId('admin-dashboard-recent-row')).toHaveLength(0);
    // The panel, its heading and the view-all link render immediately — only
    // the rows wait.
    expect(screen.getByTestId('admin-dashboard-recent-users')).toBeInTheDocument();
    expect(screen.getByText(/^Người dùng mới$|^New users$/)).toBeInTheDocument();

    release!(paged([]));

    await waitFor(() => {
      expect(screen.getByTestId('admin-dashboard-recent-empty')).toBeInTheDocument();
    });
    expect(screen.getByTestId('admin-dashboard-recent-empty')).toHaveTextContent(
      /Không tìm thấy người dùng|no users? found/i
    );
    expect(screen.queryAllByTestId('admin-dashboard-recent-row')).toHaveLength(0);
  });
});

// ---------------------------------------------------------------------------
// IT-ADMDASH-004 — quick actions, view-all link and the two no-source panels
// ---------------------------------------------------------------------------
describe('IT-ADMDASH-004: AdminDashboardPage quick actions and placeholder panels', () => {
  it('IT-ADMDASH-004: should render the four quick actions with their hrefs and both side panels with the documented no-data-source copy', async () => {
    renderPage();

    await waitFor(() => {
      expect(screen.getByTestId('admin-dashboard-quick-actions')).toBeInTheDocument();
    });

    const quick = screen.getByTestId('admin-dashboard-quick-actions');
    const actions = within(quick).getAllByTestId('admin-dashboard-quick-action');
    expect(actions).toHaveLength(4);
    // "Add user" and "Deploy token" have their own routes; the course and exam
    // shortcuts both point at the approval queue.
    expect(actions[0]).toHaveAttribute('href', '/admin/users');
    expect(actions[0]).toHaveTextContent(/^Thêm người dùng$|^Add user$/);
    expect(actions[1]).toHaveAttribute('href', '/admin/courses/approval');
    expect(actions[1]).toHaveTextContent(/khóa học|course/i);
    expect(actions[2]).toHaveAttribute('href', '/admin/courses/approval');
    expect(actions[2]).toHaveTextContent(/bài thi|exam/i);
    expect(actions[3]).toHaveAttribute('href', '/admin');
    expect(actions[3]).toHaveTextContent(/token/i);

    // Both right-hand panels exist but declare that no service publishes the
    // feed yet, rather than rendering a fabricated value.
    expect(screen.getByText(/^Hoạt động gần đây$|^Recent activity$/)).toBeInTheDocument();
    expect(screen.getByText(/^Trạng thái hệ thống$|^System status$/)).toBeInTheDocument();
    const placeholders = screen.getAllByTestId('admin-dashboard-no-data-source');
    expect(placeholders).toHaveLength(2);
    for (const p of placeholders) {
      expect(p).toHaveTextContent(/chưa có nguồn dữ liệu|no data source/i);
    }
  });
});
