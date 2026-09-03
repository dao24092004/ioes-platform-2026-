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
  isAuthenticated: boolean;
  isLoading: boolean;

  // Actions
  setUser: (user: User | null) => void;
  setAccessToken: (token: string | null) => void;
  login: (user: User, accessToken?: string) => void;
  logout: () => void;
  setLoading: (loading: boolean) => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      accessToken: null,
      isAuthenticated: false,
      isLoading: false,

      setUser: (user) => set({ user, isAuthenticated: !!user }),

      setAccessToken: (accessToken) => set({ accessToken }),

      login: (user, accessToken) => set({
        user,
        ...(accessToken === undefined ? {} : { accessToken }),
        isAuthenticated: true,
        isLoading: false
      }),

      logout: () => set({
        user: null,
        accessToken: null,
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
        isAuthenticated: state.isAuthenticated
      }),
    }
  )
);
