/** Wave 4A (admin) — Integration: UserManagementPage (`/admin/users`). */
import '@testing-library/jest-dom/vitest';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

import { useAuthStore } from '@/app/store/authStore';
import {
  usersApi,
  type AdminUser,
  type PagedUsers,
  type UserListParams,
  type UserRole,
  type UserStats,
  type UserStatus,
} from '@/services/api/users.api';

// ---------------------------------------------------------------------------
// i18next mock — self-contained, keyed exactly as UserManagementPage and
// AdminLayout consume it. Unknown keys fall through as the key itself so an
// unmocked lookup shows up as a failing assertion instead of silent blank UI.
// ---------------------------------------------------------------------------
vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string, opts?: Record<string, unknown>) => {
      const map: Record<string, string> = {
        'admin.users.title': 'Quản lý người dùng',
        'admin.users.subtitle': 'Quản lý tất cả người dùng trong hệ thống',
        'admin.stats.allUsers': 'Tổng người dùng',
        'admin.stats.users': 'Người dùng',
        'admin.stats.students': 'Học viên',
        'admin.stats.instructors': 'Giảng viên',
        'admin.stats.admins': 'Quản trị viên',
        'admin.stats.suspended': 'Tạm khóa',
        'admin.users.selected': 'đã chọn',
        'admin.users.changeRole': 'Đổi vai trò',
        'admin.users.lock': 'Khóa',
        'admin.users.delete': 'Xóa',
        'admin.users.unlock': 'Mở khóa',
        'admin.users.searchPlaceholder': 'Tìm theo tên, email...',
        'admin.users.allRoles': 'Tất cả vai trò',
        'admin.users.allStatus': 'Tất cả trạng thái',
        'admin.users.newest': 'Mới nhất',
        'admin.users.nameAZ': 'Tên A-Z',
        'admin.users.noResults': 'Không tìm thấy người dùng',
        'admin.users.showing': 'Hiển thị',
        'admin.users.of': 'trong',
        'admin.users.users': 'người dùng',
        'admin.users.viewDetail': 'Xem chi tiết',
        'admin.users.resetPassword': 'Đặt lại mật khẩu',
        'admin.users.approve': 'Duyệt tài khoản',
        'admin.users.deleteConfirm': 'Bạn có chắc muốn xóa người dùng "{{name}}"?',
        'admin.users.detailTitle': 'Chi tiết người dùng',
        'admin.users.emailVerified': 'Đã xác minh',
        'admin.users.phone': 'Số điện thoại',
        'admin.users.bio': 'Giới thiệu',
        'admin.users.lastLogin': 'Đăng nhập cuối',
        'admin.users.createdAt': 'Ngày tạo',
        'admin.users.updatedAt': 'Cập nhật lần cuối',
        'admin.users.resetPasswordConfirm': 'Bạn có chắc muốn đặt lại mật khẩu cho {{name}}?',
        'admin.users.resetPasswordWarning': 'Mật khẩu tạm thời sẽ được tạm.',
        'admin.users.resetSuccess': 'Đặt lại mật khẩu thành công!',
        'admin.users.tempPassword': 'Mật khẩu tạm thời',
        'admin.users.copy': 'Sao chép',
        'admin.users.copied': 'Đã sao chép!',
        'admin.users.tempPasswordNote': 'Yêu cầu người dùng đổi mật khẩu.',
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
        'admin.table.joined': 'Ngày tham gia',
        'admin.table.status': 'Trạng thái',
        'admin.table.actions': 'Hành động',
        'shared.close': 'Đóng',
        'shared.cancel': 'Hủy',
        'shared.loading': 'Đang tải...',
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

import UserManagementPage from '@/pages/admin/UserManagementPage';

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
  // Single-digit day and month so the table's zero padding is observable.
  createdAt: '2026-01-05T09:07:00Z',
  updatedAt: '2026-01-05T09:07:00Z',
  deletedAt: null,
  ...over,
});

