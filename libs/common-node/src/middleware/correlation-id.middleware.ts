import { Injectable, NestMiddleware } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { runWithCorrelationContext } from '../logger/correlation-context';

/**
 * CorrelationIdMiddleware - đảm bảo mọi request có trace ID + AsyncLocalStorage context.
 *
 * Headers accepted:
 * - x-trace-id (preferred)
 * - x-request-id (generic)
 * - correlation-id (W3C)
 *
 * Nếu không có → generate UUID v4.
 *
 * Trace ID sẽ được:
 * 1. Set vào `req.traceId` để handler access
 * 2. Set vào response header `x-trace-id` để client trace back
 * 3. Wrapped trong AsyncLocalStorage context → mọi log trong request
 *    đều tự động kèm correlationId
 */
@Injectable()
export class CorrelationIdMiddleware implements NestMiddleware {
  use(req: Request, res: Response, next: NextFunction): void {
    const traceId =
      (req.headers['x-trace-id'] as string) ||
      (req.headers['x-request-id'] as string) ||
      (req.headers['correlation-id'] as string) ||
      uuidv4();

    // Set vào request để handler access qua @TraceId()
    (req as any).traceId = traceId;
    res.setHeader('x-trace-id', traceId);

    // Wrap trong AsyncLocalStorage context → logs tự kèm correlationId
    runWithCorrelationContext({ traceId, userId: undefined }, () => {
      next();
    });
  }
}