import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import {
  KafkaConsumer,
  EventEnvelope,
  QuestionEventPayload,
  QuestionDeletedPayload,
  KAFKA_TOPICS,
  KAFKA_GROUPS,
  createLogger,
} from '@ioes/common-node';
import { DgraphClient } from './dgraph.client';
import { ProcessedEvent } from './entities/processed-event.entity';
import {
  UPSERT_QUESTION_MUTATION,
  SOFT_DELETE_QUESTION_MUTATION,
} from './graphql/queries';

/**
 * Claim outcome - cho atomic idempotency check.
 */
type ClaimResult = 'CLAIMED' | 'ALREADY_PROCESSED';

@Injectable()
export class DgraphSyncConsumer {
  private readonly logger = createLogger(DgraphSyncConsumer.name);
  private readonly consumerGroup: string;
  private readonly consumerId: string;

  constructor(
    private readonly dgraph: DgraphClient,
    private readonly kafkaConsumer: KafkaConsumer,
    @InjectRepository(ProcessedEvent)
    private readonly processedRepo: Repository<ProcessedEvent>,
    cfg: ConfigService,
  ) {
    this.consumerId =
      cfg.get<string>('CONSUMER_ID') ?? 'exam-suite-dgraph-sync';
    this.consumerGroup =
      cfg.get<string>('CONSUMER_GROUP') ?? KAFKA_GROUPS.EXAM_SUITE;

    this.subscribeAll();
  }

  async start(): Promise<void> {
    await this.kafkaConsumer.start();
  }

  private subscribeAll(): void {
    this.kafkaConsumer.subscribe<QuestionEventPayload>(
      KAFKA_TOPICS.QUESTION_CREATED,
      (envelope) => this.handleUpsert(envelope),
      { groupId: this.consumerGroup, fromBeginning: false },
    );

    this.kafkaConsumer.subscribe<QuestionEventPayload>(
      KAFKA_TOPICS.QUESTION_UPDATED,
      (envelope) => this.handleUpsert(envelope),
      { groupId: this.consumerGroup, fromBeginning: false },
    );

    this.kafkaConsumer.subscribe<QuestionEventPayload>(
      KAFKA_TOPICS.QUESTION_PUBLISHED,
      (envelope) => this.handleUpsert(envelope),
      { groupId: this.consumerGroup, fromBeginning: false },
    );

    this.kafkaConsumer.subscribe<QuestionDeletedPayload>(
      KAFKA_TOPICS.QUESTION_DELETED,
      (envelope) => this.handleDelete(envelope),
      { groupId: this.consumerGroup, fromBeginning: false },
    );

    this.logger.log(
      `DgraphSyncConsumer registered 4 subscriptions on group ${this.consumerGroup}`,
    );
  }

  /**
   * BUG #37 fix: Claim event ATOMICALLY trước khi xử lý.
   *
   * Dùng PostgreSQL `INSERT ... ON CONFLICT DO NOTHING`:
   * - Nếu eventId chưa tồn tại → INSERT thành công → claim được → xử lý
   * - Nếu đã tồn tại → INSERT bị skip → không claim → skip
   *
   * Đây là pattern "atomic claim" - loại bỏ TOCTOU race giữa
   * `isAlreadyProcessed` SELECT và `markProcessed` INSERT.
   *
   * Thêm column `status` ('processing' | 'completed') và TTL để cleanup
   * stuck claims.
   */
  private async claimEvent(
    envelope: EventEnvelope,
  ): Promise<ClaimResult> {
    try {
      const result = await this.processedRepo
        .createQueryBuilder()
        .insert()
        .into(ProcessedEvent)
        .values({
          eventId: envelope.eventId,
          eventType: envelope.eventType,
          aggregateId: envelope.aggregateId,
          aggregateType: envelope.aggregateType,
        })
        .orIgnore() // PostgreSQL ON CONFLICT DO NOTHING
        .execute();

      // Nếu affected = 0 → đã có → duplicate
      // Nếu affected = 1 → insert mới → claim thành công
      const claimed = (result.identifiers?.length ?? 0) > 0;

      if (!claimed) {
        return 'ALREADY_PROCESSED';
      }
      return 'CLAIMED';
    } catch (err) {
      this.logger.error(
        `Claim failed for eventId=${envelope.eventId}: ${(err as Error).message}`,
      );
      throw err;
    }
  }

  /**
   * Handle upsert events với atomic claim.
   */
  private async handleUpsert(
    envelope: EventEnvelope<QuestionEventPayload>,
  ): Promise<void> {
    const claim = await this.claimEvent(envelope);
    if (claim === 'ALREADY_PROCESSED') {
      this.logger.debug(
        `Skip duplicate upsert eventId=${envelope.eventId} questionId=${envelope.payload.id}`,
      );
      return;
    }

    const p = envelope.payload;
    const input = {
      id: p.id,
      questionText: p.questionText,
      questionType: p.questionType,
      difficulty: p.difficulty,
      points: p.points,
      language: p.language,
      hint: p.hint,
      explanation: p.explanation,
      estimatedTimeSeconds: p.estimatedTimeSeconds,
      tags: p.tags,
      topic: p.topicId ? { id: p.topicId } : undefined,
      requiresSkills: p.skillIds?.map((id) => ({ id })),
      prerequisites: p.prerequisites?.map((id) => ({ id })),
      publishedAt: p.publishedAt,
      createdBy: p.createdBy,
      updatedBy: p.updatedBy,
      createdAt: p.createdAt,
      updatedAt: p.updatedAt,
    };

    try {
      await this.dgraph.query(UPSERT_QUESTION_MUTATION, { input });
      this.logger.debug(
        `Upserted ${envelope.eventType} id=${envelope.eventId} questionId=${p.id}`,
      );
    } catch (err) {
      // Claim succeeded but Dgraph failed → throw để retry
      // Cần cleanup claim để lần retry có thể claim lại
      // Option A: leave claim, retry sẽ skip (BAD)
      // Option B: delete claim on failure (CHOSEN)
      await this.releaseClaim(envelope.eventId).catch((releaseErr) =>
        this.logger.error(
          `Failed to release claim after Dgraph error: ${(releaseErr as Error).message}`,
        ),
      );
      this.logger.error(
        `Failed to upsert question ${p.id} from event ${envelope.eventId}: ${(err as Error).message}`,
      );
      throw err;
    }
  }

  private async handleDelete(
    envelope: EventEnvelope<QuestionDeletedPayload>,
  ): Promise<void> {
    const claim = await this.claimEvent(envelope);
    if (claim === 'ALREADY_PROCESSED') {
      this.logger.debug(
        `Skip duplicate delete eventId=${envelope.eventId}`,
      );
      return;
    }

    const p = envelope.payload;

    try {
      await this.dgraph.query(SOFT_DELETE_QUESTION_MUTATION, {
        id: p.id,
        now: p.deletedAt,
      });
      this.logger.debug(
        `Soft-deleted questionId=${p.id} eventId=${envelope.eventId}`,
      );
    } catch (err) {
      await this.releaseClaim(envelope.eventId).catch((releaseErr) =>
        this.logger.error(
          `Failed to release claim after Dgraph error: ${(releaseErr as Error).message}`,
        ),
      );
      this.logger.error(
        `Failed to soft-delete question ${p.id}: ${(err as Error).message}`,
      );
      throw err;
    }
  }

  /**
   * Release claim khi xử lý fail → cho phép retry claim lại.
   * BUG #37 fix: không release → failed events bị stuck vĩnh viễn.
   */
  private async releaseClaim(eventId: string): Promise<void> {
    await this.processedRepo.delete({ eventId });
  }
}