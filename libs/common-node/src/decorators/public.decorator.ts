import { SetMetadata } from '@nestjs/common';

export const IS_PUBLIC_KEY = 'isPublic';

/**
 * @Public() decorator
 * Marks endpoint as public - bypasses JWT authentication.
 * Use for /auth/login, /auth/register, /health, etc.
 */
export const Public = () => SetMetadata(IS_PUBLIC_KEY, true);
