import { Injectable, Inject, OnModuleDestroy, Optional, Logger } from '@nestjs/common';
import { Kafka, Consumer, EachMessagePayload, KafkaMessage } from 'kafkajs';
import { KAFKA_CLIENT, KafkaOptions } from './kafka.options';
import { KafkaProducer } from './kafka.producer';
import { createLogger } from '../utils/logger.util';
import { EventEnvelope } from '../events/event-envelope';
import { kafkaMessagesProcessed } from '../metrics';
import { Counter } from '../metrics/metric-types';

const kafkaMessagesCounter = kafkaMessagesProcessed as Counter;

/**
 * KafkaConsumer - wrapper để subscribe topic với handler function.
 *
 * Đảm bảo:
 * - Idempotent subscribe (dedupe theo topic+groupId, ignore handler ref changes)
 * - Graceful disconnect
 * - Deserialize JSON + validate envelope
 * - DLQ handling: track retry count qua in-memory map + send sang dead-letter topic
 * - Manual offset commit sau khi xử lý thành công (at-least-once semantics)
 */
export type EventHandler<E = unknown> = (
  envelope: EventEnvelope<E>,
  raw: KafkaMessage,
) => Promise<void>;

interface Subscription {
  /** Unique ID cho mỗi subscribe call, dùng để dedupe */
  id: string;
  topic: string;
  groupId: string;
  handler: EventHandler;
  fromBeginning: boolean;
  maxRetries: number;
  dlqTopic: string;
  dlqHandler?: (
    envelope: EventEnvelope,
    error: Error,
    raw: KafkaMessage,
  ) => Promise<void>;
}

/**
 * Subscription config cho retry behavior.
 */
export interface KafkaConsumerSubscribeOptions {
  /** Override default consumer group (mặc định từ KafkaModule options). */
  groupId?: string;
  /** Đọc từ đầu topic thay vì latest. Chỉ work lần đầu join group. */
  fromBeginning?: boolean;
  /** Max retry count trước khi gửi DLQ (mặc định 3). */
  maxRetries?: number;
  /** Custom DLQ topic (mặc định auto-derive: `<topic>.dlq`). */
  dlqTopic?: string;
  /** Custom DLQ handler - nếu set, message sẽ không được throw để retry. */
  dlqHandler?: (envelope: EventEnvelope, error: Error, raw: KafkaMessage) => Promise<void>;
}

const DEFAULT_MAX_RETRIES = 3;

/**
 * Tracking record cho retry attempts.
 * Key = `${topic}:${partition}:${offset}` (consumer-side position).
 */
interface RetryRecord {
  count: number;
  firstSeenAt: number;
  lastError: string;
}

@Injectable()
export class KafkaConsumer implements OnModuleDestroy {
  private readonly logger = createLogger(KafkaConsumer.name);
  private readonly kafka: Kafka;
  private readonly defaultGroupId: string;
  private readonly subscriptions: Subscription[] = [];
  private readonly consumerInstances = new Map<string, Consumer>();
  private readonly retryTracker = new Map<string, RetryRecord>();
  private readonly retryTrackerMaxAgeMs = 24 * 60 * 60 * 1000; // 24h
  private running = false;
  private subscribeCounter = 0;
  private readonly producer: KafkaProducer | null;

  constructor(
    @Inject(KAFKA_CLIENT) options: KafkaOptions,
    @Optional() producer?: KafkaProducer,
  ) {
    this.kafka = new Kafka({
      clientId: options.clientId,
      brokers: options.brokers,
      retry: { retries: 5, initialRetryTime: 300 },
    });
    this.defaultGroupId =
      options.consumerGroupId ?? `${options.clientId}-consumer`;
    this.producer = producer ?? null;

    // Cleanup retry tracker periodically (every 1h)
    setInterval(() => this.cleanupRetryTracker(), 60 * 60 * 1000).unref();
  }

  subscribe<E = unknown>(
    topic: string,
    handler: EventHandler<E>,
    options: KafkaConsumerSubscribeOptions = {},
  ): string {
    const groupId = options.groupId ?? this.defaultGroupId;
    const maxRetries = options.maxRetries ?? DEFAULT_MAX_RETRIES;
    const dlqTopic = options.dlqTopic ?? `${topic}.dlq`;

    const exists = this.subscriptions.find(
      (s) => s.topic === topic && s.groupId === groupId,
    );
    if (exists) {
      this.logger.warn(
        `Already subscribed topic=${topic} group=${groupId} (id=${exists.id}), replacing handler`,
      );
      exists.handler = handler as EventHandler;
      exists.fromBeginning = options.fromBeginning ?? exists.fromBeginning;
      return exists.id;
    }

    const id = `sub-${++this.subscribeCounter}`;
    const sub: Subscription = {
      id,
      topic,
      groupId,
      handler: handler as EventHandler,
      fromBeginning: options.fromBeginning ?? false,
      maxRetries,
      dlqTopic,
      dlqHandler: options.dlqHandler,
    };
    this.subscriptions.push(sub);
    this.logger.log(
      `Registered subscription id=${id} topic=${topic} group=${groupId} dlq=${dlqTopic} maxRetries=${maxRetries}`,
    );
    return id;
  }

