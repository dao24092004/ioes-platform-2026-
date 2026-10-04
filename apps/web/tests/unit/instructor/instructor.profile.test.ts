/** Wave 3D — Unit: profile-page transport contract for /instructor/profile. */
import { describe, it, expect, vi, beforeEach } from 'vitest';

const { get, post } = vi.hoisted(() => ({ get: vi.fn(), post: vi.fn() }));

vi.mock('@/config/api.config', async () => {
  const actual = await vi.importActual<typeof import('@/config/api.config')>('@/config/api.config');
  return { ...actual, apiClient: { get, post, patch: vi.fn(), delete: vi.fn() } };
});

import { authApi } from '@/services/api/auth.api';

const TS = '2026-10-04T00:00:00.000Z';

const ok = <T>(data: T) => ({ data: { success: true, message: 'ok', timestamp: TS, data } });

beforeEach(() => {
  get.mockReset();
  post.mockReset();
});

describe('authApi.me — profile field derivation input', () => {
  it('UT-IPROFILE-001: should return the instructor account fields unchanged so the card and overview can render them', async () => {
    get.mockResolvedValue(
      ok({
        id: 'u-inst-1',
        email: 'gv@ioes.com',
        fullName: 'Nguyễn Vân An',
        avatarUrl: 'https://cdn.ioes.com/avatars/u-inst-1.png',
        role: 'instructor',
        status: 'active',
        emailVerified: true,
        createdAt: '2023-09-01T02:00:00.000Z',
      })
    );

    const user = await authApi.me();

    // Every field the page reads must arrive under its own name: `avatarUrl`
    // decides avatar-vs-initials, `status === 'active'` decides the green dot,
    // `emailVerified` decides Yes/No, `createdAt` feeds formatRelative().
    expect(user.role).toBe('instructor');
    expect(user.status).toBe('active');
    expect(user.emailVerified).toBe(true);
    expect(user.avatarUrl).toBe('https://cdn.ioes.com/avatars/u-inst-1.png');
    expect(user.fullName).toBe('Nguyễn Vân An');
    expect(user.createdAt).toBe('2023-09-01T02:00:00.000Z');
  });

  it('UT-IPROFILE-002: should keep a pending account and a null avatar intact for the "not yet active" render path', async () => {
    get.mockResolvedValue(
      ok({
        id: 'u-inst-2',
        email: 'new.gv@ioes.com',
        fullName: 'Trần Minh',
        avatarUrl: null,
        role: 'instructor',
        status: 'pending',
        emailVerified: false,
        createdAt: '2026-10-01T00:00:00.000Z',
      })
    );

    const user = await authApi.me();

    // `status: 'pending'` is rendered verbatim (not coerced to 'active') and
    // `avatarUrl: null` is what makes the page fall back to initials.
    expect(user.status).toBe('pending');
    expect(user.avatarUrl).toBeNull();
    expect(user.emailVerified).toBe(false);
  });

  it('UT-IPROFILE-003: should pass through fields the backend adds later instead of dropping them', async () => {
    get.mockResolvedValue({
      data: {
        success: true,
        message: 'ok',
        timestamp: TS,
        data: {
          id: 'u-inst-3',
          email: 'gv3@ioes.com',
          fullName: 'Lê Thu',
          avatarUrl: null,
          role: 'instructor',
          status: 'active',
          emailVerified: true,
          createdAt: '2024-01-01T00:00:00.000Z',
          department: 'Khoa Toán',
        },
      },
    });

    const user = await authApi.me();

    // `unwrap` is a pass-through mapper, so a new auth-service field is
    // available to the page without an api-layer change.
    expect(user).toMatchObject({ department: 'Khoa Toán' });
  });
});

describe('authApi.changePassword — Security tab submit', () => {
  it('UT-IPROFILE-004: should forward a SQL/XSS-like password pair verbatim and resolve undefined when the envelope omits data', async () => {
    post.mockResolvedValue({ data: { success: true, message: 'ok', timestamp: TS } });

    const injection = `'; DROP TABLE users; -- <img src=x onerror=alert(1)>`;
    const result = await authApi.changePassword(injection, injection);

    const [url, body] = post.mock.calls[0]!;
    expect(url).toBe('/api/auth/change-password');
    // The page performs no escaping; React renders the value as a text child.
    expect(body).toEqual({ oldPassword: injection, newPassword: injection });
    // `unwrapVoid` must tolerate a missing `data` field, otherwise a Jackson
    // `non_null` switch would turn every successful change into an error.
    expect(result).toBeUndefined();
  });
});
