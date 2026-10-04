/** Wave 3D — Unit: account API error mapping for the instructor account pages. */
import { describe, it, expect, vi, beforeEach } from 'vitest';

const {
  get,
  post,
  patch,
  delete: del,
} = vi.hoisted(() => ({
  get: vi.fn(),
  post: vi.fn(),
  patch: vi.fn(),
  delete: vi.fn(),
}));

// Keep the real `unwrap` / `unwrapVoid` / `toApiError` / `ApiError` so the
// error mapping under test is the production one; only the axios instance is
// replaced.
vi.mock('@/config/api.config', async () => {
  const actual = await vi.importActual<typeof import('@/config/api.config')>('@/config/api.config');
  return { ...actual, apiClient: { get, post, patch, delete: del } };
});

import { authApi } from '@/services/api/auth.api';
import { usersApi } from '@/services/api/users.api';
import { ApiError, unwrap, toApiError } from '@/config/api.config';

const TS = '2026-10-04T00:00:00.000Z';

/** Grab the rejection reason of a promise as an `ApiError` for assertions. */
const rejection = async (promise: Promise<unknown>): Promise<ApiError> => {
  try {
    await promise;
  } catch (err) {
    return err as ApiError;
  }
  throw new Error('expected the promise to reject, but it resolved');
};

beforeEach(() => {
  get.mockReset();
  post.mockReset();
  patch.mockReset();
  del.mockReset();
});

describe('authApi.me — failure mapping', () => {
  it('UT-ACCTAPI-001: should reject with ApiError carrying the backend message when /api/auth/me returns success=false', async () => {
    get.mockResolvedValue({
      data: { success: false, message: 'Token đã hết hạn', timestamp: TS },
    });

    const err = await rejection(authApi.me());

    expect(err).toBeInstanceOf(ApiError);
    expect(err.name).toBe('ApiError');
    expect(err.message).toBe('Token đã hết hạn');
  });

  it('UT-ACCTAPI-007: should map an HTTP 401 on /api/auth/me to ApiError with status 401 and the envelope traceId', async () => {
    get.mockRejectedValue({
      isAxiosError: true,
      message: 'Request failed with status code 401',
      response: {
        status: 401,
        data: { success: false, message: 'JWT không hợp lệ', timestamp: TS, traceId: 'tr-401' },
      },
    });

    const err = await rejection(authApi.me());

    expect(err).toBeInstanceOf(ApiError);
    expect(err.message).toBe('JWT không hợp lệ');
    expect(err.status).toBe(401);
    expect(err.traceId).toBe('tr-401');
  });
});

describe('authApi.changePassword — failure mapping', () => {
  it('UT-ACCTAPI-002: should reject with the generic failure message when the envelope says success=false without a message', async () => {
    post.mockResolvedValue({ data: { success: false, timestamp: TS } });

    const err = await rejection(authApi.changePassword('OldPass!23', 'NewPass!45'));

    expect(err).toBeInstanceOf(ApiError);
    expect(err.message).toBe('Yêu cầu thất bại');
  });
});

describe('usersApi — failure mapping', () => {
  it('UT-ACCTAPI-003: should reject with ApiError keeping the envelope traceId and no HTTP status for a paged list', async () => {
    get.mockResolvedValue({
      data: {
        success: false,
        message: 'Không có quyền truy cập',
        timestamp: TS,
        traceId: 'tr-403',
      },
    });

    const err = await rejection(usersApi.list({ perPage: 25 }));

    expect(err).toBeInstanceOf(ApiError);
    expect(err.message).toBe('Không có quyền truy cập');
    expect(err.traceId).toBe('tr-403');
    // Envelope-level failures carry no HTTP status: the response was a 200.
    expect(err.status).toBeUndefined();
  });

  it('UT-ACCTAPI-004: should reject on a void endpoint when the envelope says success=false', async () => {
    del.mockResolvedValue({
      data: { success: false, message: 'Người dùng không tồn tại', timestamp: TS },
    });

    const err = await rejection(usersApi.deleteUser('u-missing'));

    // `deleteUser` goes through `unwrapVoid`, which must still honour the
    // `success` flag even though it tolerates a missing `data` field.
    expect(err).toBeInstanceOf(ApiError);
    expect(err.message).toBe('Người dùng không tồn tại');
  });
});

describe('unwrap — empty payload contract', () => {
  it('UT-ACCTAPI-005: should reject with a "no data" ApiError when the envelope is successful but carries no data field', async () => {
    const err = await rejection(
      unwrap(Promise.resolve({ data: { success: true, message: 'ok', timestamp: TS } }))
    );

    expect(err).toBeInstanceOf(ApiError);
    expect(err.message).toBe('Phản hồi không có dữ liệu');
  });
});

describe('toApiError — mapping table', () => {
  it('UT-ACCTAPI-006: should map every axios failure shape to the ApiError the UI shows', () => {
    const table: {
      case: string;
      input: unknown;
      message: string;
      status?: number;
      traceId?: string;
    }[] = [
      {
        case: 'response body carries a message',
        input: {
          isAxiosError: true,
          message: 'Request failed with status code 400',
          response: { status: 400, data: { message: 'Mật khẩu quá ngắn', traceId: 'tr-1' } },
        },
        message: 'Mật khẩu quá ngắn',
        status: 400,
        traceId: 'tr-1',
      },
      {
        case: 'response body has no message',
        input: {
          isAxiosError: true,
          message: 'Request failed with status code 500',
          response: { status: 500, data: {} },
        },
        message: 'Request failed with status code 500',
        status: 500,
      },
      {
        case: 'request timed out',
        input: {
          isAxiosError: true,
          code: 'ECONNABORTED',
          message: 'timeout of 120000ms exceeded',
        },
        message: 'Yêu cầu quá thời gian chờ',
      },
      {
        case: 'network down with an empty axios message',
        input: { isAxiosError: true, code: 'ERR_NETWORK', message: '' },
        message: 'Không kết nối được máy chủ',
      },
    ];

    for (const row of table) {
      const err = toApiError(row.input);
      expect(err, row.case).toBeInstanceOf(ApiError);
      expect(err.message, row.case).toBe(row.message);
      expect(err.status, row.case).toBe(row.status);
      expect(err.traceId, row.case).toBe(row.traceId);
    }

    // Already unwrapped: the same instance is handed back, so a retry loop
    // cannot stack "ApiError: ApiError: ..." on the message.
    const already = new ApiError('đã bóc vỏ', 418);
    expect(toApiError(already)).toBe(already);
  });
});
