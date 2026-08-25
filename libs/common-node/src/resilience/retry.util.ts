/**
 * Retry configuration với exponential backoff + jitter.
 *
 * @example
 * ```ts
 * const result = await retry(() => dgraphQuery(), {
 *   maxAttempts: 5,
 *   initialDelayMs: 100,
 *   maxDelayMs: 10_000,
 *   backoffMultiplier: 2,
 *   jitterRatio: 0.2,
 *   retryableErrors: ['ECONNRESET', 'ETIMEDOUT', 'ENOTFOUND'],
 *   onRetry: (err, attempt) => logger.warn(`Retry ${attempt}: ${err.message}`),
 * });
 * ```
 */
export interface RetryConfig {
  maxAttempts: number;
  initialDelayMs: number;
  maxDelayMs: number;
  backoffMultiplier: number;
  jitterRatio: number;
  /** HTTP error codes / error names để retry. */
  retryableErrors: string[];
  onRetry?: (error: Error, attempt: number, delayMs: number) => void;
}

export const DEFAULT_RETRY_CONFIG: RetryConfig = {
  maxAttempts: 5,
  initialDelayMs: 100,
  maxDelayMs: 10_000,
  backoffMultiplier: 2,
  jitterRatio: 0.2,
  retryableErrors: [
    'ECONNRESET',
    'ETIMEDOUT',
    'ENOTFOUND',
    'EAI_AGAIN',
    'EPIPE',
    'ECONNREFUSED',
  ],
  onRetry: undefined,
};

/**
 * Calculate delay cho attempt number (exponential + jitter).
 * Formula: delay = min(initialDelay * (multiplier ^ attempt), maxDelay) ± jitter
 */
export function calculateBackoff(
  attempt: number,
  config: RetryConfig = DEFAULT_RETRY_CONFIG,
): number {
  const baseDelay = Math.min(
    config.maxDelayMs,
    config.initialDelayMs * Math.pow(config.backoffMultiplier, attempt - 1),
  );
  const jitter = baseDelay * config.jitterRatio * (Math.random() * 2 - 1);
  return Math.max(0, Math.floor(baseDelay + jitter));
}

/**
 * Determine nếu error có thể retry được.
 */
export function isRetryableError(
  error: Error,
  config: RetryConfig = DEFAULT_RETRY_CONFIG,
): boolean {
  const code = (error as any).code as string | undefined;
  if (code && config.retryableErrors.includes(code)) return true;

  // HTTP status codes (cho axios)
  const response = (error as any).response as { status?: number } | undefined;
  if (response?.status) {
    const status = response.status;
    // 5xx + 429 retryable, 4xx không
    return status >= 500 || status === 429;
  }

  // Timeout errors
  if (error.message.includes('timeout') || error.message.includes('Timeout')) {
    return true;
  }

  return false;
}

/**
 * Sleep helper.
 */
export function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Retry wrapper với exponential backoff.
 * Re-throw error nếu hết attempts hoặc không retryable.
 */
export async function retry<T>(
  fn: () => Promise<T>,
  config: RetryConfig = DEFAULT_RETRY_CONFIG,
): Promise<T> {
  let lastError: Error | undefined;

  for (let attempt = 1; attempt <= config.maxAttempts; attempt++) {
    try {
      return await fn();
    } catch (err) {
      lastError = err as Error;

      // Không retry nếu error không retryable
      if (!isRetryableError(lastError, config)) {
        throw lastError;
      }

      // Không retry nếu đã hết attempts
      if (attempt >= config.maxAttempts) {
        throw lastError;
      }

      const delayMs = calculateBackoff(attempt, config);
      config.onRetry?.(lastError, attempt, delayMs);

      await sleep(delayMs);
    }
  }

  throw lastError ?? new Error('Retry failed without error');
}