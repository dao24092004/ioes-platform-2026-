import { registry } from './registry';
import { Counter, Gauge, Histogram } from './metric-types';

export const httpRequestsTotal = registry.register(new Counter({
  name: 'http_requests_total',
  type: 'counter',
  help: 'Total HTTP requests',
  labelNames: ['method', 'path', 'status'],
}));

export const httpRequestDuration = registry.register(new Histogram({
  name: 'http_request_duration_seconds',
  type: 'histogram',
  help: 'HTTP request latency',
  labelNames: ['method', 'path'],
  buckets: [0.005, 0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1, 2.5, 5, 10],
}));

export const httpRequestsActive = registry.register(new Gauge({
  name: 'http_requests_active',
  type: 'gauge',
  help: 'Active HTTP requests',
  labelNames: [],
}));

export const kafkaMessagesProcessed = registry.register(new Counter({
  name: 'kafka_messages_processed_total',
  type: 'counter',
  help: 'Total Kafka messages processed',
  labelNames: ['topic', 'status'],
}));

export const outboxEventsTotal = registry.register(new Counter({
  name: 'outbox_events_total',
  type: 'counter',
  help: 'Total outbox events by status',
  labelNames: ['status'],
}));

export const circuitBreakerState = registry.register(new Gauge({
  name: 'circuit_breaker_state',
  type: 'gauge',
  help: 'Circuit breaker state (0=CLOSED, 1=HALF_OPEN, 2=OPEN)',
  labelNames: ['name'],
}));

export const dbConnectionsActive = registry.register(new Gauge({
  name: 'db_connections_active',
  type: 'gauge',
  help: 'Active DB connections',
  labelNames: ['database'],
}));
