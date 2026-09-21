import axios, { AxiosError, type AxiosInstance } from 'axios';
import { env } from './env';
import { useAuthStore } from '@/app/store/authStore';

/**
 * Vỏ response chung của backend, do `ApiResponse` trong `@ioes/common-node`
 * sinh ra. Mọi endpoint đều trả về dạng này.
 */
export interface ApiEnvelope<T> {
  success: boolean;
  message: string;
  data?: T;
  timestamp: string;
  traceId?: string;
}

/** Lỗi đã bóc vỏ, để phía gọi không phải đụng tới AxiosError. */
export class ApiError extends Error {
  constructor(
    message: string,
    readonly status?: number,
    readonly traceId?: string,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

/**
 * Ngân sách mặc định, đặt theo lời gọi chậm nhất đi qua client này: lượt chat
 * gọi mô hình ngôn ngữ (ai-gateway cho ml-worker `ML_WORKER_TIMEOUT_MS` = 60s).
 *
 * Đây là trần, không phải mức hợp lý cho mọi endpoint: một lượt đọc nhanh mà
 * dùng 120s thì backend hỏng cũng phải quay 120s mới báo lỗi, nhân đôi nếu
 * React Query thử lại. Vì vậy các lời gọi không đụng LLM phải tự truyền
 * `timeout` riêng (xem `FAST_READ_TIMEOUT_MS`), và lời gọi chậm hơn 120s phải
 * tự nâng lên (xem `LEARNING_PATH_GENERATE_TIMEOUT_MS`).
 */
export const DEFAULT_TIMEOUT_MS = 120_000;

/**
 * Cho endpoint đọc nhanh: truy vấn Postgres hoặc embedding có sẵn, không gọi
 * LLM. Chọn 15s chứ không phải 3–5s vì ai-gateway còn ghép dữ liệu từ
 * content-service với ngân sách `CONTENT_SERVICE_TIMEOUT_MS` = 10s — cắt sớm
 * hơn máy chủ là tự tạo ra cảnh "web báo lỗi trong khi máy chủ vẫn đang chạy
 * và sắp trả kết quả", đúng thứ lỗi ta đang sửa.
 */
export const FAST_READ_TIMEOUT_MS = 15_000;

export const apiClient: AxiosInstance = axios.create({
  baseURL: env.apiBaseUrl,
  timeout: DEFAULT_TIMEOUT_MS,
  headers: { 'Content-Type': 'application/json' },
});

declare module 'axios' {
  interface InternalAxiosRequestConfig {
    /** Đã thử lại một lần sau khi refresh token, không thử nữa. */
    _retriedAfterRefresh?: boolean;
  }
}

/**
 * Với các endpoint này, 401 nghĩa là sai mật khẩu hoặc refresh token hỏng —
 * không phải access token hết hạn — nên không được kích hoạt refresh (gọi
 * refresh trong refresh sẽ lặp vô hạn).
 */
const AUTH_ENDPOINTS_WITHOUT_REFRESH = ['/api/auth/login', '/api/auth/register', '/api/auth/refresh'];

const isAuthEndpointWithoutRefresh = (url?: string) =>
  !!url && AUTH_ENDPOINTS_WITHOUT_REFRESH.some((path) => url.endsWith(path));

apiClient.interceptors.request.use((config) => {
  const token = useAuthStore.getState().accessToken;
  if (token && !isAuthEndpointWithoutRefresh(config.url)) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

/** Lượt refresh đang chạy; các request 401 cùng lúc chờ chung một lượt. */
let refreshInFlight: Promise<string | null> | null = null;

/**
 * Đổi refresh token lấy cặp token mới. Trả access token mới, hoặc null nếu
 * không refresh được.
 *
 * Chỉ đăng xuất khi máy chủ thực sự từ chối refresh token (401/403). Mất mạng
 * thì giữ phiên, giống AuthProvider — rớt mạng không nên đá người dùng ra.
 */
async function refreshAccessToken(): Promise<string | null> {
  const { refreshToken, setTokens, logout } = useAuthStore.getState();
  if (!refreshToken) {
    logout();
    return null;
  }
  try {
    const { data: envelope } = await apiClient.post<
      ApiEnvelope<{ accessToken: string; refreshToken: string }>
    >('/api/auth/refresh', { refreshToken });
    if (!envelope.success || !envelope.data) {
      logout();
      return null;
    }
    setTokens(envelope.data.accessToken, envelope.data.refreshToken);
    return envelope.data.accessToken;
  } catch (err) {
    const status = (err as AxiosError).response?.status;
    if (status === 401 || status === 403) logout();
    return null;
  }
}

/**
 * Access token chỉ sống 15 phút. Gặp 401 thì refresh một lần rồi gửi lại
 * request gốc; nếu không, cứ 15 phút người dùng lại bị đá ra.
 */
apiClient.interceptors.response.use(undefined, async (error: AxiosError) => {
  const original = error.config;
  if (
    error.response?.status !== 401 ||
    !original ||
    original._retriedAfterRefresh ||
    isAuthEndpointWithoutRefresh(original.url)
  ) {
    return Promise.reject(error);
  }
  original._retriedAfterRefresh = true;

  if (!refreshInFlight) {
    refreshInFlight = refreshAccessToken().finally(() => {
      refreshInFlight = null;
    });
  }
  const newToken = await refreshInFlight;
  if (!newToken) return Promise.reject(error);

  original.headers.Authorization = `Bearer ${newToken}`;
  return apiClient(original);
});

/**
 * Bóc `data` ra khỏi vỏ ApiResponse.
 *
 * Backend vẫn trả HTTP 200 kèm `success: false` ở một số nhánh, nên chỉ dựa
 * vào mã trạng thái là chưa đủ — phải xét cả cờ `success`.
 */
/** Chuyển lỗi axios thành ApiError. Dùng chung cho unwrap, unwrapVoid và các lời gọi tự bóc vỏ. */
export function toApiError(err: unknown): ApiError {
  if (err instanceof ApiError) return err;

  const axiosError = err as AxiosError<ApiEnvelope<unknown>>;
  if (axiosError.response) {
    const body = axiosError.response.data;
    return new ApiError(
      body?.message || axiosError.message,
      axiosError.response.status,
      body?.traceId,
    );
  }
  if (axiosError.code === 'ECONNABORTED') {
    return new ApiError('Yêu cầu quá thời gian chờ');
  }
  return new ApiError(axiosError.message || 'Không kết nối được máy chủ');
}

/**
 * Cho endpoint không trả dữ liệu (logout, đổi mật khẩu...).
 *
 * Tách riêng khỏi `unwrap` vì `unwrap` coi thiếu `data` là lỗi. Hiện Jackson
 * vẫn gửi `data: null`, nhưng chỉ cần ai đó bật `default-property-inclusion:
 * non_null` là trường đó biến mất và mọi lời gọi void sẽ báo lỗi giả.
 */
export async function unwrapVoid(promise: Promise<{ data: ApiEnvelope<unknown> }>): Promise<void> {
  try {
    const { data: envelope } = await promise;
    if (!envelope.success) {
      throw new ApiError(envelope.message || 'Yêu cầu thất bại', undefined, envelope.traceId);
    }
  } catch (err) {
    throw toApiError(err);
  }
}

export async function unwrap<T>(promise: Promise<{ data: ApiEnvelope<T> }>): Promise<T> {
  try {
    const { data: envelope } = await promise;
    if (!envelope.success) {
      throw new ApiError(envelope.message || 'Yêu cầu thất bại', undefined, envelope.traceId);
    }
    if (envelope.data === undefined) {
      throw new ApiError('Phản hồi không có dữ liệu', undefined, envelope.traceId);
    }
    return envelope.data;
  } catch (err) {
    throw toApiError(err);
  }
}
