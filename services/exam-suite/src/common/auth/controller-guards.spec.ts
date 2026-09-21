import { CanActivate, ExecutionContext, ForbiddenException, UnauthorizedException } from '@nestjs/common';
import { GUARDS_METADATA } from '@nestjs/common/constants';
import { Reflector } from '@nestjs/core';
import * as jwt from 'jsonwebtoken';
import { JwtAuthGuard, RolesGuard } from '@ioes/common-node';
import { configureJwtAuth } from './jwt-auth.config';
import { jwtConfig } from '../../config/app.config';
import { SubmissionController } from '../../modules/submission/submission.controller';
import { ExamSessionController } from '../../modules/exam-session/exam-session.controller';
import { ExamController } from '../../modules/exam/exam.controller';

type GuardCtor = new (reflector: Reflector) => CanActivate;

/**
 * Chạy đúng chuỗi guard mà controller khai báo (@UseGuards) trên 1 request giả,
 * với token HS384 giống auth-service phát hành (role lowercase, iss ioes-platform).
 */
describe('Controller guards (JWT + roles)', () => {
  const USER = '00000000-0000-4000-8000-0000000000aa';

  beforeAll(() => {
    configureJwtAuth();
  });

  const token = (role: string, opts: jwt.SignOptions = {}, key = jwtConfig.secret) =>
    jwt.sign({ sub: USER, role, email: 'u@x.io', name: 'U', type: 'access' }, key, {
      algorithm: 'HS384',
      issuer: jwtConfig.issuer,
      expiresIn: '5m',
      ...opts,
    });

  const run = (controller: Function, handler: Function, headers: Record<string, string>) => {
    const request: Record<string, any> = { headers };
    const ctx = {
      getClass: () => controller,
      getHandler: () => handler,
      getType: () => 'http',
      switchToHttp: () => ({ getRequest: () => request, getResponse: () => ({}) }),
    } as unknown as ExecutionContext;
    const reflector = new Reflector();
    const guards = (Reflect.getMetadata(GUARDS_METADATA, controller) ?? []) as GuardCtor[];
    for (const Guard of guards) {
      if (!new Guard(reflector).canActivate(ctx)) return { allowed: false, request };
    }
    return { allowed: true, request };
  };

  const bearer = (t: string) => ({ authorization: `Bearer ${t}` });

  it.each([SubmissionController, ExamSessionController, ExamController])(
    'should_declareJwtAndRolesGuards_On_%p',
    (controller) => {
      expect(Reflect.getMetadata(GUARDS_METADATA, controller)).toEqual([JwtAuthGuard, RolesGuard]);
    },
  );

  describe('SubmissionController', () => {
    const submit = SubmissionController.prototype.submit;
    const grade = SubmissionController.prototype.grade;

    it('should_setUserId_When_studentSubmitsWithValidToken', () => {
      const { allowed, request } = run(SubmissionController, submit, bearer(token('student')));
      expect(allowed).toBe(true);
      expect(request.userId).toBe(USER);
    });

    it('should_throwUnauthorized_When_noToken', () => {
      expect(() => run(SubmissionController, submit, {})).toThrow(UnauthorizedException);
    });

    it('should_throwUnauthorized_When_wrongSecret', () => {
      const bad = token('student', {}, 'x'.repeat(64));
      expect(() => run(SubmissionController, submit, bearer(bad))).toThrow(UnauthorizedException);
    });

    it('should_throwUnauthorized_When_wrongIssuer', () => {
      const bad = token('student', { issuer: 'evil' });
      expect(() => run(SubmissionController, submit, bearer(bad))).toThrow(UnauthorizedException);
    });

    it('should_throwForbidden_When_studentGrades', () => {
      expect(() => run(SubmissionController, grade, bearer(token('student')))).toThrow(
        ForbiddenException,
      );
    });

    it.each(['instructor', 'admin', 'super_admin'])('should_allowGrade_When_role_%s', (role) => {
      expect(run(SubmissionController, grade, bearer(token(role))).allowed).toBe(true);
    });
  });

  describe('ExamSessionController', () => {
    const active = ExamSessionController.prototype.listActiveAttempts;
    const start = ExamSessionController.prototype.start;

    it('should_throwUnauthorized_When_onlyDevUserIdHeader', () => {
      expect(() =>
        run(ExamSessionController, start, { 'x-dev-user-id': USER }),
      ).toThrow(UnauthorizedException);
    });

    it('should_allowStart_When_realStudentJwt', () => {
      expect(run(ExamSessionController, start, bearer(token('student'))).allowed).toBe(true);
    });

    it('should_throwForbidden_When_studentListsActiveAttempts', () => {
      expect(() => run(ExamSessionController, active, bearer(token('student')))).toThrow(
        ForbiddenException,
      );
    });

    it.each(['instructor', 'admin', 'super_admin'])(
      'should_allowActiveAttempts_When_role_%s',
      (role) => {
        expect(run(ExamSessionController, active, bearer(token(role))).allowed).toBe(true);
      },
    );
  });

  it('should_allowSuperAdmin_On_ExamController_getById', () => {
    expect(
      run(ExamController, ExamController.prototype.getById, bearer(token('super_admin'))).allowed,
    ).toBe(true);
  });
});
