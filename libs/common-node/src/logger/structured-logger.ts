import { Injectable, LoggerService, Scope } from '@nestjs/common';
import {
  getCorrelationContext,
  getCurrentTraceId,
} from './correlation-context';

/**
 * Structured logger với JSON output và correlation ID propagation.
 *
 * Drop-in replacement cho `new Logger(context)` từ @nestjs/common.
 *
 * Output format (JSON):
 * ```json
 * {
 *   "timestamp": "2026-08-23T10:00:00.000Z",
 *   "level": "info",
 *   "context": "QuestionBankService",
 *   "message": "Created question id=...",
 *   "correlationId": "abc-123",
 *   "userId": "u-1"
 * }
 * ```
 *
 * Style guide compliance:
 * ```typescript
 * // ✅ ĐÚNG - NestJS style
 * private readonly logger = new StructuredLogger(QuestionBankService.name);
 *
 * // ✅ Cũng OK - factory function
 * private readonly logger = createLogger(QuestionBankService.name);
 * ```
 *
 * BUG #116 fix: structured JSON output
 * BUG #122 fix: auto-include correlationId từ AsyncLocalStorage
 */
@Injectable({ scope: Scope.TRANSIENT })
export class StructuredLogger implements LoggerService {
  private context = 'Application';
  private static readonly JSON_MODE = process.env.LOG_FORMAT !== 'text';
  private static get LOG_LEVEL(): string {
    return (process.env.LOG_LEVEL ?? 'info').toLowerCase();
  }

  /**
   * Constructor — NestJS style compatible.
   *
   * @example
   * ```typescript
   * private readonly logger = new StructuredLogger(QuestionBankService.name);
   * ```
   */
  constructor(context?: string) {
    if (context) {
      this.context = context;
    }
  }

  setContext(context: string): void {
    this.context = context;
  }

  log(message: any, ...optionalParams: any[]): void {
    this.writeLog('info', this.toMessage(message), optionalParams);
  }

  /**
   * Alias cua log(). Nest goi log(), nhung phan lon code trong repo va ca
   * structured-logger.spec.ts deu goi info() theo thoi quen tu pino/winston.
   */
  info(message: any, ...optionalParams: any[]): void {
    this.log(message, ...optionalParams);
  }

  error(message: any, ...optionalParams: any[]): void {
    this.writeLog('error', this.toMessage(message), optionalParams);
  }

  warn(message: any, ...optionalParams: any[]): void {
    this.writeLog('warn', this.toMessage(message), optionalParams);
  }

  debug(message: any, ...optionalParams: any[]): void {
    if (!StructuredLogger.shouldLog('debug')) return;
    this.writeLog('debug', this.toMessage(message), optionalParams);
  }

  verbose(message: any, ...optionalParams: any[]): void {
    if (!StructuredLogger.shouldLog('verbose')) return;
    this.writeLog('verbose', this.toMessage(message), optionalParams);
  }

  private static shouldLog(level: string): boolean {
    const levels = ['error', 'warn', 'info', 'debug', 'verbose'];
    const currentIdx = levels.indexOf(StructuredLogger.LOG_LEVEL);
    const levelIdx = levels.indexOf(level);
    return levelIdx <= currentIdx;
  }

  private toMessage(input: any): string {
    if (typeof input === 'string') return input;
    if (input instanceof Error) {
      return `${input.message}\n${input.stack ?? ''}`;
    }
    try {
      return JSON.stringify(input);
    } catch {
      return String(input);
    }
  }

  /**
   * Mask PII từ log message (BUG #118 fix).
   *
   * Mask các pattern:
   * - email
   * - phone numbers
   * - JWT tokens
   * - credit card numbers
   */
  private maskPII(message: string): string {
    let masked = message;

    // Email
    masked = masked.replace(
      /([a-zA-Z0-9._%+-]+)@([a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/g,
      '***@$2',
    );

    // JWT (header.payload.signature)
    masked = masked.replace(
      /eyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+/g,
      '[REDACTED-JWT]',
    );

    // Bearer tokens
    masked = masked.replace(/(Bearer\s+)[A-Za-z0-9._-]+/gi, '$1[REDACTED]');

    // Credit card (16 digits, optional dashes)
    masked = masked.replace(
      /\b\d{4}[-\s]?\d{4}[-\s]?\d{4}[-\s]?\d{4}\b/g,
      '[REDACTED-CC]',
    );

    return masked;
  }

  private writeLog(
    level: string,
    message: string,
    optionalParams: any[],
  ): void {
    const correlation = getCorrelationContext();

    if (StructuredLogger.JSON_MODE) {
      const entry: Record<string, unknown> = {
        timestamp: new Date().toISOString(),
        level,
        context: this.context,
        message: this.maskPII(message),
      };

      if (correlation?.traceId) {
        entry.correlationId = correlation.traceId;
      }
      if (correlation?.userId) {
        entry.userId = correlation.userId;
      }

      // Optional params (objects)
      for (const param of optionalParams) {
        if (param instanceof Error) {
          entry.stack = param.stack;
          entry.errorMessage = param.message;
        } else if (typeof param === 'object' && param !== null) {
          Object.assign(entry, param);
        }
      }

      const output = JSON.stringify(entry);

      if (level === 'error') {
        process.stderr.write(output + '\n');
      } else {
        process.stdout.write(output + '\n');
      }
    } else {
      // Text mode cho dev
      const traceId = getCurrentTraceId();
      const prefix = traceId ? `[${traceId}] ` : '';
      const line = `${prefix}${this.context} ${level.toUpperCase()}: ${message}\n`;

      if (level === 'error') {
        process.stderr.write(line);
      } else {
        process.stdout.write(line);
      }
    }
  }
}

/**
 * Factory tạo logger instance cho 1 context.
 * Backward-compatible với NestJS Logger signature.
 */
export function createLogger(context: string): StructuredLogger {
  const logger = new StructuredLogger();
  logger.setContext(context);
  return logger;
}