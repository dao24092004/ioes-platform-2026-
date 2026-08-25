import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { getRepositoryToken } from '@nestjs/typeorm';
import {
  KafkaConsumer,
  KAFKA_TOPICS,
  KAFKA_GROUPS,
  EVENT_TYPES,
  EventEnvelope,
  QuestionEventPayload,
  QuestionDeletedPayload,
  ProcessedEvent,
} from '@ioes/common-node';
import { DgraphClient } from './dgraph.client';
import { DgraphSyncConsumer } from './dgraph-sync.consumer';

describe('DgraphSyncConsumer - Atomic Claim (BUG #37 fix)', () => {
  let consumer: DgraphSyncConsumer;
  let mockKafka: any;
  let mockDgraph: any;
  let mockProcessedRepo: any;

  beforeEach(async () => {
    mockKafka = {
      subscribe: jest.fn(),
      start: jest.fn(),
    };

    mockDgraph = {
      query: jest.fn().mockResolvedValue({ data: { addQuestion: { question: [{ id: 'q-1' }] } } }),
    };

    // QueryBuilder mock cho atomic claim
    const mockInsertBuilder = {
      into: jest.fn().mockReturnThis(),
      values: jest.fn().mockReturnThis(),
      orIgnore: jest.fn().mockReturnThis(),
      execute: jest.fn().mockResolvedValue({ identifiers: [{ id: 1 }] }),
    };

    mockProcessedRepo = {
      createQueryBuilder: jest.fn(() => mockInsertBuilder),
      delete: jest.fn().mockResolvedValue({ affected: 1 }),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        DgraphSyncConsumer,
        { provide: KafkaConsumer, useValue: mockKafka },
        { provide: DgraphClient, useValue: mockDgraph },
        {
          provide: getRepositoryToken(ProcessedEvent),
          useValue: mockProcessedRepo,
        },
        { provide: ConfigService, useValue: { get: () => null } },
      ],
    }).compile();

    consumer = module.get<DgraphSyncConsumer>(DgraphSyncConsumer);
  });

  it('should_registerFourSubscriptions_When_constructed', () => {
    expect(mockKafka.subscribe).toHaveBeenCalledTimes(4);
  });

  describe('Atomic claim pattern', () => {
    it('should_claimAndProcess_When_newEvent', async () => {
      const upsertHandler = mockKafka.subscribe.mock.calls.find(
        (call: any[]) => call[0] === KAFKA_TOPICS.QUESTION_CREATED,
      )?.[1];

      const envelope: EventEnvelope<QuestionEventPayload> = {
        eventId: 'evt-new-1',
        eventType: EVENT_TYPES.QUESTION_CREATED,
        eventVersion: '1.0',
        occurredAt: new Date().toISOString(),
        aggregateId: 'q-1',
        aggregateType: 'Question',
        correlationId: 'corr-1',
        source: 'exam-suite',
        payload: {
          id: 'q-1',
          questionText: 'Test',
          questionType: 'coding',
          difficulty: 'easy',
          points: 1,
          topicId: 't-1',
          createdBy: 'u-1',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
      };

      await upsertHandler(envelope, {} as any);

      // Verify atomic claim được gọi
      expect(mockProcessedRepo.createQueryBuilder).toHaveBeenCalled();
      expect(mockDgraph.query).toHaveBeenCalled();
    });

    it('should_skip_When_alreadyClaimed', async () => {
      // Mock claim returns no identifiers (INSERT bị skip do conflict)
      const mockInsertBuilder = {
        into: jest.fn().mockReturnThis(),
        values: jest.fn().mockReturnThis(),
        orIgnore: jest.fn().mockReturnThis(),
        execute: jest.fn().mockResolvedValue({ identifiers: [] }), // ← already exists
      };
      mockProcessedRepo.createQueryBuilder = jest.fn(() => mockInsertBuilder);

      const upsertHandler = mockKafka.subscribe.mock.calls.find(
        (call: any[]) => call[0] === KAFKA_TOPICS.QUESTION_CREATED,
      )?.[1];

      const envelope: EventEnvelope<QuestionEventPayload> = {
        eventId: 'evt-dup',
        eventType: EVENT_TYPES.QUESTION_CREATED,
        eventVersion: '1.0',
        occurredAt: new Date().toISOString(),
        aggregateId: 'q-1',
        aggregateType: 'Question',
        correlationId: 'corr-1',
        source: 'exam-suite',
        payload: {
          id: 'q-1',
          questionText: 'Test',
          questionType: 'coding',
          difficulty: 'easy',
          points: 1,
          topicId: 't-1',
          createdBy: 'u-1',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
      };

      await upsertHandler(envelope, {} as any);

      // Should NOT call Dgraph because already claimed
      expect(mockDgraph.query).not.toHaveBeenCalled();
    });

    it('should_releaseClaim_When_dgraphFails', async () => {
      mockDgraph.query.mockRejectedValue(new Error('Dgraph timeout'));

      const upsertHandler = mockKafka.subscribe.mock.calls.find(
        (call: any[]) => call[0] === KAFKA_TOPICS.QUESTION_UPDATED,
      )?.[1];

      const envelope: EventEnvelope<QuestionEventPayload> = {
        eventId: 'evt-fail',
        eventType: EVENT_TYPES.QUESTION_UPDATED,
        eventVersion: '1.0',
        occurredAt: new Date().toISOString(),
        aggregateId: 'q-1',
        aggregateType: 'Question',
        correlationId: 'corr-1',
        source: 'exam-suite',
        payload: {
          id: 'q-1',
          questionText: 'Test',
          questionType: 'coding',
          difficulty: 'easy',
          points: 1,
          topicId: 't-1',
          createdBy: 'u-1',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
      };

      await expect(upsertHandler(envelope, {} as any)).rejects.toThrow(
        'Dgraph timeout',
      );

      // Verify claim released để retry có thể claim lại
      expect(mockProcessedRepo.delete).toHaveBeenCalledWith({
        eventId: 'evt-fail',
      });
    });

    it('should_releaseClaim_When_deleteFails', async () => {
      mockDgraph.query.mockRejectedValue(new Error('Dgraph fail'));

      const deleteHandler = mockKafka.subscribe.mock.calls.find(
        (call: any[]) => call[0] === KAFKA_TOPICS.QUESTION_DELETED,
      )?.[1];

      const envelope: EventEnvelope<QuestionDeletedPayload> = {
        eventId: 'evt-del-fail',
        eventType: EVENT_TYPES.QUESTION_DELETED,
        eventVersion: '1.0',
        occurredAt: new Date().toISOString(),
        aggregateId: 'q-1',
        aggregateType: 'Question',
        correlationId: 'corr-1',
        source: 'exam-suite',
        payload: {
          id: 'q-1',
          deletedAt: new Date().toISOString(),
          deletedBy: 'u-1',
        },
      };

      await expect(deleteHandler(envelope, {} as any)).rejects.toThrow(
        'Dgraph fail',
      );

      expect(mockProcessedRepo.delete).toHaveBeenCalledWith({
        eventId: 'evt-del-fail',
      });
    });

    it('should_skip_When_deleteAlreadyClaimed', async () => {
      const mockInsertBuilder = {
        into: jest.fn().mockReturnThis(),
        values: jest.fn().mockReturnThis(),
        orIgnore: jest.fn().mockReturnThis(),
        execute: jest.fn().mockResolvedValue({ identifiers: [] }),
      };
      mockProcessedRepo.createQueryBuilder = jest.fn(() => mockInsertBuilder);

      const deleteHandler = mockKafka.subscribe.mock.calls.find(
        (call: any[]) => call[0] === KAFKA_TOPICS.QUESTION_DELETED,
      )?.[1];

      const envelope: EventEnvelope<QuestionDeletedPayload> = {
        eventId: 'evt-dup-del',
        eventType: EVENT_TYPES.QUESTION_DELETED,
        eventVersion: '1.0',
        occurredAt: new Date().toISOString(),
        aggregateId: 'q-1',
        aggregateType: 'Question',
        correlationId: 'corr-1',
        source: 'exam-suite',
        payload: {
          id: 'q-1',
          deletedAt: new Date().toISOString(),
          deletedBy: 'u-1',
        },
      };

      await deleteHandler(envelope, {} as any);

      expect(mockDgraph.query).not.toHaveBeenCalled();
    });
  });
});