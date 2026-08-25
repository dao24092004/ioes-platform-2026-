import { Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource, In } from 'typeorm';
import {
  KafkaProducer,
  KAFKA_TOPICS,
  EventEnvelope,
  StructuredLogger,
  outboxEventsTotal,
  OutboxEvent,
  Counter,
} from '@ioes/common-node';

const BATCH_SIZE = 50;
const POLL_INTERVAL_MS = 1000;
const MAX_ATTEMPTS = 5;
const outboxEventsCounter = outboxEventsTotal as Counter;

/**
 * OutboxWorker v2 - **atomic publish** (BUG #25 fix).
 *
 * Flow mỗi poll cycle:
 * 1. BEGIN TRANSACTION
 * 2. SELECT FOR UPDATE SKIP LOCKED LIMIT 50
 * 3. UPDATE status='PROCESSING' (atomic với select)
 * 4. COMMIT
 * 5. Try publish to Kafka (OUTSIDE transaction - Kafka không support XA)
 * 6. Nếu OK → UPDATE status='PUBLISHED' (separate transaction)
 * 7. Nếu fail → UPDATE attempts++ + status='PENDING'/'FAILED' (separate transaction)
 *
 * Trade-off: vẫn có nhỏ race nếu crash giữa step 4 và 5 → duplicate publish.
 * Giảm thiểu bằng:
 * - Idempotency check ở consumer (đã có ở DgraphSyncConsumer)
 * - Stuck PROCESSING events có thể được cleanup bởi job riêng (TODO Phase E)
 *
 * Resilience:
 * - Worker crash giữa 4-5 → events status='PROCESSING', cần recovery
 * - Kafka down → retry theo exponential backoff
 * - 2 workers chạy cùng lúc → SKIP LOCKED đảm bảo không pick cùng row
 *
 * Khuyến nghị: chạy 1 instance worker (hoặc leader election) để đơn giản hơn.
 */
