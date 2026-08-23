import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { v4 as uuidv4 } from 'uuid';

/**
 * @TraceId() - extract trace ID từ request header.
 *
 * Header ưu tiên:
 * - x-trace-id (preferred, matches our convention)
 * - x-request-id (generic)
 * - correlation-id (W3C trace context)
 *
 * Nếu không có → generate UUID v4.
 *
 * Trace ID được set vào request qua CorrelationIdMiddleware trước khi
 * handler chạy, đảm bảo mọi log/error response đều có.
 */
export const TraceId = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): string => {
    const request = ctx.switchToHttp().getRequest();
    return (
      request.headers?.['x-trace-id'] ||
      request.headers?.['x-request-id'] ||
      request.headers?.['correlation-id'] ||
      request.traceId || // set bởi CorrelationIdMiddleware
      uuidv4()
    );
  },
);