/**
 * Master event schema - BẮT BUỘC theo ADR-002.
 *
 * @see docs/02-architecture/adr/ADR-002-event-schema.md
 */
export interface EventEnvelope<T = unknown> {
  /** UUID v7, unique per event */
  eventId: string;
  /** Tên event (PastTense: QuestionCreated, QuestionUpdated, QuestionDeleted) */
  eventType: string;
  /** Schema version của payload (semver) */
  eventVersion: string;
  /** ISO 8601 timestamp khi event xảy ra */
  occurredAt: string;
  /** ID của aggregate root (vd: question UUID) */
  aggregateId: string;
  /** Tên aggregate (vd: Question, User) */
  aggregateType: string;
  /** Correlation ID cho distributed tracing */
  correlationId: string;
  /** Service phát ra event */
  source: string;
  /** Payload tuỳ theo eventType */
  payload: T;
}

/**
 * Event types convention:
 * - PastTense
 * - PascalCase
 * - AggregateName + Verb in past
 */
export const EVENT_TYPES = {
  // Question Bank
  QUESTION_CREATED: 'QuestionCreated',
  QUESTION_UPDATED: 'QuestionUpdated',
  QUESTION_DELETED: 'QuestionDeleted',
  QUESTION_PUBLISHED: 'QuestionPublished',
  QUESTION_ARCHIVED: 'QuestionArchived',
  // Auth (consumed)
  USER_REGISTERED: 'UserRegistered',
  USER_UPDATED: 'UserUpdated',
  USER_DELETED: 'UserDeleted',
  // Content (consumed)
  COURSE_PUBLISHED: 'CoursePublished',
  COURSE_ENROLLED: 'CourseEnrolled',
  COURSE_UNENROLLED: 'CourseUnenrolled',
  // Exam (published)
  EXAM_STARTED: 'ExamStarted',
  EXAM_SUBMITTED: 'ExamSubmitted',
  EXAM_GRADED: 'ExamGraded',
  // Blockchain (consumed)
  CERTIFICATE_ISSUED: 'CertificateIssued',
} as const;

export type EventType = (typeof EVENT_TYPES)[keyof typeof EVENT_TYPES] | string;
