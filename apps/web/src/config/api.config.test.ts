import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { AxiosError, type AxiosResponse, type InternalAxiosRequestConfig } from 'axios';
import { ApiError, apiClient, unwrap, unwrapVoid } from './api.config';
import { useAuthStore } from '@/app/store/authStore';

const envelope = <T>(over: Partial<Record<string, unknown>> = {}, data?: T) => ({
  data: {
    success: true,
    message: 'Success',
    timestamp: '2026-08-27T00:00:00.000Z',
    data,
    ...over,
  },
});

describe('unwrap', () => {
  it('trả về data khi thành công', async () => {
    await expect(unwrap(Promise.resolve(envelope({}, { id: 'x' })))).resolves.toEqual({ id: 'x' });
  });

  it('ném ApiError khi success=false, kể cả khi HTTP là 200', async () => {
    // Backend trả 200 kèm success:false ở một số nhánh, nên chỉ nhìn mã trạng
    // thái là bỏ sót lỗi.
    const promise = unwrap(
      Promise.resolve(envelope({ success: false, message: 'Hết hạn mức', traceId: 'tr-1' })),
    );
    await expect(promise).rejects.toBeInstanceOf(ApiError);
    await expect(promise).rejects.toMatchObject({ message: 'Hết hạn mức', traceId: 'tr-1' });
  });

  it('ném ApiError khi thiếu hẳn trường data', async () => {
    await expect(unwrap(Promise.resolve(envelope()))).rejects.toThrow('Phản hồi không có dữ liệu');
  });

  it('giữ nguyên message và status từ phản hồi lỗi HTTP', async () => {
    const axiosError = {
      isAxiosError: true,
      message: 'Request failed with status code 429',
      response: {
        status: 429,
        data: { success: false, message: 'Quá nhiều yêu cầu', traceId: 'tr-9' },
      },
    };
    const promise = unwrap(Promise.reject(axiosError));
    await expect(promise).rejects.toMatchObject({
      message: 'Quá nhiều yêu cầu',
      status: 429,
      traceId: 'tr-9',
    });
  });

  it('báo quá thời gian chờ riêng, không lẫn với lỗi mạng chung', async () => {
    const promise = unwrap(Promise.reject({ code: 'ECONNABORTED', message: 'timeout of 120000ms' }));
    await expect(promise).rejects.toThrow('Yêu cầu quá thời gian chờ');
  });

  it('báo không kết nối được khi không có phản hồi', async () => {
    const promise = unwrap(Promise.reject({ message: 'Network Error' }));
    await expect(promise).rejects.toThrow('Network Error');
  });
});

describe('tự refresh khi access token hết hạn', () => {
  const originalAdapter = apiClient.defaults.adapter;
  const calls: Array<{ url?: string; auth?: string }> = [];

  const respond = (config: InternalAxiosRequestConfig, status: number, data: unknown) => {
    const response: AxiosResponse = { data, status, statusText: '', headers: {}, config };
    return status >= 400
      ? Promise.reject(new AxiosError(`status ${status}`, undefined, config, null, response))
      : Promise.resolve(response);
  };

  /** Adapter giả: token 'fresh' mới hợp lệ; refresh trả kết quả theo `refreshStatus`. */
  const install = (refreshStatus: number | 'network' = 200) => {
    apiClient.defaults.adapter = vi.fn(async (config: InternalAxiosRequestConfig) => {
      const auth = config.headers.Authorization as string | undefined;
      calls.push({ url: config.url, auth });
      if (config.url === '/api/auth/refresh') {
        if (refreshStatus === 'network') throw new AxiosError('Network Error', 'ERR_NETWORK', config);
        return respond(config, refreshStatus, {
          success: refreshStatus === 200,
          message: '',
          timestamp: '',
          data: { accessToken: 'fresh', refreshToken: 'r2' },
        });
      }
      if (config.url === '/api/auth/login') return respond(config, 401, { success: false, message: 'Sai mật khẩu' });
      return respond(config, auth === 'Bearer fresh' ? 200 : 401, { ok: true });
    });
  };

  beforeEach(() => {
    calls.length = 0;
    useAuthStore.setState({
      user: { id: 'u1', email: 'a@b.c', full_name: 'A', role: 'student' },
      accessToken: 'expired',
      refreshToken: 'r1',
      isAuthenticated: true,
    });
  });

  afterEach(() => {
    apiClient.defaults.adapter = originalAdapter;
  });

  it('refresh rồi gửi lại request gốc với token mới', async () => {
    install();
    const res = await apiClient.get('/api/v1/courses/enrollments/me');

    expect(res.data).toEqual({ ok: true });
    expect(calls.map((c) => c.url)).toEqual([
      '/api/v1/courses/enrollments/me',
      '/api/auth/refresh',
      '/api/v1/courses/enrollments/me',
    ]);
    // Không gửi access token đã hết hạn kèm lời gọi refresh.
    expect(calls[1].auth).toBeUndefined();
    expect(useAuthStore.getState()).toMatchObject({ accessToken: 'fresh', refreshToken: 'r2', isAuthenticated: true });
  });

  it('nhiều request 401 cùng lúc chỉ refresh một lần', async () => {
    install();
    await Promise.all([apiClient.get('/a'), apiClient.get('/b'), apiClient.get('/c')]);

    expect(calls.filter((c) => c.url === '/api/auth/refresh')).toHaveLength(1);
  });

  it('refresh token bị từ chối thì đăng xuất và trả lỗi 401 gốc', async () => {
    install(401);
    await expect(apiClient.get('/a')).rejects.toMatchObject({ response: { status: 401 } });

    expect(useAuthStore.getState()).toMatchObject({ accessToken: null, refreshToken: null, isAuthenticated: false });
  });

  it('mất mạng khi refresh thì giữ phiên', async () => {
    install('network');
    await expect(apiClient.get('/a')).rejects.toBeTruthy();

    expect(useAuthStore.getState()).toMatchObject({ refreshToken: 'r1', isAuthenticated: true });
  });

  it('401 từ đăng nhập không kích hoạt refresh', async () => {
    install();
    await expect(apiClient.post('/api/auth/login', {})).rejects.toMatchObject({ response: { status: 401 } });

    expect(calls.map((c) => c.url)).toEqual(['/api/auth/login']);
  });
});

describe('unwrapVoid', () => {
  it('chấp nhận phản hồi không có trường data', async () => {
    // Endpoint void như logout: nếu Jackson bật non_null thì `data` biến mất
    // hoàn toàn, và unwrap thường sẽ báo lỗi giả.
    await expect(unwrapVoid(Promise.resolve(envelope()))).resolves.toBeUndefined();
  });

  it('vẫn ném lỗi khi success=false', async () => {
    await expect(
      unwrapVoid(Promise.resolve(envelope({ success: false, message: 'Token đã thu hồi' }))),
    ).rejects.toThrow('Token đã thu hồi');
  });

  it('vẫn ánh xạ lỗi HTTP', async () => {
    const promise = unwrapVoid(
      Promise.reject({ response: { status: 401, data: { success: false, message: 'Hết hạn' } } }),
    );
    await expect(promise).rejects.toMatchObject({ status: 401, message: 'Hết hạn' });
  });
});
