/** Wave 4A (admin) — Unit: UserManagementPage (`/admin/users`). */
import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock the HTTP boundary only. `unwrap`, `unwrapVoid`, `toApiError` and
// `ApiError` stay real so the envelope and error branches are actually run.
vi.mock('@/config/api.config', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/config/api.config')>();
  return {
    ...actual,
    apiClient: { get: vi.fn(), post: vi.fn(), patch: vi.fn(), delete: vi.fn() },
  };
});

import { ApiError, apiClient } from '@/config/api.config';
import { usersApi, type AdminUser, type UserStats } from '@/services/api/users.api';

const TS = '2026-10-04T00:00:00Z';

/** Minimal rejection shaped like an axios HTTP error with an ApiResponse body. */
const httpError = (status: number, message: string, traceId?: string) => {
  const err = new Error(message) as Error & {
    isAxiosError: boolean;
    response: { status: number; data: { message: string; traceId?: string } };
  };
  err.isAxiosError = true;
  err.response = { status, data: { message, traceId } };
  return err;
};

/** A network/timeout rejection carrying no HTTP response. */
const transportError = (code: string, message: string) => {
  const err = new Error(message) as Error & { isAxiosError: boolean; code: string };
  err.isAxiosError = true;
  err.code = code;
  return err;
};

/** The query params the service actually put on the wire (call #0). */
const paramsOf = (call: number): Record<string, unknown> => {
  const cfg = vi.mocked(apiClient.get).mock.calls[call]?.[1] as
    { params?: Record<string, unknown> } | undefined;
  return cfg?.params ?? {};
};

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

const ok = <T>(data: T) => ({ data: { success: true, message: 'ok', data, timestamp: TS } });

/** HTTP 200 with `success: false` — the branch `unwrap` must not trust. */
const softFail = (message: string, data: unknown = null) => ({
  data: { success: false, message, data, timestamp: TS, traceId: 'trace-soft' },
});

beforeEach(() => {
  vi.mocked(apiClient.get).mockReset();
  vi.mocked(apiClient.post).mockReset();
  vi.mocked(apiClient.patch).mockReset();
  vi.mocked(apiClient.delete).mockReset();
});

