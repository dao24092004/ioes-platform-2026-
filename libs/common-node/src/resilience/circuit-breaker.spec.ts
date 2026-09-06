import { CircuitBreaker, CircuitOpenError } from './circuit-breaker';

describe('CircuitBreaker - BUG #95 fix', () => {
  describe('CLOSED state', () => {
    it('should_execute_When_closed', async () => {
      const breaker = new CircuitBreaker({
        failureThreshold: 3,
        successThreshold: 1,
        timeout: 1000,
      });

      const result = await breaker.execute(async () => 'ok');
      expect(result).toBe('ok');
      expect(breaker.getState()).toBe('CLOSED');
    });

    it('should_stayClosed_When_failuresBelowThreshold', async () => {
      const breaker = new CircuitBreaker({
        failureThreshold: 3,
        successThreshold: 1,
        timeout: 1000,
      });

      for (let i = 0; i < 2; i++) {
        await expect(
          breaker.execute(async () => {
            throw new Error('fail');
          }),
        ).rejects.toThrow('fail');
      }
      expect(breaker.getState()).toBe('CLOSED');
    });
  });

  describe('OPEN state', () => {
    it('should_open_When_failuresExceedThreshold', async () => {
      const breaker = new CircuitBreaker({
        failureThreshold: 3,
        successThreshold: 1,
        timeout: 1000,
      });

      for (let i = 0; i < 3; i++) {
        await expect(
          breaker.execute(async () => {
            throw new Error('fail');
          }),
        ).rejects.toThrow();
      }

      expect(breaker.getState()).toBe('OPEN');

      await expect(
        breaker.execute(async () => 'ok'),
      ).rejects.toThrow(CircuitOpenError);
    });

    it('should_transitionToHalfOpen_When_timeoutExpired', async () => {
      const breaker = new CircuitBreaker({
        failureThreshold: 1,
        successThreshold: 1,
        timeout: 50,
      });

      await expect(
        breaker.execute(async () => {
          throw new Error('fail');
        }),
      ).rejects.toThrow();

      expect(breaker.getState()).toBe('OPEN');

      await new Promise((resolve) => setTimeout(resolve, 60));

      expect(breaker.getState()).toBe('HALF_OPEN');
    });
  });

  describe('HALF_OPEN state', () => {
    it('should_close_When_successThresholdReached', async () => {
      const breaker = new CircuitBreaker({
        failureThreshold: 1,
        successThreshold: 2,
        timeout: 10,
      });

      // Trigger OPEN
      await expect(
        breaker.execute(async () => {
          throw new Error('fail');
        }),
      ).rejects.toThrow();

      await new Promise((resolve) => setTimeout(resolve, 20));
      expect(breaker.getState()).toBe('HALF_OPEN');

      // 2 successes → CLOSED
      await breaker.execute(async () => 'ok');
      await breaker.execute(async () => 'ok');

      expect(breaker.getState()).toBe('CLOSED');
    });

    it('should_reopen_When_failInHalfOpen', async () => {
      const breaker = new CircuitBreaker({
        failureThreshold: 1,
        successThreshold: 2,
        timeout: 10,
      });

      await expect(
        breaker.execute(async () => {
          throw new Error('fail');
        }),
      ).rejects.toThrow();

      await new Promise((resolve) => setTimeout(resolve, 20));

      // Fail trong HALF_OPEN → OPEN
      await expect(
        breaker.execute(async () => {
          throw new Error('still failing');
        }),
      ).rejects.toThrow();

      expect(breaker.getState()).toBe('OPEN');
    });
  });

  describe('reset()', () => {
    it('should_resetToClosed_When_called', async () => {
      const breaker = new CircuitBreaker({
        failureThreshold: 1,
        successThreshold: 1,
        timeout: 60_000,
      });

      await expect(
        breaker.execute(async () => {
          throw new Error('fail');
        }),
      ).rejects.toThrow();

      expect(breaker.getState()).toBe('OPEN');

      breaker.reset();
      expect(breaker.getState()).toBe('CLOSED');

      const result = await breaker.execute(async () => 'ok');
      expect(result).toBe('ok');
    });
  });

  describe('state change callback', () => {
    it('should_callOnStateChange_When_transition', async () => {
      const onStateChange = jest.fn();
      const breaker = new CircuitBreaker({
        failureThreshold: 1,
        successThreshold: 1,
        timeout: 10,
        onStateChange,
      });

      await expect(
        breaker.execute(async () => {
          throw new Error('fail');
        }),
      ).rejects.toThrow();

      expect(onStateChange).toHaveBeenCalledWith('OPEN', 'CLOSED');
    });
  });
});
