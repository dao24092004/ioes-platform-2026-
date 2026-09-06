import { AsyncLocalStorage } from 'node:async_hooks';

export interface CorrelationContext {
  traceId: string;
  userId?: string;
  /** Additional context có thể propagate (vd: tenantId, requestPath). */
  [key: string]: unknown;
}

const storage = new AsyncLocalStorage<CorrelationContext>();

/**
 * Run callback với correlation context. Mọi log trong scope sẽ tự
 * kèm traceId + userId.
 *
 * @example
 * ```ts
 * runWithCorrelationContext({ traceId: 'abc' }, () => {
 *   logger.info('Hello'); // log sẽ có correlationId: 'abc'
 * });
 * ```
 */
export function runWithCorrelationContext<T>(
  context: CorrelationContext,
  fn: () => T,
): T {
  return storage.run(context, fn);
}

/**
 * Lấy correlation context hiện tại (undefined nếu không trong scope).
 */
export function getCorrelationContext(): CorrelationContext | undefined {
  return storage.getStore();
}

/**
 * Lấy trace ID hiện tại (undefined nếu không có).
 */
export function getCurrentTraceId(): string | undefined {
  return storage.getStore()?.traceId;
}

/**
 * Set userId vào context (gọi từ JWT guard sau khi auth).
 */
export function setCorrelationUserId(userId: string): void {
  const ctx = storage.getStore();
  if (ctx) {
    ctx.userId = userId;
  }
}