import { EventEnvelope, EVENT_TYPES } from './event-envelope';

/**
 * Exam events - theo BA §10.2 (Exam Flow).
 *
 * Theo service-boundaries §3.1 event schema:
 * - eventType: Past tense (ExamStarted, ExamSubmitted, ExamGraded)
 * - aggregateType: Exam
 *
 * Consumers:
 * - ExamStarted    → analytics-service, notification-service
 * - ExamSubmitted  → ai-suite (grading), analytics-service
 * - ExamGraded     → blockchain-suite (issue cert), notification-service, analytics-service
 * - ExamAutoSubmitted (timeout) → ai-suite, notification
 */
export const EXAM_EVENT_TYPES = {
  EXAM_STARTED: 'ExamStarted',
  EXAM_SUBMITTED: 'ExamSubmitted',
  EXAM_AUTO_SUBMITTED: 'ExamAutoSubmitted',
  EXAM_GRADED: 'ExamGraded',
  EXAM_RESUMED: 'ExamResumed',
  EXAM_ABANDONED: 'ExamAbandoned',
} as const;

export type ExamEventType =
  (typeof EXAM_EVENT_TYPES)[keyof typeof EXAM_EVENT_TYPES] | string;

/**
 * Kafka topic convention (service-boundaries §2.2):
 * - topic: {service}.{aggregate}.{action}
 * - exam.events (1 topic cho all exam events, partitioned by examId)
 */
export const EXAM_KAFKA_TOPICS = {
  EXAM_EVENTS: 'exam.events',
  USER_EVENTS: 'auth.user.events',
  COURSE_EVENTS: 'content.course.events',
} as const;

// ============================================
// ExamStarted event (v1.0)
// ============================================

export interface ExamStartedPayload {
  examId: string;
  examTitle: string;
  attemptId: string;
  userId: string;
  startedAt: string;
  expiresAt: string;
  durationMinutes: number;
  totalQuestions: number;
}

export type ExamStartedEvent = EventEnvelope<ExamStartedPayload>;
export const EXAM_STARTED_VERSION = '1.0';

// ============================================
// ExamSubmitted event (v1.0)
// ============================================

export interface ExamSubmittedPayload {
  examId: string;
  attemptId: string;
  userId: string;
  submittedAt: string;
  /** True nếu auto-submit do timeout, false nếu user submit manually. */
  autoSubmitted: boolean;
  /** Number of questions answered (denormalized for analytics). */
  answeredCount: number;
  totalQuestions: number;
  /** Time taken in seconds. */
  durationSeconds: number;
}

export type ExamSubmittedEvent = EventEnvelope<ExamSubmittedPayload>;
export const EXAM_SUBMITTED_VERSION = '1.0';

// ============================================
// ExamGraded event (v1.0)
// ============================================

export interface ExamGradedPayload {
  examId: string;
  attemptId: string;
  userId: string;
  gradedAt: string;
  /** Total score (0-100 scale). */
  score: number;
  /** Pass/fail based on exam.passing_score. */
  passed: boolean;
  /** Breakdown per question type. */
  breakdown: {
    autoGradedScore: number;
    manualGradedScore?: number;
    autoGradedCount: number;
    manualGradedCount: number;
  };
  /** True nếu grading xong (manual + auto). False nếu chờ manual grading. */
  finalGrading: boolean;
}

export type ExamGradedEvent = EventEnvelope<ExamGradedPayload>;
export const EXAM_GRADED_VERSION = '1.0';

// ============================================
// Consumed events (cross-service)
// ============================================

export interface UserRegisteredPayload {
  userId: string;
  email: string;
  fullName?: string;
  role: string;
  registeredAt: string;
}

export interface CourseEnrolledPayload {
  userId: string;
  courseId: string;
  enrolledAt: string;
  expiresAt?: string;
}

export const CONSUMED_EVENT_TYPES = {
  USER_REGISTERED: EVENT_TYPES.USER_REGISTERED ?? 'UserRegistered',
  COURSE_ENROLLED: 'CourseEnrolled',
  COURSE_UNENROLLED: 'CourseUnenrolled',
} as const;
