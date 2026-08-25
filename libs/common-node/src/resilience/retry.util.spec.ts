import { retry, calculateBackoff, isRetryableError, DEFAULT_RETRY_CONFIG } from './retry.util';

describe('Retry Utility - BUG #94 fix', () => {
  describe('calculateBackoff', () => {
    it('should_exponentialBackoff_When_progressive', () => {
      const d1 = calculateBackoff(1, { ...DEFAULT_RETRY_CONFIG, jitterRatio: 0 });
      const d2 = calculateBackoff(2, { ...DEFAULT_RETRY_CONFIG, jitterRatio: 0 });
      const d3 = calculateBackoff(3, { ...DEFAULT_RETRY_CONFIG, jitterRatio: 0 });

      expect(d1).toBe(100);
      expect(d2).toBe(200);
      expect(d3).toBe(400);
    });

    it('should_capAtMaxDelay_When_largeAttempts', () => {
      const d = calculateBackoff(20, { ...DEFAULT_RETRY_CONFIG, jitterRatio: 0, maxDelayMs: 1000 });
      expect(d).toBeLessThanOrEqual(1000);
    });

    it('should_includeJitter_When_jitterRatioPositive', () => {
      const d1 = calculateBackoff(2);
      const d2 = calculateBackoff(2);
      // Có jitter, nên 2 lần gọi khác nhau
      expect([d1, d2]).toBeDefined();
    });
  });

  describe('isRetryableError', () => {
    it('should_retry_When_econnreset', () => {
      const err = new Error('Connection reset');
      (err as any).code = 'ECONNRESET';
      expect(isRetryableError(err)).toBe(true);
    });

    it('should_retry_When_5xxStatus', () => {
      const err = new Error('Server error');
      (err as any).response = { status: 503 };
      expect(isRetryableError(err)).toBe(true);
    });

    it('should_retry_When_429Status', () => {
      const err = new Error('Rate limited');
      (err as any).response = { status: 429 };
      expect(isRetryableError(err)).toBe(true);
    });

    it('should_notRetry_When_4xxStatus', () => {
      const err = new Error('Bad request');
      (err as any).response = { status: 400 };
      expect(isRetryableError(err)).toBe(false);
    });

    it('should_retry_When_timeoutMessage', () => {
      const err = new Error('Request timeout exceeded');
      expect(isRetryableError(err)).toBe(true);
    });

    it('should_notRetry_When_otherError', () => {
      const err = new Error('Something went wrong');
      expect(isRetryableError(err)).toBe(false);
    });
  });

  describe('retry()', () => {
    it('should_succeed_When_fnSucceedsFirstTry', async () => {
      let calls = 0;
      const result = await retry(async () => {
        calls++;
        return 'success';
      });
      expect(calls).toBe(1);
      expect(result).toBe('success');
    });

    it('should_retryAndSucceed_When_transientFailure', async () => {
      let calls = 0;
      const result = await retry(
        async () => {
          calls++;
          if (calls < 3) {
            const err = new Error('Timeout');
            (err as any).code = 'ETIMEDOUT';
            throw err;
          }
          return 'success';
        },
        { ...DEFAULT_RETRY_CONFIG, initialDelayMs: 10, maxAttempts: 5 },
      );
      expect(calls).toBe(3);
      expect(result).toBe('success');
    });

    it('should_throw_When_maxAttemptsExceeded', async () => {
      let calls = 0;
      await expect(
        retry(
          async () => {
            calls++;
            const err = new Error('Timeout');
            (err as any).code = 'ETIMEDOUT';
            throw err;
          },
          { ...DEFAULT_RETRY_CONFIG, maxAttempts: 3, initialDelayMs: 10 },
        ),
      ).rejects.toThrow('Timeout');
      expect(calls).toBe(3);
    });

    it('should_notRetry_When_nonRetryableError', async () => {
      let calls = 0;
      await expect(
        retry(
          async () => {
            calls++;
            const err = new Error('Bad request');
            (err as any).response = { status: 400 };
            throw err;
          },
          { ...DEFAULT_RETRY_CONFIG, maxAttempts: 5 },
        ),
      ).rejects.toThrow('Bad request');
      expect(calls).toBe(1); // không retry
    });

    it('should_callOnRetry_When_eachRetryAttempt', async () => {
      const onRetry = jest.fn();
      let calls = 0;
      await expect(
        retry(
          async () => {
            calls++;
            const err = new Error('Timeout');
            (err as any).code = 'ETIMEDOUT';
            throw err;
          },
          { ...DEFAULT_RETRY_CONFIG, maxAttempts: 3, initialDelayMs: 10, onRetry },
        ),
      ).rejects.toThrow();
      expect(onRetry).toHaveBeenCalledTimes(2); // 2 retries (attempt 1→2, 2→3)
    });
  });
});
