import { Injectable, OnModuleInit, OnModuleDestroy, Optional } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { StructuredLogger } from '../logger/structured-logger';
import { ProcessedEvent } from './outbox-event.entity';
import { EventEnvelope } from './event-envelope';
import type { KafkaMessage } from 'kafkajs';
import { KafkaConsumer } from '../kafka/kafka.consumer';

/**
 * BaseEventConsumer - generic base cho mọi event consumer.
 *
 * Theo ADR-004 (Idempotency):
 * - Atomic claim: INSERT ... ON CONFLICT DO NOTHING
 * - Release claim on failure (cho retry có thể claim lại)
 * - HandleEvent là abstract method (subclass implement business logic)
 *
 * @example
 * ```ts
 * @Injectable()
 * export class UserRegisteredConsumer extends BaseEventConsumer {
 *   constructor(repo: Repository<ProcessedEvent>, kafka: KafkaConsumer) {
 *     super(repo, kafka, 'auth.user.events', 'exam-suite-user-consumer');
 *   }
 *
 *   async handleEvent(envelope: EventEnvelope<UserRegisteredPayload>): Promise<void> {
 *     // business logic
 *   }
 * }
 * ```
 */
@Injectable()
export abstract class BaseEventConsumer<T = unknown>
  implements OnModuleInit, OnModuleDestroy
{
  protected abstract readonly logger: StructuredLogger;

  constructor(
    @InjectRepository(ProcessedEvent)
    protected readonly processedRepo: Repository<ProcessedEvent>,
    protected readonly kafka: KafkaConsumer,
    protected readonly topic: string,
    protected readonly groupId: string,
    protected readonly handlerName?: string,
  ) {}

  async onModuleInit(): Promise<void> {
    this.kafka.subscribe<T>(
      this.topic,
      (envelope, raw) => this.processMessage(envelope, raw),
      { groupId: this.groupId },
    );
  }

  async onModuleDestroy(): Promise<void> {
    // Kafka consumer cleanup handled by KafkaConsumer
  }

  /**
   * Process 1 message - theo atomic claim pattern.
   */
  private async processMessage(
    envelope: EventEnvelope<T>,
    msg: KafkaMessage,
  ): Promise<void> {
    // Atomic claim
    const claimed = await this.tryClaim(envelope.eventId, envelope.eventType, envelope.aggregateId, envelope.aggregateType);
    if (!claimed) {
      this.logger.debug(`Already processed, skipping: ${envelope.eventId}`);
      return;
    }

    try {
      await this.handleEvent(envelope, msg);
      this.logger.debug(
        `Processed ${envelope.eventType} id=${envelope.eventId}`,
      );
    } catch (err) {
      // Release claim để retry có thể claim lại
      await this.releaseClaim(envelope.eventId);
      this.logger.error(
        `Handler failed: ${envelope.eventType} id=${envelope.eventId} error=${(err as Error).message}`,
      );
      throw err; // Re-throw để Kafka retry / DLQ
    }
  }

  /**
   * Atomic claim: INSERT ... ON CONFLICT DO NOTHING.
   */
  private async tryClaim(
    eventId: string,
    eventType: string,
    aggregateId?: string,
    aggregateType?: string,
  ): Promise<boolean> {
    try {
      const result = await this.processedRepo
        .createQueryBuilder()
        .insert()
        .into(ProcessedEvent)
        .values({
          eventId,
          eventType,
          aggregateId,
          aggregateType,
        })
        .orIgnore()
        .execute();

      return (result.identifiers?.length ?? 0) > 0;
    } catch (err) {
      this.logger.error(`Claim failed: ${(err as Error).message}`);
      return false;
    }
  }

  /**
   * Release claim on handler failure.
   */
  private async releaseClaim(eventId: string): Promise<void> {
    try {
      await this.processedRepo.delete({ eventId });
    } catch (err) {
      this.logger.warn(`Release claim failed: ${(err as Error).message}`);
    }
  }

  /**
   * Business logic - subclass MUST implement.
   */
  protected abstract handleEvent(
    envelope: EventEnvelope<T>,
    msg: KafkaMessage,
  ): Promise<void>;
}
