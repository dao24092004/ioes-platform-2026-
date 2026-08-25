import { Injectable, OnModuleInit } from '@nestjs/common';
import { InjectRepository, InjectDataSource } from '@nestjs/typeorm';
import { DataSource, Repository, EntityManager } from 'typeorm';
import { StructuredLogger } from '../logger/structured-logger';
import { KafkaProducer } from '../kafka/kafka.producer';
import { OutboxEvent } from './outbox-event.entity';
import { v4 as uuidv4 } from 'uuid';

/**
 * OutboxService - generic transactional outbox cho mọi event type.
 *
 * Theo ADR-004 (Idempotency + Outbox):
 * 1. Save event vào outbox table trong CÙNG transaction với business logic
 *    → guaranteed atomic: nếu DB commit fail → outbox cũng không save
 * 2. Background worker poll outbox → publish to Kafka → mark PUBLISHED
 * 3. Consumer side: atomic claim trên processed_events table
 *
 * Trade-off: có thể duplicate publish nếu crash giữa publish và mark PUBLISHED
 * → Consumer-side idempotency (atomic claim) sẽ xử lý.
 *
 * @example
 * ```ts
 * // Trong service:
 * async startExam(...) {
 *   await this.outbox.saveInTransaction(
 *     this.dataSource.transaction(async (em) => {
 *       const attempt = await em.save(Attempt, {...});
 *       await this.outbox.enqueueInTx(em, EXAM_KAFKA_TOPICS.EXAM_EVENTS, envelope);
 *       return attempt;
 *     })
 *   );
 * }
 * ```
 */
@Injectable()
export class OutboxService {
  private readonly logger = new StructuredLogger(OutboxService.name);
  private timer: NodeJS.Timeout | null = null;
  private running = false;
  private readonly BATCH_SIZE = 50;
  private readonly POLL_INTERVAL_MS = 1000;
  private readonly MAX_ATTEMPTS = 5;

  constructor(
    @InjectRepository(OutboxEvent)
    private readonly repo: Repository<OutboxEvent>,
    @InjectDataSource()
    private readonly dataSource: DataSource,
    private readonly kafkaProducer: KafkaProducer,
  ) {}

  onModuleInit(): void {
    // Start background worker
    this.timer = setInterval(() => this.poll(), this.POLL_INTERVAL_MS).unref();
  }

  onModuleDestroy(): void {
    if (this.timer) {
      clearInterval(this.timer);
    }
  }

  /**
   * Enqueue event vào outbox trong existing transaction.
   *
   * Caller PHẢI ở trong 1 transaction (entityManager).
   * Event sẽ chỉ được publish nếu transaction commit thành công.
   */
  async enqueueInTx<T = unknown>(
    em: EntityManager,
    topic: string,
    envelope: {
      eventId?: string;
      eventType: string;
      eventVersion: string;
      aggregateId?: string;
      aggregateType?: string;
      source: string;
      correlationId?: string;
      payload: T;
      headers?: Record<string, string>;
    },
  ): Promise<OutboxEvent> {
    const event = em.create(OutboxEvent, {
      eventId: envelope.eventId ?? uuidv4(),
      eventType: envelope.eventType,
      eventVersion: envelope.eventVersion,
      topic,
      aggregateId: envelope.aggregateId,
      aggregateType: envelope.aggregateType,
      source: envelope.source,
      correlationId: envelope.correlationId,
      payload: envelope.payload as unknown as Record<string, unknown>,
      headers: envelope.headers,
      status: 'PENDING',
      attempts: 0,
      nextAttemptAt: new Date(),
    });

    return em.save(OutboxEvent, event);
  }

  /**
   * Atomic claim batch: SELECT FOR UPDATE SKIP LOCKED → UPDATE PROCESSING.
   * 
   * Phase 1 (theo ADR-004):
   * - BEGIN TRANSACTION
   * - SELECT FOR UPDATE SKIP LOCKED LIMIT 50
   * - UPDATE status='PROCESSING'
   * - COMMIT
   */
  private async claimBatch(): Promise<OutboxEvent[]> {
    return this.dataSource.transaction(async (em) => {
      const events = await em
        .createQueryBuilder(OutboxEvent, 'e')
        .setLock('pessimistic_write')
        .setOnLocked('skip_locked')
        .where('e.status = :status', { status: 'PENDING' })
        .andWhere('(e.nextAttemptAt IS NULL OR e.nextAttemptAt <= NOW())')
        .orderBy('e.createdAt', 'ASC')
        .limit(this.BATCH_SIZE)
        .getMany();

      if (events.length === 0) return [];

      await em
        .createQueryBuilder()
        .update(OutboxEvent)
        .set({ status: 'PROCESSING', updatedAt: new Date() })
        .whereInIds(events.map((e) => e.id))
        .execute();

      return events;
    });
  }

  /**
   * Background polling loop.
   */
  private async poll(): Promise<void> {
    if (this.running) return;
    this.running = true;

    try {
      const batch = await this.claimBatch();
      if (batch.length === 0) return;

      this.logger.debug(`Outbox claimed batch: ${batch.length} events`);

      for (const event of batch) {
        await this.publishEvent(event);
      }
    } catch (err) {
      this.logger.error(`Outbox poll error: ${(err as Error).message}`);
    } finally {
      this.running = false;
    }
  }

  /**
   * Publish 1 event + update status.
   */
  private async publishEvent(event: OutboxEvent): Promise<void> {
    try {
      await this.kafkaProducer.send(event.topic, event.aggregateId ?? event.eventId, {
        eventId: event.eventId,
        eventType: event.eventType,
        eventVersion: event.eventVersion,
        occurredAt: event.createdAt.toISOString(),
        aggregateId: event.aggregateId ?? '',
        aggregateType: event.aggregateType ?? '',
        correlationId: event.correlationId ?? '',
        source: event.source,
        payload: event.payload,
        headers: {
          'content-type': 'application/json',
          'event-version': event.eventVersion,
          ...(event.headers ?? {}),
        },
      });

      await this.repo.update(
        { id: event.id },
        {
          status: 'PUBLISHED',
          processedAt: new Date(),
          lastError: undefined,
        },
      );

      this.logger.debug(`Outbox published: ${event.eventType} id=${event.eventId}`);
    } catch (err) {
      const newAttempts = event.attempts + 1;
      const isFailed = newAttempts >= this.MAX_ATTEMPTS;
      const backoffMs = Math.min(60_000, 1000 * 2 ** newAttempts);

      await this.repo.update(
        { id: event.id },
        {
          status: isFailed ? 'FAILED' : 'PENDING',
          attempts: newAttempts,
          lastError: (err as Error).message,
          nextAttemptAt: new Date(Date.now() + backoffMs),
        },
      );

      if (isFailed) {
        this.logger.error(
          `Outbox failed (DLQ): ${event.eventType} id=${event.eventId} attempts=${newAttempts}`,
        );
        // TODO: route to DLQ topic
      } else {
        this.logger.warn(
          `Outbox retry: ${event.eventType} id=${event.eventId} attempt=${newAttempts} nextAttemptIn=${backoffMs}ms`,
        );
      }
    }
  }
}
