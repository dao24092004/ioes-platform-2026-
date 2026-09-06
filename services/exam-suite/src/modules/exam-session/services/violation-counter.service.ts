import { Inject, Injectable, Logger } from '@nestjs/common';
import Redis from 'ioredis';

export const REDIS_CLIENT = 'REDIS_CLIENT';

/**
 * ViolationCounterService — đếm số violation trong 1 phiên thi (BR-013).
 *
 * Lưu trong Redis dưới key `ioes:exam:violations:{attemptId}`.
 * Counter là monotonically increasing (chỉ tăng, không giảm).
 * Clear khi attempt submit xong.
 *
 * BR-013: violation count > threshold (mặc định 3) → trigger auto-submit + flag.
 *
 * Phase 1: chỉ dùng đếm số lượng. Phase 2 (sau) có thể lưu thêm
 * `{ type: 'LOW_ATTENTION', durationMs: 12000 }` để Instructor xem chi tiết.
 *
 * Race condition với submit:
 * - submit có distributed lock `lock:attempt:{id}:submit` (đã có ở SubmitExamUseCase)
 * - increment chỉ INCR Redis key — không ghi DB
 * - Khi submit thắng → clear key này
 * - Nếu tăng sau khi submit xong (giành race) → key đã clear, count = 1, không đủ trigger
 */
@Injectable()
export class ViolationCounterService {
  private readonly logger = new Logger(ViolationCounterService.name);
  private readonly keyPrefix = 'ioes:exam:';

  constructor(@Inject(REDIS_CLIENT) private readonly redis: Redis) {}

  private key(attemptId: string): string {
    return `${this.keyPrefix}violations:${attemptId}`;
  }

  /**
   * Tăng counter lên 1, set TTL nếu key mới.
   *
   * @returns counter value mới (sau khi incr).
   */
  async increment(attemptId: string, ttlSec: number): Promise<number> {
    const k = this.key(attemptId);
    const count = await this.redis.incr(k);
    // EXPIRE chỉ set nếu key mới — tránh reset TTL mỗi lần (giữ đúng window deadline)
    if (count === 1) {
      await this.redis.expire(k, ttlSec);
    }
    return count;
  }

  /**
   * Lấy counter hiện tại. Trả 0 nếu key không tồn tại.
   */
  async getCount(attemptId: string): Promise<number> {
    const raw = await this.redis.get(this.key(attemptId));
    return raw ? Number(raw) : 0;
  }

  /**
   * BR-013: check count > threshold (KHÔNG dùng >= vì spec yêu cầu "vượt ngưỡng").
   */
  async isOverThreshold(attemptId: string, threshold: number): Promise<boolean> {
    const count = await this.getCount(attemptId);
    return count > threshold;
  }

  /**
   * Xoá counter (sau khi submit xong).
   */
  async clear(attemptId: string): Promise<void> {
    await this.redis.del(this.key(attemptId));
  }
}