import { RolesGuard } from './roles.guard';
import { ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { ExecutionContext } from '@nestjs/common';

describe('RolesGuard - Multi-role support (BUG #110 fix)', () => {
  let guard: RolesGuard;
  let reflector: Reflector;

  beforeEach(() => {
    reflector = { getAllAndOverride: jest.fn().mockReturnValue([]) } as any;
    guard = new RolesGuard(reflector);
  });

  it('should_pass_When_noRequiredRoles', () => {
    reflector.getAllAndOverride = jest.fn().mockReturnValue(undefined);
    const ctx = createMockContext({ user: { role: 'STUDENT' } });
    expect(guard.canActivate(ctx)).toBe(true);
  });

  it('should_throw_When_userMissing', () => {
    reflector.getAllAndOverride = jest.fn().mockReturnValue(['INSTRUCTOR']);
    const ctx = createMockContext({ user: undefined });
    expect(() => guard.canActivate(ctx)).toThrow(ForbiddenException);
  });

  it('should_pass_When_singleRoleMatches', () => {
    reflector.getAllAndOverride = jest.fn().mockReturnValue(['INSTRUCTOR']);
    const ctx = createMockContext({ user: { role: 'INSTRUCTOR' } });
    expect(guard.canActivate(ctx)).toBe(true);
  });

  it('should_throw_When_singleRoleMismatch', () => {
    reflector.getAllAndOverride = jest.fn().mockReturnValue(['ADMIN']);
    const ctx = createMockContext({ user: { role: 'STUDENT' } });
    expect(() => guard.canActivate(ctx)).toThrow(ForbiddenException);
  });

  describe('Multi-role', () => {
    it('should_pass_When_roleInRolesArray', () => {
      reflector.getAllAndOverride = jest.fn().mockReturnValue(['INSTRUCTOR', 'ADMIN']);
      const ctx = createMockContext({
        user: { role: 'STUDENT', roles: ['INSTRUCTOR'] },
      });
      expect(guard.canActivate(ctx)).toBe(true);
    });

    it('should_pass_When_primaryRoleMatches', () => {
      reflector.getAllAndOverride = jest.fn().mockReturnValue(['INSTRUCTOR']);
      const ctx = createMockContext({
        user: { role: 'INSTRUCTOR', roles: ['STUDENT'] },
      });
      expect(guard.canActivate(ctx)).toBe(true);
    });

    it('should_throw_When_noRoleMatches', () => {
      reflector.getAllAndOverride = jest.fn().mockReturnValue(['ADMIN']);
      const ctx = createMockContext({
        user: { role: 'STUDENT', roles: ['INSTRUCTOR'] },
      });
      expect(() => guard.canActivate(ctx)).toThrow(ForbiddenException);
    });

    it('should_throw_When_userHasNoRole', () => {
      reflector.getAllAndOverride = jest.fn().mockReturnValue(['INSTRUCTOR']);
      const ctx = createMockContext({ user: {} });
      expect(() => guard.canActivate(ctx)).toThrow(ForbiddenException);
    });
  });
});

function createMockContext(req: any): ExecutionContext {
  return {
    switchToHttp: () => ({ getRequest: () => req }),
    getHandler: () => jest.fn(),
    getClass: () => class {},
  } as any;
}