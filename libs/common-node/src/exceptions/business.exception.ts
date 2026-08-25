import { HttpException, HttpStatus } from '@nestjs/common';
import { ERROR_CODES, ErrorCode } from '../constants/error-codes.constant';
import { maskPIIInValue } from '../utils/pii-mask.util';

/**
 * BusinessException - throw khi business rule fail.
 * Mang theo error code chuẩn để client xử lý được.
 *
 * BUG #100 fix: details được tự động sanitize để tránh leak PII
 * (email, phone, token, etc.) ra response.
 *
 * @see docs/02-architecture/error-codes.md
 */
export class BusinessException extends HttpException {
  constructor(
    public readonly errorCode: ErrorCode,
    message: string,
    status: HttpStatus = HttpStatus.BAD_REQUEST,
    public readonly details?: Record<string, unknown>,
  ) {
    // Auto-mask PII trong details trước khi gửi response
    const safeDetails = details ? maskPIIInValue(details) : undefined;
    super({ errorCode, message, details: safeDetails }, status);
  }

  static notFound(resource: string, id: string): BusinessException {
    // BUG #100 fix: ẩn id ra ngoài, chỉ log server-side
    return new BusinessException(
      ERROR_CODES.NOT_FOUND,
      `${resource} not found`,
      HttpStatus.NOT_FOUND,
      { resource }, // không leak id ra response
    );
  }

  static alreadyExists(resource: string, field: string, value: string): BusinessException {
    // BUG #100 fix: ẩn value ra ngoài để tránh enumeration attack
    // (vd: "email user@x.com exists" → attacker check valid emails)
    return new BusinessException(
      ERROR_CODES.ALREADY_EXISTS,
      `${resource} with this ${field} already exists`,
      HttpStatus.CONFLICT,
      { resource, field }, // không leak value
    );
  }

  static forbidden(message = 'Insufficient permission'): BusinessException {
    return new BusinessException(
      ERROR_CODES.INSUFFICIENT_PERMISSION,
      message,
      HttpStatus.FORBIDDEN,
    );
  }

  static validation(message: string, details?: Record<string, unknown>): BusinessException {
    return new BusinessException(ERROR_CODES.VALIDATION_FAILED, message, HttpStatus.BAD_REQUEST, details);
  }

  static conflict(message: string, details?: Record<string, unknown>): BusinessException {
    return new BusinessException(ERROR_CODES.CONFLICT, message, HttpStatus.CONFLICT, details);
  }

  /**
   * Rate limited - factory mới.
   */
  static rateLimited(retryAfter: number, message = 'Too many requests'): BusinessException {
    return new BusinessException(
      ERROR_CODES.RATE_LIMITED ?? 'RATE_LIMITED',
      message,
      HttpStatus.TOO_MANY_REQUESTS,
      { retryAfter },
    );
  }
}