  unsubscribe(subscriptionId: string): boolean {
    const idx = this.subscriptions.findIndex((s) => s.id === subscriptionId);
    if (idx >= 0) {
      const sub = this.subscriptions[idx];
      this.subscriptions.splice(idx, 1);
      this.logger.log(`Unsubscribed id=${subscriptionId} topic=${sub.topic}`);
      return true;
    }
    return false;
  }

  async start(): Promise<void> {
    if (this.running) return;
    if (this.subscriptions.length === 0) {
      this.logger.warn('No subscriptions registered, skipping start');
      return;
    }

    const groupMap = new Map<string, Subscription[]>();
    for (const sub of this.subscriptions) {
      const arr = groupMap.get(sub.groupId) ?? [];
      arr.push(sub);
      groupMap.set(sub.groupId, arr);
    }

    for (const [groupId, subs] of groupMap.entries()) {
      const consumer = this.kafka.consumer({
        groupId,
        sessionTimeout: 30_000,
        heartbeatInterval: 5_000,
        // Manual commit duoc dat o consumer.run() ben duoi; ConsumerConfig
        // cua kafkajs khong nhan autoCommit.
        allowAutoTopicCreation: true,
      } as any);
      await consumer.connect();

      for (const sub of subs) {
        await consumer.subscribe({
          topic: sub.topic,
          fromBeginning: sub.fromBeginning,
        });
      }

      await consumer.run({
        autoCommit: false,
        eachMessage: async (payload: EachMessagePayload) => {
          await this.dispatch(groupId, consumer, payload);
        },
      });

      this.consumerInstances.set(groupId, consumer);
      this.logger.log(
        `KafkaConsumer group=${groupId} started with ${subs.length} topics (manual commit)`,
      );
    }

    this.running = true;
  }

  async stop(): Promise<void> {
    if (!this.running) return;
    const errors: Error[] = [];
    for (const [groupId, consumer] of this.consumerInstances.entries()) {
      try {
        await consumer.disconnect();
        this.logger.log(`Group ${groupId} disconnected`);
      } catch (err) {
        errors.push(err as Error);
        this.logger.error(
          `Group ${groupId} disconnect failed: ${(err as Error).message}`,
        );
      }
    }
    this.consumerInstances.clear();
    this.running = false;
    if (errors.length > 0) {
      throw errors[0];
    }
  }

  async onModuleDestroy(): Promise<void> {
    await this.stop();
  }

  /**
   * Dispatch message tới handler với retry tracking.
   *
   * BUG #41 fix:
   * - Track retry count in-memory per (topic:partition:offset)
   * - Sau khi retry >= maxRetries → route sang DLQ
   * - Manual commit offset sau khi handle thành công (hoặc DLQ success)
   * - Không throw khi retry count chưa max → Kafka sẽ re-deliver
   */
  private async dispatch(
    groupId: string,
    consumer: Consumer,
    payload: EachMessagePayload,
  ): Promise<void> {
    const { topic, partition, message } = payload;
    const sub = this.subscriptions.find(
      (s) => s.topic === topic && s.groupId === groupId,
    );
    if (!sub) {
      this.logger.warn(
        `No handler for topic=${topic} group=${groupId} (possible orphan subscription)`,
      );
      return;
    }

    const retryKey = `${topic}:${partition}:${message.offset}`;
    let envelope: EventEnvelope | undefined;

    try {
      const rawValue = message.value?.toString();
      if (!rawValue) {
        this.logger.warn(
          `Empty message topic=${topic} partition=${partition} offset=${message.offset}`,
        );
        // Commit ngay vì message invalid không process được
        await this.commitOffset(consumer, topic, partition, message.offset);
        return;
      }

      const parsed = JSON.parse(rawValue);
      envelope = this.parseEnvelope(parsed);

      await sub.handler(envelope, message);

      // BUG #120 fix: track processed message metric
      kafkaMessagesCounter.inc({
        topic,
        status: 'success',
      });

      // Handle thành công → commit offset + clear retry tracker
      await this.commitOffset(consumer, topic, partition, message.offset);
      this.retryTracker.delete(retryKey);

      this.logger.debug(
        `Handled ${envelope.eventType} id=${envelope.eventId} topic=${topic} offset=${message.offset}`,
      );
    } catch (err) {
      const error = err as Error;
      kafkaMessagesCounter.inc({ topic, status: 'failed' });

      // BUG #41 fix: track retry count in-memory
      const existing = this.retryTracker.get(retryKey);
      const newCount = (existing?.count ?? 0) + 1;
      this.retryTracker.set(retryKey, {
        count: newCount,
        firstSeenAt: existing?.firstSeenAt ?? Date.now(),
        lastError: error.message,
      });

      if (newCount >= sub.maxRetries) {
        // Đã hết retry → DLQ
        this.logger.error(
          `Handler failed after ${newCount} retries topic=${topic} offset=${message.offset}: ${error.message}. Routing to DLQ.`,
        );
        try {
          await this.routeToDlq(sub, envelope, error, message);
          // DLQ success → commit offset (không retry nữa)
          await this.commitOffset(consumer, topic, partition, message.offset);
          this.retryTracker.delete(retryKey);
        } catch (dlqErr) {
          // DLQ fail → KHÔNG commit, để Kafka retry
          this.logger.error(
            `DLQ routing failed: ${(dlqErr as Error).message}. Will retry.`,
          );
          throw dlqErr;
        }
        return;
      }

      this.logger.warn(
        `Handler failed topic=${topic} offset=${message.offset} retry=${newCount}/${sub.maxRetries}: ${error.message}`,
      );

      // KHÔNG commit offset → Kafka sẽ re-deliver message
      // Throw để abort batch processing
      throw error;
    }
  }

