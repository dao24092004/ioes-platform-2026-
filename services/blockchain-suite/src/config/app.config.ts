import { readFileSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';

/**
 * Centralised, typed configuration loader. Same shape as exam-suite to
 * keep service boilerplate consistent.
 */

function loadDotEnv(): void {
  const envPath = resolve(process.cwd(), '.env');
  if (!existsSync(envPath)) return;
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

function list(key: string, fallback: string[]): string[] {
  const raw = process.env[key];
  if (!raw) return fallback;
  return raw.split(',').map((s) => s.trim()).filter(Boolean);
}

export const appConfig = {
  nodeEnv: process.env.NODE_ENV ?? 'development',
  name: required('APP_NAME', 'blockchain-suite'),
  version: required('APP_VERSION', '1.0.0'),
  host: required('APP_HOST', '0.0.0.0'),
  port: int('APP_PORT', 9200),
};

export const dbConfig = {
  host: required('POSTGRES_HOST', 'localhost'),
  port: int('POSTGRES_PORT', 5433),
  user: required('POSTGRES_USER', 'ioes'),
  password: required('POSTGRES_PASSWORD', 'ioes_dev_password'),
  database: required('BLOCKCHAIN_DB_NAME', 'ioes_blockchain'),
  poolMin: int('DB_POOL_MIN', 2),
  poolMax: int('DB_POOL_MAX', 10),
};

export const redisConfig = {
  host: required('REDIS_HOST', 'localhost'),
  port: int('REDIS_PORT', 6379),
  password: process.env.REDIS_PASSWORD || undefined,
  db: int('REDIS_DB', 0),
};

export const kafkaConfig = {
  brokers: list('KAFKA_BOOTSTRAP_SERVERS', ['localhost:9092']),
  clientId: required('KAFKA_CLIENT_ID', 'blockchain-suite'),
  groupId: required('KAFKA_GROUP_ID', 'blockchain-suite'),
};

export const jwtConfig = {
  secret: required(
    'JWT_SECRET',
    'ioes-jwt-secret-key-must-be-at-least-256-bits-long-for-hs256-signing-algorithm',
  ),
  algorithm: required('JWT_ALGORITHM', 'HS256'),
};

export const blockchainConfig = {
  network: required('BLOCKCHAIN_NETWORK', 'localhost') as
    | 'localhost'
    | 'polygon'
    | 'ethereum'
    | 'sepolia',
  rpcUrl: required('BLOCKCHAIN_RPC_URL', 'http://localhost:8545'),
  privateKey: process.env.BLOCKCHAIN_PRIVATE_KEY ?? '',
  contractAddress: process.env.BLOCKCHAIN_CONTRACT_ADDRESS ?? '',
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
