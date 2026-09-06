import { describe, it, expect, vi, beforeEach } from 'vitest';

const { get, post } = vi.hoisted(() => ({ get: vi.fn(), post: vi.fn() }));

vi.mock('@/config/api.config', async () => {
  const actual = await vi.importActual<typeof import('@/config/api.config')>('@/config/api.config');
  return { ...actual, apiClient: { get, post } };
});

import { ask, getHistory, listSessions } from './ai.api';

const ok = <T>(data: T) => ({
  data: { success: true, message: 'ok', timestamp: '2026-08-27T00:00:00.000Z', data },
});

beforeEach(() => {
  get.mockReset();
  post.mockReset();
});

describe('ai.api', () => {
  it('gửi câu hỏi kèm sessionId khi tiếp tục một phiên', async () => {
    post.mockResolvedValue(ok({ sessionId: 's1', answer: 'xin chào' }));
    await ask({ question: 'mảng là gì', sessionId: 's1' });
    expect(post).toHaveBeenCalledWith('/api/ai/chat', {
      question: 'mảng là gì',
      sessionId: 's1',
    });
  });

  it('không gửi sessionId khi mở phiên mới', async () => {
    post.mockResolvedValue(ok({ sessionId: 's-new' }));
    await ask({ question: 'xin chào' });
    // Backend tạo phiên khi thiếu sessionId, nên gửi kèm undefined cũng được,
    // nhưng khoá phải không xuất hiện với giá trị rỗng.
    expect(post.mock.calls[0][1]).not.toHaveProperty('sessionId', '');
  });

  it('trả về lượt hỏi đáp đã bóc vỏ', async () => {
    post.mockResolvedValue(ok({ sessionId: 's1', messageId: 'm1', answer: 'ok', grounded: true }));
    await expect(ask({ question: 'x' })).resolves.toMatchObject({ messageId: 'm1', grounded: true });
  });

  it('gọi đúng đường dẫn danh sách phiên', async () => {
    get.mockResolvedValue(ok([]));
    await listSessions();
    expect(get).toHaveBeenCalledWith('/api/ai/chat/sessions');
  });

  it('ghép sessionId vào đường dẫn lịch sử', async () => {
    get.mockResolvedValue(ok([]));
    await getHistory('abc-123');
    expect(get).toHaveBeenCalledWith('/api/ai/chat/abc-123');
  });
});
