import { Inject, Injectable, Logger } from '@nestjs/common';
import { KAFKA_TOPICS } from '@ioes/common-node';
import { StartAttemptRequestDto, StartAttemptResponseDto } from './dto/start-attempt.dto';
import { AnswerSaveRequestDto, AnswerBulkSaveRequestDto } from './dto/answer-save.dto';
import { ExamSessionRepository } from './exam-session.repository';
import { SessionCacheService } from './session-cache.service';
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
    @Inject(START_EXAM_USE_CASE) private readonly startExam: IStartExamUseCase,
    @Inject(SAVE_ANSWER_USE_CASE) private readonly saveAnswer: ISaveAnswerUseCase,
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
    return this.saveAnswer.execute(userId, dto);
  }

  /**
   * [WS] Auto-save nhiều câu (reconnect).
   */
  async bulkSaveAnswers(userId: string, dto: AnswerBulkSaveRequestDto) {
    const results: Array<{ questionId: string; savedAt: Date }> = [];
    for (const a of dto.answers) {
      const r = await this.saveAnswer.execute(userId, a);
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
}