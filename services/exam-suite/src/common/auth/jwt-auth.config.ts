import * as jwt from 'jsonwebtoken';
import { JwtAuthGuard, JwtGuardConfig } from '@ioes/common-node';
import { jwtConfig, validateJwtConfig } from '../../config/app.config';

/**
 * Cấu hình xác thực JWT dùng chung cho REST (JwtAuthGuard của common-node)
 * và WebSocket (ExamSessionGateway).
 *
 * auth-service ký access token HS384 bằng JWT_SECRET, iss = JWT_ISSUER
 * (mặc định "ioes-platform"). Không có secret mặc định: `jwtConfig.secret`
 * dùng requiredSecret() nên thiếu JWT_SECRET là app chết ngay lúc load config.
 */
export const ACCEPTED_JWT_ALGORITHMS: jwt.Algorithm[] = ['HS256', 'HS384', 'HS512'];

export function buildJwtGuardConfig(): JwtGuardConfig {
  validateJwtConfig();
  return {
    secret: jwtConfig.secret,
    algorithms: ACCEPTED_JWT_ALGORITHMS,
    issuer: jwtConfig.issuer,
  };
}

/** Gọi 1 lần trong main.ts trước khi tạo app. */
export function configureJwtAuth(): JwtGuardConfig {
  const config = buildJwtGuardConfig();
  JwtAuthGuard.configure(config);
  return config;
}

export interface AccessTokenPrincipal {
  userId: string;
  /** UPPERCASE, cùng quy ước với JwtAuthGuard (STUDENT, INSTRUCTOR, ADMIN, SUPER_ADMIN). */
  role: string;
  email?: string;
  name?: string;
}

/**
 * Verify chữ ký + hạn + issuer của access token, cùng tham số với JwtAuthGuard.
 * Throw nếu token không hợp lệ. Refresh token (type != "access") bị từ chối.
 */
export function verifyAccessToken(
  token: string,
  config: JwtGuardConfig = buildJwtGuardConfig(),
): AccessTokenPrincipal {
  const payload = jwt.verify(token, config.secret, {
    algorithms: config.algorithms ?? ['HS256'],
    issuer: config.issuer,
    audience: config.audience,
    clockTolerance: config.clockTolerance ?? 0,
  });

  if (typeof payload === 'string') {
    throw new Error('Invalid token payload');
  }
  const { sub, role, type, email, name } = payload as jwt.JwtPayload & {
    role?: string;
    type?: string;
    email?: string;
    name?: string;
  };
  if (!sub || !role || type !== 'access') {
    throw new Error('Invalid token payload');
  }

  return { userId: sub, role: role.toUpperCase(), email, name };
}
