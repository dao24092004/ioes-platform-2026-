/**
 * JWT Payload contract.
 * MUST be verified with proper algorithm + issuer + audience.
 */
export interface JwtPayload {
  /** Subject (userId) */
  sub: string;
  email: string;
  /** Single primary role (vd: 'INSTRUCTOR'). Để multi-role dùng `roles`. */
  role: string;
  /** Multi-role support - optional, RolesGuard check cả 2. */
  roles?: string[];
  name?: string;
  /** 'access' = short-lived (15min), 'refresh' = long-lived (7d) */
  type: 'access' | 'refresh';
  iat?: number;
  exp?: number;
  iss?: string;
  aud?: string;
  /** BUG #115 fix: tenant + permissions. */
  tenantId?: string;
  permissions?: string[];
}
