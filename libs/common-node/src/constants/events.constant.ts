/**
 * Kafka topic names - shared across services.
 */
export const KAFKA_TOPICS = {
  // Auth events
  USER_REGISTERED: 'auth.user.registered',
  USER_LOGGED_IN: 'auth.user.logged_in',
  USER_LOGGED_OUT: 'auth.user.logged_out',

  // Content events
  COURSE_CREATED: 'content.course.created',
  COURSE_PUBLISHED: 'content.course.published',
  COURSE_ENROLLED: 'content.course.enrolled',

  // Topic events (ADR-012)
  TOPIC_CREATED: 'content.topic.created',
  TOPIC_UPDATED: 'content.topic.updated',
  TOPIC_DELETED: 'content.topic.deleted',

  // Exam events
  EXAM_STARTED: 'exam.session.started',
  EXAM_SUBMITTED: 'exam.submission.submitted',
  EXAM_GRADED: 'exam.submission.graded',

  // Blockchain events
  CERTIFICATE_ISSUED: 'blockchain.certificate.issued',

  // Notification events
  NOTIFICATION_REQUESTED: 'notification.requested',

  // AI events
  LEARNING_PATH_GENERATED: 'ai.learning-path.generated',

  // Question Bank events
  QUESTION_CREATED: 'question-bank.question.created',
  QUESTION_UPDATED: 'question-bank.question.updated',
  QUESTION_DELETED: 'question-bank.question.deleted',
  QUESTION_PUBLISHED: 'question-bank.question.published',
} as const;

export type KafkaTopic = (typeof KAFKA_TOPICS)[keyof typeof KAFKA_TOPICS];

/**
 * Kafka consumer group names per service.
 */
export const KAFKA_GROUPS = {
  AUTH_SERVICE: 'auth-service',
  CONTENT_SERVICE: 'content-service',
  EXAM_SUITE: 'exam-suite',
  AI_SUITE: 'ai-suite',
  NOTIFICATION_SERVICE: 'notification-service',
  BLOCKCHAIN_SUITE: 'blockchain-suite',
} as const;
