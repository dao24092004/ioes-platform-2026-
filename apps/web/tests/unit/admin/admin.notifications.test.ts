/** Wave 4 / subagent 2C — Unit: admin notification data layer */
import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('@/config/api.config', async () => {
  const actual = await vi.importActual<typeof import('@/config/api.config')>('@/config/api.config');
  return {
    ...actual,
    apiClient: { get: vi.fn(), post: vi.fn(), patch: vi.fn(), delete: vi.fn() },
  };
});

import {
  notificationApi,
  type NotificationRecord,
  type NotificationStats,
} from '@/services/api/notification.api';
import { ApiError, apiClient, type ApiEnvelope } from '@/config/api.config';

const TS = '2026-09-01T00:00:00.000Z';

const envelope = <T>(data: T): ApiEnvelope<T> => ({
  success: true,
  message: 'ok',
  data,
  timestamp: TS,
});

const httpError = (status: number, message: string) =>
  ({
    isAxiosError: true,
    name: 'AxiosError',
    message: `Request failed with status code ${status}`,
    toJSON: () => ({}),
    response: { status, data: { success: false, message, timestamp: TS } },
  }) as unknown as Error;

/** The gateway's actual answer when notification-service has no instance. */
const NO_INSTANCE_503 = () => httpError(503, 'Unable to find instance for notification-service');

const record = (over: Partial<NotificationRecord>): NotificationRecord => ({
  id: 'n-1',
  userId: 'u-1',
  type: 'email',
  recipient: 'hocvien@ioes.test',
  subject: 'Kết quả thi',
  status: 'sent',
  sentAt: TS,
  createdAt: TS,
  ...over,
});

const statsPayload = (over: Partial<NotificationStats>): NotificationStats => ({
  total: 12,
  pending: 1,
  sent: 9,
  failed: 1,
  retrying: 1,
  email: 8,
  push: 2,
  sms: 1,
  inApp: 1,
  ...over,
});

beforeEach(() => {
  vi.mocked(apiClient.get).mockReset();
  vi.mocked(apiClient.post).mockReset();
});

describe('notificationApi.getStats', () => {
  it('UT-ADMNOTIF-001: should GET /api/notifications/stats', async () => {
    vi.mocked(apiClient.get).mockResolvedValue({ data: envelope(statsPayload({})) });

    await notificationApi.getStats();

    expect(apiClient.get).toHaveBeenCalledTimes(1);
    expect(vi.mocked(apiClient.get).mock.calls[0]![0]).toBe('/api/notifications/stats');
  });

  it('UT-ADMNOTIF-002: should return all nine counters so the four stat cards and the per-channel totals stay available', async () => {
    vi.mocked(apiClient.get).mockResolvedValue({ data: envelope(statsPayload({})) });

    const result = await notificationApi.getStats();

    expect(result).toEqual({
      total: 12,
      pending: 1,
      sent: 9,
      failed: 1,
      retrying: 1,
      email: 8,
      push: 2,
      sms: 1,
      inApp: 1,
    });
  });

  it('UT-ADMNOTIF-003: should reject with ApiError 503 carrying the gateway message when notification-service has no registered instance', async () => {
    vi.mocked(apiClient.get).mockRejectedValue(NO_INSTANCE_503());

    const err = await notificationApi.getStats().catch((e: unknown) => e);

    expect(err).toBeInstanceOf(ApiError);
    expect(err).toMatchObject({
      status: 503,
      message: 'Unable to find instance for notification-service',
    });
  });
});

describe('notificationApi.getTemplates', () => {
  it('UT-ADMNOTIF-004: should GET /api/notifications/templates', async () => {
    vi.mocked(apiClient.get).mockResolvedValue({ data: envelope([]) });

    await notificationApi.getTemplates();

    expect(apiClient.get).toHaveBeenCalledTimes(1);
    expect(vi.mocked(apiClient.get).mock.calls[0]![0]).toBe('/api/notifications/templates');
  });

  it('UT-ADMNOTIF-005: should unwrap the bare array out of data so a category endpoint does not need a per-item wrapper', async () => {
    vi.mocked(apiClient.get).mockResolvedValue({
      data: envelope([{ name: 'welcome' }, { name: 'exam-result' }]),
    });

    const result = await notificationApi.getTemplates();

    expect(Array.isArray(result)).toBe(true);
    expect(result).toEqual([{ name: 'welcome' }, { name: 'exam-result' }]);
  });

  it('UT-ADMNOTIF-006: should reject with ApiError when the envelope reports success:false, not only on a non-2xx status', async () => {
    vi.mocked(apiClient.get).mockResolvedValue({
      data: { success: false, message: 'Chỉ admin được xem danh sách template', timestamp: TS },
    });

    const err = await notificationApi.getTemplates().catch((e: unknown) => e);

    expect(err).toBeInstanceOf(ApiError);
    expect((err as ApiError).message).toBe('Chỉ admin được xem danh sách template');
  });
});

