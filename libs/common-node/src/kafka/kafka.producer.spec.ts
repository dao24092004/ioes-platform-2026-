import { Test, TestingModule } from '@nestjs/testing';
import { KafkaProducer, KAFKA_CLIENT } from '@ioes/common-node';
import { EventEnvelope } from '@ioes/common-node';

// Mock kafkajs để không thực sự connect Kafka
jest.mock('kafkajs', () => {
  const mockProducer = {
    connect: jest.fn().mockResolvedValue(undefined),
    disconnect: jest.fn().mockResolvedValue(undefined),
    send: jest.fn().mockResolvedValue([
      { topicName: 'test-topic', partition: 0, errorCode: 0 },
    ]),
  };
  return {
    Kafka: jest.fn().mockImplementation(() => ({
      producer: () => mockProducer,
    })),
    CompressionTypes: { GZIP: 1 },
    __mockProducer: mockProducer,
  };
});

describe('KafkaProducer', () => {
  let producer: KafkaProducer;
  let mockProducerInstance: any;

  beforeEach(async () => {
    const kafkajs = require('kafkajs');
    mockProducerInstance = kafkajs.__mockProducer;
    mockProducerInstance.connect.mockClear();
    mockProducerInstance.disconnect.mockClear();
    mockProducerInstance.send.mockClear();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        KafkaProducer,
        {
          provide: KAFKA_CLIENT,
          useValue: { clientId: 'test-client', brokers: ['localhost:9092'] },
        },
      ],
    }).compile();

    producer = module.get<KafkaProducer>(KafkaProducer);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should_beDefined_When_instantiated', () => {
    expect(producer).toBeDefined();
  });

  it('should_notBlockStartup_When_kafkaUnavailable', async () => {
    mockProducerInstance.connect.mockRejectedValueOnce(
      new Error('ECONNREFUSED'),
    );
    await producer.onModuleInit();
    // Không throw ra ngoài - chỉ log warning
  });

  it('should_sendEnvelope_When_connected', async () => {
    await producer.onModuleInit();

    const envelope: EventEnvelope = {
      eventId: 'evt-1',
      eventType: 'TestEvent',
      eventVersion: '1.0',
      occurredAt: new Date().toISOString(),
      aggregateId: 'agg-1',
      aggregateType: 'Test',
      correlationId: 'corr-1',
      source: 'test',
      payload: { foo: 'bar' },
    };

    await producer.sendEvent('test-topic', envelope);

    expect(mockProducerInstance.send).toHaveBeenCalledWith(
      expect.objectContaining({
        topic: 'test-topic',
        acks: -1,
      }),
    );
    const callArg = mockProducerInstance.send.mock.calls[0][0];
    expect(callArg.messages[0].headers).toEqual(
      expect.objectContaining({
        'event-id': 'evt-1',
        'event-type': 'TestEvent',
        'correlation-id': 'corr-1',
      }),
    );
  });

  it('should_autoConnectOnFirstSend_When_notYetConnected', async () => {
    mockProducerInstance.connect.mockClear();

    const envelope: EventEnvelope = {
      eventId: 'evt-2',
      eventType: 'TestEvent',
      eventVersion: '1.0',
      occurredAt: new Date().toISOString(),
      aggregateId: 'agg-2',
      aggregateType: 'Test',
      correlationId: 'corr-2',
      source: 'test',
      payload: {},
    };

    await producer.sendEvent('test-topic', envelope);

    expect(mockProducerInstance.connect).toHaveBeenCalled();
  });

  it('should_throw_When_sendFails', async () => {
    mockProducerInstance.send.mockRejectedValueOnce(new Error('Broker down'));
    const envelope: EventEnvelope = {
      eventId: 'evt-3',
      eventType: 'TestEvent',
      eventVersion: '1.0',
      occurredAt: new Date().toISOString(),
      aggregateId: 'agg-3',
      aggregateType: 'Test',
      correlationId: 'corr-3',
      source: 'test',
      payload: {},
    };

    await expect(producer.sendEvent('test-topic', envelope)).rejects.toThrow(
      'Broker down',
    );
  });
});