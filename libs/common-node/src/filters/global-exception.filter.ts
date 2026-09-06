import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { Request, Response } from 'express';
import { ApiResponse } from '../dto/api-response.dto';
import { StructuredLogger } from '../logger/structured-logger';
import {
  getCorrelationContext,
  getCurrentTraceId,
} from '../logger/correlation-context';
import { maskPIIInValue } from '../utils/pii-mask.util';

/**
 * Global Exception Filter - catch ALL unhandled exceptions.
 *
 * BUG #102 fix: log stack trace cho HttpException errors
 * BUG #103 fix: sanitize error message trong production
 * BUG #104 fix: phân biệt prod/dev mode
 */
@Catch()
export class GlobalExceptionFilter implements ExceptionFilter {
  private readonly logger = new StructuredLogger();
  private readonly isProd = process.env.NODE_ENV === 'production';

  constructor() {
    this.logger.setContext(GlobalExceptionFilter.name);
  }

  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    let status = HttpStatus.INTERNAL_SERVER_ERROR;
    let message = 'Internal server error';
    let stack: string | undefined;

    if (exception instanceof HttpException) {
      status = exception.getStatus();
      const res = exception.getResponse();
      const responseMsg =
        typeof res === 'string'
          ? res
          : ((res as any).message ?? exception.message);

      // BUG #102 fix: log stack cho HttpException (NestJS errors)
      // HttpException có thể có .cause (từ Node 17+)
      const cause = (exception as any).cause;
      if (cause instanceof Error) {
        stack = cause.stack;
      } else if (exception instanceof Error) {
        stack = exception.stack;
      }

      message = Array.isArray(responseMsg) ? responseMsg.join('; ') : responseMsg;
    } else if (exception instanceof Error) {
      message = exception.message;
      stack = exception.stack;
    }

    const traceId =
      getCurrentTraceId() ||
      (request.headers['x-trace-id'] as string) ||
      (request.headers['x-request-id'] as string) ||
      'unknown';

    // Log với structured format
    this.logger.error(
      `Unhandled exception: ${message}`,
      {
        method: request.method,
        url: request.originalUrl ?? request.url,
        status,
        ip: request.ip,
        userAgent: request.headers?.['user-agent'],
        stack,
        traceId,
      },
    );

    // BUG #104 fix: production → generic message, dev → include details
    const safeMessage = this.isProd && status >= 500 ? 'Internal server error' : message;

    // BUG #100 fix: sanitize details trước khi trả về response
    const safeDetails = maskPIIInValue({
      path: request.originalUrl ?? request.url,
      method: request.method,
      traceId,
      ...(this.isProd ? {} : { stack }),
    });

    response.status(status).json(ApiResponse.error(safeMessage, safeDetails));
  }
}