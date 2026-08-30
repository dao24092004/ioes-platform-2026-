import { describe, it, expect, vi, beforeEach } from 'vitest';

// vi.mock được kéo lên đầu file, nên biến dùng trong factory phải khai bằng
// vi.hoisted, không thì gặp "Cannot access 'post' before initialization".
const { post } = vi.hoisted(() => ({ post: vi.fn() }));

vi.mock('@/config/api.config', async () => {
  const actual = await vi.importActual<typeof import('@/config/api.config')>('@/config/api.config');
  return { ...actual, apiClient: { post } };
});

import { send, sendTemplated } from './notification.api';
import { ApiError } from '@/config/api.config';

const ok = <T>(data: T) => ({
  data: { success: true, message: 'ok', timestamp: '2026-08-30T00:00:00.000Z', data },
});

const record = {
  id: 'n-1',
  userId: null,
  type: 'email',
  recipient: 'ai@fpt.edu.vn',
  subject: 'Bảo trì hệ thống',
  status: 'sent',
  sentAt: '2026-08-30T00:00:00.000Z',
  createdAt: '2026-08-30T00:00:00.000Z',
};

beforeEach(() => post.mockReset());

describe('notification.api', () => {
  it('gọi đúng đường dẫn gửi thường', async () => {
    post.mockResolvedValue(ok(record));
    await send({
      type: 'email',
      recipient: 'ai@fpt.edu.vn',
      subject: 'Bảo trì hệ thống',
      content: 'Hệ thống bảo trì lúc 22h.',
    });
    expect(post).toHaveBeenCalledWith('/api/notifications/send', {
      type: 'email',
      recipient: 'ai@fpt.edu.vn',
      subject: 'Bảo trì hệ thống',
      content: 'Hệ thống bảo trì lúc 22h.',
    });
  });

  it('gọi đúng đường dẫn gửi theo mẫu', async () => {
    post.mockResolvedValue(ok(record));
    await sendTemplated({
      type: 'email',
      recipient: 'ai@fpt.edu.vn',
      subject: 'Chào mừng',
      template: 'welcome',
      data: { fullName: 'Ngọc' },
    });
    expect(post).toHaveBeenCalledWith('/api/notifications/send-templated', {
      type: 'email',
      recipient: 'ai@fpt.edu.vn',
      subject: 'Chào mừng',
      template: 'welcome',
      data: { fullName: 'Ngọc' },
    });
  });

  it('trả nguyên bản ghi để phía gọi đọc được status', async () => {
    // Backend bắt lỗi gửi rồi vẫn trả 200 kèm status 'failed', nên không thể
    // chỉ dựa vào việc promise resolve để kết luận là đã gửi được.
    post.mockResolvedValue(ok({ ...record, status: 'failed' }));
    await expect(send({ type: 'email', recipient: 'x@y.z', subject: 's', content: 'c' }))
      .resolves.toMatchObject({ status: 'failed' });
  });

  it('ném ApiError khi backend báo thất bại', async () => {
    post.mockResolvedValue({
      data: { success: false, message: 'recipient must not be blank', timestamp: '' },
    });
    await expect(send({ type: 'email', recipient: '', subject: 's', content: 'c' }))
      .rejects.toBeInstanceOf(ApiError);
  });
});
