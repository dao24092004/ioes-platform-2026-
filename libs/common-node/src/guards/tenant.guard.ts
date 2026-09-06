import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
  SetMetadata,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Request } from 'express';
import { JwtPayload } from '../types/jwt-payload.type';
import { createLogger } from '../utils/logger.util';

export const TENANT_KEY = 'tenant:check';

/**
 * @RequireTenant() - enforce user phải có tenantId.
 *
 * Multi-tenant resource isolation: requests không có tenantId → 403.
 *
 * BUG #115 fix: tenant isolation.
 */
export const RequireTenant = (): MethodDecorator =>
  SetMetadata(TENANT_KEY, true);

@Injectable()
export class TenantGuard implements CanActivate {
  private readonly logger = createLogger(TenantGuard.name);

  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiresTenant = this.reflector.getAllAndOverride<boolean>(TENANT_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (!requiresTenant) return true;

    const req = context.switchToHttp().getRequest<Request>();
    const user = (req as any).user as JwtPayload | undefined;

    if (!user) {
      throw new ForbiddenException('User not authenticated');
    }

    if (user.role === 'ADMIN') return true;

    if (!user.tenantId) {
      this.logger.warn(
        `User ${user.sub} tried to access tenant-protected resource without tenantId`,
      );
      throw new ForbiddenException('User does not belong to any tenant');
    }

    // Optional: check if request path includes /tenants/:tenantId/...
    const pathTenantId = req.params?.tenantId;
    if (pathTenantId && pathTenantId !== user.tenantId && user.role !== 'ADMIN') {
      this.logger.warn(
        `Cross-tenant access denied: user ${user.sub} (tenant ${user.tenantId}) tried to access tenant ${pathTenantId}`,
      );
      throw new ForbiddenException('Cross-tenant access denied');
    }

    return true;
  }
}
