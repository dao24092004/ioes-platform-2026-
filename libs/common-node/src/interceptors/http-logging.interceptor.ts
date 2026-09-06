import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from '@nestjs/common';
import { Observable, tap, catchError, throwError } from 'rxjs';
import { Request, Response } from 'express';
import { createLogger } from '../utils/logger.util';

/**
 * HttpLoggingInterceptor - log mỗi HTTP request/response.
 *
 * Log structured fields:
 * - method, url, status, latencyMs, contentLength, userAgent, ip
 * - correlationId (từ AsyncLocalStorage context)
 * - error nếu có
 *
 * BUG #119 fix: mọi HTTP request đều có log entry
 *
 * Sensitive paths (auth, etc.) có thể được filter qua options.
 */
@Injectable()
export class HttpLoggingInterceptor implements NestInterceptor {
  private readonly logger = createLogger('HTTP');

  private static readonly SENSITIVE_PATHS = [
    '/auth/login',
    '/auth/register',
    '/auth/refresh',
    '/auth/forgot-password',
    '/users/reset-password',
  ];

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const http = context.switchToHttp();
    const req = http.getRequest<Request>();
    const res = http.getResponse<Response>();
    const start = Date.now();

    const isSensitive = HttpLoggingInterceptor.SENSITIVE_PATHS.some((p) =>
      req.path?.startsWith(p),
    );

    return next.handle().pipe(
      tap(() => {
        const latency = Date.now() - start;
        this.logRequest(req, res, latency, null, isSensitive);
      }),
      catchError((err) => {
        const latency = Date.now() - start;
        this.logRequest(req, res, latency, err, isSensitive);
        return throwError(() => err);
      }),
    );
  }

  private logRequest(
    req: Request,
    res: Response,
    latencyMs: number,
    error: Error | null,
    sensitive: boolean,
  ): void {
    const status = res.statusCode;
    const level: 'error' | 'warn' | 'log' =
      error || status >= 500
        ? 'error'
        : status >= 400
          ? 'warn'
          : 'log';

    const logData: Record<string, unknown> = {
      method: req.method,
      url: req.originalUrl ?? req.url,
      status,
      latencyMs,
      contentLength: res.getHeader('content-length') ?? 0,
      ip: req.ip ?? req.socket?.remoteAddress,
      userAgent: req.headers?.['user-agent'],
    };

    if (sensitive) {
      // Không log body, chỉ metadata
      logData.body = '[REDACTED]';
    }

    if (error) {
      logData.error = error.message;
      if (error.stack) {
        logData.stack = error.stack.split('\n').slice(0, 3).join('\n');
      }
    }

    this.logger[level]('HTTP request', logData);
  }
}