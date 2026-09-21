import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { UserRole } from '@/types/db';

interface User {
  id: string;
  email: string;
  full_name: string;
  role: UserRole;
  avatar_url?: string | null;
}

interface AuthState {
  user: User | null;
  /** JWT gửi kèm mọi request qua API Gateway. */
  accessToken: string | null;
  /** Dùng để xin access token mới khi access token (15 phút) hết hạn. */
  refreshToken: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;

  // Actions
  setUser: (user: User | null) => void;
  setAccessToken: (token: string | null) => void;
  setTokens: (accessToken: string, refreshToken: string) => void;
  login: (user: User, accessToken?: string, refreshToken?: string) => void;
  logout: () => void;
  setLoading: (loading: boolean) => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      accessToken: null,
      refreshToken: null,
      isAuthenticated: false,
      isLoading: false,

      setUser: (user) => set({ user, isAuthenticated: !!user }),

      setAccessToken: (accessToken) => set({ accessToken }),

      setTokens: (accessToken, refreshToken) => set({ accessToken, refreshToken }),

      login: (user, accessToken, refreshToken) => set({
        user,
        ...(accessToken === undefined ? {} : { accessToken }),
        ...(refreshToken === undefined ? {} : { refreshToken }),
        isAuthenticated: true,
        isLoading: false
      }),

      logout: () => set({
        user: null,
        accessToken: null,
        refreshToken: null,
        isAuthenticated: false,
        isLoading: false
      }),
      
      setLoading: (loading) => set({ isLoading: loading }),
    }),
    {
      name: 'ioes-auth',
      partialize: (state) => ({
        user: state.user,
        accessToken: state.accessToken,
        refreshToken: state.refreshToken,
        isAuthenticated: state.isAuthenticated
      }),
    }
  )
);
