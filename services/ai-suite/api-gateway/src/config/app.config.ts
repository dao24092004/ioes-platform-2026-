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

export const dbConfig = {
  host: required('POSTGRES_HOST', 'localhost'),
  port: int('POSTGRES_PORT', 5433),
  user: required('POSTGRES_USER', 'ioes'),
  password: required('POSTGRES_PASSWORD', 'ioes_dev_password'),
  database: required('AI_DB_NAME', 'ioes_ai'),
  poolMax: int('DB_POOL_MAX', 10),
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

export const throttleConfig = {
  ttlMs: int('THROTTLE_TTL_MS', 60_000),
  limit: int('THROTTLE_LIMIT', 100),
};

export const mlWorkerConfig = {
  baseUrl: required('ML_WORKER_URL', 'http://localhost:9101'),
  timeoutMs: int('ML_WORKER_TIMEOUT_MS', 60_000),
  /**
   * Sinh câu hỏi gọi mô hình nhiều lượt — một lượt soạn cộng một lượt đối
   * chiếu cho mỗi câu — nên xin 10 câu là 11 lần gọi. Timeout của hỏi đáp
   * (60s) sẽ cắt ngang giữa chừng.
   */
  generateTimeoutMs: int('ML_WORKER_GENERATE_TIMEOUT_MS', 180_000),
  /**
   * Lộ trình chạy năm agent tuần tự, mỗi agent một lượt gọi Gemini cộng một
   * lượt truy xuất Milvus. Dùng timeout hỏi đáp (60s) thì đứt giữa chừng và
   * người dùng mất cả lượt sinh, nên tách riêng như phần sinh câu hỏi.
   */
  learningPathTimeoutMs: int('ML_WORKER_LEARNING_PATH_TIMEOUT_MS', 180_000),
};

/**
 * content-service (Spring Boot, cổng 9001) giữ khoá học và ghi danh.
 *
 * Gọi thẳng vào service chứ không qua Spring gateway: gateway chỉ để cho
 * client ngoài, còn gọi vòng lại qua nó thì thêm một chặng mạng và một lần
 * kiểm JWT không cần thiết.
 */
export const contentServiceConfig = {
  baseUrl: required('CONTENT_SERVICE_URL', 'http://localhost:9001'),
  timeoutMs: int('CONTENT_SERVICE_TIMEOUT_MS', 10_000),
  /**
   * content-service kẹp per_page ở 100 (CourseUseCase.MAX_PER_PAGE), xin hơn
   * cũng chỉ nhận được 100 mà lại lệch giữa số trang tính ở đây và ở đó.
   */
  catalogPageSize: int('CONTENT_CATALOG_PAGE_SIZE', 100),
  /**
   * Trần số trang để một catalogue phình to không biến mỗi lượt gợi ý thành
   * hàng chục lượt gọi HTTP. Gợi ý 6 khoá không cần đọc hết kho.
   */
  catalogMaxPages: int('CONTENT_CATALOG_MAX_PAGES', 5),
};

export const recommendationsConfig = {
  /**
   * Gợi ý đổi theo tiến độ học, mà tiến độ thì thay đổi theo phút chứ không
   * theo giây. TTL ngắn đủ để trang chủ tải lại không gọi lại cả chuỗi
   * content-service + ml-worker, nhưng vẫn kịp phản ánh khoá vừa ghi danh.
   */
  cacheTtlSeconds: int('RECOMMENDATIONS_CACHE_TTL_SECONDS', 180),
  defaultLimit: int('RECOMMENDATIONS_DEFAULT_LIMIT', 6),
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
