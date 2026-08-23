import { readFileSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';

/**
 * Centralised, typed configuration loader.
 *
 * Loads `.env` (development) or environment variables (production) with
 * sensible defaults. Throws on startup if a required variable is missing
 * in production mode.
 */

function loadDotEnv(): void {
  const envPath = resolve(process.cwd(), '.env');
  if (!existsSync(envPath)) {
    return;
  }
  const content = readFileSync(envPath, 'utf-8');
  for (const rawLine of content.split('\n')) {
    const line = rawLine.trim();
    if (!line || line.startsWith('#')) continue;
    const eq = line.indexOf('=');
    if (eq === -1) continue;
    const key = line.slice(0, eq).trim();
    let value = line.slice(eq + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    if (process.env[key] === undefined) {
      process.env[key] = value;
    }
  }
}

loadDotEnv();

function required(key: string, fallback?: string): string {
  const value = process.env[key] ?? fallback;
  if (value === undefined || value === '') {
    if (process.env.NODE_ENV === 'production') {
      throw new Error(`Missing required env variable: ${key}`);
    }
    return '';
  }
  return value;
}

function int(key: string, fallback: number): number {
  const raw = process.env[key];
  if (raw === undefined || raw === '') return fallback;
  const parsed = parseInt(raw, 10);
  if (Number.isNaN(parsed)) {
    throw new Error(`Env ${key} must be an integer (got "${raw}")`);
  }
  return parsed;
}

function bool(key: string, fallback: boolean): boolean {
  const raw = process.env[key];
  if (raw === undefined || raw === '') return fallback;
  return ['1', 'true', 'yes', 'on'].includes(raw.toLowerCase());
}

function list(key: string, fallback: string[]): string[] {
  const raw = process.env[key];
  if (!raw) return fallback;
  return raw.split(',').map((s) => s.trim()).filter(Boolean);
}

export const appConfig = {
  nodeEnv: process.env.NODE_ENV ?? 'development',
  name: required('APP_NAME', 'exam-suite'),
  version: required('APP_VERSION', '1.0.0'),
  host: required('APP_HOST', '0.0.0.0'),
  port: int('APP_PORT', 9005),
};

export const dbConfig = {
  host: required('POSTGRES_HOST', 'localhost'),
  port: int('POSTGRES_PORT', 5433),
  user: required('POSTGRES_USER', 'ioes'),
  password: required('POSTGRES_PASSWORD', 'ioes_dev_password'),
  database: required('EXAM_DB_NAME', 'ioes_exam'),
  poolMin: int('DB_POOL_MIN', 5),
  poolMax: int('DB_POOL_MAX', 20),
};

export const redisConfig = {
  host: required('REDIS_HOST', 'localhost'),
  port: int('REDIS_PORT', 6379),
  password: process.env.REDIS_PASSWORD || undefined,
  db: int('REDIS_DB', 0),
  keyPrefix: required('REDIS_KEY_PREFIX', 'ioes:exam:'),
};

export const kafkaConfig = {
  brokers: list('KAFKA_BOOTSTRAP_SERVERS', ['localhost:9092']),
  clientId: required('KAFKA_CLIENT_ID', 'exam-suite'),
  groupId: required('KAFKA_GROUP_ID', 'exam-suite'),
};

export const jwtConfig = {
  // BUG #105 fix: KHÔNG có default - bắt buộc set JWT_SECRET trong .env hoặc CI/CD.
  // Nếu thiếu, throw lỗi ngay khi load config (fail-fast).
  secret: required('JWT_SECRET'),  // ← BẮT BUỘC, không có fallback
  algorithm: required('JWT_ALGORITHM', 'HS256'),
  expireMinutes: int('JWT_EXPIRE_MINUTES', 60),
  issuer: process.env.JWT_ISSUER,
  audience: process.env.JWT_AUDIENCE,
};

/**
 * Validate JWT secret strength.
 * Throw nếu secret quá ngắn (< 32 chars) để tránh brute-force.
 */
export function validateJwtConfig(): void {
  if (!jwtConfig.secret || jwtConfig.secret.length < 32) {
    throw new Error(
      'JWT_SECRET must be at least 32 characters. ' +
        'Generate one with: openssl rand -hex 32',
    );
  }
}

export const wsConfig = {
  port: int('WS_PORT', 9006),
  corsOrigins: list('WS_CORS_ORIGINS', ['http://localhost:3000']),
};

export const serviceUrls = {
  authService: required('AUTH_SERVICE_URL', 'http://localhost:9000'),
  contentService: required('CONTENT_SERVICE_URL', 'http://localhost:9001'),
  notificationService: required('NOTIFICATION_SERVICE_URL', 'http://localhost:9009'),
  analyticsService: required('ANALYTICS_SERVICE_URL', 'http://localhost:9004'),
  apiGateway: required('API_GATEWAY_URL', 'http://localhost:8080'),
};

export const observabilityConfig = {
  logLevel: required('LOG_LEVEL', 'DEBUG'),
  logFormat: required('LOG_FORMAT', 'json') as 'json' | 'console',
  otlpEndpoint: process.env.OTLP_ENDPOINT,
};

export const featureFlags = {
  proctoringEnabled: bool('FEATURE_PROCTORING_ENABLED', true),
  autoGradingEnabled: bool('FEATURE_AUTO_GRADING_ENABLED', true),
};
