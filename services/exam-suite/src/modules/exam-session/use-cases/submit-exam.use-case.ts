import { ConflictException, ForbiddenException, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import { ExamSessionRepository } from '../exam-session.repository';
import { SessionCacheService } from '../session-cache.service';

export const SUBMIT_EXAM_USE_CASE = Symbol('SUBMIT_EXAM_USE_CASE');
export interface ISubmitExamUseCase {
  /**
   * Submit attempt chủ động (BR-008).
   * Đã submit rồi thì return submission hiện có (idempotent).
   */
  execute(userId: string, attemptId: string, kind: 'MANUAL' | 'TIMEOUT' | 'AUTO_FLAG'): Promise<{
    submissionId: string;
    submissionKind: string;
    flagged: boolean;
  }>;
}

/**
 * UseCase: Submit exam (manual / timeout / auto-flag).
 *
 * Flow:
 * 1. Validate ownership + status
 * 2. Acquire distributed lock (race condition với auto-submit)
 * 3. Double-check status (sau khi acquire lock)
 * 4. Transaction: update attempt + insert submission + publish Kafka event
 * 5. Release lock + cleanup session cache
 *
 * Idempotent: nếu đã submit → return submission hiện có.
 *
 * Manual submit THẮNG auto-submit (L3): nếu đang giữ lock manual,
 * auto-submit phải đợi → manual set status trước → auto-submit thấy
 * status=SUBMITTED → skip.
 */
@Injectable()
export class SubmitExamUseCase implements ISubmitExamUseCase {
  private readonly logger = new Logger(SubmitExamUseCase.name);

  constructor(
    private readonly repository: ExamSessionRepository,
    private readonly sessionCache: SessionCacheService,
  ) {}

  async execute(
    userId: string,
    attemptId: string,
    kind: 'MANUAL' | 'TIMEOUT' | 'AUTO_FLAG',
  ) {
    // 0. Idempotency check
    const existing = await this.repository.findSubmissionByAttempt(attemptId);
    if (existing) {
      this.logger.warn(`[submit-exam] already submitted attempt=${attemptId}`);
      const attempt = await this.repository.findAttemptById(attemptId);
      return {
        submissionId: existing.id,
        submissionKind: attempt?.submissionKind ?? 'UNKNOWN',
        flagged: attempt?.flag ?? false,
      };
    }

    // 1. Validate ownership + status
    const attempt = await this.repository.findAttemptById(attemptId);
    if (!attempt) {
      throw new NotFoundException('Attempt không tồn tại');
    }
    // AUTO_FLAG và TIMEOUT không cần check userId (system-driven)
    if (kind === 'MANUAL' && attempt.userId !== userId) {
      throw new ForbiddenException('Bạn không có quyền với attempt này');
    }
    if (attempt.status !== 'IN_PROGRESS') {
      throw new ConflictException(`Attempt đã ở trạng thái ${attempt.status}`);
    }

    // 2. Acquire distributed lock
    const lockToken = randomUUID();
    const acquired = await this.sessionCache.acquireSubmitLock(attemptId, lockToken, 30);
    if (!acquired) {
      // Có người khác đang submit → thử idempotent check lại
      const reCheck = await this.repository.findSubmissionByAttempt(attemptId);
      if (reCheck) {
        return {
          submissionId: reCheck.id,
          submissionKind: attempt.submissionKind ?? 'UNKNOWN',
          flagged: attempt.flag,
        };
      }
      throw new ConflictException('Có tiến trình submit khác đang chạy, vui lòng thử lại');
    }

    try {
      // 3. Double-check status sau khi acquire lock
      const reloaded = await this.repository.findAttemptById(attemptId);
      if (!reloaded || reloaded.status !== 'IN_PROGRESS') {
        throw new ConflictException('Attempt đã được submit bởi tiến trình khác');
      }

      // 4. Transaction: update attempt + insert submission + snapshot answers
      const submission = await this.repository.withTransaction(async (manager) => {
        const answers = await this.repository.getAnswersSnapshot(attemptId);
        const submission = await this.repository.createSubmission(
          {
            attemptId,
            answers,
            autoScore: 0,
            finalScore: null,
            gradedAt: null,
          },
          manager,
        );

        await this.repository.updateAttemptSubmission(attemptId, {
          status: 'SUBMITTED',
          submittedAt: new Date(),
          submissionKind: kind,
          flag: attempt.flag,
          flagReason: attempt.flagReason,
        });

        return submission;
      });

      // 5. Update session cache
      await this.sessionCache.updateStatus(attemptId, 'SUBMITTED');

      this.logger.log(
        `[submit-exam] attempt=${attemptId} kind=${kind} submission=${submission.id}`,
      );

      return {
        submissionId: submission.id,
        submissionKind: kind,
        flagged: attempt.flag,
      };
    } finally {
      // 6. Always release lock
      await this.sessionCache.releaseSubmitLock(attemptId, lockToken);
    }
  }
}