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

// Decorators
export * from './decorators/current-user.decorator';
export * from './decorators/roles.decorator';
export * from './decorators/public.decorator';
export * from './decorators/user-id.decorator';
export * from './decorators/cache.decorator';

// DTOs
export * from './dto/api-response.dto';
export * from './dto/user-principal.dto';

// Utils
export * from './utils/logger.util';
export * from './utils/validator.util';

// Constants
export * from './constants/events.constant';
export * from './constants/error-codes.constant';

// Types
export * from './types/jwt-payload.type';
