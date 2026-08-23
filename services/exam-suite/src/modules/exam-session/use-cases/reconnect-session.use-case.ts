import { ForbiddenException, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { ExamSessionRepository } from '../exam-session.repository';
import { SessionCacheService } from '../session-cache.service';

export const RECONNECT_SESSION_USE_CASE = Symbol('RECONNECT_SESSION_USE_CASE');
export interface IReconnectSessionUseCase {
  /**
   * Khôi phục session sau khi client mất kết nối WebSocket tạm thời.
   * Trả về state hiện tại + tất cả drafts đã save để client merge.
   */
  execute(userId: string, attemptId: string): Promise<{
    attemptId: string;
    deadlineEpochMs: number;
    remainingMs: number;
    drafts: Array<{ questionId: string; answer: unknown; savedAt: Date }>;
  }>;
}

/**
 * UseCase: Reconnect session (UC_008 exception 5e).
 *
 * Client gọi sau khi WebSocket reconnect thành công.
 * Server trả:
 * - deadline còn lại (server authoritative timer)
 * - tất cả drafts đã save (client merge với IndexedDB local)
 *
 * Nếu deadline đã qua → throw, client sẽ nhận exam:auto-submitted.
 */
@Injectable()
export class ReconnectSessionUseCase implements IReconnectSessionUseCase {
  private readonly logger = new Logger(ReconnectSessionUseCase.name);

  constructor(
    private readonly repository: ExamSessionRepository,
    private readonly sessionCache: SessionCacheService,
  ) {}

  async execute(userId: string, attemptId: string) {
    // 1. Validate ownership + status
    const attempt = await this.repository.findAttemptById(attemptId);
    if (!attempt) {
      throw new NotFoundException('Attempt không tồn tại');
    }
    if (attempt.userId !== userId) {
      throw new ForbiddenException('Bạn không có quyền với attempt này');
    }
    if (attempt.status !== 'IN_PROGRESS') {
      throw new ForbiddenException(
        `Phiên thi đã kết thúc (status=${attempt.status})`,
      );
    }

    // 2. Lấy deadline từ Redis (authoritative)
    const cachedDeadline = await this.sessionCache.getDeadline(attemptId);
    const deadlineEpochMs = cachedDeadline ?? attempt.deadlineAt.getTime();
    const remainingMs = deadlineEpochMs - Date.now();

    if (remainingMs <= 0) {
      throw new ForbiddenException(
        'Đã hết giờ — bài thi sẽ tự động nộp theo dữ liệu đã lưu',
      );
    }

    // 3. Lấy tất cả drafts
    const drafts = await this.repository.findDraftsByAttempt(attemptId);

    this.logger.log(
      `[reconnect] attempt=${attemptId} remaining=${remainingMs}ms drafts=${drafts.length}`,
    );

    return {
      attemptId,
      deadlineEpochMs,
      remainingMs,
      drafts: drafts.map((d) => ({
        questionId: d.questionId,
        answer: d.answer,
        savedAt: d.savedAt,
      })),
    };
  }
}