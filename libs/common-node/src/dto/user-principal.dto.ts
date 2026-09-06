export interface UserPrincipal {
  userId: string;
  email: string;
  role: string;
  fullName?: string;
  /** BUG #115 fix: multi-tenant support. */
  tenantId?: string;
  /** Permissions granular (thay thế role-only check). */
  permissions?: string[];
}

export class UserPrincipalDto implements UserPrincipal {
  userId!: string;
  email!: string;
  role!: string;
  fullName?: string;
  tenantId?: string;
  permissions?: string[];

  static from(payload: {
    sub: string;
    email: string;
    role: string;
    name?: string;
    tenantId?: string;
    permissions?: string[];
  }): UserPrincipalDto {
    const dto = new UserPrincipalDto();
    dto.userId = payload.sub;
    dto.email = payload.email;
    dto.role = payload.role;
    dto.fullName = payload.name;
    dto.tenantId = payload.tenantId;
    dto.permissions = payload.permissions;
    return dto;
  }

  /**
   * Check nếu user có permission cụ thể.
   * Admin luôn có tất cả permissions.
   */
  hasPermission(permission: string): boolean {
    if (this.role === 'ADMIN') return true;
    return this.permissions?.includes(permission) ?? false;
  }

  /**
   * Check nếu user thuộc tenant (hoặc là admin).
   */
  belongsToTenant(tenantId: string): boolean {
    if (this.role === 'ADMIN') return true;
    return this.tenantId === tenantId;
  }
}