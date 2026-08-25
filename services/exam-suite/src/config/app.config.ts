import { readFileSync, existsSync } from 'node:fs';
import { dirname, resolve } from 'node:path';

/**
 * Centralised, typed configuration loader.
 *
 * ADR-008: SINGLE SOURCE OF TRUTH — always loads `.env` from the
 * MONOREPO ROOT, never from the service cwd. This guarantees that
 * every service reads the same configuration values without
 * needing per-service `.env` files.
 *
 * Resolution order:
 *   1. Existing env var (highest priority — set by orchestrator)
 *   2. Root monorepo `.env` (loaded at startup)
 */

function findMonorepoRoot(startDir: string): string {
  let dir = startDir;
  while (true) {
    if (existsSync(resolve(dir, '.env.example'))) {
      return dir;
    }
    const parent = dirname(dir);
    if (parent === dir) {
      return startDir; // fallback to start dir
    }
    dir = parent;
  }
}

function loadDotEnv(): void {
  const monorepoRoot = findMonorepoRoot(process.cwd());
  const envPath = resolve(monorepoRoot, '.env');

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

/**
 * BẮT BUỘC có env var, KHÔNG có default fallback.
 * Dùng cho secrets (JWT_SECRET, password, API keys) theo ADR-008.
 * Throw ngay khi load config (fail-fast) nếu thiếu — cả dev lẫn prod.
 */
function requiredSecret(key: string): string {
  const value = process.env[key];
  if (value === undefined || value === '') {
    throw new Error(
      `❌ Missing required secret: ${key}\n` +
      `Set it in .env (dev) hoặc K8s Secret / Vault (prod).\n` +
      `Xem: docs/02-architecture/adr/ADR-008-jwt-secret-synchronization.md`,
    );
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

/**
 * Helper: resolve key with optional prefix. Ưu tiên PREFIX_KEY, fallback về KEY.
 * Cho phép dùng root .env.example với tên EXAM_*, đồng thời backward compat.
 */
function prefixed(prefix: string, key: string, fallback?: string): string {
  return (process.env[`${prefix}_${key}`] ?? process.env[key] ?? fallback) as string;
}
function prefixedInt(prefix: string, key: string, fallback: number): number {
  const raw = process.env[`${prefix}_${key}`] ?? process.env[key];
  if (raw === undefined || raw === '') return fallback;
  const parsed = parseInt(raw, 10);
  if (Number.isNaN(parsed)) {
    throw new Error(`Env ${prefix}_${key} must be an integer (got "${raw}")`);
  }
  return parsed;
}
function prefixedBool(prefix: string, key: string, fallback: boolean): boolean {
  const raw = process.env[`${prefix}_${key}`] ?? process.env[key];
  if (raw === undefined || raw === '') return fallback;
  return ['1', 'true', 'yes', 'on'].includes(raw.toLowerCase());
}

export const appConfig = {
  nodeEnv: process.env.NODE_ENV ?? 'development',
  name: prefixed('EXAM', 'APP_NAME', 'exam-suite'),
  version: prefixed('EXAM', 'APP_VERSION', '1.0.0'),
  host: prefixed('EXAM', 'APP_HOST', '0.0.0.0'),
  port: prefixedInt('EXAM', 'APP_PORT', 9005),
};

export const dbConfig = {
  host: required('POSTGRES_HOST', 'localhost'),
  port: int('POSTGRES_PORT', 5433),
  user: required('POSTGRES_USER', 'ioes'),
  // ADR-008: password là secret, không có default fallback
  password: requiredSecret('POSTGRES_PASSWORD'),
  database: required('EXAM_DB_NAME', 'ioes_exam'),
  poolMin: int('DB_POOL_MIN', 5),
  poolMax: int('DB_POOL_MAX', 20),
};

export const redisConfig = {
  host: required('REDIS_HOST', 'localhost'),
  port: int('REDIS_PORT', 6379),
  // ADR-008: password là secret, không có default fallback (optional trong dev)
  password: process.env.REDIS_PASSWORD
    ? requiredSecret('REDIS_PASSWORD')
    : undefined,
  db: int('REDIS_DB', 0),
  keyPrefix: prefixed('EXAM', 'REDIS_KEY_PREFIX', 'ioes:exam:'),
};

export const kafkaConfig = {
  brokers: list('KAFKA_BOOTSTRAP_SERVERS', ['localhost:9092']),
  clientId: prefixed('EXAM', 'KAFKA_CLIENT_ID', 'exam-suite'),
  groupId: prefixed('EXAM', 'KAFKA_GROUP_ID', 'exam-suite'),
};

export const jwtConfig = {
  // ADR-008: KHÔNG default fallback. JWT_SECRET phải được set qua env.
  // Cùng secret với auth-service + api-gateway.
  secret: requiredSecret('JWT_SECRET'),
  algorithm: required('JWT_ALGORITHM', 'HS256'),
  expireMinutes: prefixedInt('EXAM', 'JWT_EXPIRE_MINUTES', 60),
  issuer: required('JWT_ISSUER', 'ioes-platform'),
  audience: process.env.JWT_AUDIENCE,
};

/**
 * Validate JWT secret strength.
 * Throw nếu secret quá ngắn (< 32 chars) để tránh brute-force.
 *
 * Lưu ý: việc check missing/empty đã được requiredSecret() xử lý tại load time.
 */
export function validateJwtConfig(): void {
  if (jwtConfig.secret.length < 32) {
    throw new Error(
      'JWT_SECRET must be at least 32 characters. ' +
        'Generate one with: openssl rand -hex 32',
    );
  }
}

export const wsConfig = {
  port: prefixedInt('EXAM', 'WS_PORT', 9006),
  corsOrigins: list(
    'EXAM_WS_CORS_ORIGINS',
    list('WS_CORS_ORIGINS', ['http://localhost:3000']),
  ),
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
  otlpEndpoint: prefixed('EXAM', 'OTLP_ENDPOINT', process.env.OTLP_ENDPOINT),
};

export const featureFlags = {
  proctoringEnabled: prefixedBool('EXAM', 'FEATURE_PROCTORING_ENABLED', true),
  autoGradingEnabled: prefixedBool('EXAM', 'FEATURE_AUTO_GRADING_ENABLED', true),
  bulkImportEnabled: prefixedBool('EXAM', 'FEATURE_BULK_IMPORT_ENABLED', true),
};

/**
 * S3-compatible storage config (MinIO in dev, AWS S3 in prod).
 * Dùng cho image upload cho questions và bulk import files.
 */
export const storageConfig = {
  /** Endpoint S3/MinIO */
  endpoint: prefixed('EXAM', 'STORAGE_ENDPOINT', 'http://localhost:9000'),
  /** Region */
  region: prefixed('EXAM', 'STORAGE_REGION', 'us-east-1'),
  /** Access key — ADR-008: secret, không default fallback */
  accessKey: requiredSecret('STORAGE_ACCESS_KEY'),
  /** Secret key — ADR-008: secret, không default fallback */
  secretKey: requiredSecret('STORAGE_SECRET_KEY'),
  /** Bucket cho question images */
  bucket: prefixed('EXAM', 'STORAGE_BUCKET_QUESTIONS', 'ioes-questions'),
  /** Bucket cho temp upload (Excel/CSV bulk import) */
  tempBucket: prefixed('EXAM', 'STORAGE_BUCKET_TEMP', 'ioes-temp'),
  /** Force path-style (MinIO requires, S3 optional) */
  forcePathStyle: prefixedBool('EXAM', 'STORAGE_FORCE_PATH_STYLE', true),
  /** Max file size (bytes) - default 10MB */
  maxImageSize: prefixedInt('EXAM', 'STORAGE_MAX_IMAGE_SIZE', 10 * 1024 * 1024),
  /** Max bulk import file size - 50MB */
  maxBulkImportSize: prefixedInt('EXAM', 'STORAGE_MAX_BULK_SIZE', 50 * 1024 * 1024),
  /** CDN base URL (optional) */
  cdnBaseUrl: process.env.STORAGE_CDN_BASE_URL,
  /** Presigned URL TTL seconds */
  presignedTtl: prefixedInt('EXAM', 'STORAGE_PRESIGNED_TTL', 3600),
};

/**
 * Bulk import config.
 */
export const bulkImportConfig = {
  /** Max rows per file */
  maxRows: int('BULK_IMPORT_MAX_ROWS', 5000),
  /** Batch size khi insert vào DB */
  batchSize: int('BULK_IMPORT_BATCH_SIZE', 100),
  /** Default status sau khi import */
  defaultStatus: required('BULK_IMPORT_DEFAULT_STATUS', 'draft') as
    | 'draft'
    | 'published',
};
