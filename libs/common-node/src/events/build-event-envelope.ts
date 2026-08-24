import { v4 as uuidv4 } from 'uuid';
import { EventEnvelope, EventType } from './event-envelope';

/**
 * Build a standard EventEnvelope with sensible defaults.
 * Caller chỉ cần truyền eventType + payload.
 *
 * Note: uuid@9.x không có v7, nên dùng v4 với prefix 'evt-' để dễ nhận biết.
 */
export interface BuildEnvelopeInput<P> {
  eventType: EventType;
  eventVersion?: string;
  aggregateId: string;
  aggregateType: string;
  source: string;
  payload: P;
  correlationId?: string;
  occurredAt?: string;
}

export function buildEventEnvelope<P>({
  eventType,
  eventVersion = '1.0',
  aggregateId,
  aggregateType,
  source,
  payload,
  correlationId,
  occurredAt,
}: BuildEnvelopeInput<P>): EventEnvelope<P> {
  return {
    eventId: `evt-${uuidv4()}`,
    eventType,
    eventVersion,
    occurredAt: occurredAt ?? new Date().toISOString(),
    aggregateId,
    aggregateType,
    correlationId: correlationId ?? `corr-${uuidv4()}`,
    source,
    payload,
  };
}