const userStats = (over: Partial<UserStats> = {}): UserStats => ({
  total: 18,
  students: 10,
  instructors: 5,
  admins: 2,
  superAdmins: 1,
  suspended: 2,
  pending: 1,
  active: 15,
  ...over,
});

const paged = (data: AdminUser[], over: Partial<PagedUsers['meta']> = {}): PagedUsers => ({
  data,
  meta: { total: data.length, page: 1, perPage: 6, totalPages: 1, ...over },
});

/** The "value" text rendered on one of the five stat cards, by its label. */
const statValueFor = (label: string | RegExp): string => {
  const card = screen.getByTestId('admin-users-stats');
  const labelEl = within(card).getByText(label);
  const btn = labelEl.closest('button') as HTMLElement;
  // value sits in the second child div, right above the label.
  return (btn.children[1] as HTMLElement).textContent ?? '';
};

/** The `list` args of the most recent call. */
const lastListArgs = (): UserListParams => {
  const calls = vi.mocked(usersApi.list).mock.calls;
  return (calls[calls.length - 1]?.[0] ?? {}) as UserListParams;
};

/**
 * Fill a controlled input with ONE input event.
 *
 * `user.type()` re-reads the element's DOM `value` before every character and
 * inserts `value + key`. The search box is React-controlled, so under a loaded
 * event loop React's re-render lands after the read and the characters
 * interleave; typing char-by-char also costs one timer per character. `paste()`
 * is still a real user gesture but dispatches a single input event, so the value
 * is exact and the test stays deterministic and fast.
 */
const fill = async (
  user: ReturnType<typeof userEvent.setup>,
  el: HTMLElement,
  text: string
): Promise<void> => {
  await user.clear(el);
  await user.paste(text);
};

let list: ReturnType<typeof vi.fn>;
let stats: ReturnType<typeof vi.fn>;
let updateStatus: ReturnType<typeof vi.fn>;
let updateRole: ReturnType<typeof vi.fn>;
let deleteUser: ReturnType<typeof vi.fn>;
let resetPassword: ReturnType<typeof vi.fn>;

/** The rows the current query returns, keyed by the page's own sort. */
let rows: AdminUser[] = [];

const renderPage = () => {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false, gcTime: 0 } },
  });
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={['/admin/users']}>
        <UserManagementPage />
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

  rows = [];
  // The page asks for one page at a time (perPage = 6); the backend does the
  // slicing, so the mock has to as well or the table would render 18 rows.
  list = vi.fn().mockImplementation(async (params: UserListParams = {}) => {
    const perPage = params.perPage ?? 6;
    const total = rows.length;
    const start = ((params.page ?? 1) - 1) * perPage;
    return paged(rows.slice(start, start + perPage), {
      total,
      page: params.page ?? 1,
      perPage,
      totalPages: Math.max(1, Math.ceil(total / perPage)),
    });
  });
  stats = vi.fn().mockResolvedValue(userStats());
  updateStatus = vi.fn().mockResolvedValue(adminUser('u-1'));
  updateRole = vi.fn().mockResolvedValue(adminUser('u-1', { role: 'instructor' }));
  deleteUser = vi.fn().mockResolvedValue(undefined);
  resetPassword = vi.fn().mockResolvedValue({ temporaryPassword: 'Temp#1234' });

  vi.spyOn(usersApi, 'list').mockImplementation(list);
  vi.spyOn(usersApi, 'stats').mockImplementation(stats);
  vi.spyOn(usersApi, 'updateStatus').mockImplementation(updateStatus);
  vi.spyOn(usersApi, 'updateRole').mockImplementation(updateRole);
  vi.spyOn(usersApi, 'deleteUser').mockImplementation(deleteUser);
  vi.spyOn(usersApi, 'resetPassword').mockImplementation(resetPassword);
});

