import { TopicSyncConsumer } from './topic-sync.consumer';
import { DgraphClient } from './dgraph.client';
import { KafkaConsumer } from '@ioes/common-node';
import { ConfigService } from '@nestjs/config';
import { Test } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { ProcessedEvent } from '@ioes/common-node';
import { Repository } from 'typeorm';
import { KAFKA_TOPICS } from '@ioes/common-node';

describe('TopicSyncConsumer', () => {
  let consumer: TopicSyncConsumer;
  let dgraph: jest.Mocked<DgraphClient>;
  let kafkaConsumer: jest.Mocked<KafkaConsumer>;
  let processedRepo: jest.Mocked<Repository<ProcessedEvent>>;

  const baseEnvelope = {
    eventId: '00000000-0000-0000-0000-000000000001',
    eventType: 'TopicCreated',
    eventVersion: '1.0',
    occurredAt: new Date().toISOString(),
    aggregateId: '00000000-0000-0000-0000-000000000002',
    aggregateType: 'Topic',
    correlationId: 'corr-1',
    causationId: 'corr-1',
    source: 'content-service',
  };

  beforeEach(async () => {
    const dgraphMock = {
      query: jest.fn(),
    } as unknown as jest.Mocked<DgraphClient>;

    const kafkaMock = {
      subscribe: jest.fn(),
      start: jest.fn(),
    } as unknown as jest.Mocked<KafkaConsumer>;

    const repoMock = {
      createQueryBuilder: jest.fn(() => ({
        insert: jest.fn().mockReturnThis(),
        into: jest.fn().mockReturnThis(),
        values: jest.fn().mockReturnThis(),
        orIgnore: jest.fn().mockReturnThis(),
        execute: jest.fn().mockResolvedValue({ identifiers: [{ eventId: 'x' }] }),
      })),
      delete: jest.fn().mockResolvedValue({ affected: 1 }),
    } as unknown as jest.Mocked<Repository<ProcessedEvent>>;

    const module = await Test.createTestingModule({
      providers: [
        TopicSyncConsumer,
        { provide: DgraphClient, useValue: dgraphMock },
        { provide: KafkaConsumer, useValue: kafkaMock },
        { provide: getRepositoryToken(ProcessedEvent), useValue: repoMock },
        {
          provide: ConfigService,
          useValue: { get: () => 'test-group' },
        },
      ],
    }).compile();

    consumer = module.get(TopicSyncConsumer);
    dgraph = module.get(DgraphClient) as jest.Mocked<DgraphClient>;
    kafkaConsumer = module.get(KafkaConsumer) as jest.Mocked<KafkaConsumer>;
    processedRepo = module.get(getRepositoryToken(ProcessedEvent));
  });

  it('should subscribe to 3 topic-related Kafka topics', () => {
    expect(kafkaConsumer.subscribe).toHaveBeenCalledTimes(3);
    expect(kafkaConsumer.subscribe).toHaveBeenCalledWith(
      KAFKA_TOPICS.TOPIC_CREATED,
      expect.any(Function),
      expect.any(Object),
    );
    expect(kafkaConsumer.subscribe).toHaveBeenCalledWith(
      KAFKA_TOPICS.TOPIC_UPDATED,
      expect.any(Function),
      expect.any(Object),
    );
    expect(kafkaConsumer.subscribe).toHaveBeenCalledWith(
      KAFKA_TOPICS.TOPIC_DELETED,
      expect.any(Function),
      expect.any(Object),
    );
  });

  it('should upsert topic on TopicCreated event', async () => {
    const envelope = {
      ...baseEnvelope,
      payload: {
        id: '00000000-0000-0000-0000-000000000002',
        name: 'Java',
        slug: 'java',
        description: 'Java programming',
        level: 0,
      },
    };

    const subscribeCalls = (kafkaConsumer.subscribe as jest.Mock).mock.calls;
    const upsertHandler = subscribeCalls[0][1];

    await upsertHandler(envelope);

    expect(processedRepo.createQueryBuilder).toHaveBeenCalled();
    expect(dgraph.query).toHaveBeenCalledWith(
      expect.stringContaining('UpsertTopic'),
      expect.objectContaining({
        input: expect.objectContaining({
          id: '00000000-0000-0000-0000-000000000002',
          name: 'Java',
          slug: 'java',
          level: 0,
        }),
      }),
    );
  });

  it('should skip duplicate event via idempotency', async () => {
    (processedRepo.createQueryBuilder as jest.Mock).mockReturnValueOnce({
      insert: jest.fn().mockReturnThis(),
      into: jest.fn().mockReturnThis(),
      values: jest.fn().mockReturnThis(),
      orIgnore: jest.fn().mockReturnThis(),
      execute: jest.fn().mockResolvedValue({ identifiers: [] }),
    });

    const envelope = {
      ...baseEnvelope,
      payload: {
        id: '00000000-0000-0000-0000-000000000002',
        name: 'Java',
        slug: 'java',
        level: 0,
      },
    };

    const subscribeCalls = (kafkaConsumer.subscribe as jest.Mock).mock.calls;
    const upsertHandler = subscribeCalls[0][1];

    await upsertHandler(envelope);

    expect(dgraph.query).not.toHaveBeenCalled();
  });

  it('should delete topic on TopicDeleted event', async () => {
    const envelope = {
      ...baseEnvelope,
      eventType: 'TopicDeleted',
      payload: {
        id: '00000000-0000-0000-0000-000000000002',
        reason: 'MANUAL',
      },
    };

    const subscribeCalls = (kafkaConsumer.subscribe as jest.Mock).mock.calls;
    const deleteHandler = subscribeCalls[2][1];

    await deleteHandler(envelope);

    expect(dgraph.query).toHaveBeenCalledWith(
      expect.stringContaining('DeleteTopic'),
      expect.objectContaining({ id: '00000000-0000-0000-0000-000000000002' }),
    );
  });

  it('should release claim on dgraph error', async () => {
    (dgraph.query as jest.Mock).mockRejectedValueOnce(new Error('Dgraph error'));

    const envelope = {
      ...baseEnvelope,
      payload: {
        id: '00000000-0000-0000-0000-000000000002',
        name: 'Java',
        slug: 'java',
        level: 0,
      },
    };

    const subscribeCalls = (kafkaConsumer.subscribe as jest.Mock).mock.calls;
    const upsertHandler = subscribeCalls[0][1];

    await expect(upsertHandler(envelope)).rejects.toBe();
    expect(processedRepo.delete).toHaveBeenCalledWith({
      eventId: envelope.eventId,
    });
  });
});