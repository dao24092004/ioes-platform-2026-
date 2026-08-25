import { Reflector } from '@nestjs/core';
import { ExecutionContext, HttpException } from '@nestjs/common';
import { RateLimitGuard, RateLimit, RATE_LIMIT_KEY } from './rate-limit.guard';

describe('RateLimitGuard - BUG #67 fix', () => {
  let guard: RateLimitGuard;
  let reflector: Reflector;

  beforeEach(() => {
    reflector = {
      getAllAndOverride: jest.fn().mockReturnValue(undefined),
    } as any;
    guard = new RateLimitGuard(reflector);
  });

  it('should_pass_When_noMetadata', () => {
    reflector.getAllAndOverride = jest.fn().mockReturnValue(undefined);
    const ctx = createMockContext({ method: 'GET', url: '/x', ip: '1.2.3.4' });
    expect(guard.canActivate(ctx)).toBe(true);
  });

  it('should_pass_When_underLimit', () => {
    reflector.getAllAndOverride = jest.fn().mockReturnValue({ limit: 5, windowSec: 60 });
    const ctx = createMockContext({ method: 'GET', url: '/x', ip: '1.2.3.4' });
    for (let i = 0; i < 5; i++) {
      expect(guard.canActivate(ctx)).toBe(true);
    }
  });

  it('should_throw_WhenExceedsLimit', () => {
    reflector.getAllAndOverride = jest.fn().mockReturnValue({ limit: 3, windowSec: 60 });
    const ctx = createMockContext({ method: 'GET', url: '/x', ip: '1.2.3.4' });

    for (let i = 0; i < 3; i++) {
      expect(guard.canActivate(ctx)).toBe(true);
    }

    expect(() => guard.canActivate(ctx)).toThrow(HttpException);
  });

  it('should_useUserId_WhenAuthenticated', () => {
    reflector.getAllAndOverride = jest.fn().mockReturnValue({ limit: 2, windowSec: 60 });
    const ctx1 = createMockContext({
      method: 'GET',
      url: '/x',
      ip: '1.2.3.4',
      user: { sub: 'user-1' },
    });
    const ctx2 = createMockContext({
      method: 'GET',
      url: '/x',
      ip: '5.6.7.8', // Different IP
      user: { sub: 'user-2' },
    });

    expect(guard.canActivate(ctx1)).toBe(true);
    expect(guard.canActivate(ctx1)).toBe(true);
    expect(() => guard.canActivate(ctx1)).toThrow();

    // user-2 nên vẫn pass vì keyBy = userId
    expect(guard.canActivate(ctx2)).toBe(true);
  });

  it('should_setRateLimitHeaders_When_canActivate', () => {
    reflector.getAllAndOverride = jest.fn().mockReturnValue({ limit: 5, windowSec: 60 });
    const ctx = createMockContext({ method: 'GET', url: '/x', ip: '1.2.3.4' });

    guard.canActivate(ctx);
    expect((ctx.switchToHttp().getResponse() as any).headers['x-ratelimit-limit']).toBe(5);
    expect((ctx.switchToHttp().getResponse() as any).headers['x-ratelimit-remaining']).toBe(4);
  });
});

function createMockContext(req: any): ExecutionContext {
  const headers: Record<string, string> = {};
  return {
    switchToHttp: () => ({
      getRequest: () => req,
      getResponse: () => ({
        setHeader: (k: string, v: string) => {
          headers[k.toLowerCase()] = v;
        },
        getHeader: (k: string) => headers[k.toLowerCase()],
        headers,
      }),
    }),
    getHandler: () => jest.fn(),
    getClass: () => class {},
  } as any;
}
