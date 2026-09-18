import { apiClient, unwrap, unwrapVoid, type ApiEnvelope } from '@/config/api.config';

/**
 * Danh bạ người dùng cho admin — `AdminUserController` của auth-service.
 *
 * Gateway khai `Path=/api/auth/**` kèm `StripPrefix=2`, nên `/api/auth/users`
 * tới service thành `/users`. Chỉ `admin`/`super_admin` gọi được
 * (`SecurityConfig`), người khác nhận 403.
 *
 * Backend không có endpoint tạo người dùng: tài khoản chỉ sinh ra qua đăng ký.
 */

const BASE = '/api/auth/users';

/** Khớp enum `UserRole` phía Java (chữ thường). */
export type UserRole = 'student' | 'instructor' | 'admin' | 'super_admin' | 'guest';

/** Khớp enum `UserStatus` phía Java. */
export type UserStatus = 'pending' | 'active' | 'suspended' | 'deleted';

/** Khớp enum `UserSort`; giá trị lạ bị backend lặng lẽ đổi về `newest`. */
export type UserSort = 'newest' | 'oldest' | 'name_asc' | 'name_desc';

/** Ánh xạ 1-1 với record `AdminUserResponse`. Không có phòng ban hay metadata. */
export interface AdminUser {
  id: string;
  email: string;
  fullName: string;
  avatarUrl: string | null;
  phone: string | null;
  bio: string | null;
  role: UserRole;
  status: UserStatus;
  emailVerified: boolean;
  mfaEnabled: boolean;
  lastLoginAt: string | null;
  lastLoginIp: string | null;
  createdAt: string;
  updatedAt: string;
  deletedAt: string | null;
}

/** Khớp record `PagedResponse`: `data` và `meta` nằm bên trong vỏ ApiResponse. */
export interface PagedUsers {
  data: AdminUser[];
  meta: {
    total: number;
    page: number;
    perPage: number;
    totalPages: number;
  };
}

/** Khớp record `UserStatsResponse`; người dùng đã xoá mềm không được đếm. */
export interface UserStats {
  total: number;
  students: number;
  instructors: number;
  admins: number;
  superAdmins: number;
  suspended: number;
  pending: number;
  active: number;
}

export interface UserListParams {
  page?: number;
  perPage?: number;
  search?: string;
  /** `all` hoặc bỏ trống là không lọc; tên sai thì backend trả 400. */
  role?: UserRole | 'all';
  status?: UserStatus | 'all';
  sort?: UserSort;
}

export function list(params: UserListParams = {}): Promise<PagedUsers> {
  const { perPage, ...rest } = params;
  return unwrap(
    apiClient.get<ApiEnvelope<PagedUsers>>(BASE, {
      // Query param phía Java tên `per_page`, không phải `perPage`.
      params: { ...rest, per_page: perPage },
    }),
  );
}

export function stats(): Promise<UserStats> {
  return unwrap(apiClient.get<ApiEnvelope<UserStats>>(`${BASE}/stats`));
}

export function getById(id: string): Promise<AdminUser> {
  return unwrap(apiClient.get<ApiEnvelope<AdminUser>>(`${BASE}/${id}`));
}

/**
 * Backend từ chối `deleted` ở đây — xoá phải đi qua `deleteUser` để
 * `deleted_at` được ghi cùng lúc.
 */
export function updateStatus(
  id: string,
  status: Exclude<UserStatus, 'deleted'>,
): Promise<AdminUser> {
  return unwrap(apiClient.patch<ApiEnvelope<AdminUser>>(`${BASE}/${id}/status`, { status }));
}

export function updateRole(id: string, role: UserRole): Promise<AdminUser> {
  return unwrap(apiClient.patch<ApiEnvelope<AdminUser>>(`${BASE}/${id}/role`, { role }));
}

/** Xoá mềm; backend trả `data: null` nên dùng `unwrapVoid`. */
export function deleteUser(id: string): Promise<void> {
  return unwrapVoid(apiClient.delete<ApiEnvelope<null>>(`${BASE}/${id}`));
}

/** Đặt lại mật khẩu người dùng; backend trả mật khẩu tạm mới. */
export interface ResetPasswordResponse {
  temporaryPassword: string;
}

export function resetPassword(id: string): Promise<ResetPasswordResponse> {
  return unwrap(apiClient.post<ApiEnvelope<ResetPasswordResponse>>(`${BASE}/${id}/reset-password`));
}

export const usersApi = { list, stats, getById, updateStatus, updateRole, deleteUser, resetPassword };
