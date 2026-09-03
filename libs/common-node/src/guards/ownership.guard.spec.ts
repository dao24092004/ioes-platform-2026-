import { Reflector } from '@nestjs/core';
import { ForbiddenException } from '@nestjs/common';
import { OwnershipGuard, Ownership } from './ownership.guard';

describe('OwnershipGuard - BUG #112 fix', () => {
  let guard: OwnershipGuard;
  let reflector: Reflector;

  beforeEach(() => {
    reflector = { getAllAndOverride: jest.fn().mockReturnValue(undefined) } as any;
    guard = new OwnershipGuard(reflector);
  });

  it('should_pass_When_noConfig', () => {
    reflector.getAllAndOverride = jest.fn().mockReturnValue(undefined);
    expect(guard.canActivate(createMockContext({ user: { sub: 'u1' } }))).toBe(true);
  });

  it('should_throw_When_userMissing', async () => {
    reflector.getAllAndOverride = jest.fn().mockReturnValue({ resource: 'question', ownerField: 'createdBy' });
    expect(() =>
      guard.canActivate(createMockContext({ user: undefined })),
    ).toThrow(ForbiddenException);
  });

  it('should_bypass_When_admin', async () => {
    reflector.getAllAndOverride = jest.fn().mockReturnValue({ resource: 'question', ownerField: 'createdBy' });
    expect(
      await guard.canActivate(createMockContext({ user: { sub: 'admin-1', role: 'ADMIN' }, params: { id: 'q1' } })),
    ).toBe(true);
  });

  it('should_throw_When_noFetcherRegistered', async () => {
    reflector.getAllAndOverride = jest.fn().mockReturnValue({ resource: 'unknown', ownerField: 'createdBy' });
    expect(() =>
      guard.canActivate(createMockContext({ user: { sub: 'u1', role: 'STUDENT' }, params: { id: 'q1' } })),
    ).toThrow(ForbiddenException);
  });

  it('should_pass_When_ownerMatches', async () => {
    OwnershipGuard.registerResourceOwner('question', async (_r, id) => ({
      createdBy: 'u1',
    }));
    reflector.getAllAndOverride = jest.fn().mockReturnValue({ resource: 'question', ownerField: 'createdBy' });
    expect(
      await guard.canActivate(createMockContext({ user: { sub: 'u1', role: 'INSTRUCTOR' }, params: { id: 'q1' } })),
    ).toBe(true);
  });

  it('should_throw_When_ownerMismatch', async () => {
    OwnershipGuard.registerResourceOwner('question', async (_r, id) => ({
      createdBy: 'other-user',
    }));
    reflector.getAllAndOverride = jest.fn().mockReturnValue({ resource: 'question', ownerField: 'createdBy' });
    await expect(
      guard.canActivate(createMockContext({ user: { sub: 'u1', role: 'INSTRUCTOR' }, params: { id: 'q1' } })),
    ).rejects.toThrow(ForbiddenException);
  });

  it('should_throw_When_resourceNotFound', async () => {
    OwnershipGuard.registerResourceOwner('question', async () => null);
    reflector.getAllAndOverride = jest.fn().mockReturnValue({ resource: 'question', ownerField: 'createdBy' });
    await expect(
      guard.canActivate(createMockContext({ user: { sub: 'u1', role: 'INSTRUCTOR' }, params: { id: 'q1' } })),
    ).rejects.toThrow(ForbiddenException);
  });
});

function createMockContext(req: any): any {
  return {
    switchToHttp: () => ({ getRequest: () => req }),
    getHandler: () => jest.fn(),
    getClass: () => class {},
  };
}
