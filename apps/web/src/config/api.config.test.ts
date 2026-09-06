import { describe, it, expect } from 'vitest';
import { ApiError, unwrap, unwrapVoid } from './api.config';

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
