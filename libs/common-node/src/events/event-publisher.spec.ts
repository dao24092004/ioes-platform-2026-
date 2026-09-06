import { EventPublisher } from './event-publisher';

describe('EventPublisher - Exam events', () => {
  let publisher: EventPublisher;

  beforeEach(() => {
    publisher = new EventPublisher('exam-suite');
  });

  describe('buildEnvelope()', () => {
    it('should_buildEnvelope_When_validInputs', () => {
      const envelope = publisher.buildEnvelope(
        'ExamStarted',
        'Exam',
        'exam-123',
        '1.0',
        { examId: 'exam-123', userId: 'user-1' },
        'trace-abc',
      );

      expect(envelope).toMatchObject({
        eventType: 'ExamStarted',
        eventVersion: '1.0',
        aggregateId: 'exam-123',
        aggregateType: 'Exam',
        correlationId: 'trace-abc',
        source: 'exam-suite',
      });
      expect(envelope.eventId).toBeDefined();
      expect(envelope.payload).toEqual({ examId: 'exam-123', userId: 'user-1' });
    });

    it('should_generateUniqueIds_When_multipleCalls', () => {
      const e1 = publisher.buildEnvelope('ExamStarted', 'Exam', 'e1', '1.0', {}, 't1');
      const e2 = publisher.buildEnvelope('ExamStarted', 'Exam', 'e1', '1.0', {}, 't1');
      expect(e1.eventId).not.toBe(e2.eventId);
    });

    it('should_includeTimestamp_When_built', () => {
      const envelope = publisher.buildEnvelope('ExamStarted', 'Exam', 'e1', '1.0', {});
      expect(envelope.occurredAt).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/);
    });
  });
});
