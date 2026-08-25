import {
  CanActivate,
  ExecutionContext,
  Injectable,
  HttpException,
  HttpStatus,
  SetMetadata,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Request, Response } from 'express';
import { createLogger } from '../utils/logger.util';

export interface RateLimitOptions {
  /** Max requests trong window. */
  limit: number;
  /** Window duration (seconds). */
  windowSec: number;
  /** Identifier: 'ip' | 'userId' (mặc định 'userId'). */
  keyBy?: 'ip' | 'userId';
}

export const RATE_LIMIT_KEY = 'rate-limit:options';

/**
 * @RateLimit({ limit: 30, windowSec: 60 }) - decorator trên controller method.
 *
 * Sliding window rate limiter với in-memory store.
 *
 * Production note:
 * - In-memory không scale across multiple instances
 * - Có thể switch sang Redis sau này qua RateLimitStore interface
 *
 * BUG #67 fix: DDoS protection cho search/get endpoints
 */
export const RateLimit = (options: RateLimitOptions): MethodDecorator => {
  return SetMetadata(RATE_LIMIT_KEY, options);
};

interface RateLimitStore {
  hit(key: string, windowMs: number): { count: number; resetAt: number };
  reset(key: string): void;
  cleanup?(): void;
}

/**
 * Sliding window log-based rate limiter.
 * Memory-friendly: chỉ lưu timestamps trong window.
 */
class InMemoryRateLimitStore implements RateLimitStore {
  private hits = new Map<string, number[]>();

  hit(key: string, windowMs: number): { count: number; resetAt: number } {
    const now = Date.now();
    const cutoff = now - windowMs;
    const timestamps = (this.hits.get(key) ?? []).filter((t) => t > cutoff);
    timestamps.push(now);
    this.hits.set(key, timestamps);

    return {
      count: timestamps.length,
      resetAt: now + windowMs,
    };
  }

  reset(key: string): void {
    this.hits.delete(key);
  }

  /** Cleanup old entries periodically để tránh memory leak. */
  cleanup(): void {
    const now = Date.now();
    let removed = 0;
    for (const [key, timestamps] of this.hits.entries()) {
      const cutoff = now - 60_000;
      const filtered = timestamps.filter((t) => t > cutoff);
      if (filtered.length === 0) {
        this.hits.delete(key);
        removed++;
      } else if (filtered.length !== timestamps.length) {
        this.hits.set(key, filtered);
      }
    }
    if (removed > 0) {
      // Silent cleanup
    }
  }
}

@Injectable()
export class RateLimitGuard implements CanActivate {
  private readonly logger = createLogger(RateLimitGuard.name);
  private readonly store: RateLimitStore = new InMemoryRateLimitStore();

  constructor(private reflector: Reflector) {
    setInterval(() => this.store.cleanup?.(), 60_000).unref();
  }

  canActivate(context: ExecutionContext): boolean {
    const options = this.reflector.getAllAndOverride<RateLimitOptions | undefined>(
      RATE_LIMIT_KEY,
      [context.getHandler(), context.getClass()],
    );

    if (!options) return true;

    const req = context.switchToHttp().getRequest<Request>();
    const res = context.switchToHttp().getResponse<Response>();

    const keyBy = options.keyBy ?? 'userId';
    const identifier =
      keyBy === 'userId'
        ? (req as any).user?.sub ?? (req as any).user?.userId ?? req.ip ?? 'anonymous'
        : req.ip ?? 'unknown';

    const key = `${req.method}:${req.originalUrl ?? req.url}:${identifier}`;
    const result = this.store.hit(key, options.windowSec * 1000);

    // Set headers (RFC 6585)
    res.setHeader('X-RateLimit-Limit', options.limit);
    res.setHeader('X-RateLimit-Remaining', Math.max(0, options.limit - result.count));
    res.setHeader('X-RateLimit-Reset', Math.ceil(result.resetAt / 1000));

    if (result.count > options.limit) {
      const retryAfter = Math.ceil((result.resetAt - Date.now()) / 1000);
      res.setHeader('Retry-After', retryAfter);

      this.logger.warn(
        `Rate limit exceeded: ${key} count=${result.count} limit=${options.limit}`,
      );

      throw new HttpException(
        {
          success: false,
          message: `Too many requests. Try again in ${retryAfter}s.`,
          statusCode: HttpStatus.TOO_MANY_REQUESTS,
          retryAfter,
        },
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }

    return true;
  }
}
