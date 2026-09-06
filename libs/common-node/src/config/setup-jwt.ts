import { JwtAuthGuard } from '../guards/jwt-auth.guard';

/**
 * Helper khởi tạo JwtAuthGuard từ environment variables.
 *
 * MUST be called 1 lần trước khi app starts.
 * Nếu thiếu env vars → fail-fast với error message rõ ràng.
 *
 * @example
 * ```ts
 * // main.ts
 * bootstrapApp().then(() => {
 *   setupJwtFromEnv();
 * });
 * ```
 *
 * @see BUG #105 fix - JWT_SECRET hard-coded fallback
 */
export function setupJwtFromEnv(): void {
  const secret = process.env.JWT_SECRET;
  const algorithms = (process.env.JWT_ALGORITHMS ?? 'HS256')
    .split(',')
    .map((a) => a.trim()) as ('HS256' | 'HS384' | 'HS512' | 'RS256')[];
  const issuer = process.env.JWT_ISSUER;
  const audience = process.env.JWT_AUDIENCE;
  const clockTolerance = parseInt(process.env.JWT_CLOCK_TOLERANCE ?? '5', 10);

  if (!secret) {
    throw new Error(
      'JWT_SECRET environment variable is required. Generate one with: `openssl rand -hex 32`',
    );
  }

  JwtAuthGuard.configure({
    secret,
    algorithms,
    issuer,
    audience,
    clockTolerance,
  });
}