@Injectable()
export class OutboxWorker implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new StructuredLogger(OutboxWorker.name);
  private timer: NodeJS.Timeout | null = null;
  private running = false;
  private polling = false;
  private readonly dlqTopic: string;

  constructor(
    @InjectRepository(OutboxEvent)
    private readonly outboxRepo: Repository<OutboxEvent>,
    private readonly dataSource: DataSource,
    private readonly producer: KafkaProducer,
  ) {
    this.dlqTopic = `${KAFKA_TOPICS.QUESTION_CREATED.split('.')[0]}.dlq`;
  }

  onModuleInit(): void {
    this.start();
  }

  onModuleDestroy(): void {
    this.stop();
  }

  start(): void {
    if (this.running) return;
    this.running = true;
    this.scheduleNextPoll(0);
    this.logger.log(`OutboxWorker started (poll every ${POLL_INTERVAL_MS}ms)`);
  }

  stop(): void {
    this.running = false;
    if (this.timer) {
      clearTimeout(this.timer);
      this.timer = null;
    }
    this.logger.log('OutboxWorker stopped');
  }

  private scheduleNextPoll(delayMs: number): void {
    if (!this.running) return;
    this.timer = setTimeout(() => this.pollOnce(), delayMs);
  }

  async pollOnce(): Promise<number> {
    if (!this.running || this.polling) return 0;
    this.polling = true;

    try {
      const events = await this.fetchAndLockPending();
      if (events.length === 0) {
        return 0;
      }

      this.logger.debug(`Polled ${events.length} pending events`);

      let processed = 0;
      for (const event of events) {
        const success = await this.publishEvent(event);
        if (success) processed++;
      }

      return processed;
    } catch (err) {
      this.logger.error(`Poll cycle failed: ${(err as Error).message}`);
      return 0;
    } finally {
      this.polling = false;
      this.scheduleNextPoll(POLL_INTERVAL_MS);
    }
  }

  /**
   * Fetch + lock + mark PROCESSING trong 1 transaction.
   * BUG #25 fix: trước đây UPDATE status='PROCESSING' tách riêng → có thể crash
   * giữa SELECT và UPDATE. Giờ gộp vào 1 transaction.
   */
  private async fetchAndLockPending(): Promise<OutboxEvent[]> {
    return this.dataSource.transaction(async (manager) => {
      const events = await manager
        .createQueryBuilder(OutboxEvent, 'e')
        .setLock('pessimistic_write')
        .setOnLocked('skip_locked')
        .where(
          'e.status = :status AND (e.nextAttemptAt IS NULL OR e.nextAttemptAt <= :now)',
          { status: 'PENDING', now: new Date() },
        )
        .orderBy('e.createdAt', 'ASC')
        .limit(BATCH_SIZE)
        .getMany();

      if (events.length > 0) {
        // Update trong CÙNG transaction với select - atomic
        await manager.update(
          OutboxEvent,
          { id: In(events.map((e) => e.id)) },
          { status: 'PROCESSING' },
        );
        events.forEach((e) => (e.status = 'PROCESSING'));
      }

      return events;
    });
  }

  /**
   * Publish 1 event + atomic update status.
   *
   * Strategy: tách thành 2 transactions
   * - Tx1: Kafka publish (no DB)
   * - Tx2: DB update status (atomic)
   *
   * Trade-off: vẫn có nhỏ race giữa Tx1 và Tx2, nhưng consumer-side
   * idempotency sẽ xử lý duplicate.
   */
  private async publishEvent(event: OutboxEvent): Promise<boolean> {
    const envelope: EventEnvelope = {
      eventId: event.eventId,
      eventType: event.eventType,
      eventVersion: event.eventVersion,
      occurredAt: event.createdAt.toISOString(),
      aggregateId: event.aggregateId ?? '',
      aggregateType: event.aggregateType ?? '',
      correlationId: event.correlationId ?? `corr-${event.id}`,
      source: event.source,
      payload: event.payload,
    };

    try {
      await this.producer.sendEvent(event.topic, envelope, event.headers ?? {});

      // BUG #120 fix: track published event
      outboxEventsCounter.inc({ status: 'PUBLISHED' });

      // Publish OK → atomic update
      await this.dataSource.transaction(async (manager) => {
        await manager.update(
          OutboxEvent,
          event.id,
          {
            status: 'PUBLISHED',
            processedAt: new Date(),
            attempts: event.attempts + 1,
            lastError: undefined,
          },
        );
      });

      this.logger.debug(
        `Published ${event.eventType} id=${event.eventId} to ${event.topic}`,
      );
      return true;
    } catch (err) {
      const error = err as Error;
      const newAttempts = event.attempts + 1;
      const isFinal = newAttempts >= MAX_ATTEMPTS;

      this.logger.warn(
        `Publish failed ${event.eventType} id=${event.eventId} attempt=${newAttempts}/${MAX_ATTEMPTS}: ${error.message}`,
      );

      // Atomic failure update
      await this.dataSource.transaction(async (manager) => {
        await manager.update(
          OutboxEvent,
          event.id,
          {
            status: isFinal ? 'FAILED' : 'PENDING',
            attempts: newAttempts,
            lastError: error.message,
            nextAttemptAt: isFinal ? undefined : this.computeBackoff(newAttempts),
          },
        );
      });

      // BUG #120 fix: track failed/retry event
      outboxEventsCounter.inc({ status: isFinal ? 'FAILED' : 'RETRY' });

      if (isFinal) {
        await this.sendToDlq(event, error).catch((dlqErr) =>
          this.logger.error(
            `DLQ publish failed for event ${event.eventId}: ${(dlqErr as Error).message}`,
          ),
        );
      }

      return false;
    }
  }

  private computeBackoff(attempts: number): Date {
    // Exponential với cap 5 phút để tránh overflow
    const baseMs = 1000;
    const maxBackoffMs = 5 * 60 * 1000;
    const backoff = Math.min(maxBackoffMs, baseMs * Math.pow(2, attempts - 1));
    const jitter = Math.random() * 200; // 0-200ms jitter
    return new Date(Date.now() + backoff + jitter);
  }

  private async sendToDlq(
    event: OutboxEvent,
    error: Error,
  ): Promise<void> {
    const dlqEnvelope = {
      ...event,
      failure: {
        originalTopic: event.topic,
        attempts: event.attempts,
        error: error.message,
        failedAt: new Date().toISOString(),
      },
    };
    await this.producer.send(this.dlqTopic, event.eventId, dlqEnvelope, {
      'x-dlq-reason': 'max-attempts-exceeded',
    });
    this.logger.warn(
      `Event ${event.eventId} sent to DLQ ${this.dlqTopic} after ${event.attempts} attempts`,
    );
  }
}