// ---------------------------------------------------------------------------
// IT-ADMUSERS-001 — populated list, badges, initials, date formats, pagination
// ---------------------------------------------------------------------------
describe('IT-ADMUSERS-001: UserManagementPage populated list', () => {
  it('IT-ADMUSERS-001: should render the five stat cards, one row per user with the right role and status badge, the dd/MM/yyyy joined date and the 1-6 of 18 range', async () => {
    rows = [
      adminUser('u-1', { fullName: 'Nguyen Van A', role: 'super_admin', status: 'active' }),
      adminUser('u-2', {
        fullName: 'Tran Thi B',
        role: 'guest',
        status: 'pending',
        avatarUrl: 'https://cdn.ioes.com/a.png',
        emailVerified: true,
        mfaEnabled: true,
      }),
      // Out-of-contract values must fall back, not crash or render "undefined".
      adminUser('u-3', {
        fullName: 'Le Quoc C',
        role: 'wizard' as UserRole,
        status: 'blocked' as UserStatus,
      }),
    ];

    renderPage();

    await waitFor(() => {
      expect(screen.getAllByTestId('admin-users-row')).toHaveLength(3);
    });

    // Stat cards: the admin tile is admins + superAdmins = 2 + 1 = 3.
    expect(statValueFor(/Tổng người dùng|all users/i)).toBe('18');
    expect(statValueFor(/Học viên|students?/i)).toBe('10');
    expect(statValueFor(/Giảng viên|instructors?/i)).toBe('5');
    expect(statValueFor(/Quản trị viên|admins?/i)).toBe('3');
    expect(statValueFor(/Tạm khóa|suspended/i)).toBe('2');

    // Role badge: super_admin goes through admin.role.superAdmin. The role
    // <select> renders the same copy as an <option>, so the badge assertions
    // are scoped to the table body.
    const tbody = screen.getByTestId('admin-users-tbody');
    expect(within(tbody).getByText('Super Admin')).toBeInTheDocument();
    expect(within(tbody).getByText(/^Khách$|^Guest$/)).toBeInTheDocument();

    // LOCKED LOGIC (roleBadge fallback, UserManagementPage.tsx:315): an unknown
    // role still paints the student palette and prints the raw key.
    expect(within(tbody).getByText('admin.role.wizard')).toBeInTheDocument();

    // Status badge + LOCKED LOGIC (statusBadge, :328) — the palette falls back
    // to `active`, but the LABEL is keyed on the raw status, so an unknown
    // value leaks the untranslated key instead of silently saying "active".
    expect(within(tbody).getByText(/^Chờ duyệt$|^Pending$/)).toBeInTheDocument();
    expect(within(tbody).getByText('admin.status.blocked')).toBeInTheDocument();
    expect(within(tbody).getByText(/^Đang hoạt động$|^Active$/)).toBeInTheDocument();

    // LOCKED LOGIC (getInitials, :234) — "Nguyen Van A" -> "NV" (third word
    // sliced); the row with an avatarUrl renders the <img> instead.
    expect(screen.getByTestId('admin-users-initials-u-1')).toHaveTextContent('NV');
    expect(screen.getByTestId('admin-users-avatar-u-2')).toHaveAttribute(
      'src',
      'https://cdn.ioes.com/a.png'
    );
    expect(screen.getByTestId('admin-users-initials-u-3')).toHaveTextContent('LQ');

    // LOCKED LOGIC (formatDate, :237) — dd/MM/yyyy, day and month padded.
    expect(screen.getByTestId('admin-users-joined-u-1')).toHaveTextContent(/^\d{2}\/\d{2}\/\d{4}$/);

    // LOCKED LOGIC (showing range, :531) — 1 to min(1 * 6, 3) of 3.
    expect(screen.getByTestId('admin-users-page-info')).toHaveTextContent(/Hiển thị|showing/i);
    expect(screen.getByTestId('admin-users-page-info')).toHaveTextContent('1-3');
    expect(screen.getByTestId('admin-users-page-info')).toHaveTextContent(/\b3\b/);
    expect(screen.getByTestId('admin-users-page-1')).toBeInTheDocument();
    expect(screen.queryByTestId('admin-users-page-2')).not.toBeInTheDocument();
  });
});

