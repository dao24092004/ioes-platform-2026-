import { Test, TestingModule } from '@nestjs/testing';
import { DataSource } from 'typeorm';
import { KafkaProducer } from '@ioes/common-node';
import { OutboxWorker } from './outbox.worker';
import { OutboxEvent } from './entities/outbox-event.entity';

describe('OutboxWorker', () => {
  let worker: OutboxWorker;
  let mockOutboxRepo: any;
  let mockDataSource: any;
  let mockProducer: any;

  const sampleEvent: Partial<OutboxEvent> = {
    id: 'outbox-1',
    eventId: 'evt-1',
    eventType: 'QuestionCreated',
    eventVersion: '1.0',
    topic: 'question-bank.question.created',
    aggregateId: 'q-1',
    aggregateType: 'Question',
    source: 'exam-suite',
    correlationId: 'corr-1',
    payload: { id: 'q-1' },
    status: 'PENDING',
    attempts: 0,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  beforeEach(async () => {
    mockOutboxRepo = {
      update: jest.fn().mockResolvedValue({ affected: 1 }),
    };

    mockDataSource = {
      transaction: jest.fn(async (cb) =>
        cb({
          createQueryBuilder: () => ({
            setLock: () => ({
              setOnLocked: () => ({
                where: () => ({
                  orderBy: () => ({
                    limit: () => ({
                      getMany: jest.fn().mockResolvedValue([sampleEvent]),
                    }),
                  }),
                }),
              }),
            }),
          }),
          update: jest.fn().mockResolvedValue({ affected: 1 }),
        }),
      ),
    };

    mockProducer = {
      sendEvent: jest.fn().mockResolvedValue([{ topicName: 'test', partition: 0 }]),
      send: jest.fn().mockResolvedValue([{ topicName: 'dlq', partition: 0 }]),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        OutboxWorker,
        { provide: DataSource, useValue: mockDataSource },
        { provide: KafkaProducer, useValue: mockProducer },
        { provide: 'OutboxEventRepository', useValue: mockOutboxRepo },
      ],
    }).overrideProvider('OutboxEventRepository').useValue(mockOutboxRepo).compile();

    worker = module.get<OutboxWorker>(OutboxWorker);
  });

  it('should_publishEvent_When_sendSucceeds', async () => {
    // Need to inject the repo via different mechanism for TypeORM
    (worker as any).outboxRepo = mockOutboxRepo;

    const processed = await worker.pollOnce();

    expect(mockProducer.sendEvent).toHaveBeenCalledWith(
      sampleEvent.topic,
      expect.objectContaining({
        eventId: sampleEvent.eventId,
        eventType: sampleEvent.eventType,
      }),
    );
    expect(mockOutboxRepo.update).toHaveBeenCalledWith(
      sampleEvent.id,
      expect.objectContaining({ status: 'PUBLISHED' }),
    );
    expect(processed).toBeGreaterThan(0);
  });

  it('should_markFailed_When_maxAttemptsReached', async () => {
    mockProducer.sendEvent.mockRejectedValue(new Error('Kafka down'));
    (worker as any).outboxRepo = mockOutboxRepo;

    const failingEvent = { ...sampleEvent, attempts: 4 }; // next attempt = 5 = max
    mockDataSource.transaction = jest.fn(async (cb) =>
      cb({
        createQueryBuilder: () => ({
          setLock: () => ({
            setOnLocked: () => ({
              where: () => ({
                orderBy: () => ({
                  limit: () => ({
                    getMany: jest.fn().mockResolvedValue([failingEvent]),
                  }),
                }),
              }),
            }),
          }),
        }),
        update: jest.fn().mockResolvedValue({ affected: 1 }),
      }),
    );

    await worker.pollOnce();

    expect(mockOutboxRepo.update).toHaveBeenCalledWith(
      failingEvent.id,
      expect.objectContaining({
        status: 'FAILED',
        attempts: 5,
      }),
    );
  });

  it('should_sendToDlq_When_publishFailsFinal', async () => {
    mockProducer.sendEvent.mockRejectedValue(new Error('Kafka down'));
    mockProducer.send.mockResolvedValue([{ topicName: 'dlq', partition: 0 }]);
    (worker as any).outboxRepo = mockOutboxRepo;

    const failingEvent = { ...sampleEvent, attempts: 4 };
    mockDataSource.transaction = jest.fn(async (cb) =>
      cb({
        createQueryBuilder: () => ({
          setLock: () => ({
            setOnLocked: () => ({
              where: () => ({
                orderBy: () => ({
                  limit: () => ({
                    getMany: jest.fn().mockResolvedValue([failingEvent]),
                  }),
                }),
              }),
            }),
          }),
        }),
        update: jest.fn().mockResolvedValue({ affected: 1 }),
      }),
    );

    await worker.pollOnce();

    expect(mockProducer.send).toHaveBeenCalledWith(
      expect.stringContaining('.dlq'),
      failingEvent.eventId,
      expect.objectContaining({
        failure: expect.objectContaining({
          error: 'Kafka down',
        }),
      }),
      expect.any(Object),
    );
  });

  it('should_computeExponentialBackoff_When_retrying', async () => {
    const backoff1 = (worker as any).computeBackoff(1);
    const backoff3 = (worker as any).computeBackoff(3);

    const delay1 = backoff1.getTime() - Date.now();
    const delay3 = backoff3.getTime() - Date.now();

    // delay3 should be roughly 4x delay1 (2^(3-1) = 4)
    expect(delay3).toBeGreaterThan(delay1 * 3);
  });

  it('should_skipPoll_When_alreadyPolling', async () => {
    (worker as any).polling = true;
    const result = await worker.pollOnce();
    expect(result).toBe(0);
  });
});