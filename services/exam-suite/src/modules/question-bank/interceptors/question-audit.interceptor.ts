import { Injectable, NestInterceptor, ExecutionContext, CallHandler } from '@nestjs/common';
import { Observable, tap } from 'rxjs';
import { Request, Response } from 'express';
import { StructuredLogger } from '@ioes/common-node';

/**
 * Audit interceptor cho Question Bank writes.
 *
 * Log tất cả POST/PATCH/DELETE operations để phục vụ audit trail
 * (theo service-boundaries §9.3 Defense in Depth).
 *
 * Style guide: kebab-case file name, NestJS Logger convention.
 */
@Injectable()
export class QuestionAuditInterceptor implements NestInterceptor {
  private readonly logger = new StructuredLogger(QuestionAuditInterceptor.name);

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const http = context.switchToHttp();
    const req = http.getRequest<Request>();
    const res = http.getResponse<Response>();
    const method = req.method?.toUpperCase() ?? 'GET';
    const isWrite = ['POST', 'PATCH', 'PUT', 'DELETE'].includes(method);

    if (!isWrite) {
      return next.handle();
    }

    const start = Date.now();
    const user = (req as any).user;

    return next.handle().pipe(
      tap({
        next: () => {
          this.logger.log(
            `audit method=${method} path=${req.originalUrl} status=${res.statusCode} userId=${user?.sub ?? 'anon'} durationMs=${Date.now() - start}`,
          );
        },
        error: (err: Error) => {
          this.logger.warn(
            `audit method=${method} path=${req.originalUrl} status=${res.statusCode || 500} userId=${user?.sub ?? 'anon'} error=${err.message} durationMs=${Date.now() - start}`,
          );
        },
      }),
    );
  }
}