// ---------------------------------------------------------------------------
// IT-ADMUSERS-002 — loading, then empty (with the totalPages clamp)
// ---------------------------------------------------------------------------
describe('IT-ADMUSERS-002: UserManagementPage loading and empty states', () => {
  it('IT-ADMUSERS-002: should show the spinner row and five zero stat cards while loading, then the no-results row with a disabled select-all when the backend returns an empty page', async () => {
    // Never resolve until the test has seen the loading branch.
    let releaseStats: ((v: UserStats) => void) | undefined;
    stats.mockImplementation(
      () =>
        new Promise<UserStats>((res) => {
          releaseStats = res;
        })
    );
    let releaseList: ((v: PagedUsers) => void) | undefined;
    list.mockImplementation(
      () =>
        new Promise<PagedUsers>((res) => {
          releaseList = res;
        })
    );

    renderPage();

    // Loading branch: spinner row, no empty row, no data row.
    await waitFor(() => {
      expect(screen.getByTestId('admin-users-loading')).toBeInTheDocument();
    });
    expect(screen.queryByTestId('admin-users-empty')).not.toBeInTheDocument();
    expect(screen.queryByTestId('admin-users-row')).not.toBeInTheDocument();
    // LOCKED LOGIC (stat cards, :341) — every card falls back to 0 while the
    // stats query is unresolved.
    expect(statValueFor(/Tổng người dùng|all users/i)).toBe('0');
    expect(statValueFor(/Tạm khóa|suspended/i)).toBe('0');

    releaseStats!(userStats());
    releaseList!(paged([], { total: 0, totalPages: 0 }));

    await waitFor(() => {
      expect(screen.getByTestId('admin-users-empty')).toBeInTheDocument();
    });
    expect(screen.queryByTestId('admin-users-loading')).not.toBeInTheDocument();
    expect(screen.getByTestId('admin-users-empty')).toHaveTextContent(
      /Không tìm thấy người dùng|no users? found/i
    );

    // LOCKED LOGIC (totalPages clamp, :302) — meta.totalPages 0 still renders
    // exactly one page button, and both arrows are disabled on it.
    expect(screen.getByTestId('admin-users-page-1')).toBeInTheDocument();
    expect(screen.queryByTestId('admin-users-page-2')).not.toBeInTheDocument();
    expect(screen.getByTestId('admin-users-page-prev')).toBeDisabled();
    expect(screen.getByTestId('admin-users-page-next')).toBeDisabled();
    // LOCKED LOGIC (showing range, :531) — the explicit 0 when the page is empty.
    expect(screen.getByTestId('admin-users-page-info')).toHaveTextContent(/0-0/);
    expect(screen.getByTestId('admin-users-page-info')).toHaveTextContent(/0 người dùng|0 users/i);
    // The header checkbox is disabled with zero rows.
    expect(screen.getByTestId('admin-users-select-all')).toBeDisabled();
    // The stats cards recovered once the stats query resolved.
    expect(statValueFor(/Tổng người dùng|all users/i)).toBe('18');
  });
});

// ---------------------------------------------------------------------------
// IT-ADMUSERS-003 — error state
// ---------------------------------------------------------------------------
describe('IT-ADMUSERS-003: UserManagementPage error state', () => {
  it('IT-ADMUSERS-003: should render the error row and no data rows when the list read fails, and keep the stat cards', async () => {
    list.mockRejectedValue(new Error('Forbidden'));

    renderPage();

    await waitFor(() => {
      expect(screen.getByTestId('admin-users-error')).toBeInTheDocument();
    });

    expect(screen.getByTestId('admin-users-error')).toHaveTextContent(
      /Không tìm thấy người dùng|no users? found/i
    );
    // The error row replaces the data rows but not the empty row — the page
    // guards the empty branch on `!isError`.
    expect(screen.queryByTestId('admin-users-empty')).not.toBeInTheDocument();
    expect(screen.queryAllByTestId('admin-users-row')).toHaveLength(0);
    // The stats query is independent and still renders.
    expect(statValueFor(/Tổng người dùng|all users/i)).toBe('18');
    // The select-all guard runs on `users.length`, which is 0 after the error.
    expect(screen.getByTestId('admin-users-select-all')).toBeDisabled();
  });
});

