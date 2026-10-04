/**
 * Batch Wave 1B — Unit: src/services/api/users.api.ts
 *
 * Covers each admin-user wrapper. Each test checks both the URL/verb
 * combination and the request payload that reaches `apiClient`. No network,
 * no auth, no UI rendering.
 *
 * IDs: UT-USERSAPI-NNN
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';

const { get, post, patch, delete: del } = vi.hoisted(() => ({
  get: vi.fn(),
  post: vi.fn(),
  patch: vi.fn(),
  delete: vi.fn(),
}));

vi.mock('@/config/api.config', async () => {
  const actual = await vi.importActual<typeof import('@/config/api.config')>(
    '@/config/api.config',
  );
  return { ...actual, apiClient: { get, post, patch, delete: del } };
});

import { list, stats, getById, updateStatus, updateRole, deleteUser, resetPassword } from './users.api';

const ok = <T>(data: T) => ({
  data: { success: true, message: 'ok', timestamp: '2026-10-03T00:00:00.000Z', data },
});

beforeEach(() => {
  get.mockReset();
  post.mockReset();
  patch.mockReset();
  del.mockReset();
});

// ===== list =====
describe('users.api list', () => {
  it('UT-USERSAPI-001: GET /api/auth/users với perPage được map sang per_page', async () => {
    get.mockResolvedValue(ok({ data: [], meta: { total: 0, page: 1, perPage: 25, totalPages: 1 } }));
    await list({ perPage: 50, role: 'student', status: 'active', search: 'alice' });
    expect(get).toHaveBeenCalledWith('/api/auth/users', {
      params: { role: 'student', status: 'active', search: 'alice', per_page: 50 },
    });
  });

  it('UT-USERSAPI-002: perPage bỏ trống thì per_page vẫn là khoá nhưng undefined (hiện trạng)', async () => {
    get.mockResolvedValue(ok({ data: [], meta: { total: 0, page: 1, perPage: 25, totalPages: 1 } }));
    await list({ role: 'all' });
    // Source: `per_page: perPage` luôn xuất hiện dù giá trị undefined.
    // Ghi nhận hiện trạng này để nếu sau này hàm được đổi sang bỏ per_page thì
    // test sẽ báo khác và ta phải cập nhật backend query contract.
    expect(get.mock.calls[0][1].params).toHaveProperty('per_page', undefined);
  });
});

// ===== stats =====
describe('users.api stats', () => {
  it('UT-USERSAPI-003: GET /api/auth/users/stats', async () => {
    get.mockResolvedValue(ok({ total: 0, students: 0, instructors: 0, admins: 0, superAdmins: 0, suspended: 0, pending: 0, active: 0 }));
    await stats();
    expect(get).toHaveBeenCalledWith('/api/auth/users/stats');
  });
});

// ===== getById =====
describe('users.api getById', () => {
  it('UT-USERSAPI-004: GET /api/auth/users/{id} ghép id vào đường dẫn', async () => {
    get.mockResolvedValue(ok({ id: 'u1', email: 's@ioes.com' } as never));
    await getById('u-abc');
    expect(get).toHaveBeenCalledWith('/api/auth/users/u-abc');
  });
});

// ===== updateStatus =====
describe('users.api updateStatus', () => {
  it('UT-USERSAPI-005: PATCH /api/auth/users/{id}/status với {status}', async () => {
    patch.mockResolvedValue(ok({ id: 'u1', status: 'suspended' } as never));
    await updateStatus('u-1', 'suspended');
    expect(patch).toHaveBeenCalledWith('/api/auth/users/u-1/status', { status: 'suspended' });
  });
});

// ===== updateRole =====
describe('users.api updateRole', () => {
  it('UT-USERSAPI-006: PATCH /api/auth/users/{id}/role với {role}', async () => {
    patch.mockResolvedValue(ok({ id: 'u1', role: 'instructor' } as never));
    await updateRole('u-1', 'instructor');
    expect(patch).toHaveBeenCalledWith('/api/auth/users/u-1/role', { role: 'instructor' });
  });
});

// ===== deleteUser =====
describe('users.api deleteUser', () => {
  it('UT-USERSAPI-007: DELETE /api/auth/users/{id} và trả về undefined', async () => {
    del.mockResolvedValue(ok(null));
    const result = await deleteUser('u-1');
    expect(del).toHaveBeenCalledWith('/api/auth/users/u-1');
    expect(result).toBeUndefined();
  });
});

// ===== resetPassword =====
describe('users.api resetPassword', () => {
  it('UT-USERSAPI-008: POST /api/auth/users/{id}/reset-password và bóc vỏ temporaryPassword', async () => {
    post.mockResolvedValue(ok({ temporaryPassword: 'Tmp!2345' }));
    const result = await resetPassword('u-1');
    expect(post).toHaveBeenCalledWith('/api/auth/users/u-1/reset-password');
    expect(result.temporaryPassword).toBe('Tmp!2345');
  });
});