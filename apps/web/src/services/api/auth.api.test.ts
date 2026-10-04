/**
 * Batch Wave 1B — Unit: src/services/api/auth.api.ts
 *
 * Covers end-to-end happy-path assertions for each auth wrapper. Each test
 * checks both the URL/verb combination and the request payload that reaches
 * `apiClient`. No network, no JWT validation, no UI rendering.
 *
 * IDs: UT-AUTHAPI-NNN
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';

const { get, post } = vi.hoisted(() => ({ get: vi.fn(), post: vi.fn() }));

vi.mock('@/config/api.config', async () => {
  const actual = await vi.importActual<typeof import('@/config/api.config')>(
    '@/config/api.config',
  );
  return { ...actual, apiClient: { get, post } };
});

import { login, register, refresh, logout, me, changePassword } from './auth.api';

const ok = <T>(data: T) => ({
  data: { success: true, message: 'ok', timestamp: '2026-10-03T00:00:00.000Z', data },
});

beforeEach(() => {
  get.mockReset();
  post.mockReset();
});

// ===== login =====
describe('auth.api login', () => {
  it('UT-AUTHAPI-001: POST /api/auth/login với {email, password}', async () => {
    post.mockResolvedValue(
      ok({
        user: { id: 'u1', email: 's@ioes.com' },
        accessToken: 'a',
        refreshToken: 'r',
        tokenType: 'Bearer',
        expiresIn: 3600,
      }),
    );
    await login({ email: 's@ioes.com', password: 'Test@123' });
    expect(post).toHaveBeenCalledWith('/api/auth/login', {
      email: 's@ioes.com',
      password: 'Test@123',
    });
  });

  it('UT-AUTHAPI-002: unwrap bóc vỏ envelope và trả về AuthSession thô', async () => {
    post.mockResolvedValue(
      ok({
        user: { id: 'u1', email: 's@ioes.com', fullName: 'S', avatarUrl: null, role: 'student', status: 'active', emailVerified: true, createdAt: '' },
        accessToken: 'a',
        refreshToken: 'r',
        tokenType: 'Bearer',
        expiresIn: 3600,
      }),
    );
    const session = await login({ email: 's@ioes.com', password: 'Test@123' });
    expect(session.accessToken).toBe('a');
    expect(session.expiresIn).toBe(3600);
    expect(session.user.role).toBe('student');
  });
});

// ===== register =====
describe('auth.api register', () => {
  it('UT-AUTHAPI-003: POST /api/auth/register với {email, password, fullName}', async () => {
    post.mockResolvedValue(
      ok({
        id: 'u-new',
        email: 'new@ioes.com',
        fullName: 'New User',
        avatarUrl: null,
        role: 'student',
        status: 'active',
        emailVerified: false,
        createdAt: '2026-10-03T00:00:00Z',
      }),
    );
    await register({ email: 'new@ioes.com', password: 'Test@123', fullName: 'New User' });
    expect(post).toHaveBeenCalledWith('/api/auth/register', {
      email: 'new@ioes.com',
      password: 'Test@123',
      fullName: 'New User',
    });
  });
});

// ===== refresh =====
describe('auth.api refresh', () => {
  it('UT-AUTHAPI-004: POST /api/auth/refresh với {refreshToken}', async () => {
    post.mockResolvedValue(
      ok({
        user: { id: 'u1', email: 's@ioes.com', fullName: 'S', avatarUrl: null, role: 'student', status: 'active', emailVerified: true, createdAt: '' },
        accessToken: 'a2',
        refreshToken: 'r2',
        tokenType: 'Bearer',
        expiresIn: 3600,
      }),
    );
    await refresh('r-token');
    expect(post).toHaveBeenCalledWith('/api/auth/refresh', { refreshToken: 'r-token' });
  });
});

// ===== logout =====
describe('auth.api logout', () => {
  it('UT-AUTHAPI-005: POST /api/auth/logout và trả về undefined', async () => {
    post.mockResolvedValue(ok(undefined));
    const result = await logout();
    expect(post).toHaveBeenCalledWith('/api/auth/logout');
    expect(result).toBeUndefined();
  });
});

// ===== me =====
describe('auth.api me', () => {
  it('UT-AUTHAPI-006: GET /api/auth/me đọc phiên hiện tại', async () => {
    get.mockResolvedValue(
      ok({
        id: 'u1',
        email: 's@ioes.com',
        fullName: 'S',
        avatarUrl: null,
        role: 'student',
        status: 'active',
        emailVerified: true,
        createdAt: '',
      }),
    );
    const user = await me();
    expect(get).toHaveBeenCalledWith('/api/auth/me');
    expect(user.id).toBe('u1');
  });
});

// ===== changePassword =====
describe('auth.api changePassword', () => {
  it('UT-AUTHAPI-007: POST /api/auth/change-password với {oldPassword, newPassword}', async () => {
    post.mockResolvedValue(ok(undefined));
    await changePassword('OldPass!23', 'NewPass!45');
    expect(post).toHaveBeenCalledWith('/api/auth/change-password', {
      oldPassword: 'OldPass!23',
      newPassword: 'NewPass!45',
    });
  });
});