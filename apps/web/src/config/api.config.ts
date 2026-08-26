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
    if (err instanceof ApiError) throw err;

    const axiosError = err as AxiosError<ApiEnvelope<unknown>>;
    if (axiosError.response) {
      const body = axiosError.response.data;
      throw new ApiError(
        body?.message || axiosError.message,
        axiosError.response.status,
        body?.traceId,
      );
    }
    if (axiosError.code === 'ECONNABORTED') {
      throw new ApiError('Yêu cầu quá thời gian chờ');
    }
    throw new ApiError(axiosError.message || 'Không kết nối được máy chủ');
  }
}
