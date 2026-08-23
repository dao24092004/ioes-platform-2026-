import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository, EntityManager } from 'typeorm';
import {
  BusinessException,
  UserPrincipalDto,
  ERROR_CODES,
  KafkaProducer,
  KAFKA_TOPICS,
  EVENT_TYPES,
  buildEventEnvelope,
  QuestionEventPayload,
  QuestionDeletedPayload,
  QuestionStatus,
  createLogger,
  EventEnvelope,
} from '@ioes/common-node';
import { Question } from './entities/question.entity';
import { OutboxEvent } from './entities/outbox-event.entity';
import { CreateQuestionDto } from './dto/create-question.dto';
import { UpdateQuestionDto } from './dto/update-question.dto';

/**
 * QuestionWriteService với **Transactional Outbox Pattern**.
 *
 * Flow:
 * 1. Mở transaction
 * 2. INSERT/UPDATE question trong PostgreSQL
 * 3. INSERT OutboxEvent vào cùng transaction
 * 4. Commit transaction (DB + outbox atomic)
 * 5. OutboxWorker (background) sẽ publish events sang Kafka
 *
 * Benefits:
 * - DB write + event log atomic (không thể lệch)
 * - Kafka down → vẫn không mất event (lưu trong outbox)
 * - Retry tự động bởi worker với exponential backoff
 * - Manual intervention được qua SELECT * FROM outbox_events WHERE status='FAILED'
 */
@Injectable()
export class QuestionWriteService {
  private readonly logger = createLogger(QuestionWriteService.name);

  constructor(
    @InjectRepository(Question)
    private readonly questionRepo: Repository<Question>,
    private readonly dataSource: DataSource,
    // KafkaProducer không dùng trực tiếp nữa - chỉ type reference cho tests
    // OutboxWorker sẽ dùng KafkaProducer thực sự
    private readonly _producer: KafkaProducer,
  ) {}

  async create(
    dto: CreateQuestionDto,
    user: UserPrincipalDto,
    correlationId: string,
  ): Promise<Question> {
    return this.dataSource.transaction(async (manager) => {
      const repo = manager.getRepository(Question);

      // Duplicate check
      const existing = await repo.findOne({
        where: { questionText: dto.questionText, topicId: dto.topicId },
      });
      if (existing) {
        throw BusinessException.alreadyExists(
          'Question',
          'questionText',
          dto.questionText,
        );
      }

      const question = repo.create({
        ...dto,
        status: dto.status ?? QuestionStatus.DRAFT,
        createdBy: user.userId,
        updatedBy: user.userId,
      });
      const saved = await repo.save(question);

      // Outbox event - cùng transaction
      await this.saveOutboxEvent(
        manager,
        KAFKA_TOPICS.QUESTION_CREATED,
        EVENT_TYPES.QUESTION_CREATED,
        saved,
        user,
        correlationId,
      );

      this.logger.info(
        `Created question id=${saved.id} by ${user.userId} topic=${dto.topicId}`,
      );
      return saved;
    });
  }

  async update(
    id: string,
    dto: UpdateQuestionDto,
    user: UserPrincipalDto,
    correlationId: string,
  ): Promise<Question> {
    return this.dataSource.transaction(async (manager) => {
      const repo = manager.getRepository(Question);
      const existing = await repo.findOne({ where: { id } });
      if (!existing) {
        throw BusinessException.notFound('Question', id);
      }

      // Optimistic lock
      if (dto.etag && existing.version.toString() !== dto.etag) {
        throw BusinessException.conflict(
          'Question has been modified by another request',
          { currentVersion: existing.version, providedVersion: dto.etag },
        );
      }

      Object.assign(existing, dto, { updatedBy: user.userId });
      const updated = await repo.save(existing);

      await this.saveOutboxEvent(
        manager,
        KAFKA_TOPICS.QUESTION_UPDATED,
        EVENT_TYPES.QUESTION_UPDATED,
        updated,
        user,
        correlationId,
      );

      this.logger.info(`Updated question id=${updated.id} by ${user.userId}`);
      return updated;
    });
  }

