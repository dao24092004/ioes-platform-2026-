import {
  CanActivate,
  ExecutionContext,
  Injectable,
  Logger,
  OnModuleInit,
  UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Request } from 'express';
import * as jwt from 'jsonwebtoken';
import { JwtPayload } from '../types/jwt-payload.type';
import { IS_PUBLIC_KEY } from '../decorators/public.decorator';

export interface JwtGuardConfig {
  /**
   * JWT secret key (required).
   * MUST be set via env (JWT_SECRET). No default value - fail-fast nếu missing.
   */
  secret: string;
  /** Allowed signing algorithms (mặc định HS256). */
  algorithms?: jwt.Algorithm[];
  /** Expected issuer (optional but recommended). */
  issuer?: string;
  /** Expected audience (optional but recommended). */
  audience?: string;
  /** Clock tolerance in seconds cho exp/nbf check (mặc định 0). */
  clockTolerance?: number;
}

/**
 * JwtAuthGuard với secure-by-default:
 *
 * - KHÔNG có default secret - fail nếu env missing (BUG #105)
 * - Enforce algorithm (BUG #106) - chống alg:none attack
 * - Verify iss/aud nếu configured (BUG #107)
 * - Inject typed user object vào request
 *
 * Usage:
 * ```ts
 * JwtAuthGuard.configure({
 *   secret: process.env.JWT_SECRET!,
 *   algorithms: ['HS256'],
 *   issuer: 'ioes-auth-service',
 *   audience: 'ioes-platform',
 * });
 * ```
 */
@Injectable()
export class JwtAuthGuard implements CanActivate, OnModuleInit {
  private readonly logger = new Logger(JwtAuthGuard.name);
  private static config: JwtGuardConfig;

  constructor(private reflector: Reflector) {}

  onModuleInit(): void {
    if (!JwtAuthGuard.config) {
      this.logger.warn(
        'JwtAuthGuard not configured. Call JwtAuthGuard.configure() in main.ts or module init.',
      );
    } else {
      this.logger.log(
        `JwtAuthGuard configured: algs=${JwtAuthGuard.config.algorithms?.join(',') ?? 'default'} issuer=${JwtAuthGuard.config.issuer ?? 'any'} audience=${JwtAuthGuard.config.audience ?? 'any'}`,
      );
    }
  }

  /**
   * Configure JWT validation. Phải gọi 1 lần trước khi guard được sử dụng.
   * Throws nếu secret missing (BUG #105 fix).
   */
  static configure(config: JwtGuardConfig): void {
    if (!config.secret || config.secret.length < 32) {
      throw new Error(
        'JWT secret is required and must be at least 32 characters. Set JWT_SECRET env var.',
      );
    }
    JwtAuthGuard.config = config;
  }

  /**
   * Lấy config hiện tại. Throw nếu chưa configure.
   */
  private getConfig(): JwtGuardConfig {
    if (!JwtAuthGuard.config) {
      throw new Error(
        'JwtAuthGuard not configured. Call JwtAuthGuard.configure() before app starts.',
      );
    }
    return JwtAuthGuard.config;
  }

  canActivate(context: ExecutionContext): boolean {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (isPublic) {
      return true;
    }

    const config = this.getConfig();
    const request = context.switchToHttp().getRequest<Request>();
    const authHeader = request.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw new UnauthorizedException('Missing or invalid Authorization header');
    }

    const token = authHeader.substring(7);

    try {
      // BUG #106 fix: enforce algorithm
      // BUG #107 fix: verify iss/aud
      const verifyOptions: jwt.VerifyOptions = {
        algorithms: config.algorithms ?? ['HS256'],
        issuer: config.issuer,
        audience: config.audience,
        clockTolerance: config.clockTolerance ?? 0,
      };

      const payload = jwt.verify(token, config.secret, verifyOptions) as JwtPayload;

      // Validate required fields
      if (!payload.sub || !payload.role || !payload.type) {
        throw new UnauthorizedException('Invalid token payload');
      }

      // Normalize role sang UPPERCASE để khớp với @Roles('STUDENT', 'INSTRUCTOR', 'ADMIN')
      payload.role = payload.role.toUpperCase();
      if (payload.roles && Array.isArray(payload.roles)) {
        payload.roles = payload.roles.map((r) => r.toUpperCase());
      }

      // Type-safe user object
      (request as any).user = payload;
      (request as any).userId = payload.sub;

      return true;
    } catch (error) {
      // Log detailed error server-side, generic message cho client
      this.logger.warn(`JWT verification failed: ${(error as Error).message}`);
      throw new UnauthorizedException('Invalid or expired token');
    }
  }
}