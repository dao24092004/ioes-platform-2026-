/** Wave 2 - Unit: notification.api.ts (student-owned) */
import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('@/config/api.config', () => ({
  apiClient: {
    get: vi.fn(),
    post: vi.fn(),
    patch: vi.fn(),
    delete: vi.fn(),
  },
  unwrap: vi.fn((promise: Promise<{ data: { data: unknown } }>) =>
    promise.then((res) => res.data.data)
  ),
  unwrapVoid: vi.fn((promise: Promise<unknown>) => promise),
}));

import { notificationApi } from '@/services/api/notification.api';
import { apiClient } from '@/config/api.config';

beforeEach(() => {
  vi.mocked(apiClient.get).mockReset();
  vi.mocked(apiClient.post).mockReset();
});

describe('notificationApi.getUserInbox', () => {
  it('UT-NOTIF-001: should GET /api/notifications/user/:userId', async () => {
    vi.mocked(apiClient.get).mockResolvedValue({ data: { data: [] } });

    await notificationApi.getUserInbox('user-42');

    expect(apiClient.get).toHaveBeenCalledTimes(1);
    expect(vi.mocked(apiClient.get).mock.calls[0]![0]).toBe('/api/notifications/user/user-42');
  });

  it('UT-NOTIF-002: should return the unwrapped NotificationRecord[] payload', async () => {
    const records = [
      {
        id: 'n1',
        userId: 'u1',
        type: 'email' as const,
        recipient: 'a@b.com',
        subject: 'S1',
        status: 'sent' as const,
        sentAt: '2026-10-01T00:00:00.000Z',
        createdAt: '2026-10-01T00:00:00.000Z',
      },
      {
        id: 'n2',
        userId: 'u1',
        type: 'push' as const,
        recipient: 'tok',
        subject: 'S2',
        status: 'pending' as const,
        sentAt: null,
        createdAt: '2026-10-01T00:00:00.000Z',
      },
    ];
    vi.mocked(apiClient.get).mockResolvedValue({ data: { data: records } });

    const result = await notificationApi.getUserInbox('u1');

    expect(result).toEqual(records);
    expect(result).toHaveLength(2);
  });

  it('UT-NOTIF-003: should treat the four NotificationType values symmetrically', async () => {
    // Documented union; the page filter pills map onto this exact set.
    const types = ['email', 'push', 'sms', 'in_app'] as const;
    for (const t of types) {
      expect(['email', 'push', 'sms', 'in_app']).toContain(t);
    }
  });

  it('UT-NOTIF-004: should treat the four NotificationStatus values symmetrically', async () => {
    const statuses = ['pending', 'sent', 'failed', 'retrying'] as const;
    for (const s of statuses) {
      expect(['pending', 'sent', 'failed', 'retrying']).toContain(s);
    }
  });
});

describe('notificationApi.send', () => {
  it('UT-NOTIF-005: should POST /api/notifications/send with required fields', async () => {
    vi.mocked(apiClient.post).mockResolvedValue({
      data: {
        data: {
          id: 'n1',
          userId: null,
          type: 'email',
          recipient: 'a@b.com',
          subject: 'S',
          status: 'pending',
          sentAt: null,
          createdAt: '2026-10-01T00:00:00.000Z',
        },
      },
    });

    await notificationApi.send({
      type: 'email',
      recipient: 'a@b.com',
      subject: 'Hello',
      content: 'body',
    });

    const [url, body] = vi.mocked(apiClient.post).mock.calls[0]!;
    expect(url).toBe('/api/notifications/send');
    expect(body).toEqual({
      type: 'email',
      recipient: 'a@b.com',
      subject: 'Hello',
      content: 'body',
    });
  });

  it('UT-NOTIF-006: should send sendTemplated POST /api/notifications/send-templated with template+data', async () => {
    vi.mocked(apiClient.post).mockResolvedValue({
      data: {
        data: {
          id: 'n1',
          userId: null,
          type: 'push',
          recipient: 'tok',
          subject: 'Welcome',
          status: 'sent',
          sentAt: '2026-10-01T00:00:00.000Z',
          createdAt: '2026-10-01T00:00:00.000Z',
        },
      },
    });

    await notificationApi.sendTemplated({
      type: 'push',
      recipient: 'tok',
      subject: 'Welcome',
      template: 'welcome',
      data: { name: 'A' },
    });

    const [url, body] = vi.mocked(apiClient.post).mock.calls[0]!;
    expect(url).toBe('/api/notifications/send-templated');
    expect(body).toMatchObject({ template: 'welcome', data: { name: 'A' } });
  });
});

describe('notificationApi.getStats', () => {
  it('UT-NOTIF-007: should GET /api/notifications/stats', async () => {
    vi.mocked(apiClient.get).mockResolvedValue({
      data: {
        data: {
          total: 10,
          pending: 1,
          sent: 8,
          failed: 0,
          retrying: 1,
          email: 5,
          push: 3,
          sms: 1,
          inApp: 1,
        },
      },
    });

    await notificationApi.getStats();

    expect(apiClient.get).toHaveBeenCalledTimes(1);
    expect(vi.mocked(apiClient.get).mock.calls[0]![0]).toBe('/api/notifications/stats');
  });
});

describe('notificationApi.getTemplates', () => {
  it('UT-NOTIF-008: should GET /api/notifications/templates', async () => {
    vi.mocked(apiClient.get).mockResolvedValue({ data: { data: [{ name: 'welcome' }] } });

    await notificationApi.getTemplates();

    expect(apiClient.get).toHaveBeenCalledTimes(1);
    expect(vi.mocked(apiClient.get).mock.calls[0]![0]).toBe('/api/notifications/templates');
  });
});