  async softDelete(
    id: string,
    user: UserPrincipalDto,
    correlationId: string,
  ): Promise<void> {
    return this.dataSource.transaction(async (manager) => {
      const repo = manager.getRepository(Question);
      const existing = await repo.findOne({ where: { id } });
      if (!existing) {
        throw BusinessException.notFound('Question', id);
      }

      await repo.softDelete(id);

      const payload: QuestionDeletedPayload = {
        id,
        deletedAt: new Date().toISOString(),
        deletedBy: user.userId,
      };

      await this.saveRawOutboxEvent(
        manager,
        KAFKA_TOPICS.QUESTION_DELETED,
        EVENT_TYPES.QUESTION_DELETED,
        id,
        payload,
        correlationId,
      );

      this.logger.info(`Soft-deleted question id=${id} by ${user.userId}`);
    });
  }

  async publish(
    id: string,
    user: UserPrincipalDto,
    correlationId: string,
  ): Promise<Question> {
    return this.dataSource.transaction(async (manager) => {
      const repo = manager.getRepository(Question);
      const existing = await repo.findOne({ where: { id } });
      if (!existing) {
        throw BusinessException.notFound('Question', id);
      }
      if (existing.status === QuestionStatus.PUBLISHED) {
        throw new BusinessException(
          ERROR_CODES.CONFLICT,
          'Question is already published',
        );
      }

      existing.status = QuestionStatus.PUBLISHED;
      existing.lastPublishedBy = user.userId;
      existing.publishedAt = new Date();
      existing.updatedBy = user.userId;
      const updated = await repo.save(existing);

      await this.saveOutboxEvent(
        manager,
        KAFKA_TOPICS.QUESTION_PUBLISHED,
        EVENT_TYPES.QUESTION_PUBLISHED,
        updated,
        user,
        correlationId,
      );

      this.logger.info(`Published question id=${id} by ${user.userId}`);
      return updated;
    });
  }

  // ========================================================================
  // Outbox helpers
  // ========================================================================

  /**
   * Lưu Question event vào outbox (cùng transaction với DB write).
   */
  private async saveOutboxEvent(
    manager: EntityManager,
    topic: string,
    eventType: string,
    q: Question,
    _user: UserPrincipalDto,
    correlationId: string,
  ): Promise<void> {
    const envelope: EventEnvelope<QuestionEventPayload> = buildEventEnvelope({
      eventType,
      aggregateId: q.id,
      aggregateType: 'Question',
      source: 'exam-suite',
      payload: this.toEventPayload(q),
      correlationId,
    });

    const outbox = manager.create(OutboxEvent, {
      eventId: envelope.eventId,
      eventType: envelope.eventType,
      eventVersion: envelope.eventVersion,
      topic,
      aggregateId: envelope.aggregateId,
      aggregateType: envelope.aggregateType,
      source: envelope.source,
      correlationId,
      payload: envelope.payload as unknown as Record<string, unknown>,
      status: 'PENDING',
      attempts: 0,
    });
    await manager.save(OutboxEvent, outbox);
  }

  /**
   * Lưu event với payload không phải Question (vd: QuestionDeleted).
   */
  private async saveRawOutboxEvent<P>(
    manager: EntityManager,
    topic: string,
    eventType: string,
    aggregateId: string,
    payload: P,
    correlationId: string,
  ): Promise<void> {
    const envelope = buildEventEnvelope<P>({
      eventType,
      aggregateId,
      aggregateType: 'Question',
      source: 'exam-suite',
      payload,
      correlationId,
    });

    const outbox = manager.create(OutboxEvent, {
      eventId: envelope.eventId,
      eventType: envelope.eventType,
      eventVersion: envelope.eventVersion,
      topic,
      aggregateId: envelope.aggregateId,
      aggregateType: envelope.aggregateType,
      source: envelope.source,
      correlationId,
      payload: envelope.payload as unknown as Record<string, unknown>,
      status: 'PENDING',
      attempts: 0,
    });
    await manager.save(OutboxEvent, outbox);
  }

  private toEventPayload(q: Question): QuestionEventPayload {
    return {
      id: q.id,
      questionText: q.questionText,
      questionType: q.questionType,
      difficulty: q.difficulty,
      points: q.points,
      language: q.language,
      hint: q.hint,
      explanation: q.explanation,
      estimatedTimeSeconds: q.estimatedTimeSeconds,
      tags: q.tags,
      topicId: q.topicId,
      skillIds: q.skillIds,
      prerequisites: q.prerequisites,
      publishedAt: q.publishedAt?.toISOString(),
      createdBy: q.createdBy,
      updatedBy: q.updatedBy,
      createdAt: q.createdAt.toISOString(),
      updatedAt: q.updatedAt.toISOString(),
    };
  }
}