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

/**
 * @Ownership decorator - check user có phải owner của resource.
 *
 * Resource ownership được determine qua một async function được cung cấp
 * trong module config.
 *
 * @example
 * ```ts
 * @Controller('questions')
 * class QuestionController {
 *   @Delete(':id')
 *   @Roles('INSTRUCTOR')
 *   @Ownership('question', 'createdBy')
 *   async delete(...) {}
 * }
 *
 * // Module:
 * OwnershipGuard.registerResourceOwner('question', async (id) => {
 *   return repo.findOne({ where: { id }, select: ['createdBy'] });
 * });
 * ```
 */
export const OWNERSHIP_KEY = 'ownership:config';

export interface OwnershipConfig {
  resource: string;
  /** Field name trong resource object chứa owner user ID. */
  ownerField: string;
}

export const Ownership = (
  resource: string,
  ownerField: string = 'createdBy',
): MethodDecorator => SetMetadata(OWNERSHIP_KEY, { resource, ownerField });

type ResourceOwnerFetcher = (
  resource: string,
  id: string,
) => Promise<Record<string, unknown> | null>;

@Injectable()
export class OwnershipGuard implements CanActivate {
  private readonly logger = createLogger(OwnershipGuard.name);
  private static fetchers = new Map<string, ResourceOwnerFetcher>();

  constructor(private reflector: Reflector) {}

  /**
   * Register resource owner fetcher cho 1 resource type.
   * Phải gọi trong module onModuleInit.
   */
  static registerResourceOwner(
    resource: string,
    fetcher: ResourceOwnerFetcher,
  ): void {
    OwnershipGuard.fetchers.set(resource, fetcher);
  }

  canActivate(context: ExecutionContext): Promise<boolean> | boolean {
    const config = this.reflector.getAllAndOverride<OwnershipConfig | undefined>(
      OWNERSHIP_KEY,
      [context.getHandler(), context.getClass()],
    );

    if (!config) return true;

    const req = context.switchToHttp().getRequest<Request>();
    const user = (req as any).user as JwtPayload | undefined;

    if (!user) {
      throw new ForbiddenException('User not authenticated');
    }

    // Admin bypass ownership check
    if (user.role === 'ADMIN') {
      return true;
    }

    const fetcher = OwnershipGuard.fetchers.get(config.resource);
    if (!fetcher) {
      this.logger.error(
        `No owner fetcher registered for resource '${config.resource}'. ` +
          `Call OwnershipGuard.registerResourceOwner('${config.resource}', ...) in module init.`,
      );
      throw new ForbiddenException('Ownership check unavailable');
    }

    const id = req.params?.id;
    if (!id) {
      this.logger.warn(`Ownership check failed: no id param`);
      return false;
    }

    return this.checkOwnership(fetcher, config, id, user);
  }

  private async checkOwnership(
    fetcher: ResourceOwnerFetcher,
    config: OwnershipConfig,
    id: string,
    user: JwtPayload,
  ): Promise<boolean> {
    const resource = await fetcher(config.resource, id);
    if (!resource) {
      throw new ForbiddenException(`${config.resource} not found`);
    }

    const ownerId = resource[config.ownerField];
    if (!ownerId) {
      this.logger.error(
        `Resource ${config.resource}:${id} has no '${config.ownerField}' field`,
      );
      throw new ForbiddenException('Resource ownership undefined');
    }

    if (ownerId !== user.sub) {
      this.logger.warn(
        `Ownership denied: user ${user.sub} tried to access ${config.resource}:${id} owned by ${ownerId}`,
      );
      throw new ForbiddenException('You do not own this resource');
    }

    return true;
  }
}
