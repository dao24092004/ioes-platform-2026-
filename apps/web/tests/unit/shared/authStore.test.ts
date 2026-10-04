// Batch 1 — Unit: authStore
import { describe, it, expect, beforeEach } from 'vitest';
import { useAuthStore } from '@/app/store/authStore';
import type { UserRole } from '@/types/db';

const STORAGE_KEY = 'ioes-auth';

interface User {
  id: string;
  email: string;
  full_name: string;
  role: UserRole;
  avatar_url?: string | null;
}

const buildUser = (overrides: Partial<User> = {}): User => ({
  id: 'user-1',
  email: 'tester@ioes.com',
  full_name: 'Tester One',
  role: 'student',
  avatar_url: null,
  ...overrides,
});

beforeEach(() => {
  // Đảm bảo mỗi test khởi đầu từ trạng thái rỗng và không có dữ liệu persist.
  useAuthStore.setState({
    user: null,
    accessToken: null,
    refreshToken: null,
    isAuthenticated: false,
    isLoading: false,
  });
  localStorage.clear();
});

describe('authStore — initial state', () => {
  it('UT-STORE-001: should expose empty defaults right after reset', () => {
    const state = useAuthStore.getState();
    expect(state.user).toBeNull();
    expect(state.accessToken).toBeNull();
    expect(state.refreshToken).toBeNull();
    expect(state.isAuthenticated).toBe(false);
    expect(state.isLoading).toBe(false);
  });
});

describe('authStore — setters', () => {
  it('UT-STORE-002: should set user and flip isAuthenticated when setUser is called', () => {
    const user = buildUser();
    useAuthStore.getState().setUser(user);
    expect(useAuthStore.getState().user).toEqual(user);
    expect(useAuthStore.getState().isAuthenticated).toBe(true);
  });

  it('UT-STORE-003: should null user and clear isAuthenticated when setUser(null) is called', () => {
    useAuthStore.getState().setUser(buildUser());
    useAuthStore.getState().setUser(null);
    expect(useAuthStore.getState().user).toBeNull();
    expect(useAuthStore.getState().isAuthenticated).toBe(false);
  });

  it('UT-STORE-004: should store access token without touching refresh or user', () => {
    useAuthStore.getState().setAccessToken('jwt-abc');
    const state = useAuthStore.getState();
    expect(state.accessToken).toBe('jwt-abc');
    expect(state.refreshToken).toBeNull();
    expect(state.user).toBeNull();
  });

  it('UT-STORE-005: should update both tokens via setTokens without changing user', () => {
    useAuthStore.getState().setTokens('access-1', 'refresh-1');
    const state = useAuthStore.getState();
    expect(state.accessToken).toBe('access-1');
    expect(state.refreshToken).toBe('refresh-1');
    expect(state.user).toBeNull();
  });

  it('UT-STORE-006: should toggle isLoading via setLoading without side effects', () => {
    useAuthStore.getState().setLoading(true);
    expect(useAuthStore.getState().isLoading).toBe(true);
    useAuthStore.getState().setLoading(false);
    expect(useAuthStore.getState().isLoading).toBe(false);
  });
});

describe('authStore — login', () => {
  it('UT-STORE-007: should set user, both tokens and isAuthenticated when login is called with all args', () => {
    const user = buildUser({ role: 'instructor' });
    useAuthStore.getState().login(user, 'access-xyz', 'refresh-xyz');
    const state = useAuthStore.getState();
    expect(state.user).toEqual(user);
    expect(state.accessToken).toBe('access-xyz');
    expect(state.refreshToken).toBe('refresh-xyz');
    expect(state.isAuthenticated).toBe(true);
    expect(state.isLoading).toBe(false);
  });

  it('UT-STORE-008: should keep existing tokens when login is called without them (e.g. refresh flow)', () => {
    useAuthStore.getState().setTokens('access-keep', 'refresh-keep');
    const user = buildUser({ id: 'user-2' });
    useAuthStore.getState().login(user); // không truyền token
    const state = useAuthStore.getState();
    expect(state.user).toEqual(user);
    expect(state.accessToken).toBe('access-keep');
    expect(state.refreshToken).toBe('refresh-keep');
    expect(state.isAuthenticated).toBe(true);
  });
});

describe('authStore — logout', () => {
  it('UT-STORE-009: should reset user, tokens, isAuthenticated and isLoading on logout', () => {
    useAuthStore.getState().setUser(buildUser());
    useAuthStore.getState().setTokens('access-zzz', 'refresh-zzz');
    useAuthStore.getState().setLoading(true);
    useAuthStore.getState().logout();
    const state = useAuthStore.getState();
    expect(state.user).toBeNull();
    expect(state.accessToken).toBeNull();
    expect(state.refreshToken).toBeNull();
    expect(state.isAuthenticated).toBe(false);
    expect(state.isLoading).toBe(false);
  });
});

describe('authStore — persistence', () => {
  it('UT-STORE-010: should persist only user/tokens/authenticated to localStorage under ioes-auth', async () => {
    useAuthStore.getState().setUser(buildUser());
    useAuthStore.getState().setTokens('access-persist', 'refresh-persist');
    useAuthStore.getState().setLoading(true); // không được persist

    // Đợi một microtask để Zustand kịp ghi xuống storage (persist mặc định đồng bộ).
    await Promise.resolve();

    const raw = localStorage.getItem(STORAGE_KEY);
    expect(raw).not.toBeNull();
    const parsed = JSON.parse(raw as string);
    expect(parsed.state.user).toEqual(buildUser());
    expect(parsed.state.accessToken).toBe('access-persist');
    expect(parsed.state.refreshToken).toBe('refresh-persist');
    expect(parsed.state.isAuthenticated).toBe(true);
    // isLoading phải bị loại khỏi persisted slice (xem `partialize`).
    expect('isLoading' in parsed.state).toBe(false);
  });

  it('UT-STORE-011: should clear the persisted slice after logout', async () => {
    useAuthStore.getState().login(buildUser(), 'access-x', 'refresh-x');
    await Promise.resolve();
    expect(localStorage.getItem(STORAGE_KEY)).not.toBeNull();

    useAuthStore.getState().logout();
    await Promise.resolve();

    const raw = localStorage.getItem(STORAGE_KEY);
    const parsed = raw ? JSON.parse(raw) : { state: {} };
    // Sau logout, slice persisted phải rỗng — không lưu access/refresh token cũ.
    expect(parsed.state.accessToken ?? null).toBeNull();
    expect(parsed.state.refreshToken ?? null).toBeNull();
    expect(parsed.state.user ?? null).toBeNull();
    expect(parsed.state.isAuthenticated ?? false).toBe(false);
  });
});

// UT-STORE-012 removed: only measured setLoading(true) elapsed time under 100 ms,
// did not assert any state property and was flaky on slow CI. ID is kept in
// traceability_batch1_unit.csv (status=Deprecated) to avoid collision with
// future TC IDs.
