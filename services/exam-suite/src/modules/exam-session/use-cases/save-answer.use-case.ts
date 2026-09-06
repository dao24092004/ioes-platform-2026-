import { ForbiddenException, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { AnswerSaveRequestDto } from '../dto/answer-save.dto';
import { ExamSessionRepository } from '../exam-session.repository';
import { SessionCacheService } from '../session-cache.service';

export const SAVE_ANSWER_USE_CASE = Symbol.for('SAVE_ANSWER_USE_CASE');
export interface ISaveAnswerUseCase {
  execute(userId: string, dto: AnswerSaveRequestDto): Promise<{ savedAt: Date }>;
}

/**
 * UseCase: Auto-save draft (BR-012).
 *
 * Flow:
 * 1. Validate attempt thuộc user + status=IN_PROGRESS
 * 2. Validate chưa hết giờ (deadline > now)
 * 3. Upsert draft vào Postgres
 * 4. Trả savedAt
 *
 * Rate limiting: thực hiện ở WS layer (token bucket 1 Hz).
 * Idempotency: (attemptId, questionId) unique → save lại = ghi đè.
 */
@Injectable()
export class SaveAnswerUseCase implements ISaveAnswerUseCase {
  private readonly logger = new Logger(SaveAnswerUseCase.name);

  constructor(
    private readonly repository: ExamSessionRepository,
    private readonly sessionCache: SessionCacheService,
  ) {}

  async execute(
    userId: string,
    dto: AnswerSaveRequestDto,
  ): Promise<{ savedAt: Date }> {
    // 1. Validate ownership + status
    const attempt = await this.repository.findAttemptById(dto.attemptId);
    if (!attempt) {
      throw new NotFoundException('Attempt không tồn tại');
    }
    if (attempt.userId !== userId) {
      throw new ForbiddenException('Bạn không có quyền với attempt này');
    }
    if (attempt.status !== 'IN_PROGRESS') {
      throw new ForbiddenException('Phiên thi đã kết thúc');
    }

    // 2. Check deadline (BR-008: timer không pause)
    const now = Date.now();
    if (attempt.deadlineAt.getTime() <= now) {
      throw new ForbiddenException('Đã hết giờ — không thể lưu câu trả lời');
    }

    // 3. Double-check deadline từ Redis (server authoritative)
    const cachedDeadline = await this.sessionCache.getDeadline(dto.attemptId);
    if (cachedDeadline !== null && cachedDeadline <= now) {
      throw new ForbiddenException('Đã hết giờ');
    }

    // 4. Upsert draft
    const saved = await this.repository.upsertDraft({
      attemptId: dto.attemptId,
      questionId: dto.questionId,
      answer: dto.answer,
      clientTs: dto.clientTs ? new Date(dto.clientTs) : null,
    });

    this.logger.debug(
      `[save-answer] attempt=${dto.attemptId} question=${dto.questionId}`,
    );
    return { savedAt: saved.savedAt };
  }
}