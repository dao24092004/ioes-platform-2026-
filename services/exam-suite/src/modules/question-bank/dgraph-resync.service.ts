import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In } from 'typeorm';
import {
  UserPrincipalDto,
  createLogger,
  buildEventEnvelope,
  EVENT_TYPES,
  KAFKA_TOPICS,
  QuestionEventPayload,
  EventEnvelope,
} from '@ioes/common-node';
import { Question } from './entities/question.entity';
import { OutboxEvent } from './entities/outbox-event.entity';
import { DataSource } from 'typeorm';

/**
 * DgraphResyncService - force re-sync toàn bộ questions sang Dgraph.
 *
 * Use cases:
 * - Dgraph down/lost data → admin trigger full resync
 * - Schema migration (predicate rename) → re-emit all events
 * - Manual reconciliation sau disaster recovery
 *
 * Flow:
 * 1. Query all active questions từ PostgreSQL (paginated)
 * 2. Mỗi batch → INSERT outbox events (QuestionResynced)
 * 3. OutboxWorker publish events → Kafka → DgraphSyncConsumer
 *
 * **Rate limiting**: batch size 100, sleep 100ms giữa các batch
 * để không overwhelm Kafka/Dgraph.
 *
 * **Audit**: mỗi lần resync tạo 1 record trong `dgraph_resync_audit`
 * table (TODO Phase 3).
 */
export interface ResyncResult {
  totalQuestions: number;
  batchCount: number;
  durationMs: number;
  startedAt: Date;
  completedAt: Date;
  triggeredBy: string;
  reason?: string;
}

export interface ResyncOptions {
  /** Only resync questions updated after this date */
  since?: Date;
  /** Limit total questions (testing) */
  limit?: number;
  /** Specific question IDs */
  ids?: string[];
  /** Reason for audit log */
  reason?: string;
}

@Injectable()
export class DgraphResyncService {
  private readonly logger = createLogger(DgraphResyncService.name);
  private readonly batchSize = 100;

  constructor(
    @InjectRepository(Question)
    private readonly questionRepo: Repository<Question>,
    private readonly dataSource: DataSource,
  ) {}

  /**
   * Trigger bulk re-sync all questions → Dgraph.
   *
   * WARNING: operation này sinh rất nhiều Kafka messages.
   * Chỉ dành cho admin operations.
   */
  async resyncAll(
    user: UserPrincipalDto,
    options: ResyncOptions = {},
  ): Promise<ResyncResult> {
    const startTime = Date.now();
    const startedAt = new Date();

    if (!user.roles?.includes('ADMIN')) {
      throw new Error('Only ADMIN can trigger resync');
    }

    this.logger.warn(
      `Resync triggered by ${user.userId}: options=${JSON.stringify(options)}`,
    );

    // Build query
    const qb = this.questionRepo
      .createQueryBuilder('q')
      .where('q.deletedAt IS NULL');

    if (options.since) {
      qb.andWhere('q.updatedAt >= :since', { since: options.since });
    }
    if (options.ids && options.ids.length > 0) {
      qb.andWhere({ id: In(options.ids) });
    }
    if (options.limit) {
      qb.limit(options.limit);
    }

    const total = await qb.getCount();
    this.logger.log(`Found ${total} questions to resync`);

    let batchCount = 0;
    let processed = 0;

    for (let offset = 0; offset < total; offset += this.batchSize) {
      const batch = await qb
        .clone()
        .offset(offset)
        .limit(this.batchSize)
        .getMany();

      if (batch.length === 0) break;

      await this.dataSource.transaction(async (manager) => {
        for (const q of batch) {
          const envelope: EventEnvelope<QuestionEventPayload> = buildEventEnvelope({
            eventType: EVENT_TYPES.QUESTION_UPDATED, // Resync dùng event UPDATE
            aggregateId: q.id,
            aggregateType: 'Question',
            source: 'exam-suite-resync',
            payload: this.toEventPayload(q),
            correlationId: `resync-${Date.now()}`,
          });

          const outbox = manager.create(OutboxEvent, {
            eventId: envelope.eventId,
            eventType: envelope.eventType,
            eventVersion: envelope.eventVersion,
            topic: KAFKA_TOPICS.QUESTION_UPDATED,
            aggregateId: envelope.aggregateId,
            aggregateType: envelope.aggregateType,
            source: envelope.source,
            correlationId: envelope.correlationId,
            payload: envelope.payload as unknown as Record<string, unknown>,
            status: 'PENDING',
            attempts: 0,
          });
          await manager.save(OutboxEvent, outbox);
        }
      });

      batchCount++;
      processed += batch.length;

      // Rate limit: sleep 100ms giữa batches
      if (processed < total) {
        await this.sleep(100);
      }
    }

    const completedAt = new Date();
    const result: ResyncResult = {
      totalQuestions: total,
      batchCount,
      durationMs: Date.now() - startTime,
      startedAt,
      completedAt,
      triggeredBy: user.userId,
      reason: options.reason,
    };

    this.logger.warn(
      `Resync COMPLETED: total=${total} batches=${batchCount} duration=${result.durationMs}ms`,
    );

    return result;
  }

  /**
   * Resync single question (testing/manual fix).
   */
  async resyncOne(
    questionId: string,
    user: UserPrincipalDto,
  ): Promise<{ eventId: string }> {
    const question = await this.questionRepo.findOne({
      where: { id: questionId },
    });
    if (!question) {
      throw new Error(`Question ${questionId} not found`);
    }

    return this.dataSource.transaction(async (manager) => {
      const envelope = buildEventEnvelope<QuestionEventPayload>({
        eventType: EVENT_TYPES.QUESTION_UPDATED,
        aggregateId: question.id,
        aggregateType: 'Question',
        source: 'exam-suite-resync-single',
        payload: this.toEventPayload(question),
        correlationId: `resync-${Date.now()}`,
      });

      const outbox = manager.create(OutboxEvent, {
        eventId: envelope.eventId,
        eventType: envelope.eventType,
        eventVersion: envelope.eventVersion,
        topic: KAFKA_TOPICS.QUESTION_UPDATED,
        aggregateId: envelope.aggregateId,
        aggregateType: envelope.aggregateType,
        source: envelope.source,
        correlationId: envelope.correlationId,
        payload: envelope.payload as unknown as Record<string, unknown>,
        status: 'PENDING',
        attempts: 0,
      });
      await manager.save(OutboxEvent, outbox);

      this.logger.info(
        `Resync queued for question=${questionId} by ${user.userId}`,
      );

      return { eventId: envelope.eventId };
    });
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

  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}