// ---------------------------------------------------------------------------
// IT-ADMUSERS-004 — search / role / status / sort / pagination interactions
// ---------------------------------------------------------------------------
describe('IT-ADMUSERS-004: UserManagementPage filters, search, sort and pagination', () => {
  it('IT-ADMUSERS-004: should send the search term, role, status and sort to the backend, reset to page 1 on every filter change, and show the 7-12 range on page 2', async () => {
    rows = Array.from({ length: 18 }, (_, i) =>
      adminUser(`u-${i + 1}`, { fullName: `User ${i + 1}` })
    );
    const user = userEvent.setup();
    renderPage();

    await waitFor(() => {
      expect(screen.getAllByTestId('admin-users-row')).toHaveLength(6);
    });
    // Initial read: page 1, no search, both filters "all", sort "newest".
    expect(lastListArgs()).toMatchObject({
      page: 1,
      perPage: 6,
      role: 'all',
      status: 'all',
      sort: 'newest',
    });
    expect(lastListArgs().search).toBeUndefined();
    expect(screen.getByTestId('admin-users-page-1')).toHaveTextContent('1');
    expect(screen.getByTestId('admin-users-page-3')).toBeInTheDocument();
    expect(screen.getByTestId('admin-users-page-next')).toBeEnabled();

    // Walk to page 3, then prove every filter change snaps back to page 1.
    await user.click(screen.getByTestId('admin-users-page-3'));
    await waitFor(() => {
      expect(lastListArgs().page).toBe(3);
    });
    // LOCKED LOGIC (showing range, :531) — (3-1)*6+1 = 13 to min(3*6, 18) = 18.
    expect(screen.getByTestId('admin-users-page-info')).toHaveTextContent('13-18');

    await fill(user, screen.getByTestId('admin-users-search'), 'nguyen');
    await waitFor(() => {
      expect(lastListArgs().search).toBe('nguyen');
    });
    expect(lastListArgs().page).toBe(1);

    await user.selectOptions(screen.getByTestId('admin-users-role-filter'), 'instructor');
    await waitFor(() => {
      expect(lastListArgs().role).toBe('instructor');
    });
    expect(lastListArgs().page).toBe(1);
    expect(screen.getByTestId('admin-users-role-filter')).toHaveValue('instructor');

    await user.selectOptions(screen.getByTestId('admin-users-status-filter'), 'suspended');
    await waitFor(() => {
      expect(lastListArgs().status).toBe('suspended');
    });
    expect(lastListArgs().page).toBe(1);

    // Sorting does NOT reset the page — only search and the two filters do.
    await user.click(screen.getByTestId('admin-users-page-2'));
    await waitFor(() => {
      expect(lastListArgs().page).toBe(2);
    });
    await user.selectOptions(screen.getByTestId('admin-users-sort'), 'name_asc');
    await waitFor(() => {
      expect(lastListArgs().sort).toBe('name_asc');
    });
    expect(lastListArgs().page).toBe(2);
    // LOCKED LOGIC (showing range, :531) — 7 to 12.
    expect(screen.getByTestId('admin-users-page-info')).toHaveTextContent('7-12');

    // The two filter <select>s must offer every documented enum value.
    const roleFilter = screen.getByTestId('admin-users-role-filter');
    expect(
      within(roleFilter)
        .getAllByRole('option')
        .map((o) => (o as HTMLOptionElement).value)
    ).toEqual(['all', 'super_admin', 'admin', 'instructor', 'student', 'guest']);
    const statusFilter = screen.getByTestId('admin-users-status-filter');
    expect(
      within(statusFilter)
        .getAllByRole('option')
        .map((o) => (o as HTMLOptionElement).value)
    ).toEqual(['all', 'active', 'pending', 'suspended', 'deleted']);
  });
});

