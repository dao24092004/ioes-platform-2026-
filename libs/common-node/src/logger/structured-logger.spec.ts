import { StructuredLogger, createLogger } from './structured-logger';
import { runWithCorrelationContext } from './correlation-context';

describe('StructuredLogger - BUG #116/#118/#122 fix', () => {
  describe('JSON output', () => {
    let writeSpy: jest.SpyInstance;

    beforeEach(() => {
      process.env.LOG_FORMAT = 'json';
      writeSpy = jest.spyOn(process.stdout, 'write').mockImplementation(() => true);
    });

    afterEach(() => {
      writeSpy.mockRestore();
    });

    it('should_outputJson_When_logCalled', () => {
      const logger = createLogger('TestService');
      logger.info('Hello world');

      expect(writeSpy).toHaveBeenCalled();
      const logStr = writeSpy.mock.calls[0][0] as string;
      const parsed = JSON.parse(logStr);

      expect(parsed).toMatchObject({
        level: 'info',
        context: 'TestService',
        message: 'Hello world',
      });
      expect(parsed.timestamp).toBeDefined();
    });

    it('should_includeCorrelationId_When_inContext', () => {
      const logger = createLogger('TestService');

      runWithCorrelationContext({ traceId: 'corr-123' }, () => {
        logger.info('With correlation');
      });

      const parsed = JSON.parse(writeSpy.mock.calls[0][0] as string);
      expect(parsed.correlationId).toBe('corr-123');
    });

    it('should_includeUserId_When_inContext', () => {
      const logger = createLogger('TestService');

      runWithCorrelationContext({ traceId: 't1', userId: 'user-1' }, () => {
        logger.info('User action');
      });

      const parsed = JSON.parse(writeSpy.mock.calls[0][0] as string);
      expect(parsed.userId).toBe('user-1');
    });
  });

  describe('PII Masking - BUG #118', () => {
    let writeSpy: jest.SpyInstance;

    beforeEach(() => {
      process.env.LOG_FORMAT = 'json';
      writeSpy = jest.spyOn(process.stdout, 'write').mockImplementation(() => true);
    });

    afterEach(() => {
      writeSpy.mockRestore();
    });

    it('should_maskEmail_When_logContainsEmail', () => {
      const logger = createLogger('Test');
      logger.info('User email is user@example.com');

      const parsed = JSON.parse(writeSpy.mock.calls[0][0] as string);
      expect(parsed.message).toContain('***@example.com');
      expect(parsed.message).not.toContain('user@');
    });

    it('should_maskJWT_When_logContainsToken', () => {
      const logger = createLogger('Test');
      logger.info('Auth header: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIn0.SflKxwRJSMeKKF2QT4fwpMeJf36POk6yJV_adQssw5c');

      const parsed = JSON.parse(writeSpy.mock.calls[0][0] as string);
      expect(parsed.message).toContain('[REDACTED-JWT]');
      expect(parsed.message).not.toContain('eyJ');
    });

    it('should_maskCreditCard_When_logContainsCard', () => {
      const logger = createLogger('Test');
      logger.info('Card: 4111-1111-1111-1111');

      const parsed = JSON.parse(writeSpy.mock.calls[0][0] as string);
      expect(parsed.message).toContain('[REDACTED-CC]');
    });
  });

  describe('Log levels - BUG #117 fix', () => {
    let writeSpy: jest.SpyInstance;

    beforeEach(() => {
      process.env.LOG_FORMAT = 'json';
      writeSpy = jest.spyOn(process.stdout, 'write').mockImplementation(() => true);
    });

    afterEach(() => {
      writeSpy.mockRestore();
      process.env.LOG_LEVEL = 'info';
    });

    it('should_skipDebug_When_levelInfo', () => {
      process.env.LOG_LEVEL = 'info';
      const logger = createLogger('Test');
      logger.debug('Debug message');

      expect(writeSpy).not.toHaveBeenCalled();
    });

    it('should_logDebug_When_levelDebug', () => {
      process.env.LOG_LEVEL = 'debug';
      const logger = createLogger('Test');
      logger.debug('Debug message');

      expect(writeSpy).toHaveBeenCalled();
    });
  });
});
