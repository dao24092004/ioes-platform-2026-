import { ExecutionContext, createParamDecorator } from '@nestjs/common';
import { Request } from 'express';

/**
 * @UserId() decorator
 * Extracts the authenticated user ID from the request.
 * Used in services that only need the user ID, not the full user info.
 */
export const UserId = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): string => {
    const request = ctx.switchToHttp().getRequest<Request>();
    return (request as any).userId || (request as any).user?.sub;
  },
);
