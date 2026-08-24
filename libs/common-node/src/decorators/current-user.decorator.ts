import { ExecutionContext, createParamDecorator } from '@nestjs/common';
import { Request } from 'express';
import { UserPrincipalDto } from '../dto/user-principal.dto';

/**
 * @CurrentUser() decorator
 * Extracts authenticated user from request.
 *
 * Usage:
 * @CurrentUser() user: UserPrincipalDto
 * @CurrentUser('userId') userId: string
 */
export const CurrentUser = createParamDecorator(
  (data: keyof UserPrincipalDto | undefined, ctx: ExecutionContext) => {
    const request = ctx.switchToHttp().getRequest<Request>();
    const user = (request as any).user;

    if (!user) {
      return null;
    }

    if (data) {
      return user[data];
    }

    return UserPrincipalDto.from({
      sub: user.sub,
      email: user.email,
      role: user.role,
      name: user.name,
    });
  },
) as unknown as (...dataAndPipe: (keyof UserPrincipalDto | undefined)[]) => ParameterDecorator;
