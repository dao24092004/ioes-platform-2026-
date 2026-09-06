import { SetMetadata } from '@nestjs/common';

export const CACHE_TTL_KEY = 'cache_ttl';
export const CACHE_KEY_PREFIX = 'cache_key';

/**
 * @Cacheable(60) decorator
 * Marks controller method response as cacheable with TTL in seconds.
 * Note: Requires cache interceptor to be active.
 */
export const Cacheable = (ttlSeconds: number, keyPrefix?: string) => {
  return (target: any, propertyKey: string, descriptor: PropertyDescriptor) => {
    SetMetadata(CACHE_TTL_KEY, ttlSeconds)(target, propertyKey, descriptor);
    if (keyPrefix) {
      SetMetadata(CACHE_KEY_PREFIX, keyPrefix)(target, propertyKey, descriptor);
    }
    return descriptor;
  };
};

/**
 * @CacheEvict('user:*') decorator
 * Invalidates cache entries matching pattern.
 */
export const CacheEvict = (keyPattern: string): MethodDecorator & ClassDecorator =>
  SetMetadata('cache_evict_pattern', keyPattern);