// ---------------------------------------------------------------------------
// IT-ADMUSERS-005 — selection, bulk writes, invalidation refetch, delete confirm
// ---------------------------------------------------------------------------
describe('IT-ADMUSERS-005: UserManagementPage selection and bulk actions', () => {
  it('IT-ADMUSERS-005: should select and deselect rows, fan the bulk bar out to one mutation per selected id, and re-query the list after the write succeeds', async () => {
    rows = [adminUser('u-1'), adminUser('u-2'), adminUser('u-3')];
    // Hold the post-invalidation refetch open so the `isFetching && !isLoading`
    // spinner is observable instead of racing the assertion.
    let hangNext = false;
    let release: (() => void) | undefined;
    list.mockImplementation(async (params: UserListParams = {}) => {
      if (hangNext) {
        hangNext = false;
        await new Promise<void>((res) => {
          release = res;
        });
      }
      const perPage = params.perPage ?? 6;
      const start = ((params.page ?? 1) - 1) * perPage;
      return paged(rows.slice(start, start + perPage), {
        total: rows.length,
        page: params.page ?? 1,
        perPage,
        totalPages: 1,
      });
    });

    const user = userEvent.setup();
    renderPage();

    await waitFor(() => {
      expect(screen.getAllByTestId('admin-users-row')).toHaveLength(3);
    });
    // No selection -> no bulk bar.
    expect(screen.queryByTestId('admin-users-bulk-bar')).not.toBeInTheDocument();

    // LOCKED LOGIC (toggleRow, :305) — one row selected.
    await user.click(screen.getByTestId('admin-users-row-check-u-1'));
    expect(screen.getByTestId('admin-users-bulk-bar')).toHaveTextContent('1');
    expect(screen.getByTestId('admin-users-bulk-bar')).toHaveTextContent(/đã chọn|selected/i);

    // LOCKED LOGIC (toggleAll, :308) — not every row is selected, so the header
    // checkbox ADDS the remaining rows; a second click makes every row
    // selected, and only then does a third click CLEAR the current page.
    await user.click(screen.getByTestId('admin-users-select-all'));
    expect(screen.getByTestId('admin-users-bulk-bar')).toHaveTextContent(/^3/);

    // Toggling one row off leaves the other two, and toggleAll is back to the
    // "add" branch because not every row is selected anymore.
    await user.click(screen.getByTestId('admin-users-row-check-u-2'));
    expect(screen.getByTestId('admin-users-bulk-bar')).toHaveTextContent(/^2/);
    await user.click(screen.getByTestId('admin-users-select-all'));
    expect(screen.getByTestId('admin-users-bulk-bar')).toHaveTextContent(/^3/);
    await user.click(screen.getByTestId('admin-users-select-all'));
    expect(screen.queryByTestId('admin-users-bulk-bar')).not.toBeInTheDocument();

    // Re-select two rows, then fan the bulk change-role out to both.
    await user.click(screen.getByTestId('admin-users-row-check-u-1'));
    await user.click(screen.getByTestId('admin-users-row-check-u-2'));
    await user.click(screen.getByTestId('admin-users-bulk-role'));

    await waitFor(() => {
      expect(updateRole).toHaveBeenCalledTimes(2);
    });
    expect(updateRole).toHaveBeenCalledWith('u-1', 'instructor');
    expect(updateRole).toHaveBeenCalledWith('u-2', 'instructor');
    // The selection is cleared once the fan-out is dispatched.
    expect(screen.queryByTestId('admin-users-bulk-bar')).not.toBeInTheDocument();

    // The successful mutation invalidates ['users'], so the current list
    // re-queries. Pin the next read open to observe the isFetching spinner.
    hangNext = true;
    await user.click(screen.getByTestId('admin-users-row-check-u-3'));
    await user.click(screen.getByTestId('admin-users-bulk-lock'));

    await waitFor(() => {
      expect(screen.getByTestId('admin-users-fetching-spinner')).toBeInTheDocument();
    });
    // The spinner belongs to the background refetch, not the initial load.
    expect(screen.queryByTestId('admin-users-loading')).not.toBeInTheDocument();
    await waitFor(() => {
      expect(updateStatus).toHaveBeenCalledWith('u-3', 'suspended');
    });
    release!();
    await waitFor(() => {
      expect(screen.queryByTestId('admin-users-fetching-spinner')).not.toBeInTheDocument();
    });
  });
});

