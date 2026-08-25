import { Injectable, NestInterceptor, ExecutionContext, CallHandler } from '@nestjs/common';
import { Observable, tap } from 'rxjs';
import { Request, Response } from 'express';
import { createLogger } from '../utils/logger.util';
import {
  getCorrelationContext,
} from '../logger/correlation-context';

/**
 * Audit Log - track write operations (POST/PATCH/DELETE).
 *
 * Use case: forensics, compliance (GDPR/SOC2), debug "who changed what".
 *
 * Log fields:
 * - actor (userId, email, role)
 * - action (method + path)
 * - resource (id nếu có)
 * - timestamp
 * - correlationId
 * - result (status)
 * - duration
 *
 * BUG #113 fix: every write operation được log
 *
 * Read operations (GET) KHÔNG log để tránh spam.
 */
@Injectable()
export class AuditLogInterceptor implements NestInterceptor {
  private readonly logger = createLogger('AUDIT');

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const http = context.switchToHttp();
    const req = http.getRequest<Request>();
    const res = http.getResponse<Response>();
    const start = Date.now();

    const method = req.method?.toUpperCase() ?? 'GET';
    const isWrite = ['POST', 'PATCH', 'PUT', 'DELETE'].includes(method);

    if (!isWrite) {
      return next.handle();
    }

    const user = (req as any).user;
    const correlation = getCorrelationContext();

    return next.handle().pipe(
      tap({
        next: () => {
          this.log({
            method,
            path: req.originalUrl ?? req.url,
            status: res.statusCode,
            userId: user?.sub ?? user?.userId,
            userEmail: user?.email,
            userRole: user?.role,
            correlationId: correlation?.traceId,
            durationMs: Date.now() - start,
            ip: req.ip,
            userAgent: req.headers?.['user-agent'],
            result: 'SUCCESS',
          });
        },
        error: (err: Error) => {
          this.log({
            method,
            path: req.originalUrl ?? req.url,
            status: res.statusCode || 500,
            userId: user?.sub ?? user?.userId,
            userEmail: user?.email,
            userRole: user?.role,
            correlationId: correlation?.traceId,
            durationMs: Date.now() - start,
            ip: req.ip,
            userAgent: req.headers?.['user-agent'],
            result: 'FAILURE',
            errorMessage: err.message,
          });
        },
      }),
    );
  }

  private log(data: Record<string, unknown>): void {
    // PII masking: chỉ log first 3 chars của email
    if (data.userEmail && typeof data.userEmail === 'string') {
      const [local, domain] = data.userEmail.split('@');
      data.userEmail = domain
        ? `${local.slice(0, 3)}***@${domain}`
        : `${data.userEmail.slice(0, 3)}***`;
    }

    this.logger.log('Audit event', data);
  }
}