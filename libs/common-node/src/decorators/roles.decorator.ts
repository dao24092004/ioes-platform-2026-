import { SetMetadata } from '@nestjs/common';

export const ROLES_KEY = 'roles';

/**
 * @Roles('ADMIN', 'INSTRUCTOR') decorator
 * Restricts endpoint access to specified roles.
 */
export const Roles = (...roles: string[]) => SetMetadata(ROLES_KEY, roles);
