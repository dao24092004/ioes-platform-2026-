/**
 * Cấu hình ai-suite/api-gateway.
 *
 * Mọi giá trị đọc từ biến môi trường, có mặc định cho môi trường local.
 * Không hardcode secret ở đây — xem PROJECT_RULES §6.1.
 */

const required = (key: string, fallback: string): string =>
  process.env[key]?.trim() || fallback;

const int = (key: string, fallback: number): number => {
  const raw = process.env[key];
  if (!raw) {
    return fallback;
  }
  const parsed = Number.parseInt(raw, 10);
  return Number.isNaN(parsed) ? fallback : parsed;
};

const list = (key: string, fallback: string[]): string[] => {
  const raw = process.env[key];
  return raw ? raw.split(',').map((item) => item.trim()) : fallback;
};

const bool = (key: string, fallback: boolean): boolean => {
  const raw = process.env[key]?.trim().toLowerCase();
  if (raw === undefined || raw === '') {
    return fallback;
  }
  return raw === 'true' || raw === '1';
};

export const appConfig = {
  nodeEnv: required('NODE_ENV', 'development'),
  // Danh tinh service, khong doc tu APP_NAME vi bien do dung chung toan monorepo.
  name: 'ai-gateway',
  version: required('APP_VERSION', '1.0.0'),
  host: required('APP_HOST', '0.0.0.0'),
  port: int('AI_GATEWAY_PORT', 9100),
};

/**
 * Tên đăng ký trong Eureka phải là `ai-suite`, vì api-gateway (Spring)
 * định tuyến bằng `uri: lb://ai-suite` — xem services/api-gateway/src/main/resources/application.yml.
 */
export const eurekaConfig = {
  enabled: bool('EUREKA_ENABLED', true),
  serviceName: required('EUREKA_APP_NAME', 'ai-suite'),
  host: required('EUREKA_HOST', 'localhost'),
  port: int('EUREKA_PORT', 9999),
  servicePath: required('EUREKA_SERVICE_PATH', '/eureka/apps/'),
  instanceHost: required('EUREKA_INSTANCE_HOST', 'localhost'),
  heartbeatIntervalMs: int('EUREKA_HEARTBEAT_INTERVAL_MS', 30_000),
  registryFetchIntervalMs: int('EUREKA_REGISTRY_FETCH_INTERVAL_MS', 30_000),
};

export const mlWorkerConfig = {
  baseUrl: required('ML_WORKER_URL', 'http://localhost:9101'),
  timeoutMs: int('ML_WORKER_TIMEOUT_MS', 60_000),
};

export const kafkaConfig = {
  brokers: list('KAFKA_BOOTSTRAP_SERVERS', ['localhost:29092']),
  clientId: required('KAFKA_CLIENT_ID', 'ai-suite'),
  groupId: required('KAFKA_GROUP_ID', 'ai-suite'),
};

export const jwtConfig = {
  secret: required('JWT_SECRET', ''),
  algorithm: required('JWT_ALGORITHM', 'HS256'),
};
