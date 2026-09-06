import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
  Inject,
  Optional,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Observable, of, from } from 'rxjs';
import { tap, switchMap } from 'rxjs/operators';
import { CacheStore, getCacheStore } from './cache.store';
import {
  CacheConfig,
  CACHE_CONFIG_KEY,
  defaultKeyGenerator,
} from './cache.decorator';
import { createLogger } from '../utils/logger.util';

/**
 * CacheInterceptor - intercept methods decorated with @Cache().
 *
 * Flow:
 * 1. Compute cache key từ keyPrefix + args
 * 2. Try cache.get() - nếu HIT → return cached value
 * 3. MISS → execute handler → cache result
 *
 * Invalidation:
 * - Manual: cache.delete(key)
 * - Pattern: cache.deletePattern('topic-tree:*')
 *
 * BUG #90 fix: simple caching cho read endpoints
 */
@Injectable()
export class CacheInterceptor implements NestInterceptor {
  private readonly logger = createLogger(CacheInterceptor.name);
  private readonly cache: CacheStore;

  constructor(
    private reflector: Reflector,
    @Optional() @Inject('CACHE_STORE') store?: CacheStore,
  ) {
    this.cache = store ?? getCacheStore();
  }

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const config = this.reflector.getAllAndOverride<CacheConfig | undefined>(
      CACHE_CONFIG_KEY,
      [context.getHandler(), context.getClass()],
    );

    if (!config) {
      return next.handle();
    }

    const args = context.getArgs();
    const keyGenerator = config.keyGenerator ?? defaultKeyGenerator;
    const cacheKey = `${config.keyPrefix}:${keyGenerator(...args)}`;

    return from(this.cache.get(cacheKey)).pipe(
      switchMap((cached) => {
        if (cached !== null && cached !== undefined) {
          this.logger.debug(`Cache HIT: ${cacheKey}`);
          return of(cached);
        }

        this.logger.debug(`Cache MISS: ${cacheKey}`);

        return next.handle().pipe(
          tap({
            next: async (result) => {
              if (result !== undefined && result !== null) {
                try {
                  await this.cache.set(cacheKey, result, config.ttl);
                } catch (err) {
                  this.logger.warn(
                    `Failed to cache result for ${cacheKey}: ${(err as Error).message}`,
                  );
                }
              }
            },
            error: () => {
              // Không cache errors
            },
          }),
        );
      }),
    );
  }
}
