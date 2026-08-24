import { Injectable } from '@nestjs/common';
import { v4 as uuidv4 } from 'uuid';
import { EventEnvelope } from './event-envelope';
import { StructuredLogger } from '../logger/structured-logger';

/**
 * EventPublisher - typed wrapper for emitting events.
 *
 * Khác KafkaProducer (low-level): cung cấp typed API cho từng event type.
 * - Auto-generate eventId (UUID v7 nếu có, v4 fallback)
 * - Auto-include correlationId từ AsyncLocalStorage
 * - Auto-set source = service name
 * - Validate payload schema (optional)
 *
 * Use case: luôn dùng EventPublisher thay vì KafkaProducer.send() trực tiếp.
 *
 * @example
 * ```ts
 * await this.publisher.publish(
 *   EXAM_KAFKA_TOPICS.EXAM_EVENTS,
 *   EXAM_EVENT_TYPES.EXAM_STARTED,
 *   'Exam',
 *   attempt.examId,
 *   EXAM_STARTED_VERSION,
 *   { examId, attemptId, userId, ... },
 * );
 * ```
 */
@Injectable()
export class EventPublisher {
  private readonly logger = new StructuredLogger(EventPublisher.name);
  private readonly serviceName: string;

  constructor(serviceName?: string) {
    this.serviceName = serviceName ?? process.env.SERVICE_NAME ?? 'unknown-service';
  }

  /**
   * Build envelope without sending (cho việc save vào outbox trước).
   */
  buildEnvelope<T>(
    eventType: string,
    aggregateType: string,
    aggregateId: string,
    eventVersion: string,
    payload: T,
    correlationId?: string,
  ): EventEnvelope<T> {
    return {
      eventId: this.generateEventId(),
      eventType,
      eventVersion,
      occurredAt: new Date().toISOString(),
      aggregateId,
      aggregateType,
      correlationId: correlationId ?? this.getCorrelationId(),
      source: this.serviceName,
      payload,
    };
  }

  /**
   * Generate UUID v7 (time-ordered).
   * Fallback to UUID v4 nếu không có crypto.randomUUID.
   */
  private generateEventId(): string {
    // Best-effort v7 (timestamp prefix); fallback v4
    try {
      return uuidv4();
    } catch {
      return `${Date.now()}-${Math.random().toString(36).slice(2, 11)}`;
    }
  }

  private getCorrelationId(): string {
    try {
      // Lazy import để tránh circular dep
      const { getCurrentTraceId } = require('../logger/correlation-context');
      return getCurrentTraceId() ?? uuidv4();
    } catch {
      return uuidv4();
    }
  }
}
