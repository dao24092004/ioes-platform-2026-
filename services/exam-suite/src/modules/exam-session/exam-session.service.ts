import { Inject, Injectable, Logger } from '@nestjs/common';
import { KAFKA_TOPICS } from '@ioes/common-node';
import { StartAttemptRequestDto, StartAttemptResponseDto } from './dto/start-attempt.dto';
import { AnswerSaveRequestDto } from './dto/answer-save.dto';
import { AnswerBulkSaveRequestDto } from './dto/reconnect.dto';
import { ExamSessionRepository } from './exam-session.repository';
import { SessionCacheService } from './session-cache.service';
import { ViolationCounterService } from './services/violation-counter.service';
import {
  IStartExamUseCase,
  START_EXAM_USE_CASE,
} from './use-cases/start-exam.use-case';
import {
  ISaveAnswerUseCase,
  SAVE_ANSWER_USE_CASE,
} from './use-cases/save-answer.use-case';
import {
  ISubmitExamUseCase,
  SUBMIT_EXAM_USE_CASE,
} from './use-cases/submit-exam.use-case';
import {
  IReconnectSessionUseCase,
  RECONNECT_SESSION_USE_CASE,
} from './use-cases/reconnect-session.use-case';
import { KafkaPublisherService } from '../../common/kafka-publisher.service';

/**
 * Orchestrator cho exam-session module.
 *
 * Chỉ làm nhiệm vụ:
 * 1. Inject các use-case
 * 2. Sau khi use-case thành công → publish Kafka event (nếu cần)
 *
 * Controller / Gateway chỉ gọi service này, không gọi trực tiếp use-case.
 * Giúp dễ thêm side effects (event, metric, audit log) ở 1 chỗ.
 */
@Injectable()
export class ExamSessionService {
  private readonly logger = new Logger(ExamSessionService.name);

  constructor(
    private readonly repository: ExamSessionRepository,
    private readonly sessionCache: SessionCacheService,
    private readonly kafkaPublisher: KafkaPublisherService,
    private readonly violationCounter: ViolationCounterService,
    @Inject(START_EXAM_USE_CASE) private readonly startExam: IStartExamUseCase,
    @Inject(SAVE_ANSWER_USE_CASE) private readonly saveAnswerUc: ISaveAnswerUseCase,
    @Inject(SUBMIT_EXAM_USE_CASE) private readonly submitExam: ISubmitExamUseCase,
    @Inject(RECONNECT_SESSION_USE_CASE)
    private readonly reconnectSession: IReconnectSessionUseCase,
  ) {}

  /**
   * [REST + WS] Bắt đầu attempt.
   */
  async startAttempt(
    userId: string,
    dto: StartAttemptRequestDto,
  ): Promise<StartAttemptResponseDto> {
    const result = await this.startExam.execute(userId, dto);

    // Publish event ExamSessionStarted (async, không block response)
    void this.kafkaPublisher
      .publish(KAFKA_TOPICS.EXAM_STARTED, 'ExamSessionStarted', {
        attemptId: result.attemptId,
        examId: dto.examId,
        userId,
        deadlineEpochMs: result.deadlineEpochMs,
        proctoringRequired: result.proctoringRequired,
        screenRecordEnabled: result.screenRecordEnabled,
      })
      .catch((err) =>
        this.logger.error(`Failed to publish ExamSessionStarted: ${err}`),
      );

    return result;
  }

  /**
   * [WS] Auto-save 1 câu (BR-012).
   */
  async saveAnswer(userId: string, dto: AnswerSaveRequestDto) {
    return this.saveAnswerUc.execute(userId, dto);
  }

  /**
   * [WS] Auto-save nhiều câu (reconnect).
   */
  async bulkSaveAnswers(userId: string, dto: AnswerBulkSaveRequestDto) {
    const results: Array<{ questionId: string; savedAt: Date }> = [];
    for (const a of dto.answers) {
      const r = await this.saveAnswerUc.execute(userId, a);
      results.push({ questionId: a.questionId, savedAt: r.savedAt });
    }
    return { saved: results.length, items: results };
  }

  /**
   * [REST + WS] Manual submit.
   */
  async submitManually(userId: string, attemptId: string) {
    const result = await this.submitExam.execute(userId, attemptId, 'MANUAL');

    // Publish ExamSubmitted
    void this.kafkaPublisher
      .publish(KAFKA_TOPICS.EXAM_SUBMITTED, 'ExamSubmitted', {
        attemptId,
        submissionId: result.submissionId,
        submissionKind: 'MANUAL',
        userId,
      })
      .catch((err) =>
        this.logger.error(`Failed to publish ExamSubmitted: ${err}`),
      );

    return result;
  }

  /**
   * [System] Auto-submit do timeout hoặc vi phạm.
   * Dùng nội bộ, không expose REST.
   */
  async autoSubmit(attemptId: string, kind: 'TIMEOUT' | 'AUTO_FLAG') {
    const result = await this.submitExam.execute('', attemptId, kind);

    // Clear violations sau khi submit
    await this.violationCounter.clearAll(attemptId);

    void this.kafkaPublisher
      .publish(KAFKA_TOPICS.EXAM_SUBMITTED, 'ExamSubmitted', {
        attemptId,
        submissionId: result.submissionId,
        submissionKind: kind,
        flagged: result.flagged,
      })
      .catch((err) =>
        this.logger.error(`Failed to publish ExamSubmitted: ${err}`),
      );

    return result;
  }

  /**
   * [WS] Reconnect.
   */
  async reconnect(userId: string, attemptId: string) {
    return this.reconnectSession.execute(userId, attemptId);
  }

  /**
   * [REST] Lấy attempt.
   */
  async getAttempt(userId: string, attemptId: string) {
    const attempt = await this.repository.findAttemptById(attemptId);
    if (!attempt) return null;
    if (attempt.userId !== userId) return null; // ẩn existence
    return attempt;
  }

  /**
   * [UC_009 bước 2] List active attempts cho Instructor.
   * Phase 1: filter theo examId, không check ownership (giả định Instructor phụ trách mọi exam).
   * Phase 2 (sau): check Instructor có quyền với exam này không (qua exam.instructorIds).
   */
  async listActiveAttempts(examId: string, _instructorId: string) {
    return this.repository.listActiveAttempts(examId);
  }

  /**
   * [UC_009 bước 13] Report chi tiết 1 attempt cho Instructor.
   * FR-PROC-008: Trả về attempt info + violations từ Redis.
   *
   * Phase 1: violations từ Redis (violation_events list).
   * Phase 2 (sau): join với bảng proctoring_violation khi có migration.
   */
  async getProctoringReport(attemptId: string, _instructorId: string) {
    const attempt = await this.repository.findAttemptById(attemptId);
    if (!attempt) return null;

    // Lấy violations từ Redis
    const [violationEvents, totalCount] = await Promise.all([
      this.violationCounter.getEvents(attemptId),
      this.violationCounter.getCount(attemptId),
    ]);

    const submission = await this.repository.findSubmissionByAttempt(attemptId);

    return {
      attemptId: attempt.id,
      userId: attempt.userId,
      examId: attempt.examId,
      status: attempt.status,
      score: attempt.score,
      maxScore: attempt.maxScore,
      flag: attempt.flag,
      flagReason: attempt.flagReason,
      submissionKind: attempt.submissionKind,
      // FR-PROC-008: violations từ Redis
      violations: violationEvents,
      totalViolationCount: totalCount,
      // Phase 2: S3 presigned URL cho screen recording
      screenRecording: null,
      submission: submission ?? null,
    };
  }
}