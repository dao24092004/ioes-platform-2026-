/** Wave 2 - Unit: auth.api.ts + users.api.ts (student-owned for ProfilePage). */
import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('@/config/api.config', () => ({
  apiClient: {
    get: vi.fn(),
    post: vi.fn(),
    patch: vi.fn(),
    delete: vi.fn(),
  },
  unwrap: vi.fn((promise: Promise<{ data: { data: unknown } }>) =>
    promise.then((res) => res.data.data)
  ),
  unwrapVoid: vi.fn((promise: Promise<unknown>) => promise),
}));

import { authApi } from '@/services/api/auth.api';
import { usersApi } from '@/services/api/users.api';
import { apiClient } from '@/config/api.config';

beforeEach(() => {
  vi.mocked(apiClient.get).mockReset();
  vi.mocked(apiClient.post).mockReset();
  vi.mocked(apiClient.patch).mockReset();
});

const makeUser = (overrides: Record<string, unknown> = {}): unknown => ({
  id: 'u-1',
  email: 'a@b.com',
  fullName: 'A B',
  avatarUrl: null,
  role: 'student',
  status: 'active',
  emailVerified: true,
  createdAt: '2024-01-01T00:00:00Z',
  ...overrides,
});

describe('authApi.me (ProfilePage)', () => {
  it('UT-PROFILE-001: should GET /api/auth/me with no params', async () => {
    vi.mocked(apiClient.get).mockResolvedValue({ data: { data: makeUser() } });

    await authApi.me();

    expect(apiClient.get).toHaveBeenCalledTimes(1);
    expect(vi.mocked(apiClient.get).mock.calls[0]![0]).toBe('/api/auth/me');
  });

  it('UT-PROFILE-002: should return the unwrapped AuthUser object', async () => {
    const user = makeUser({ fullName: 'Bob' });
    vi.mocked(apiClient.get).mockResolvedValue({ data: { data: user } });

    const result = await authApi.me();

    expect(result).toEqual(user);
    expect((result as { fullName: string }).fullName).toBe('Bob');
  });
});

describe('authApi.changePassword (ProfilePage security tab)', () => {
  it('UT-PROFILE-003: should POST /api/auth/change-password with {oldPassword, newPassword}', async () => {
    vi.mocked(apiClient.post).mockResolvedValue({ data: { data: null } });

    await authApi.changePassword('oldPass1!', 'NewPass2!');

    const [url, body] = vi.mocked(apiClient.post).mock.calls[0]!;
    expect(url).toBe('/api/auth/change-password');
    expect(body).toEqual({ oldPassword: 'oldPass1!', newPassword: 'NewPass2!' });
  });
});

describe('usersApi.getById', () => {
  it('UT-PROFILE-004: should GET /api/auth/users/:id', async () => {
    vi.mocked(apiClient.get).mockResolvedValue({ data: { data: makeUser() } });

    await usersApi.getById('u-42');

    expect(apiClient.get).toHaveBeenCalledTimes(1);
    expect(vi.mocked(apiClient.get).mock.calls[0]![0]).toBe('/api/auth/users/u-42');
  });
});

describe('usersApi.updateStatus', () => {
  it('UT-PROFILE-005: should PATCH /api/auth/users/:id/status with {status}', async () => {
    vi.mocked(apiClient.patch).mockResolvedValue({
      data: { data: makeUser({ status: 'suspended' }) },
    });

    await usersApi.updateStatus('u-7', 'suspended');

    const [url, body] = vi.mocked(apiClient.patch).mock.calls[0]!;
    expect(url).toBe('/api/auth/users/u-7/status');
    expect(body).toEqual({ status: 'suspended' });
  });

  it('UT-PROFILE-006: should accept each non-deleted UserStatus value', async () => {
    vi.mocked(apiClient.patch).mockResolvedValue({ data: { data: makeUser() } });

    for (const status of ['pending', 'active', 'suspended'] as const) {
      await usersApi.updateStatus('u-x', status);
    }

    expect(vi.mocked(apiClient.patch).mock.calls.map((c) => c[1])).toEqual([
      { status: 'pending' },
      { status: 'active' },
      { status: 'suspended' },
    ]);
  });
});
