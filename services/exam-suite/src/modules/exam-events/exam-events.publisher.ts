import { Injectable, Inject } from '@nestjs/common';
import { EntityManager } from 'typeorm';
import { StructuredLogger } from '@ioes/common-node';
import {
  OutboxService,
  EventPublisher,
  EXAM_EVENT_TYPES,
  EXAM_KAFKA_TOPICS,
  EXAM_STARTED_VERSION,
  EXAM_SUBMITTED_VERSION,
  EXAM_GRADED_VERSION,
  ExamStartedPayload,
  ExamSubmittedPayload,
  ExamGradedPayload,
} from '@ioes/common-node';

/**
 * ExamEventsPublisher - typed publisher cho exam events.
 *
 * Theo ADR-006 (Service Integration):
 * - Publish vào outbox trong transaction (atomic với business logic)
 * - Background worker (OutboxService) poll + publish to Kafka
 *
 * @example
 * ```ts
 * // Trong ExamService.startExam():
 * await this.dataSource.transaction(async (em) => {
 *   const attempt = await em.save(Attempt, {...});
 *   await this.examEvents.publishStartedInTx(em, {
 *     examId: attempt.examId,
 *     attemptId: attempt.id,
 *     userId,
 *     startedAt: attempt.startedAt.toISOString(),
 *     expiresAt: attempt.expiresAt.toISOString(),
 *     durationMinutes: exam.durationMinutes,
 *     totalQuestions: exam.totalQuestions,
 *   });
 * });
 * ```
 */
@Injectable()
export class ExamEventsPublisher {
  private readonly logger = new StructuredLogger(ExamEventsPublisher.name);

  constructor(
    private readonly outbox: OutboxService,
    private readonly envelopeBuilder: EventPublisher,
  ) {}

  /**
   * Publish ExamStarted event (in transaction).
   */
  async publishStartedInTx(
    em: EntityManager,
    payload: ExamStartedPayload,
    correlationId?: string,
  ): Promise<void> {
    const envelope = this.envelopeBuilder.buildEnvelope(
      EXAM_EVENT_TYPES.EXAM_STARTED,
      'Exam',
      payload.examId,
      EXAM_STARTED_VERSION,
      payload,
      correlationId,
    );

    await this.outbox.enqueueInTx(em, EXAM_KAFKA_TOPICS.EXAM_EVENTS, envelope);

    this.logger.debug(`Enqueued ExamStarted id=${envelope.eventId} examId=${payload.examId}`);
  }

  /**
   * Publish ExamSubmitted event (in transaction).
   */
  async publishSubmittedInTx(
    em: EntityManager,
    payload: ExamSubmittedPayload,
    correlationId?: string,
  ): Promise<void> {
    const envelope = this.envelopeBuilder.buildEnvelope(
      EXAM_EVENT_TYPES.EXAM_SUBMITTED,
      'Exam',
      payload.examId,
      EXAM_SUBMITTED_VERSION,
      payload,
      correlationId,
    );

    await this.outbox.enqueueInTx(em, EXAM_KAFKA_TOPICS.EXAM_EVENTS, envelope);

    this.logger.debug(`Enqueued ExamSubmitted id=${envelope.eventId} examId=${payload.examId}`);
  }

  /**
   * Publish ExamGraded event (in transaction).
   */
  async publishGradedInTx(
    em: EntityManager,
    payload: ExamGradedPayload,
    correlationId?: string,
  ): Promise<void> {
    const envelope = this.envelopeBuilder.buildEnvelope(
      EXAM_EVENT_TYPES.EXAM_GRADED,
      'Exam',
      payload.examId,
      EXAM_GRADED_VERSION,
      payload,
      correlationId,
    );

    await this.outbox.enqueueInTx(em, EXAM_KAFKA_TOPICS.EXAM_EVENTS, envelope);

    this.logger.debug(`Enqueued ExamGraded id=${envelope.eventId} examId=${payload.examId} score=${payload.score}`);
  }
}
