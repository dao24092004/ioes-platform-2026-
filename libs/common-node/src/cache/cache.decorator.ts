import { SetMetadata } from '@nestjs/common';

export interface CacheConfig {
  /** TTL in seconds. */
  ttl: number;
  /** Cache key prefix - kết hợp với args để tạo full key. */
  keyPrefix: string;
  /** Optional: hàm generate key từ args (default: JSON.stringify). */
  keyGenerator?: (...args: unknown[]) => string;
}

/**
 * @Cache decorator - cache kết quả method theo args.
 *
 * @example
 * ```ts
 * @Cache({ ttl: 60, keyPrefix: 'topic-tree' })
 * async getTopicTree(): Promise<TopicDto[]> {
 *   return this.dgraph.query(...);
 * }
 * ```
 *
 * **Lưu ý**: method phải được wrap qua CacheInterceptor để decorator có tác dụng.
 *
 * BUG #90 fix: cache layer cho read endpoints.
 */
export const Cache = (config: CacheConfig): MethodDecorator =>
  SetMetadata('cache:config', config);

export const CACHE_CONFIG_KEY = 'cache:config';

export function defaultKeyGenerator(...args: unknown[]): string {
  return args.map((a) => JSON.stringify(a) ?? 'null').join(':');
}
