import { EntityManager } from 'typeorm';
import {
  OutboxService,
  EventPublisher,
  EXAM_EVENT_TYPES,
  EXAM_KAFKA_TOPICS,
  EXAM_STARTED_VERSION,
} from '@ioes/common-node';
import { ExamEventsPublisher } from './exam-events.publisher';

describe('ExamEventsPublisher - Outbox pattern', () => {
  let publisher: ExamEventsPublisher;
  let outbox: jest.Mocked<OutboxService>;
  let envelopeBuilder: jest.Mocked<EventPublisher>;
  let em: jest.Mocked<EntityManager>;

  beforeEach(() => {
    outbox = {
      enqueueInTx: jest.fn().mockResolvedValue({} as any),
    } as any;

    envelopeBuilder = {
      buildEnvelope: jest.fn().mockImplementation((type, aggType, aggId, ver, payload, corrId) => ({
        eventId: 'test-event-id',
        eventType: type,
        eventVersion: ver,
        aggregateId: aggId,
        aggregateType: aggType,
        correlationId: corrId,
        occurredAt: new Date().toISOString(),
        source: 'exam-suite',
        payload,
      })),
    } as any;

    em = {} as any;

    publisher = new ExamEventsPublisher(outbox, envelopeBuilder);
  });

  describe('publishStartedInTx()', () => {
    it('should_enqueue_When_validPayload', async () => {
      await publisher.publishStartedInTx(
        em,
        {
          examId: 'exam-1',
          examTitle: 'Math Test',
          attemptId: 'att-1',
          userId: 'user-1',
          startedAt: '2026-08-23T10:00:00Z',
          expiresAt: '2026-08-23T11:00:00Z',
          durationMinutes: 60,
          totalQuestions: 20,
        },
        'trace-1',
      );

      expect(envelopeBuilder.buildEnvelope).toHaveBeenCalledWith(
        EXAM_EVENT_TYPES.EXAM_STARTED,
        'Exam',
        'exam-1',
        EXAM_STARTED_VERSION,
        expect.objectContaining({ examId: 'exam-1', userId: 'user-1' }),
        'trace-1',
      );

      expect(outbox.enqueueInTx).toHaveBeenCalledWith(
        em,
        EXAM_KAFKA_TOPICS.EXAM_EVENTS,
        expect.objectContaining({
          eventType: 'ExamStarted',
          aggregateId: 'exam-1',
        }),
      );
    });
  });

  describe('publishSubmittedInTx()', () => {
    it('should_enqueue_When_validPayload', async () => {
      await publisher.publishSubmittedInTx(
        em,
        {
          examId: 'exam-1',
          attemptId: 'att-1',
          userId: 'user-1',
          submittedAt: '2026-08-23T10:45:00Z',
          autoSubmitted: false,
          answeredCount: 18,
          totalQuestions: 20,
          durationSeconds: 2700,
        },
      );

      expect(outbox.enqueueInTx).toHaveBeenCalledWith(
        em,
        EXAM_KAFKA_TOPICS.EXAM_EVENTS,
        expect.objectContaining({
          eventType: 'ExamSubmitted',
        }),
      );
    });
  });

  describe('publishGradedInTx()', () => {
    it('should_enqueue_When_validPayload', async () => {
      await publisher.publishGradedInTx(
        em,
        {
          examId: 'exam-1',
          attemptId: 'att-1',
          userId: 'user-1',
          gradedAt: '2026-08-23T11:00:00Z',
          score: 85,
          passed: true,
          breakdown: {
            autoGradedScore: 85,
            autoGradedCount: 20,
            manualGradedCount: 0,
          },
          finalGrading: true,
        },
      );

      expect(outbox.enqueueInTx).toHaveBeenCalledWith(
        em,
        EXAM_KAFKA_TOPICS.EXAM_EVENTS,
        expect.objectContaining({
          eventType: 'ExamGraded',
          payload: expect.objectContaining({ score: 85, passed: true }),
        }),
      );
    });
  });
});