  /**
   * Commit offset manually.
   */
  private async commitOffset(
    consumer: Consumer,
    topic: string,
    partition: number,
    offset: string,
  ): Promise<void> {
    try {
      await consumer.commitOffsets([
        {
          topic,
          partition,
          offset: (BigInt(offset) + 1n).toString(),
        },
      ]);
    } catch (err) {
      this.logger.error(
        `Failed to commit offset topic=${topic} partition=${partition} offset=${offset}: ${(err as Error).message}`,
      );
      // Không throw - commit failure không nên block processing
    }
  }

  /**
   * Route failed message sang DLQ topic.
   */
  private async routeToDlq(
    sub: Subscription,
    envelope: EventEnvelope | undefined,
    error: Error,
    raw: KafkaMessage,
  ): Promise<void> {
    if (!envelope) {
      this.logger.error('Cannot route empty/invalid envelope to DLQ');
      throw new Error('Invalid envelope');
    }

    const dlqPayload = {
      ...envelope,
      _dlq: {
        originalTopic: sub.topic,
        originalGroup: sub.groupId,
        error: error.message,
        stack: error.stack?.split('\n').slice(0, 5).join('\n'),
        failedAt: new Date().toISOString(),
        attemptCount: sub.maxRetries,
      },
    };

    if (sub.dlqHandler) {
      await sub.dlqHandler(envelope, error, raw);
      return;
    }

    if (this.producer) {
      await this.producer.send(sub.dlqTopic, envelope.eventId, dlqPayload, {
        'x-dlq-reason': 'max-retries-exceeded',
        'x-original-topic': sub.topic,
        'x-error': error.message.slice(0, 200),
      });
      this.logger.warn(
        `Routed to DLQ ${sub.dlqTopic} eventId=${envelope.eventId}`,
      );
      return;
    }

    throw new Error('No producer configured for DLQ routing');
  }

  /**
   * Cleanup retry tracker records cũ (>24h).
   * Tránh memory leak khi service chạy lâu.
   */
  private cleanupRetryTracker(): void {
    const now = Date.now();
    let removed = 0;
    for (const [key, record] of this.retryTracker.entries()) {
      if (now - record.firstSeenAt > this.retryTrackerMaxAgeMs) {
        this.retryTracker.delete(key);
        removed++;
      }
    }
    if (removed > 0) {
      this.logger.log(`Retry tracker cleanup: removed ${removed} stale records`);
    }
  }

  private parseEnvelope(raw: unknown): EventEnvelope {
    if (!raw || typeof raw !== 'object') {
      throw new Error('Event payload is not an object');
    }
    const r = raw as Record<string, unknown>;
    const required: (keyof EventEnvelope)[] = [
      'eventId',
      'eventType',
      'eventVersion',
      'occurredAt',
      'aggregateId',
      'aggregateType',
      'source',
      'payload',
    ];
    for (const field of required) {
      if (r[field] === undefined || r[field] === null) {
        throw new Error(`Missing required field: ${field}`);
      }
    }

    const eventId = r.eventId as string;
    if (typeof eventId !== 'string' || eventId.length < 8) {
      throw new Error(`Invalid eventId: ${eventId}`);
    }

    return r as unknown as EventEnvelope;
  }
}