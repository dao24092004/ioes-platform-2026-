import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import {
  KafkaConsumer,
  EventEnvelope,
  createLogger,
  ProcessedEvent,
  KAFKA_TOPICS,
} from '@ioes/common-node';
import { DgraphClient } from './dgraph.client';
import {
  UPSERT_TOPIC_MUTATION,
  DELETE_TOPIC_MUTATION,
} from './graphql/topic.queries';

/**
 * ADR-012: Topic Sync Consumer
 *
 * Consumes TopicCreated, TopicUpdated, TopicDeleted events
 * từ content-service và sync sang Dgraph (read-side cache).
 *
 * Idempotency: dùng atomic claim pattern (PostgreSQL ON CONFLICT DO NOTHING)
 * như DgraphSyncConsumer.
 */
type ClaimResult = 'CLAIMED' | 'ALREADY_PROCESSED';

export interface TopicPayload {
  id: string;
  name: string;
  slug: string;
  description?: string;
  parentTopicId?: string;
  level: number;
}

export interface TopicDeletedPayload {
  id: string;
  reason: string;
}

@Injectable()
export class TopicSyncConsumer {
  private readonly logger = createLogger(TopicSyncConsumer.name);
  private readonly consumerGroup: string;

  constructor(
    private readonly dgraph: DgraphClient,
    private readonly kafkaConsumer: KafkaConsumer,
    @InjectRepository(ProcessedEvent)
    private readonly processedRepo: Repository<ProcessedEvent>,
    cfg: ConfigService,
  ) {
    this.consumerGroup =
      cfg.get<string>('CONSUMER_GROUP') ?? 'exam-suite-topic-sync';

    this.subscribeAll();
  }

  async start(): Promise<void> {
    await this.kafkaConsumer.start();
  }

  private subscribeAll(): void {
    this.kafkaConsumer.subscribe<TopicPayload>(
      KAFKA_TOPICS.TOPIC_CREATED,
      (envelope) => this.handleUpsert(envelope),
      { groupId: this.consumerGroup, fromBeginning: false },
    );

    this.kafkaConsumer.subscribe<TopicPayload>(
      KAFKA_TOPICS.TOPIC_UPDATED,
      (envelope) => this.handleUpsert(envelope),
      { groupId: this.consumerGroup, fromBeginning: false },
    );

    this.kafkaConsumer.subscribe<TopicDeletedPayload>(
      KAFKA_TOPICS.TOPIC_DELETED,
      (envelope) => this.handleDelete(envelope),
      { groupId: this.consumerGroup, fromBeginning: false },
    );

    this.logger.log(
      `TopicSyncConsumer registered 3 subscriptions on group ${this.consumerGroup}`,
    );
  }

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
        .orIgnore()
        .execute();

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

  private async releaseClaim(eventId: string): Promise<void> {
    await this.processedRepo.delete({ eventId });
  }

  private async handleUpsert(
    envelope: EventEnvelope<TopicPayload>,
  ): Promise<void> {
    const claim = await this.claimEvent(envelope);
    if (claim === 'ALREADY_PROCESSED') {
      this.logger.debug(
        `Skip duplicate topic eventId=${envelope.eventId} topicId=${envelope.payload.id}`,
      );
      return;
    }

    const p = envelope.payload;
    const input = {
      id: p.id,
      name: p.name,
      slug: p.slug,
      description: p.description,
      parentTopic: p.parentTopicId ? { id: p.parentTopicId } : undefined,
      level: p.level,
    };

    try {
      await this.dgraph.query(UPSERT_TOPIC_MUTATION, { input });
      this.logger.debug(
        `Synced ${envelope.eventType} topicId=${p.id} eventId=${envelope.eventId}`,
      );
    } catch (err) {
      await this.releaseClaim(envelope.eventId).catch((releaseErr) =>
        this.logger.error(
          `Failed to release claim: ${(releaseErr as Error).message}`,
        ),
      );
      this.logger.error(
        `Failed to sync topic ${p.id}: ${(err as Error).message}`,
      );
      throw err;
    }
  }

  private async handleDelete(
    envelope: EventEnvelope<TopicDeletedPayload>,
  ): Promise<void> {
    const claim = await this.claimEvent(envelope);
    if (claim === 'ALREADY_PROCESSED') {
      this.logger.debug(
        `Skip duplicate topic delete eventId=${envelope.eventId}`,
      );
      return;
    }

    const p = envelope.payload;

    try {
      await this.dgraph.query(DELETE_TOPIC_MUTATION, { id: p.id });
      this.logger.debug(
        `Deleted topic topicId=${p.id} eventId=${envelope.eventId}`,
      );
    } catch (err) {
      await this.releaseClaim(envelope.eventId).catch((releaseErr) =>
        this.logger.error(
          `Failed to release claim: ${(releaseErr as Error).message}`,
        ),
      );
      this.logger.error(
        `Failed to delete topic ${p.id}: ${(err as Error).message}`,
      );
      throw err;
    }
  }
}