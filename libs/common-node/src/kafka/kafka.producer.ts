import { Injectable, Inject, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { Kafka, Producer, RecordMetadata, CompressionTypes } from 'kafkajs';
import { KAFKA_CLIENT, KafkaOptions } from './kafka.options';
import { createLogger } from '../utils/logger.util';
import { EventEnvelope } from '../events/event-envelope';

/**
 * KafkaProducer - shared wrapper để publish events đúng chuẩn.
 * Tự động:
 * - Connect on app init (lazy, không block startup nếu Kafka down)
 * - Disconnect on app shutdown
 * - Log mọi send/ack/error
 * - Wrap payload thành EventEnvelope nếu chưa có
 *
 * Connection strategy: best-effort. Nếu Kafka unavailable, retry ngầm.
 * Send() sẽ chờ connection ready trước khi gửi.
 *
 * @see docs/02-architecture/adr/ADR-002-event-schema.md
 */
@Injectable()
export class KafkaProducer implements OnModuleInit, OnModuleDestroy {
  private readonly logger = createLogger(KafkaProducer.name);
  private readonly kafka: Kafka;
  private producer: Producer | null = null;
  private connected = false;
  private connecting: Promise<void> | null = null;

  constructor(@Inject(KAFKA_CLIENT) options: KafkaOptions) {
    this.kafka = new Kafka({
      clientId: options.clientId,
      brokers: options.brokers,
      retry: { retries: 5, initialRetryTime: 300 },
    });
  }

  async onModuleInit(): Promise<void> {
    // Non-blocking: fire-and-forget connect, errors logged but don't crash startup
    this.connect().catch((err) =>
      this.logger.warn(
        `Initial connect failed (will retry on first send): ${(err as Error).message}`,
      ),
    );
  }

  async onModuleDestroy(): Promise<void> {
    await this.disconnect();
  }

  /**
   * Connect to Kafka. Idempotent - multiple calls share 1 promise.
   */
  async connect(): Promise<void> {
    if (this.connected) return;
    if (this.connecting) return this.connecting;

    this.connecting = (async () => {
      this.producer = this.kafka.producer({
        allowAutoTopicCreation: true,
        idempotent: true,
        maxInFlightRequests: 5,
      });
      await this.producer.connect();
      this.connected = true;
      this.logger.log('KafkaProducer connected');
    })();

    try {
      await this.connecting;
    } finally {
      this.connecting = null;
    }
  }

  /**
   * Disconnect. Idempotent.
   */
  async disconnect(): Promise<void> {
    if (!this.connected || !this.producer) return;
    try {
      await this.producer.disconnect();
    } catch (err) {
      this.logger.warn(`Disconnect error: ${(err as Error).message}`);
    }
    this.connected = false;
    this.producer = null;
    this.logger.log('KafkaProducer disconnected');
  }

  /**
   * Publish raw message to a topic. Auto-connects if not yet connected.
   */
  async send(
    topic: string,
    key: string,
    value: unknown,
    headers: Record<string, string> = {},
  ): Promise<RecordMetadata[]> {
    if (!this.connected || !this.producer) {
      await this.connect();
    }
    if (!this.producer) {
      throw new Error('KafkaProducer not connected');
    }

    const message = {
      key,
      value: JSON.stringify(value),
      headers: {
        'content-type': 'application/json',
        'sent-at': new Date().toISOString(),
        ...headers,
      },
    };

    this.logger.debug(`send topic=${topic} key=${key}`);
    try {
      const metadata = await this.producer.send({
        topic,
        compression: CompressionTypes.GZIP,
        messages: [message],
        acks: -1,
      });
      return metadata;
    } catch (err) {
      this.logger.error(`Failed to send to ${topic}: ${(err as Error).message}`);
      throw err;
    }
  }

  /**
   * Send an EventEnvelope - enforces schema correctness.
   */
  async sendEvent<E extends EventEnvelope>(
    topic: string,
    envelope: E,
    headers: Record<string, string> = {},
  ): Promise<RecordMetadata[]> {
    return this.send(topic, envelope.aggregateId, envelope, {
      'event-id': envelope.eventId,
      'event-type': envelope.eventType,
      'event-version': envelope.eventVersion,
      'correlation-id': envelope.correlationId,
      ...headers,
    });
  }
}
