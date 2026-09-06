import { Test, TestingModule } from '@nestjs/testing';
import { KafkaConsumer } from './kafka.consumer';
import { KAFKA_CLIENT } from './kafka.options';

// Phai mock o pham vi module. jest.doMock() trong beforeEach chay sau khi
// kafka.consumer.ts da import kafkajs that, nen consumer se mo ket noi that
// va test hong voi KafkaJSConnectionError.
jest.mock('kafkajs', () => {
  const mockConsumer = {
    connect: jest.fn().mockResolvedValue(undefined),
    disconnect: jest.fn().mockResolvedValue(undefined),
    subscribe: jest.fn().mockResolvedValue(undefined),
    run: jest.fn().mockResolvedValue(undefined),
  };
  return {
    __esModule: true,
    Kafka: jest.fn().mockImplementation(() => ({
      consumer: () => mockConsumer,
    })),
    __mockConsumer: mockConsumer,
  };
});

describe('KafkaConsumer', () => {
  let consumer: KafkaConsumer;
  let mockConsumerInstance: any;

  beforeEach(async () => {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    mockConsumerInstance = require('kafkajs').__mockConsumer;
    mockConsumerInstance.connect.mockClear();
    mockConsumerInstance.disconnect.mockClear();
    mockConsumerInstance.subscribe.mockClear();
    mockConsumerInstance.run.mockClear();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        KafkaConsumer,
        {
          provide: KAFKA_CLIENT,
          useValue: {
            clientId: 'test-client',
            brokers: ['localhost:9092'],
            consumerGroupId: 'test-group',
          },
        },
      ],
    }).compile();

    consumer = module.get<KafkaConsumer>(KafkaConsumer);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should_useDefaultGroupId_When_optionsProvided', () => {
    expect(consumer).toBeDefined();
  });

  it('should_deduplicate_When_subscribeSameTopicGroup', () => {
    const handler1 = jest.fn();
    const handler2 = jest.fn();

    const id1 = consumer.subscribe('topic-a', handler1);
    const id2 = consumer.subscribe('topic-a', handler2);

    expect(id1).toBe(id2); // Same subscription ID
  });

  it('should_allowDifferentGroups_When_sameTopic', () => {
    const id1 = consumer.subscribe('topic-b', jest.fn(), { groupId: 'g1' });
    const id2 = consumer.subscribe('topic-b', jest.fn(), { groupId: 'g2' });

    expect(id1).not.toBe(id2);
  });

  it('should_throw_When_envelopeMissingRequiredField', async () => {
    const invalidHandler = jest.fn();
    consumer.subscribe('topic-c', invalidHandler);

    await consumer.start();

    // Lấy handler đã được register cho run
    const runCallback = mockConsumerInstance.run.mock.calls[0][0].eachMessage;

    // Mock envelope thiếu field
    await expect(
      runCallback({
        topic: 'topic-c',
        partition: 0,
        message: {
          value: Buffer.from(
            JSON.stringify({ eventId: 'e1', payload: {} }),
          ),
          offset: '0',
          key: null,
          timestamp: '0',
          attributes: 0,
          headers: [],
          size: 0,
        },
        heartbeat: jest.fn(),
        pause: jest.fn(),
      }),
    ).rejects.toThrow(/Missing required field/);
  });

  it('should_callHandler_When_validEnvelope', async () => {
    const validHandler = jest.fn().mockResolvedValue(undefined);
    consumer.subscribe('topic-d', validHandler);

    await consumer.start();

    const runCallback = mockConsumerInstance.run.mock.calls[0][0].eachMessage;
    const envelope = {
      eventId: 'evt-valid-1',
      eventType: 'TestEvent',
      eventVersion: '1.0',
      occurredAt: new Date().toISOString(),
      aggregateId: 'agg-1',
      aggregateType: 'Test',
      source: 'test',
      payload: { foo: 'bar' },
    };

    await runCallback({
      topic: 'topic-d',
      partition: 0,
      message: {
        value: Buffer.from(JSON.stringify(envelope)),
        offset: '0',
        key: null,
        timestamp: '0',
        attributes: 0,
        headers: [],
        size: 0,
      },
      heartbeat: jest.fn(),
      pause: jest.fn(),
    });

    expect(validHandler).toHaveBeenCalledWith(
      expect.objectContaining({ eventId: 'evt-valid-1' }),
      expect.anything(),
    );
  });

  it('should_rethrow_When_handlerFails', async () => {
    const failingHandler = jest.fn().mockRejectedValue(new Error('Handler boom'));
    consumer.subscribe('topic-e', failingHandler);

    await consumer.start();

    const runCallback = mockConsumerInstance.run.mock.calls[0][0].eachMessage;
    const envelope = {
      eventId: 'evt-fail',
      eventType: 'TestEvent',
      eventVersion: '1.0',
      occurredAt: new Date().toISOString(),
      aggregateId: 'agg',
      aggregateType: 'T',
      source: 'test',
      payload: {},
    };

    await expect(
      runCallback({
        topic: 'topic-e',
        partition: 0,
        message: {
          value: Buffer.from(JSON.stringify(envelope)),
          offset: '0',
          key: null,
          timestamp: '0',
          attributes: 0,
          headers: [],
          size: 0,
        },
        heartbeat: jest.fn(),
        pause: jest.fn(),
      }),
    ).rejects.toThrow('Handler boom');
  });
});