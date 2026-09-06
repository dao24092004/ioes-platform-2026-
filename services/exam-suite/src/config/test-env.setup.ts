/**
 * Jest setup: cấp secret giả cho test.
 *
 * app.config.ts theo ADR-008 fail-fast khi thiếu secret, kể cả ở dev. Jest
 * chạy không có .env nên mọi suite import app.config đều chết ngay lúc load.
 *
 * Các giá trị dưới đây là placeholder chỉ dùng trong test, KHÔNG phải secret
 * thật, và không được dùng lại ở bất kỳ môi trường nào khác. Chỉ đặt khi biến
 * chưa tồn tại, để CI có thể ghi đè bằng giá trị riêng.
 */
const TEST_ENV: Record<string, string> = {
  NODE_ENV: 'test',
  POSTGRES_PASSWORD: 'test-postgres-password',
  JWT_SECRET:
    'test-only-jwt-secret-at-least-256-bits-long-for-hs256-signing-not-a-real-key',
  STORAGE_ACCESS_KEY: 'test-storage-access-key',
  STORAGE_SECRET_KEY: 'test-storage-secret-key',
};

for (const [key, value] of Object.entries(TEST_ENV)) {
  if (process.env[key] === undefined || process.env[key] === '') {
    process.env[key] = value;
  }
}
