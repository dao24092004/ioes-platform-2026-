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
      return startDir;
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

function list(key: string, fallback: string[]): string[] {
  const raw = process.env[key];
  if (!raw) return fallback;
  return raw.split(',').map((s) => s.trim()).filter(Boolean);
}

/**
 * Helper: resolve key with optional prefix. Ưu tiên PREFIX_KEY, fallback về KEY.
 */
function prefixed(prefix: string, key: string, fallback?: string): string {
  return process.env[`${prefix}_${key}`] ?? process.env[key] ?? fallback;
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

export const appConfig = {
  nodeEnv: process.env.NODE_ENV ?? 'development',
  name: prefixed('BLOCKCHAIN', 'APP_NAME', 'blockchain-suite'),
  version: prefixed('BLOCKCHAIN', 'APP_VERSION', '1.0.0'),
  host: prefixed('BLOCKCHAIN', 'APP_HOST', '0.0.0.0'),
  port: prefixedInt('BLOCKCHAIN_SERVICE', 'PORT', 9200),
};

export const dbConfig = {
  host: required('POSTGRES_HOST', 'localhost'),
  port: int('POSTGRES_PORT', 5433),
  user: required('POSTGRES_USER', 'ioes'),
  // ADR-008: password là secret, không default fallback
  password: requiredSecret('POSTGRES_PASSWORD'),
  database: required('BLOCKCHAIN_DB_NAME', 'ioes_blockchain'),
  poolMin: int('DB_POOL_MIN', 2),
  poolMax: int('DB_POOL_MAX', 10),
};

export const redisConfig = {
  host: required('REDIS_HOST', 'localhost'),
  port: int('REDIS_PORT', 6379),
  password: process.env.REDIS_PASSWORD
    ? requiredSecret('REDIS_PASSWORD')
    : undefined,
  db: int('REDIS_DB', 0),
};

export const kafkaConfig = {
  brokers: list('KAFKA_BOOTSTRAP_SERVERS', ['localhost:9092']),
  clientId: prefixed('BLOCKCHAIN', 'KAFKA_CLIENT_ID', 'blockchain-suite'),
  groupId: prefixed('BLOCKCHAIN', 'KAFKA_GROUP_ID', 'blockchain-suite'),
};

export const jwtConfig = {
  // ADR-008: KHÔNG default fallback. JWT_SECRET phải được set qua env.
  // Cùng secret với auth-service + api-gateway.
  secret: requiredSecret('JWT_SECRET'),
  algorithm: required('JWT_ALGORITHM', 'HS256'),
};

export const blockchainConfig = {
  network: required('BLOCKCHAIN_NETWORK', 'localhost') as
    | 'localhost'
    | 'polygon'
    | 'ethereum'
    | 'sepolia',
  rpcUrl: required('BLOCKCHAIN_RPC_URL', 'http://localhost:8545'),
  // ADR-008: private key là secret quan trọng, không default fallback
  privateKey: requiredSecret('BLOCKCHAIN_PRIVATE_KEY'),
  contractAddress: required('BLOCKCHAIN_CONTRACT_ADDRESS'),
  chainId: int('BLOCKCHAIN_CHAIN_ID', 31337),
};

export const ipfsConfig = {
  host: required('IPFS_HOST', 'localhost'),
  port: int('IPFS_PORT', 5001),
  gateway: required('IPFS_GATEWAY', 'https://ipfs.io/ipfs/'),
};

export const serviceUrls = {
  apiGateway: required('API_GATEWAY_URL', 'http://localhost:8080'),
  authService: required('AUTH_SERVICE_URL', 'http://localhost:9000'),
  contentService: required('CONTENT_SERVICE_URL', 'http://localhost:9001'),
  examService: required('EXAM_SERVICE_URL', 'http://localhost:9005'),
};

export const observabilityConfig = {
  logLevel: required('LOG_LEVEL', 'DEBUG'),
  logFormat: required('LOG_FORMAT', 'json') as 'json' | 'console',
  otlpEndpoint: process.env.OTLP_ENDPOINT,
};
