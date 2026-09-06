import { JwtAuthGuard, JwtGuardConfig } from './jwt-auth.guard';
import { UnauthorizedException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { ExecutionContext } from '@nestjs/common';
import * as jwt from 'jsonwebtoken';

describe('JwtAuthGuard - Security fixes', () => {
  const VALID_SECRET = 'this-is-a-secret-key-that-is-at-least-32-characters-long';
  let guard: JwtAuthGuard;
  let reflector: Reflector;

  beforeEach(() => {
    reflector = { getAllAndOverride: jest.fn().mockReturnValue(false) } as any;
    guard = new JwtAuthGuard(reflector);
  });

  afterEach(() => {
    // Reset static config
    (JwtAuthGuard as any).config = undefined;
  });

  describe('configure() - BUG #105 fix', () => {
    it('should_throw_When_secretMissing', () => {
      expect(() => JwtAuthGuard.configure({ secret: '' } as JwtGuardConfig)).toThrow(
        /JWT secret is required/,
      );
    });

    it('should_throw_When_secretTooShort', () => {
      expect(() => JwtAuthGuard.configure({ secret: 'short' })).toThrow(
        /at least 32 characters/,
      );
    });

    it('should_accept_When_secretValid', () => {
      expect(() =>
        JwtAuthGuard.configure({ secret: VALID_SECRET, algorithms: ['HS256'] }),
      ).not.toThrow();
    });
  });

  describe('algorithm enforcement - BUG #106 fix', () => {
    it('should_reject_When_algNone', () => {
      JwtAuthGuard.configure({ secret: VALID_SECRET, algorithms: ['HS256'] });

      // Create token với alg: none (vulnerability test)
      const token = jwt.sign(
        { sub: 'u1', role: 'STUDENT', type: 'access' },
        '',
        { algorithm: 'none' as any },
      );

      const ctx = createMockContext(`Bearer ${token}`);
      expect(() => guard.canActivate(ctx)).toThrow(UnauthorizedException);
    });

    it('should_accept_When_algMatches', () => {
      JwtAuthGuard.configure({ secret: VALID_SECRET, algorithms: ['HS256'] });

      const token = jwt.sign(
        { sub: 'u1', role: 'STUDENT', type: 'access' },
        VALID_SECRET,
        { algorithm: 'HS256' },
      );

      const ctx = createMockContext(`Bearer ${token}`);
      expect(guard.canActivate(ctx)).toBe(true);
    });
  });

  describe('iss/aud verification - BUG #107 fix', () => {
    it('should_reject_When_issuerMismatch', () => {
      JwtAuthGuard.configure({
        secret: VALID_SECRET,
        algorithms: ['HS256'],
        issuer: 'expected-issuer',
      });

      const token = jwt.sign(
        { sub: 'u1', role: 'STUDENT', type: 'access' },
        VALID_SECRET,
        { algorithm: 'HS256', issuer: 'wrong-issuer' },
      );

      const ctx = createMockContext(`Bearer ${token}`);
      expect(() => guard.canActivate(ctx)).toThrow(UnauthorizedException);
    });

    it('should_accept_When_issuerMatches', () => {
      JwtAuthGuard.configure({
        secret: VALID_SECRET,
        algorithms: ['HS256'],
        issuer: 'ioes-auth',
      });

      const token = jwt.sign(
        { sub: 'u1', role: 'STUDENT', type: 'access' },
        VALID_SECRET,
        { algorithm: 'HS256', issuer: 'ioes-auth' },
      );

      const ctx = createMockContext(`Bearer ${token}`);
      expect(guard.canActivate(ctx)).toBe(true);
    });

    it('should_reject_When_audienceMismatch', () => {
      JwtAuthGuard.configure({
        secret: VALID_SECRET,
        algorithms: ['HS256'],
        audience: 'ioes-platform',
      });

      const token = jwt.sign(
        { sub: 'u1', role: 'STUDENT', type: 'access' },
        VALID_SECRET,
        { algorithm: 'HS256', audience: 'wrong-audience' },
      );

      const ctx = createMockContext(`Bearer ${token}`);
      expect(() => guard.canActivate(ctx)).toThrow(UnauthorizedException);
    });
  });

  describe('payload validation', () => {
    it('should_reject_When_payloadMissingFields', () => {
      JwtAuthGuard.configure({ secret: VALID_SECRET });

      const token = jwt.sign(
        { sub: 'u1' }, // missing role, type
        VALID_SECRET,
      );

      const ctx = createMockContext(`Bearer ${token}`);
      expect(() => guard.canActivate(ctx)).toThrow(UnauthorizedException);
    });

    it('should_injectUser_When_valid', () => {
      JwtAuthGuard.configure({ secret: VALID_SECRET });

      const token = jwt.sign(
        { sub: 'u1', role: 'INSTRUCTOR', type: 'access', email: 'i@x.com' },
        VALID_SECRET,
      );

      const req = { headers: { authorization: `Bearer ${token}` } };
      const ctx = createMockContextWithReq(req);
      guard.canActivate(ctx);

      expect((req as any).user).toMatchObject({
        sub: 'u1',
        role: 'INSTRUCTOR',
      });
    });
  });

  describe('public routes', () => {
    it('should_skipAuth_When_isPublic', () => {
      reflector.getAllAndOverride = jest.fn().mockReturnValue(true);
      const ctx = createMockContext('');
      expect(guard.canActivate(ctx)).toBe(true);
    });
  });
});

function createMockContext(authHeader: string): ExecutionContext {
  return createMockContextWithReq({
    headers: authHeader ? { authorization: authHeader } : {},
  });
}

function createMockContextWithReq(req: any): ExecutionContext {
  return {
    switchToHttp: () => ({
      getRequest: () => req,
      getResponse: () => ({}),
      getNext: () => ({}),
    }),
    getHandler: () => jest.fn(),
    getClass: () => class {},
  } as any;
}