import { describe, it, expect, vi, beforeEach } from 'vitest';

// vi.mock được kéo lên đầu file, nên biến dùng trong factory phải khai bằng
// vi.hoisted, không thì gặp "Cannot access 'get' before initialization".
const { get } = vi.hoisted(() => ({ get: vi.fn() }));

vi.mock('@/config/api.config', async () => {
  const actual = await vi.importActual<typeof import('@/config/api.config')>('@/config/api.config');
  return { ...actual, apiClient: { get } };
});

import { getLeaderboard, getMyRank, getUserAnalytics } from './analytics.api';

const ok = <T>(data: T) => ({
  data: { success: true, message: 'ok', timestamp: '2026-08-27T00:00:00.000Z', data },
});

beforeEach(() => get.mockReset());

describe('analytics.api', () => {
  it('gọi đúng đường dẫn và tham số cho bảng xếp hạng', async () => {
    get.mockResolvedValue(ok([]));
    await getLeaderboard('MONTHLY', 25);
    expect(get).toHaveBeenCalledWith('/api/analytics/leaderboard', {
      params: { period: 'MONTHLY', limit: 25 },
    });
  });

  it('mặc định là WEEKLY, 10 mục', async () => {
    get.mockResolvedValue(ok([]));
    await getLeaderboard();
    expect(get).toHaveBeenCalledWith('/api/analytics/leaderboard', {
      params: { period: 'WEEKLY', limit: 10 },
    });
  });

  it('trả null khi người dùng chưa có hạng, không ném lỗi', async () => {
    // Backend trả success:true kèm data:null cho trường hợp này — chưa xếp
    // hạng là bình thường, không phải hỏng.
    get.mockResolvedValue({
      data: { success: true, message: 'Not ranked yet', timestamp: '', data: null },
    });
    await expect(getMyRank()).resolves.toBeNull();
  });

  it('trả về entry khi đã có hạng', async () => {
    get.mockResolvedValue(ok({ userId: 'u1', rank: 3 }));
    await expect(getMyRank('DAILY')).resolves.toMatchObject({ rank: 3 });
    expect(get).toHaveBeenCalledWith('/api/analytics/leaderboard/me', {
      params: { period: 'DAILY' },
    });
  });

  it('ghép userId vào đường dẫn thống kê', async () => {
    get.mockResolvedValue(ok({ userId: 'u-7' }));
    await getUserAnalytics('u-7');
    expect(get).toHaveBeenCalledWith('/api/analytics/users/u-7');
  });
});
