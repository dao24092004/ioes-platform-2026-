import { apiClient, unwrap, unwrapVoid, type ApiEnvelope } from '@/config/api.config';
import type { UserRole, UserStatus } from '@/types/db';

/**
 * Epic 1 — đăng nhập, đăng ký, phiên làm việc.
 *
 * Gateway khai `Path=/api/auth/**` kèm `StripPrefix=2`, nên `/api/auth/login`
 * tới auth-service thành `/login`.
 *
 * `logout`, `me` và `changePassword` cần gateway chèn `X-User-Id`, tức là phải
 * gọi kèm access token hợp lệ; gọi thẳng auth-service sẽ trả 400 vì thiếu
 * header đó.
 */

const BASE = '/api/auth';

/** Ánh xạ 1-1 với record `UserResponse` phía Java. */
export interface AuthUser {
  id: string;
  email: string;
  fullName: string;
  avatarUrl: string | null;
  // Enum UserRole/UserStatus phía Java viết thường, trùng đúng union của web
  // nên không cần ánh xạ.
  role: UserRole;
  status: UserStatus;
  emailVerified: boolean;
  createdAt: string;
}

/** Ánh xạ 1-1 với record `AuthResponse` phía Java. */
export interface AuthSession {
  user: AuthUser;
  accessToken: string;
  refreshToken: string;
  tokenType: string;
  /** Thời gian sống của access token, tính bằng giây. */
  expiresIn: number;
}

export interface LoginPayload {
  email: string;
  password: string;
}

export interface RegisterPayload {
  email: string;
  /** auth-service bắt tối thiểu 8 ký tự. */
  password: string;
  fullName: string;
}

export function login(payload: LoginPayload): Promise<AuthSession> {
  return unwrap(apiClient.post<ApiEnvelope<AuthSession>>(`${BASE}/login`, payload));
}

/** Đăng ký xong chưa có phiên — người dùng phải xác thực email trước. */
export function register(payload: RegisterPayload): Promise<AuthUser> {
  return unwrap(apiClient.post<ApiEnvelope<AuthUser>>(`${BASE}/register`, payload));
}

export function refresh(refreshToken: string): Promise<AuthSession> {
  return unwrap(apiClient.post<ApiEnvelope<AuthSession>>(`${BASE}/refresh`, { refreshToken }));
}

export function logout(): Promise<void> {
  return unwrapVoid(apiClient.post<ApiEnvelope<void>>(`${BASE}/logout`));
}

export function me(): Promise<AuthUser> {
  return unwrap(apiClient.get<ApiEnvelope<AuthUser>>(`${BASE}/me`));
}

export function changePassword(oldPassword: string, newPassword: string): Promise<void> {
  return unwrapVoid(
    apiClient.post<ApiEnvelope<void>>(`${BASE}/change-password`, { oldPassword, newPassword }),
  );
}

export const authApi = { login, register, refresh, logout, me, changePassword };
