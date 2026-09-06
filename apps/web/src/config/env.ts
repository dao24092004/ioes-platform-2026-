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
  apiBaseUrl: import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:8080',
  isDev: import.meta.env.DEV,
};
