import { describe, it, expect } from 'vitest';
import { getInitials } from './LeaderboardPage';

// analytics-service có thể trả `full_name: null` cho hàng seed/demo thiếu hồ
// sơ (xem GET /api/analytics/leaderboard) — hàm suy chữ cái đầu phải sống
// sót qua trường hợp đó thay vì ném lỗi `Cannot read properties of null`.
describe('getInitials', () => {
  it('lấy hai chữ cái đầu từ họ tên đầy đủ', () => {
    expect(getInitials('Jane Doe')).toBe('JD');
  });

  it('lấy một chữ cái khi chỉ có một từ', () => {
    expect(getInitials('Alex')).toBe('A');
  });

  it('trả về placeholder khi full_name là null', () => {
    expect(getInitials(null)).toBe('?');
  });

  it('trả về placeholder khi full_name toàn khoảng trắng', () => {
    expect(getInitials('   ')).toBe('?');
  });

  it('bỏ qua khoảng trắng thừa giữa các từ', () => {
    expect(getInitials('  John   Smith ')).toBe('JS');
  });
});
