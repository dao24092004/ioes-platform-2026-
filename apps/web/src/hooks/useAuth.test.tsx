import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import React from 'react';

const { logout, navigate } = vi.hoisted(() => ({ logout: vi.fn(), navigate: vi.fn() }));

vi.mock('@/services/api/auth.api', () => ({ authApi: { logout } }));
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual<typeof import('react-router-dom')>('react-router-dom');
  return { ...actual, useNavigate: () => navigate };
});

import { useAuth } from './useAuth';
import { useAuthStore } from '@/app/store/authStore';

const wrapper = ({ children }: { children: React.ReactNode }) => (
  <MemoryRouter>{children}</MemoryRouter>
);

beforeEach(() => {
  logout.mockReset();
  navigate.mockReset();
  useAuthStore.setState({
    user: { id: 'u1', email: 'a@b.c', full_name: 'A', role: 'student' },
    accessToken: 'jwt-abc',
    isAuthenticated: true,
    isLoading: false,
  });
});

describe('useAuth.signOut', () => {
  it('báo backend rồi mới xoá phiên cục bộ', async () => {
    logout.mockResolvedValue(undefined);
    const { result } = renderHook(() => useAuth(), { wrapper });

    await act(async () => {
      await result.current.signOut();
    });

    expect(logout).toHaveBeenCalled();
    expect(useAuthStore.getState().accessToken).toBeNull();
    expect(useAuthStore.getState().isAuthenticated).toBe(false);
    expect(navigate).toHaveBeenCalledWith('/auth/login', { replace: true });
  });

  it('vẫn xoá phiên khi gọi backend thất bại', async () => {
    // Người dùng bấm đăng xuất thì phiên trên máy họ phải biến mất, kể cả khi
    // máy chủ không phản hồi — nếu không, họ tưởng đã thoát mà token vẫn còn.
    logout.mockRejectedValue(new Error('Network Error'));
    const { result } = renderHook(() => useAuth(), { wrapper });

    await act(async () => {
      await result.current.signOut();
    });

    await waitFor(() => expect(useAuthStore.getState().accessToken).toBeNull());
    expect(useAuthStore.getState().user).toBeNull();
    expect(navigate).toHaveBeenCalledWith('/auth/login', { replace: true });
  });
});