// ---------------------------------------------------------------------------
// usersApi.list — GET /api/auth/users (the table read)
// ---------------------------------------------------------------------------
describe('usersApi.list — the read behind the UserManagementPage table', () => {
  it('UT-ADMUSERS-001: should rename perPage to per_page because the Java query param is snake_case and never send the camelCase key', async () => {
    vi.mocked(apiClient.get).mockResolvedValue(
      ok({ data: [], meta: { total: 0, page: 1, perPage: 6, totalPages: 1 } })
    );

    await usersApi.list({ page: 1, perPage: 6 });

    expect(apiClient.get).toHaveBeenCalledWith('/api/auth/users', {
      params: expect.objectContaining({ per_page: 6 }),
    });
    expect(paramsOf(0)).not.toHaveProperty('perPage');
  });

  it('UT-ADMUSERS-002: should forward page, search, role, status and sort verbatim so the four filter selects reach the backend', async () => {
    vi.mocked(apiClient.get).mockResolvedValue(
      ok({ data: [], meta: { total: 0, page: 2, perPage: 6, totalPages: 1 } })
    );

    await usersApi.list({
      page: 2,
      perPage: 6,
      search: 'nguyen',
      role: 'instructor',
      status: 'suspended',
      sort: 'name_asc',
    });

    expect(paramsOf(0)).toEqual({
      page: 2,
      search: 'nguyen',
      role: 'instructor',
      status: 'suspended',
      sort: 'name_asc',
      per_page: 6,
    });
  });

  it('UT-ADMUSERS-003: should send search as undefined when the page clears the search box, so the empty term never filters', async () => {
    vi.mocked(apiClient.get).mockResolvedValue(
      ok({ data: [], meta: { total: 0, page: 1, perPage: 6, totalPages: 1 } })
    );

    // UserManagementPage.tsx:266 sends `search: search || undefined` — an empty
    // box must omit the param entirely instead of sending `search=`.
    await usersApi.list({
      page: 1,
      perPage: 6,
      search: undefined,
      role: 'all',
      status: 'all',
      sort: 'newest',
    });

    expect(paramsOf(0).search).toBeUndefined();
  });

  it('UT-ADMUSERS-004: should unwrap the PagedUsers envelope so both `data` rows and the `meta` pagination survive', async () => {
    const paged = {
      data: [adminUser('u-1', { fullName: 'Nguyen Van A' })],
      meta: { total: 18, page: 2, perPage: 6, totalPages: 3 },
    };
    vi.mocked(apiClient.get).mockResolvedValue(ok(paged));

    await expect(usersApi.list({ page: 2, perPage: 6 })).resolves.toEqual(paged);
  });

  it('UT-ADMUSERS-005: should reject with ApiError(400) carrying the backend message when an unknown role name is sent', async () => {
    vi.mocked(apiClient.get).mockRejectedValue(httpError(400, 'Role không hợp lệ', 'trace-role'));

    await expect(usersApi.list({ role: 'wizard' as never })).rejects.toThrowError(ApiError);
    await expect(usersApi.list({ role: 'wizard' as never })).rejects.toMatchObject({
      name: 'ApiError',
      status: 400,
      message: 'Role không hợp lệ',
      traceId: 'trace-role',
    });
  });

  it('UT-ADMUSERS-006: should reject when the backend answers HTTP 200 with success=false, because the status code alone is not trustworthy', async () => {
    vi.mocked(apiClient.get).mockResolvedValue(softFail('Bạn không có quyền xem danh sách'));

    // This is the branch the page renders as `admin-users-error`.
    await expect(usersApi.list()).rejects.toMatchObject({
      name: 'ApiError',
      message: 'Bạn không có quyền xem danh sách',
      traceId: 'trace-soft',
    });
  });

  it('UT-ADMUSERS-007: should reject with "Phản hồi không có dữ liệu" when the envelope carries no data key at all', async () => {
    vi.mocked(apiClient.get).mockResolvedValue({
      data: { success: true, message: 'ok', timestamp: TS },
    });

    await expect(usersApi.list()).rejects.toMatchObject({
      name: 'ApiError',
      message: 'Phản hồi không có dữ liệu',
    });
  });

  it('UT-ADMUSERS-008: should resolve an empty page with totalPages=0 unchanged, which the page clamps to a single page button', async () => {
    const empty = { data: [], meta: { total: 0, page: 1, perPage: 6, totalPages: 0 } };
    vi.mocked(apiClient.get).mockResolvedValue(ok(empty));

    const result = await usersApi.list();
    expect(result.data).toEqual([]);
    expect(result.meta.totalPages).toBe(0);
  });
});

// ---------------------------------------------------------------------------
// usersApi.stats — GET /api/auth/users/stats (the five stat cards)
// ---------------------------------------------------------------------------
describe('usersApi.stats — the read behind the five stat cards', () => {
  it('UT-ADMUSERS-009: should GET the /stats sub-path and unwrap the flat UserStats record', async () => {
    const stats = userStats();
    vi.mocked(apiClient.get).mockResolvedValue(ok(stats));

    await expect(usersApi.stats()).resolves.toEqual(stats);
    expect(apiClient.get).toHaveBeenCalledWith('/api/auth/users/stats');
    // The stat cards need all six counters; nothing may be dropped by unwrap.
    expect(stats.admins + stats.superAdmins).toBe(3);
  });

  it('UT-ADMUSERS-010: should reject with ApiError(500) carrying the backend message and traceId', async () => {
    vi.mocked(apiClient.get).mockRejectedValue(httpError(500, 'Lỗi hệ thống', 'trace-500'));

    await expect(usersApi.stats()).rejects.toMatchObject({
      name: 'ApiError',
      status: 500,
      message: 'Lỗi hệ thống',
      traceId: 'trace-500',
    });
  });
});

// ---------------------------------------------------------------------------
// usersApi.getById — GET /api/auth/users/:id
// ---------------------------------------------------------------------------
describe('usersApi.getById — single admin user lookup', () => {
  it('UT-ADMUSERS-011: should GET the user by id and unwrap the AdminUser record', async () => {
    const user = adminUser('u-9', { role: 'super_admin', status: 'suspended' });
    vi.mocked(apiClient.get).mockResolvedValue(ok(user));

    await expect(usersApi.getById('u-9')).resolves.toEqual(user);
    expect(apiClient.get).toHaveBeenCalledWith('/api/auth/users/u-9');
  });
});

