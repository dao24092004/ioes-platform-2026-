import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, waitFor } from '@testing-library/react';

const { me } = vi.hoisted(() => ({ me: vi.fn() }));
vi.mock('@/services/api/auth.api', () => ({ authApi: { me } }));

import AuthProvider from './AuthProvider';
import { useAuthStore } from '@/app/store/authStore';

const session = {
  user: { id: 'u1', email: 'a@b.c', full_name: 'A', role: 'student' as const },
  accessToken: 'jwt-abc',
  isAuthenticated: true,
  isLoading: false,
};

const renderProvider = () => render(<AuthProvider><div>ok</div></AuthProvider>);

beforeEach(() => {
  me.mockReset();
  vi.resetModules();
  useAuthStore.setState(session);
});

describe('AuthProvider', () => {
  it('làm mới hồ sơ khi token còn hạn', async () => {
    me.mockResolvedValue({
      id: 'u1',
      email: 'a@b.c',
      fullName: 'Tên Mới',
      avatarUrl: null,
      role: 'student',
      status: 'active',
      emailVerified: true,
      createdAt: '',
    });

    renderProvider();

    await waitFor(() => expect(useAuthStore.getState().user?.full_name).toBe('Tên Mới'));
    expect(useAuthStore.getState().isAuthenticated).toBe(true);
  });

  it('đăng xuất khi máy chủ trả 401', async () => {
    me.mockRejectedValue({ status: 401 });
    renderProvider();
    await waitFor(() => expect(useAuthStore.getState().isAuthenticated).toBe(false));
    expect(useAuthStore.getState().accessToken).toBeNull();
  });

  it('giữ nguyên phiên khi chỉ là lỗi mạng', async () => {
    // Rớt mạng mà đá người dùng ra ngoài thì mỗi lần wifi chập là mất phiên.
    me.mockRejectedValue({ message: 'Network Error' });
    renderProvider();
    await waitFor(() => expect(me).toHaveBeenCalled());
    expect(useAuthStore.getState().isAuthenticated).toBe(true);
    expect(useAuthStore.getState().accessToken).toBe('jwt-abc');
  });

  it('dọn phiên có user nhưng không có token', async () => {
    // Trạng thái này chỉ gọi API là 401 hàng loạt, nên xoá luôn cho dứt khoát.
    useAuthStore.setState({ ...session, accessToken: null });
    renderProvider();
    await waitFor(() => expect(useAuthStore.getState().isAuthenticated).toBe(false));
    expect(me).not.toHaveBeenCalled();
  });
});
