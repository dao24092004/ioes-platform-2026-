/**
 * Circuit Breaker - chống cascading failures.
 *
 * 3 states:
 * - CLOSED: normal, requests pass through. Track failures.
 * - OPEN: block requests immediately, return fallback. Sau timeout → HALF_OPEN.
 * - HALF_OPEN: thử 1 request. Nếu OK → CLOSED. Nếu fail → OPEN.
 *
 * @example
 * ```ts
 * const breaker = new CircuitBreaker({
 *   failureThreshold: 5,
 *   successThreshold: 2,
 *   timeout: 30_000,
 * });
 *
 * const result = await breaker.execute(() => dgraphQuery());
 * ```
 */
export interface CircuitBreakerConfig {
  /** Số lần fail liên tiếp → OPEN. */
  failureThreshold: number;
  /** Số lần success liên tiếp trong HALF_OPEN → CLOSED. */
  successThreshold: number;
  /** Timeout (ms) OPEN state → HALF_OPEN. */
  timeout: number;
  /** Tên breaker để log. */
  name?: string;
  /** Callback khi state thay đổi. */
  onStateChange?: (state: CircuitState, prev: CircuitState) => void;
}

export type CircuitState = 'CLOSED' | 'OPEN' | 'HALF_OPEN';

export class CircuitOpenError extends Error {
  constructor(public readonly breakerName: string) {
    super(`Circuit breaker '${breakerName}' is OPEN`);
    this.name = 'CircuitOpenError';
  }
}

export class CircuitBreaker {
  private state: CircuitState = 'CLOSED';
  private failureCount = 0;
  private successCount = 0;
  private nextAttemptTime = 0;
  private readonly config: CircuitBreakerConfig;
  private readonly name: string;

  constructor(config: CircuitBreakerConfig) {
    this.config = config;
    this.name = config.name ?? 'circuit-breaker';
  }

  /**
   * Execute fn với circuit breaker protection.
   * Throw CircuitOpenError nếu breaker OPEN.
   */
  async execute<T>(fn: () => Promise<T>): Promise<T> {
    if (this.state === 'OPEN') {
      if (Date.now() < this.nextAttemptTime) {
        throw new CircuitOpenError(this.name);
      }
      // Timeout expired → chuyển sang HALF_OPEN
      this.transition('HALF_OPEN');
    }

    try {
      const result = await fn();
      this.recordSuccess();
      return result;
    } catch (err) {
      this.recordFailure();
      throw err;
    }
  }

  /**
   * Lấy state hiện tại (cho monitoring/metrics).
   */
  getState(): CircuitState {
    // Auto-transition OPEN → HALF_OPEN nếu timeout đã expired
    if (this.state === 'OPEN' && Date.now() >= this.nextAttemptTime) {
      this.transition('HALF_OPEN');
    }
    return this.state;
  }

  /**
   * Force reset về CLOSED (cho manual recovery).
   */
  reset(): void {
    this.transition('CLOSED');
    this.failureCount = 0;
    this.successCount = 0;
    this.nextAttemptTime = 0;
  }

  /**
   * Stats cho metrics endpoint.
   */
  getStats(): {
    state: CircuitState;
    failureCount: number;
    successCount: number;
    nextAttemptTime: number;
  } {
    return {
      state: this.getState(),
      failureCount: this.failureCount,
      successCount: this.successCount,
      nextAttemptTime: this.nextAttemptTime,
    };
  }

  private recordSuccess(): void {
    this.failureCount = 0;

    if (this.state === 'HALF_OPEN') {
      this.successCount++;
      if (this.successCount >= this.config.successThreshold) {
        this.transition('CLOSED');
        this.successCount = 0;
      }
    }
  }

  private recordFailure(): void {
    this.successCount = 0;

    if (this.state === 'HALF_OPEN') {
      // Bất kỳ fail nào trong HALF_OPEN → OPEN lại
      this.trip();
      return;
    }

    if (this.state === 'CLOSED') {
      this.failureCount++;
      if (this.failureCount >= this.config.failureThreshold) {
        this.trip();
      }
    }
  }

  private trip(): void {
    this.nextAttemptTime = Date.now() + this.config.timeout;
    this.transition('OPEN');
  }

  private transition(newState: CircuitState): void {
    if (this.state === newState) return;
    const prev = this.state;
    this.state = newState;
    this.config.onStateChange?.(newState, prev);
  }
}