describe('notificationApi.getUserInbox', () => {
  it('UT-ADMNOTIF-007: should GET /api/notifications/user/:userId with the id from the signed-in admin', async () => {
    vi.mocked(apiClient.get).mockResolvedValue({ data: envelope([]) });

    await notificationApi.getUserInbox('00000000-0000-0000-0000-000000000002');

    expect(apiClient.get).toHaveBeenCalledTimes(1);
    expect(vi.mocked(apiClient.get).mock.calls[0]![0]).toBe(
      '/api/notifications/user/00000000-0000-0000-0000-000000000002'
    );
  });

  it('UT-ADMNOTIF-008: should return records verbatim, preserving a null sentAt alongside a set sentAt', async () => {
    vi.mocked(apiClient.get).mockResolvedValue({
      data: envelope([
        record({ id: 'n-1', status: 'sent', sentAt: TS }),
        record({ id: 'n-2', status: 'pending', sentAt: null, type: 'in_app' }),
        record({ id: 'n-3', status: 'failed', sentAt: null, userId: null, type: 'email' }),
      ]),
    });

    const result = await notificationApi.getUserInbox('u-1');

    expect(result).toHaveLength(3);
    expect(result[0]!.sentAt).toBe(TS);
    expect(result[1]!.sentAt).toBeNull();
    expect(result[1]!.type).toBe('in_app');
    expect(result[2]!.userId).toBeNull();
    expect(result.map((r) => r.status)).toEqual(['sent', 'pending', 'failed']);
  });

  it('UT-ADMNOTIF-009: should reject with ApiError 403 when the caller may not read another user inbox', async () => {
    vi.mocked(apiClient.get).mockRejectedValue(httpError(403, 'Không có quyền đọc hộp thư này'));

    const err = await notificationApi.getUserInbox('someone-else').catch((e: unknown) => e);

    expect(err).toBeInstanceOf(ApiError);
    expect(err).toMatchObject({ status: 403, message: 'Không có quyền đọc hộp thư này' });
  });
});

describe('notificationApi.send', () => {
  it('UT-ADMNOTIF-010: should POST /api/notifications/send with exactly the four fields the broadcast form fills', async () => {
    vi.mocked(apiClient.post).mockResolvedValue({ data: envelope(record({ id: 'n-9' })) });

    await notificationApi.send({
      type: 'email',
      recipient: 'hocvien@ioes.test',
      subject: 'Thông báo kỳ thi',
      content: 'Kỳ thi mở cửa lúc 8h ngày 10/10.',
    });

    const [url, body] = vi.mocked(apiClient.post).mock.calls[0]!;
    expect(url).toBe('/api/notifications/send');
    expect(body).toEqual({
      type: 'email',
      recipient: 'hocvien@ioes.test',
      subject: 'Thông báo kỳ thi',
      content: 'Kỳ thi mở cửa lúc 8h ngày 10/10.',
    });
  });

  it('UT-ADMNOTIF-011: should resolve — not reject — with status "failed" when delivery broke, because the Java service catches the exception and still stores the row', async () => {
    // This is the branch `onSuccess` on the page has to inspect: a 200 alone
    // does not mean the notification went out.
    vi.mocked(apiClient.post).mockResolvedValue({
      data: envelope(record({ id: 'n-10', status: 'failed', sentAt: null })),
    });

    const result = await notificationApi.send({
      type: 'email',
      recipient: 'hocvien@ioes.test',
      subject: 'S',
      content: 'C',
    });

    expect(result.status).toBe('failed');
    expect(result.sentAt).toBeNull();
  });

  it('UT-ADMNOTIF-012: should reject with ApiError carrying the backend message when the type enum is rejected with 400', async () => {
    // `NotificationType` is a Java enum behind `@NotNull`; a spelling the
    // server does not know is a 400, which is the whole reason the page maps
    // its own channel labels through a lookup table.
    vi.mocked(apiClient.post).mockRejectedValue(httpError(400, 'type: không phải giá trị hợp lệ'));

    const err = await notificationApi
      .send({ type: 'inApp' as never, recipient: 'a@b.test', subject: 'S', content: 'C' })
      .catch((e: unknown) => e);

    expect(err).toBeInstanceOf(ApiError);
    expect(err).toMatchObject({ status: 400, message: 'type: không phải giá trị hợp lệ' });
  });
});
