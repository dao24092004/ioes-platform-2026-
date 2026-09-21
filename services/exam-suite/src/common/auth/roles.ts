/**
 * Role đã được JwtAuthGuard chuẩn hoá sang UPPERCASE
 * (token của auth-service mang role lowercase: student | instructor | admin | super_admin).
 */
export const ADMIN_ROLES = ['ADMIN', 'SUPER_ADMIN'] as const;

export function isAdminRole(role: string | undefined | null): boolean {
  return !!role && (ADMIN_ROLES as readonly string[]).includes(role.toUpperCase());
}