// ---------------------------------------------------------------------------
// usersApi.updateStatus — PATCH /api/auth/users/:id/status
// ---------------------------------------------------------------------------
describe('usersApi.updateStatus — the row approve/lock/unlock and bulk-lock writes', () => {
  it('UT-ADMUSERS-012: should PATCH the /status sub-path with the status body and unwrap the updated user', async () => {
    const updated = adminUser('u-3', { status: 'suspended' });
    vi.mocked(apiClient.patch).mockResolvedValue(ok(updated));

    await expect(usersApi.updateStatus('u-3', 'suspended')).resolves.toEqual(updated);
    expect(apiClient.patch).toHaveBeenCalledWith('/api/auth/users/u-3/status', {
      status: 'suspended',
    });
  });

  it('UT-ADMUSERS-013: should reject with ApiError(400) when the backend refuses the deleted status', async () => {
    vi.mocked(apiClient.patch).mockRejectedValue(
      httpError(400, 'Phải dùng API xóa để xoá người dùng')
    );

    await expect(usersApi.updateStatus('u-3', 'deleted' as never)).rejects.toMatchObject({
      name: 'ApiError',
      status: 400,
      message: 'Phải dùng API xóa để xoá người dùng',
    });
  });
});

// ---------------------------------------------------------------------------
// usersApi.updateRole — PATCH /api/auth/users/:id/role
// ---------------------------------------------------------------------------
describe('usersApi.updateRole — the bulk change-role write', () => {
  it('UT-ADMUSERS-014: should PATCH the /role sub-path with the role body the bulk bar hard-codes to instructor', async () => {
    const updated = adminUser('u-1', { role: 'instructor' });
    vi.mocked(apiClient.patch).mockResolvedValue(ok(updated));

    await expect(usersApi.updateRole('u-1', 'instructor')).resolves.toEqual(updated);
    expect(apiClient.patch).toHaveBeenCalledWith('/api/auth/users/u-1/role', {
      role: 'instructor',
    });
  });
});

// ---------------------------------------------------------------------------
// usersApi.deleteUser — DELETE /api/auth/users/:id
// ---------------------------------------------------------------------------
describe('usersApi.deleteUser — the row and bulk soft delete', () => {
  it('UT-ADMUSERS-015: should DELETE the user and resolve undefined because the backend answers data:null and unwrapVoid must not treat that as an error', async () => {
    vi.mocked(apiClient.delete).mockResolvedValue({
      data: { success: true, message: 'ok', data: null, timestamp: TS },
    });

    await expect(usersApi.deleteUser('u-4')).resolves.toBeUndefined();
    expect(apiClient.delete).toHaveBeenCalledWith('/api/auth/users/u-4');
  });

  it('UT-ADMUSERS-016: should reject with ApiError when the soft delete answers success=false, and map a transport timeout to the Vietnamese timeout message', async () => {
    vi.mocked(apiClient.delete).mockResolvedValue(
      softFail('Không thể xóa chính tài khoản đang đăng nhập')
    );
    await expect(usersApi.deleteUser('u-4')).rejects.toMatchObject({
      name: 'ApiError',
      message: 'Không thể xóa chính tài khoản đang đăng nhập',
    });

    vi.mocked(apiClient.delete).mockRejectedValue(
      transportError('ECONNABORTED', 'timeout of 120000ms exceeded')
    );
    await expect(usersApi.deleteUser('u-4')).rejects.toMatchObject({
      name: 'ApiError',
      message: 'Yêu cầu quá thời gian chờ',
    });
  });
});

// ---------------------------------------------------------------------------
// usersApi.resetPassword — POST /api/auth/users/:id/reset-password
// ---------------------------------------------------------------------------
describe('usersApi.resetPassword — the reset-password modal write', () => {
  it('UT-ADMUSERS-017: should POST to the /reset-password sub-path and unwrap temporaryPassword, and reject with ApiError(404) for an unknown user', async () => {
    vi.mocked(apiClient.post).mockResolvedValue(ok({ temporaryPassword: 'Temp#1234' }));

    await expect(usersApi.resetPassword('u-5')).resolves.toEqual({
      temporaryPassword: 'Temp#1234',
    });
    expect(apiClient.post).toHaveBeenCalledWith('/api/auth/users/u-5/reset-password');

    vi.mocked(apiClient.post).mockRejectedValue(httpError(404, 'Không tìm thấy người dùng'));
    await expect(usersApi.resetPassword('u-missing')).rejects.toMatchObject({
      name: 'ApiError',
      status: 404,
      message: 'Không tìm thấy người dùng',
    });
  });
});
