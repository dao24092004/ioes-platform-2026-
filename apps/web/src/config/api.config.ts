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

export const apiClient: AxiosInstance = axios.create({
  baseURL: env.apiBaseUrl,
  timeout: 120_000, // lượt chat gọi mô hình ngôn ngữ, chậm hơn hẳn request thường
  headers: { 'Content-Type': 'application/json' },
});

apiClient.interceptors.request.use((config) => {
  const token = useAuthStore.getState().accessToken;
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
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
