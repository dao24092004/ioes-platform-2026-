/**
 * IOES Common Node Library - Main Entry Point
 *
 * Exports shared utilities, filters, guards, decorators and types
 * for use across all Node.js microservices (exam-suite, blockchain-suite, ai-suite).
 */

// Filters
export * from './filters/global-exception.filter';
export * from './filters/http-exception.filter';
export * from './filters/validation-exception.filter';

// Guards
export * from './guards/jwt-auth.guard';
export * from './guards/roles.guard';
export * from './guards/rate-limit.guard';
export * from './guards/ownership.guard';
export * from './guards/tenant.guard';

// Resilience
export * from './resilience/retry.util';
export * from './resilience/circuit-breaker';

// Validators
export * from './validators/cross-field.validators';

// Cache
export * from './cache/cache.store';
export * from './cache/cache.decorator';
export * from './cache/cache.interceptor';

// Discovery
export * from './discovery/eureka-client';

// Service Client
export * from './service-client/service-client.base';
export * from './service-client/auth-client';

// Events
export * from './events/event-envelope';
export * from './events/event-publisher';
export * from './events/exam-events';
export * from './events/outbox-event.entity';
export * from './events/outbox.service';
export * from './events/base-event-consumer';

// Logging
export * from './logger/correlation-context';
export * from './logger/structured-logger';

// Metrics
export * from './metrics';

// Controllers
export * from './controllers/metrics.controller';

// Middleware
export * from './middleware/correlation-id.middleware';

// Interceptors
export * from './interceptors/http-logging.interceptor';
export * from './interceptors/audit-log.interceptor';

// Config helpers
export * from './config/setup-jwt';

// Decorators
export * from './decorators/current-user.decorator';
export * from './decorators/roles.decorator';
export * from './decorators/public.decorator';
export * from './decorators/user-id.decorator';
export * from './decorators/cache.decorator';
export * from './decorators/trace-id.decorator';
export * from './decorators/api-property.decorator';

// DTOs
export * from './dto/api-response.dto';
export * from './dto/user-principal.dto';

// Exceptions
export * from './exceptions/business.exception';

// Utils
export * from './utils/validator.util';
export * from './utils/pii-mask.util';

// Constants
export * from './constants/events.constant';
export * from './constants/error-codes.constant';

// Types
export * from './types/jwt-payload.type';

// Events (shared schemas)
export * from './events/event-envelope';
export * from './events/build-event-envelope';
export * from './events/event-publisher';
export * from './events/question-event';
export * from './events/question-types';

// Kafka
export * from './kafka/kafka.options';
export * from './kafka/kafka.producer';
export * from './kafka/kafka.consumer';
export * from './kafka/kafka.module';
