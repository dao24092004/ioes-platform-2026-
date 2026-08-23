import { Inject, Injectable, Logger, OnModuleDestroy } from '@nestjs/common';
import { Kafka, Producer, logLevel } from 'kafkajs';
import { randomUUID } from 'node:crypto';
import { kafkaConfig } from '../config/app.config';
import { KAFKA_TOPICS, KafkaTopic } from '@ioes/common-node';

/**
 * KafkaPublisherService — publish event với envelope chuẩn.
 *
 * Tuân thủ Event Schema trong PROJECT_RULES.md:
 * {
 *   eventId, eventType, eventVersion, occurredAt,
 *   aggregateId, aggregateType, correlationId, source, payload
 * }
 *
 * Pattern: fire-and-forget + log error. Caller không cần đợi publish.
 *
 * Idempotency: consumer dùng eventId để dedupe (sẽ có ở common-kafka).
 *
 * Outbox pattern: sẽ thêm ở phase sau (P3-P4) — hiện tại publish trực tiếp.
 */
@Injectable()
export class KafkaPublisherService implements OnModuleDestroy {
  private readonly logger = new Logger(KafkaPublisherService.name);
  private kafka!: Kafka;
  private producer!: Producer;
  private connected = false;

  constructor() {
    this.kafka = new Kafka({
      clientId: kafkaConfig.clientId,
      brokers: kafkaConfig.brokers,
      logLevel: logLevel.WARN,
    });
    this.producer = this.kafka.producer({
      allowAutoTopicCreation: true,
      idempotent: true,
    });
  }

  async onModuleInit(): Promise<void> {
    try {
      await this.producer.connect();
      this.connected = true;
      this.logger.log('Kafka producer connected');
    } catch (err) {
      this.logger.error(`Kafka producer connect failed: ${err}`);
    }
  }

  async onModuleDestroy(): Promise<void> {
    if (this.connected) {
      await this.producer.disconnect().catch((err) =>
        this.logger.warn(`Kafka disconnect error: ${err}`),
      );
    }
  }

  /**
   * Publish event với envelope chuẩn.
   *
   * @param topic  Kafka topic (dùng KAFKA_TOPICS để tránh typo)
   * @param eventType  Tên event (vd: 'ExamSessionStarted')
   * @param payload  Business data
   * @param meta    aggregateId, aggregateType (optional)
   */
  async publish(
    topic: KafkaTopic | string,
    eventType: string,
    payload: Record<string, unknown>,
    meta?: { aggregateId?: string; aggregateType?: string; correlationId?: string },
  ): Promise<void> {
    const envelope = {
      eventId: randomUUID(),
      eventType,
      eventVersion: '1.0',
      occurredAt: new Date().toISOString(),
      aggregateId: meta?.aggregateId ?? (payload.attemptId as string) ?? 'unknown',
      aggregateType: meta?.aggregateType ?? 'ExamAttempt',
      correlationId: meta?.correlationId ?? randomUUID(),
      source: kafkaConfig.clientId,
      payload,
    };

    try {
      if (!this.connected) {
        await this.producer.connect();
        this.connected = true;
      }
      await this.producer.send({
        topic,
        messages: [
          {
            key: envelope.aggregateId,
            value: JSON.stringify(envelope),
            timestamp: Date.now().toString(),
          },
        ],
      });
      this.logger.debug(`[kafka] ${topic} ${eventType} id=${envelope.eventId}`);
    } catch (err) {
      this.logger.error(`[kafka] publish failed topic=${topic} err=${err}`);
      throw err;
    }
  }
}