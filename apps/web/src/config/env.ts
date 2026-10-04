/**
 * Biến môi trường của web app.
 *
 * Vite chỉ phơi ra biến có tiền tố `VITE_`, và thay thế chúng lúc build chứ
 * không đọc lúc chạy — nên gom về một chỗ để không rải `import.meta.env` khắp
 * code và để mọi giá trị mặc định nằm cùng một nơi.
 */

interface Env {
  /** Gốc của API Gateway (Spring Cloud Gateway). */
  apiBaseUrl: string;
  /** Bật log chi tiết ở môi trường dev. */
  isDev: boolean;
}

export const env: Env = {
  // Empty base URL → axios uses window.location.origin. In dev Vite proxies
  // `/api/*` to the gateway on :8080, so requests appear same-origin and
  // Playwright's `page.route('**/api/...')` intercepts them without a CORS
  // preflight. Production deployments override VITE_API_BASE_URL.
  apiBaseUrl: import.meta.env.VITE_API_BASE_URL ?? '',
  isDev: import.meta.env.DEV,
};
