import { Inject, Injectable, Logger } from '@nestjs/common';
import Redis from 'ioredis';

/**
 * ViolationEvent — một sự kiện vi phạm ghi lại trong Redis.
 */
export interface ViolationEvent {
  type: string;
  startedAt: string;   // ISO timestamp
  endedAt?: string;     // ISO timestamp, undefined = ongoing
  durationMs?: number;  // computed when event ends
}

/** BR-011 attention thresholds (hardcoded, configurable via env). */
export const ATTENTION_WARNING_THRESHOLD = 60;  // < 60 → warning only
export const ATTENTION_FLAG_THRESHOLD = 40;     // < 40 → flag attempt

/** FR-PROC-006: FACE_NOT_DETECTED > 5s → violation. */
export const FACE_NOT_DETECTED_DURATION_MS = 5000;

/**
 * Khoảng lặng giữa hai violation *cùng loại* của một attempt (giây).
 *
 * FR-PROC-001 nâng nhịp gửi khung lên 1 Hz. Không có khoảng lặng này thì một
 * lần cúi xuống nhìn giấy nháp 4 giây đã sinh 4 violation LOW_ATTENTION liên
 * tiếp và vượt ngưỡng BR-013 (>3) — bài thi bị nộp tự động. Đếm theo "đợt"
 * thay vì theo khung: mỗi loại vi phạm chỉ tính một lần trong 15 giây, nên
 * ngưỡng 3 tương ứng với khoảng 45 giây vi phạm liên tục.
 */
export const VIOLATION_COOLDOWN_SEC = 15;

export const REDIS_CLIENT = 'REDIS_CLIENT';

/**
 * ViolationCounterService — đếm số violation và ghi lại từng sự kiện vi phạm trong 1 phiên thi.
 *
 * BR-013: violation count > threshold (mặc định 3) → trigger auto-submit + flag.
 * BR-011: attention < 60 → LOW_ATTENTION; attention < 40 → flag attempt luôn.
 * FR-PROC-006: FACE_NOT_DETECTED liên tục > 5s → violation.
 *
 * Redis keys:
 * - `ioes:exam:violations:{attemptId}` — counter
 * - `ioes:exam:violation_events:{attemptId}` — JSON array của ViolationEvent
 * - `ioes:exam:face_not_detected_start:{attemptId}` — timestamp bắt đầu face-not-detected
 */
@Injectable()
export class ViolationCounterService {
  private readonly logger = new Logger(ViolationCounterService.name);
  private readonly keyPrefix = 'ioes:exam:';

  constructor(@Inject(REDIS_CLIENT) private readonly redis: Redis) {}

  private counterKey(attemptId: string): string {
    return `${this.keyPrefix}violations:${attemptId}`;
  }

  private eventsKey(attemptId: string): string {
    return `${this.keyPrefix}violation_events:${attemptId}`;
  }

  private faceNotDetectedStartKey(attemptId: string): string {
    return `${this.keyPrefix}face_not_detected_start:${attemptId}`;
  }

  private cooldownKey(attemptId: string, type: string): string {
    return `${this.keyPrefix}violation_cooldown:${attemptId}:${type}`;
  }

  /**
   * Mở một "đợt" vi phạm mới cho `type`, hoặc từ chối nếu đợt trước còn trong
   * khoảng lặng.
   *
   * Dùng `SET NX EX` để chốt nguyên tử — hai khung tới gần như cùng lúc thì
   * chỉ một khung mở được đợt.
   *
   * @returns true nếu đây là đợt mới (caller được phép ghi violation).
   */
  async tryStartViolationEpisode(
    attemptId: string,
    type: string,
    cooldownSec: number = VIOLATION_COOLDOWN_SEC,
  ): Promise<boolean> {
    if (cooldownSec <= 0) return true;
    const res = await this.redis.set(
      this.cooldownKey(attemptId, type),
      Date.now().toString(),
      'EX',
      cooldownSec,
      'NX',
    );
    return res === 'OK';
  }

  // ========== Counter ==========

  /**
   * Tăng counter lên 1, set TTL nếu key mới.
   *
   * @returns counter value mới (sau khi incr).
   */
  async increment(attemptId: string, ttlSec: number): Promise<number> {
    const k = this.counterKey(attemptId);
    const count = await this.redis.incr(k);
    if (count === 1) {
      await this.redis.expire(k, ttlSec);
    }
    return count;
  }

  async getCount(attemptId: string): Promise<number> {
    const raw = await this.redis.get(this.counterKey(attemptId));
    return raw ? Number(raw) : 0;
  }

  /**
   * BR-013: check count > threshold (KHÔNG dùng >= vì spec yêu cầu "vượt ngưỡng").
   */
  async isOverThreshold(attemptId: string, threshold: number): Promise<boolean> {
    const count = await this.getCount(attemptId);
    return count > threshold;
  }

  // ========== Violation events ==========

  /**
   * Ghi một sự kiện vi phạm vào Redis list.
   * @returns total violation count sau khi thêm
   */
  async recordViolation(attemptId: string, event: ViolationEvent, ttlSec: number): Promise<number> {
    const k = this.eventsKey(attemptId);
    await this.redis.rpush(k, JSON.stringify(event));
    if (ttlSec > 0) {
      await this.redis.expire(k, ttlSec);
    }
    return this.increment(attemptId, ttlSec);
  }

  /**
   * Lấy tất cả sự kiện vi phạm của một attempt.
   * Dùng cho GET /proctoring-report (FR-PROC-008).
   */
  async getEvents(attemptId: string): Promise<ViolationEvent[]> {
    const raw = await this.redis.lrange(this.eventsKey(attemptId), 0, -1);
    return raw.map((s) => JSON.parse(s) as ViolationEvent);
  }

  // ========== FACE_NOT_DETECTED tracking (FR-PROC-006) ==========

  /**
   * Ghi lại thời điểm bắt đầu face-not-detected.
   * FR-PROC-006: đếm 5 giây trước khi coi là violation.
   */
  async startFaceNotDetected(attemptId: string, ttlSec: number): Promise<void> {
    const k = this.faceNotDetectedStartKey(attemptId);
    await this.redis.set(k, Date.now().toString(), 'EX', ttlSec);
  }

  /**
   * Xoá tracking face-not-detected (khi face được phát hiện lại).
   */
  async clearFaceNotDetected(attemptId: string): Promise<void> {
    await this.redis.del(this.faceNotDetectedStartKey(attemptId));
  }

  /**
   * Kiểm tra xem face-not-detected đã kéo dài > 5s chưa.
   * @returns durationMs nếu đang face-not-detected, null nếu face OK
   */
  async getFaceNotDetectedDurationMs(attemptId: string): Promise<number | null> {
    const raw = await this.redis.get(this.faceNotDetectedStartKey(attemptId));
    if (!raw) return null;
    return Date.now() - Number(raw);
  }

  // ========== Clear ==========

  /** Xoá tất cả violation data của attempt (sau khi submit xong). */
  async clearAll(attemptId: string): Promise<void> {
    await this.redis.del(
      this.counterKey(attemptId),
      this.eventsKey(attemptId),
      this.faceNotDetectedStartKey(attemptId),
    );
  }

  /** Xoá counter (sau khi submit xong). */
  async clear(attemptId: string): Promise<void> {
    await this.redis.del(this.counterKey(attemptId));
  }
}
