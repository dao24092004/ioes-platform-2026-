import { Repository } from 'typeorm';
import { BaseEventConsumer } from './base-event-consumer';
import { ProcessedEvent } from './outbox-event.entity';
import { KafkaConsumer, KafkaMessageContext } from '../kafka/kafka.consumer';
import { StructuredLogger } from '../logger/structured-logger';
import { EventEnvelope } from './event-envelope';

class TestConsumer extends BaseEventConsumer<{ userId: string }> {
  protected readonly logger = new StructuredLogger(TestConsumer.name);
  public handleCallCount = 0;
  public lastEnvelope: EventEnvelope<{ userId: string }> | null = null;

  protected async handleEvent(envelope: EventEnvelope<{ userId: string }>): Promise<void> {
    this.handleCallCount++;
    this.lastEnvelope = envelope;
  }
}

describe('BaseEventConsumer - Atomic claim pattern (ADR-004)', () => {
  let consumer: TestConsumer;
  let processedRepo: jest.Mocked<Repository<ProcessedEvent>>;
  let kafka: jest.Mocked<KafkaConsumer>;

  beforeEach(() => {
    processedRepo = {
      createQueryBuilder: jest.fn(),
      delete: jest.fn(),
    } as any;
    kafka = {
      subscribe: jest.fn(),
    } as any;

    consumer = new TestConsumer(
      processedRepo,
      kafka,
      'test.topic',
      'test-group',
      'TestConsumer',
    );
  });

  describe('subscribe()', () => {
    it('should_subscribeToTopic_When_initialized', async () => {
      await consumer.onModuleInit();
      expect(kafka.subscribe).toHaveBeenCalledWith(
        'test.topic',
        'test-group',
        expect.any(Function),
      );
    });
  });

  describe('atomic claim', () => {
    it('should_handleMessage_When_claimSucceeds', async () => {
      const mockBuilder: any = {
        insert: jest.fn().mockReturnThis(),
        into: jest.fn().mockReturnThis(),
        values: jest.fn().mockReturnThis(),
        orIgnore: jest.fn().mockReturnThis(),
        execute: jest.fn().mockResolvedValue({ identifiers: [{ id: '1' }] }),
      };
      processedRepo.createQueryBuilder = jest.fn().mockReturnValue(mockBuilder);

      let capturedHandler: ((msg: KafkaMessageContext) => Promise<void>) | null = null;
      kafka.subscribe = jest.fn((_topic, _group, handler) => {
        capturedHandler = handler;
      }) as any;

      await consumer.onModuleInit();
      expect(capturedHandler).toBeTruthy();

      const envelope: EventEnvelope<{ userId: string }> = {
        eventId: 'event-1',
        eventType: 'UserRegistered',
        eventVersion: '1.0',
        occurredAt: new Date().toISOString(),
        aggregateId: 'user-1',
        aggregateType: 'User',
        correlationId: 'trace-1',
        source: 'auth-service',
        payload: { userId: 'user-1' },
      };

      await capturedHandler!({
        topic: 'test.topic',
        partition: 0,
        message: {
          value: Buffer.from(JSON.stringify(envelope)),
          offset: '0',
        } as any,
        heartbeat: jest.fn(),
        pause: jest.fn(),
      } as KafkaMessageContext);

      expect(consumer.handleCallCount).toBe(1);
      expect(consumer.lastEnvelope?.eventId).toBe('event-1');
    });

    it('should_skipMessage_When_alreadyClaimed', async () => {
      const mockBuilder: any = {
        insert: jest.fn().mockReturnThis(),
        into: jest.fn().mockReturnThis(),
        values: jest.fn().mockReturnThis(),
        orIgnore: jest.fn().mockReturnThis(),
        execute: jest.fn().mockResolvedValue({ identifiers: [] }),
      };
      processedRepo.createQueryBuilder = jest.fn().mockReturnValue(mockBuilder);

      let capturedHandler: ((msg: KafkaMessageContext) => Promise<void>) | null = null;
      kafka.subscribe = jest.fn((_t, _g, handler) => {
        capturedHandler = handler;
      }) as any;

      await consumer.onModuleInit();

      const envelope: EventEnvelope<{ userId: string }> = {
        eventId: 'dup-1',
        eventType: 'UserRegistered',
        eventVersion: '1.0',
        occurredAt: new Date().toISOString(),
        aggregateId: 'user-1',
        aggregateType: 'User',
        correlationId: 'trace-1',
        source: 'auth-service',
        payload: { userId: 'user-1' },
      };

      await capturedHandler!({
        topic: 'test.topic',
        partition: 0,
        message: { value: Buffer.from(JSON.stringify(envelope)), offset: '0' } as any,
        heartbeat: jest.fn(),
        pause: jest.fn(),
      } as KafkaMessageContext);

      expect(consumer.handleCallCount).toBe(0);
    });

    it('should_releaseClaim_When_handlerFails', async () => {
      const mockBuilder: any = {
        insert: jest.fn().mockReturnThis(),
        into: jest.fn().mockReturnThis(),
        values: jest.fn().mockReturnThis(),
        orIgnore: jest.fn().mockReturnThis(),
        execute: jest.fn().mockResolvedValue({ identifiers: [{ id: '1' }] }),
      };
      processedRepo.createQueryBuilder = jest.fn().mockReturnValue(mockBuilder);
      processedRepo.delete = jest.fn().mockResolvedValue({ affected: 1 });

      let capturedHandler: ((msg: KafkaMessageContext) => Promise<void>) | null = null;
      kafka.subscribe = jest.fn((_t, _g, handler) => {
        capturedHandler = handler;
      }) as any;

      consumer.handleEvent = jest.fn().mockRejectedValue(new Error('boom')) as any;

      await consumer.onModuleInit();

      const envelope: EventEnvelope<{ userId: string }> = {
        eventId: 'fail-1',
        eventType: 'UserRegistered',
        eventVersion: '1.0',
        occurredAt: new Date().toISOString(),
        aggregateId: 'user-1',
        aggregateType: 'User',
        correlationId: 'trace-1',
        source: 'auth-service',
        payload: { userId: 'user-1' },
      };

      await expect(
        capturedHandler!({
          topic: 'test.topic',
          partition: 0,
          message: { value: Buffer.from(JSON.stringify(envelope)), offset: '0' } as any,
          heartbeat: jest.fn(),
          pause: jest.fn(),
        } as KafkaMessageContext),
      ).rejects.toThrow('boom');

      expect(processedRepo.delete).toHaveBeenCalledWith({ eventId: 'fail-1' });
    });
  });
});
