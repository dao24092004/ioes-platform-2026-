import { Inject, Injectable, Logger, OnModuleDestroy } from '@nestjs/common';
import Redis from 'ioredis';

export const REDIS_CLIENT = 'REDIS_CLIENT';

/**
 * Trạng thái phiên thi trong Redis.
 * Mirror của `exam_attempt.status` + một số field volatile (timer, screen record).
 */
export interface SessionState {
  attemptId: string;
  userId: string;
  examId: string;
  status: 'IN_PROGRESS' | 'SUBMITTED' | 'GRADED' | 'EXPIRED';
  deadlineEpochMs: number;
  screenRecordEnabled: boolean;
  proctoringRequired: boolean;
  wsSessionId?: string;
}

/**
 * SessionCacheService — wrapper Redis cho trạng thái phiên thi.
 *
 * Key naming convention:
 * - session:attempt:{id}        → Hash SessionState
 * - timer:attempt:{id}          → String epoch ms deadline + TTL
 * - ws:attempt:{id}:student     → String WebSocket session id
 * - lock:attempt:{id}:submit    → String distributed lock
 *
 * Tuân thủ Redis pattern trong PROJECT_RULES.md:
 * - Key prefix: ioes:exam:
 * - TTL cho mọi key (tránh leak)
 */
@Injectable()
export class SessionCacheService implements OnModuleDestroy {
  private readonly logger = new Logger(SessionCacheService.name);
  private readonly keyPrefix = 'ioes:exam:';

  constructor(@Inject(REDIS_CLIENT) private readonly redis: Redis) {}

  async onModuleDestroy(): Promise<void> {
    await this.redis.quit().catch((err) => this.logger.warn(`Redis quit error: ${err}`));
  }

  // ========== session state ==========

  private sessionKey(id: string): string {
    return `${this.keyPrefix}session:attempt:${id}`;
  }

  private timerKey(id: string): string {
    return `${this.keyPrefix}timer:attempt:${id}`;
  }

  private wsStudentKey(id: string): string {
    return `${this.keyPrefix}ws:attempt:${id}:student`;
  }

  private submitLockKey(id: string): string {
    return `${this.keyPrefix}lock:attempt:${id}:submit`;
  }

  /**
   * Lưu session state. TTL = thời gian còn lại + 5 phút buffer.
   */
  async setSession(state: SessionState, ttlSec: number): Promise<void> {
    const key = this.sessionKey(state.attemptId);
    await this.redis.hset(key, {
      attemptId: state.attemptId,
      userId: state.userId,
      examId: state.examId,
      status: state.status,
      deadlineEpochMs: String(state.deadlineEpochMs),
      screenRecordEnabled: state.screenRecordEnabled ? '1' : '0',
      proctoringRequired: state.proctoringRequired ? '1' : '0',
      wsSessionId: state.wsSessionId ?? '',
    });
    await this.redis.expire(key, ttlSec);
  }

  /**
   * Lấy session state.
   */
  async getSession(attemptId: string): Promise<SessionState | null> {
    const raw = await this.redis.hgetall(this.sessionKey(attemptId));
    if (!raw || !raw.attemptId) return null;
    return {
      attemptId: raw.attemptId,
      userId: raw.userId,
      examId: raw.examId,
      status: raw.status as SessionState['status'],
      deadlineEpochMs: Number(raw.deadlineEpochMs),
      screenRecordEnabled: raw.screenRecordEnabled === '1',
      proctoringRequired: raw.proctoringRequired === '1',
      wsSessionId: raw.wsSessionId || undefined,
    };
  }

  /**
   * Update status nhanh (vd: khi submit).
   */
  async updateStatus(attemptId: string, status: SessionState['status']): Promise<void> {
    await this.redis.hset(this.sessionKey(attemptId), { status });
  }

  /**
   * Xoá session khỏi Redis (sau khi submit xong, optional).
   */
  async deleteSession(attemptId: string): Promise<void> {
    await this.redis.del(
      this.sessionKey(attemptId),
      this.timerKey(attemptId),
      this.wsStudentKey(attemptId),
    );
  }

  // ========== timer (deadline) ==========

  /**
   * Lưu deadline dạng epoch ms. Server authoritative timer.
   */
  async setDeadline(attemptId: string, deadlineEpochMs: number, ttlSec: number): Promise<void> {
    await this.redis.set(this.timerKey(attemptId), String(deadlineEpochMs), 'EX', ttlSec);
  }

  async getDeadline(attemptId: string): Promise<number | null> {
    const raw = await this.redis.get(this.timerKey(attemptId));
    return raw ? Number(raw) : null;
  }

  // ========== WS session tracking ==========

  async setStudentWsSession(attemptId: string, wsSessionId: string, ttlSec: number): Promise<void> {
    await this.redis.set(this.wsStudentKey(attemptId), wsSessionId, 'EX', ttlSec);
  }

  async getStudentWsSession(attemptId: string): Promise<string | null> {
    return this.redis.get(this.wsStudentKey(attemptId));
  }

  // ========== distributed lock (auto-submit) ==========

  /**
   * Acquire lock với TTL. Trả về true nếu thành công.
   *
   * Pattern: `SET key token NX EX ttl`
   * - token: unique per request để release đúng lock
   * - NX: chỉ set nếu chưa tồn tại
   * - EX: TTL auto-release tránh deadlock
   */
  async acquireSubmitLock(attemptId: string, token: string, ttlSec = 30): Promise<boolean> {
    const result = await this.redis.set(this.submitLockKey(attemptId), token, 'EX', ttlSec, 'NX');
    return result === 'OK';
  }

  /**
   * Release lock (chỉ release nếu token khớp — Lua script để atomic).
   */
  async releaseSubmitLock(attemptId: string, token: string): Promise<void> {
    const lua = `
      if redis.call("get", KEYS[1]) == ARGV[1] then
        return redis.call("del", KEYS[1])
      else
        return 0
      end
    `;
    await this.redis.eval(lua, 1, this.submitLockKey(attemptId), token);
  }
}