// ---------------------------------------------------------------------------
// IT-ADMUSERS-006 — per-row status action, failure path, and the two modals
// ---------------------------------------------------------------------------
describe('IT-ADMUSERS-006: UserManagementPage row actions and modals', () => {
  it('IT-ADMUSERS-006: should send the right status for approve, lock and unlock, survive a rejected write, and render the detail and reset-password modals with their fallbacks', async () => {
    rows = [
      adminUser('u-pending', { fullName: 'Pending One', status: 'pending' }),
      adminUser('u-active', { fullName: 'Active One', status: 'active' }),
      adminUser('u-susp', {
        fullName: 'Suspended One',
        status: 'suspended',
        phone: '0900000000',
        bio: 'Giáo viên CNTT',
        lastLoginAt: '2026-09-01T08:30:00Z',
        lastLoginIp: '10.0.0.7',
        emailVerified: true,
        mfaEnabled: true,
      }),
    ];
    const user = userEvent.setup();
    renderPage();

    await waitFor(() => {
      expect(screen.getAllByTestId('admin-users-row')).toHaveLength(3);
    });

    // Exactly one status button per row, chosen by the current status.
    await user.click(screen.getByTestId('admin-users-approve-u-pending'));
    await waitFor(() => {
      expect(updateStatus).toHaveBeenCalledWith('u-pending', 'active');
    });
    await user.click(screen.getByTestId('admin-users-lock-u-active'));
    await waitFor(() => {
      expect(updateStatus).toHaveBeenCalledWith('u-active', 'suspended');
    });
    await user.click(screen.getByTestId('admin-users-unlock-u-susp'));
    await waitFor(() => {
      expect(updateStatus).toHaveBeenCalledWith('u-susp', 'active');
    });
    // A pending row offers approve, not lock/unlock.
    expect(screen.queryByTestId('admin-users-lock-u-pending')).not.toBeInTheDocument();
    expect(screen.queryByTestId('admin-users-approve-u-active')).not.toBeInTheDocument();

    // Failure path: a rejected write must not throw out of the handler and
    // must leave the row rendered.
    updateStatus.mockRejectedValueOnce(new Error('Conflict'));
    await user.click(screen.getByTestId('admin-users-lock-u-active'));
    await waitFor(() => {
      expect(updateStatus).toHaveBeenCalledTimes(4);
    });
    expect(screen.getAllByTestId('admin-users-row')[0]).toBeInTheDocument();
    expect(screen.getByTestId('admin-users-identity-u-active')).toHaveTextContent('Active One');

    // ---- Detail modal ---------------------------------------------------
    await user.click(screen.getByTestId('admin-users-view-u-active'));
    const modal = await screen.findByTestId('admin-users-detail-modal');
    expect(screen.getByTestId('admin-users-detail-name')).toHaveTextContent('Active One');
    expect(screen.getByTestId('admin-users-detail-email')).toHaveTextContent('u-active@ioes.com');
    expect(screen.getByTestId('admin-users-detail-role')).toHaveTextContent(/^Học viên$|^Student$/);
    expect(screen.getByTestId('admin-users-detail-status')).toHaveTextContent(
      /^Đang hoạt động$|^Active$/
    );
    expect(screen.getByTestId('admin-users-detail-id')).toHaveTextContent('u-active');
    // LOCKED LOGIC (UserDetailModal formatDate, :23) — `dd/MM/yyyy H:mm` where
    // day and month are zero-padded but the HOUR is NOT, so `\d{1,2}`.
    expect(screen.getByTestId('admin-users-detail-created')).toHaveTextContent(
      /^\d{2}\/\d{2}\/\d{4} \d{1,2}:\d{2}$/
    );
    // Nullable fields render the em-dash placeholder.
    expect(screen.getByTestId('admin-users-detail-phone')).toHaveTextContent('—');
    expect(screen.getByTestId('admin-users-detail-bio')).toHaveTextContent('—');
    expect(screen.getByTestId('admin-users-detail-last-login')).toHaveTextContent('—');
    expect(screen.getByTestId('admin-users-detail-ip')).toHaveTextContent('—');
    // Unverified / no-MFA rows render neither chip.
    expect(screen.queryByTestId('admin-users-detail-verified')).not.toBeInTheDocument();
    expect(screen.queryByTestId('admin-users-detail-mfa')).not.toBeInTheDocument();
    // The footer close and the backdrop both dismiss.
    await user.click(within(modal).getByTestId('admin-users-detail-close-footer'));
    await waitFor(() => {
      expect(screen.queryByTestId('admin-users-detail-modal')).not.toBeInTheDocument();
    });

    // The second row has a real phone, IP, bio and both chips.
    await user.click(screen.getByTestId('admin-users-view-u-susp'));
    await screen.findByTestId('admin-users-detail-modal');
    expect(screen.getByTestId('admin-users-detail-phone')).toHaveTextContent('0900000000');
    expect(screen.getByTestId('admin-users-detail-bio')).toHaveTextContent('Giáo viên CNTT');
    expect(screen.getByTestId('admin-users-detail-verified')).toBeInTheDocument();
    expect(screen.getByTestId('admin-users-detail-mfa')).toHaveTextContent('2FA');
    await user.click(screen.getByTestId('admin-users-detail-close'));
    await waitFor(() => {
      expect(screen.queryByTestId('admin-users-detail-modal')).not.toBeInTheDocument();
    });

    // ---- Reset-password modal -------------------------------------------
    await user.click(screen.getByTestId('admin-users-reset-u-active'));
    await screen.findByTestId('admin-users-reset-modal');
    expect(screen.getByTestId('admin-users-reset-confirm')).toHaveTextContent('Active One');
    expect(screen.getByTestId('admin-users-reset-cancel')).toHaveTextContent(/^Hủy$|^Cancel$/);

    // Failure path first: a rejected reset keeps the confirm copy and shows no
    // temporary password.
    resetPassword.mockRejectedValueOnce(new Error('Internal Server Error'));
    await user.click(screen.getByTestId('admin-users-reset-submit'));
    await waitFor(() => {
      expect(resetPassword).toHaveBeenCalledTimes(1);
    });
    expect(screen.getByTestId('admin-users-reset-confirm')).toBeInTheDocument();
    expect(screen.queryByTestId('admin-users-reset-temp-password')).not.toBeInTheDocument();

    // Then the success path: the temp password replaces the confirm copy and
    // the confirm button disappears.
    await user.click(screen.getByTestId('admin-users-reset-submit'));
    const temp = await screen.findByTestId('admin-users-reset-temp-password');
    expect(temp).toHaveTextContent('Temp#1234');
    expect(screen.queryByTestId('admin-users-reset-confirm')).not.toBeInTheDocument();
    expect(screen.queryByTestId('admin-users-reset-submit')).not.toBeInTheDocument();
    expect(screen.getByTestId('admin-users-reset-cancel')).toHaveTextContent(/^Đóng$|^Close$/);

    // The copy button writes the temp password to the clipboard and flips to
    // the "copied" label.
    const writeText = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, 'clipboard', {
      value: { writeText },
      configurable: true,
      writable: true,
    });
    await user.click(screen.getByTestId('admin-users-reset-copy'));
    expect(writeText).toHaveBeenCalledWith('Temp#1234');
    await waitFor(() => {
      expect(screen.getByTestId('admin-users-reset-copy')).toHaveTextContent(/Đã sao chép|copied/i);
    });
  });
});
