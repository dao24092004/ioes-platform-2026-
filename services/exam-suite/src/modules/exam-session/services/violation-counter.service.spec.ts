import { ViolationCounterService } from './violation-counter.service';

/**
 * Unit tests cho ViolationCounterService.
 *
 * BR-013: violation count phải >= threshold (mặc định 3) thì mới trigger auto-submit.
 * Counter lưu trong Redis với key `ioes:exam:violations:{attemptId}`.
 * TTL = thời gian còn lại của phiên + buffer (5 phút).
 *
 * Counter KHÔNG BAO GIỜ giảm (chỉ tăng). Clear khi submit.
 *
 * Convention: should_X_When_Y
 */
describe('ViolationCounterService', () => {
  let service: ViolationCounterService;
  let redis: {
    incr: jest.Mock;
    get: jest.Mock;
    expire: jest.Mock;
    del: jest.Mock;
  };

  beforeEach(() => {
    redis = {
      incr: jest.fn(),
      get: jest.fn(),
      expire: jest.fn(),
      del: jest.fn(),
    };
    service = new ViolationCounterService(redis as any);
  });

  describe('increment', () => {
    it('should_returnOne_When_firstViolation', async () => {
      redis.incr.mockResolvedValue(1);
      redis.expire.mockResolvedValue(1);

      const result = await service.increment('attempt-1', 1800);

      expect(result).toBe(1);
      expect(redis.incr).toHaveBeenCalledWith('ioes:exam:violations:attempt-1');
      expect(redis.expire).toHaveBeenCalledWith(
        'ioes:exam:violations:attempt-1',
        1800,
      );
    });

    it('should_returnCumulativeCount_When_multipleViolations', async () => {
      redis.incr.mockResolvedValueOnce(2).mockResolvedValueOnce(3);
      redis.expire.mockResolvedValue(1);

      const first = await service.increment('attempt-1', 1800);
      const second = await service.increment('attempt-1', 1800);

      expect(first).toBe(2);
      expect(second).toBe(3);
    });

    it('should_setExpireOnlyOnce_When_keyIsNew', async () => {
      redis.incr.mockResolvedValue(1);
      redis.expire.mockResolvedValue(1);

      await service.increment('attempt-1', 1800);

      expect(redis.expire).toHaveBeenCalledTimes(1);
    });
  });

  describe('getCount', () => {
    it('should_returnZero_When_keyMissing', async () => {
      redis.get.mockResolvedValue(null);

      const count = await service.getCount('attempt-1');

      expect(count).toBe(0);
    });

    it('should_returnNumber_When_keyExists', async () => {
      redis.get.mockResolvedValue('5');

      const count = await service.getCount('attempt-1');

      expect(count).toBe(5);
    });
  });

  describe('isOverThreshold', () => {
    it('should_returnTrue_When_countStrictlyGreaterThanThreshold', async () => {
      redis.get.mockResolvedValue('4');

      const over = await service.isOverThreshold('attempt-1', 3);

      expect(over).toBe(true);
    });

    it('should_returnFalse_When_countEqualsThreshold', async () => {
      redis.get.mockResolvedValue('3');

      const over = await service.isOverThreshold('attempt-1', 3);

      expect(over).toBe(false);
    });

    it('should_returnFalse_When_countBelowThreshold', async () => {
      redis.get.mockResolvedValue('2');

      const over = await service.isOverThreshold('attempt-1', 3);

      expect(over).toBe(false);
    });
  });

  describe('clear', () => {
    it('should_deleteRedisKey_When_clearing', async () => {
      redis.del.mockResolvedValue(1);

      await service.clear('attempt-1');

      expect(redis.del).toHaveBeenCalledWith(
        'ioes:exam:violations:attempt-1',
      );
    });
  });

  describe('BR-013 integration', () => {
    it('should_triggerAutoFlag_When_countExceedsThree', async () => {
      // Simulate: counter goes 1 -> 2 -> 3 -> 4 (over)
      redis.incr
        .mockResolvedValueOnce(1)
        .mockResolvedValueOnce(2)
        .mockResolvedValueOnce(3)
        .mockResolvedValueOnce(4);
      redis.expire.mockResolvedValue(1);

      const counts: number[] = [];
      let triggeredAt: number | null = null;
      for (let i = 0; i < 4; i++) {
        const count = await service.increment('attempt-1', 1800);
        counts.push(count);
        // isOverThreshold sẽ gọi getCount → redis.get
        // → mock giá trị tương ứng cho mỗi vòng
        redis.get.mockResolvedValueOnce(String(count));
        const over = await service.isOverThreshold('attempt-1', 3);
        if (over && triggeredAt === null) {
          triggeredAt = count;
        }
      }

      // Sau 4 lần: count = 4 > threshold 3 → trigger
      expect(triggeredAt).toBe(4);
      expect(counts).toEqual([1, 2, 3, 4]);
    });

    it('should_notTrigger_When_countEqualsThreshold', async () => {
      redis.incr.mockResolvedValueOnce(3);
      redis.expire.mockResolvedValue(1);
      redis.get.mockResolvedValueOnce('3');

      await service.increment('attempt-1', 1800);
      const over = await service.isOverThreshold('attempt-1', 3);

      expect(over).toBe(false);
    });
  });
});