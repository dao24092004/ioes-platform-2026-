package com.ioes.common.constant;

/**
 * Canonical Kafka topic names.
 * <p>
 * All services must publish / subscribe using these constants to avoid drift.
 * Naming follows past-tense domain events (e.g. UserRegistered, ExamSubmitted).
 */
public final class KafkaTopics {

    private KafkaTopics() {}

    // Auth
    public static final String USER_REGISTERED = "auth.user.registered";
    public static final String USER_LOGGED_IN = "auth.user.logged_in";
    public static final String USER_LOGGED_OUT = "auth.user.logged_out";
    public static final String PASSWORD_RESET = "auth.password.reset";

    // Content
    public static final String COURSE_CREATED = "content.course.created";
    public static final String COURSE_PUBLISHED = "content.course.published";
    public static final String COURSE_UPDATED = "content.course.updated";
    public static final String COURSE_ENROLLED = "content.course.enrolled";
    public static final String COURSE_UNENROLLED = "content.course.unenrolled";

    // Exam
    public static final String EXAM_STARTED = "exam.session.started";
    public static final String EXAM_SUBMITTED = "exam.submission.submitted";
    public static final String EXAM_GRADED = "exam.submission.graded";
    public static final String EXAM_TIME_EXPIRED = "exam.session.time_expired";

    // Notification
    public static final String NOTIFICATION_REQUESTED = "notification.requested";

    // Blockchain
    public static final String CERTIFICATE_ISSUED = "blockchain.certificate.issued";
    public static final String CERTIFICATE_VERIFIED = "blockchain.certificate.verified";

    // AI
    public static final String LEARNING_PATH_GENERATED = "ai.learning-path.generated";
    public static final String PROCTOR_ALERT = "ai.proctor.alert";
    public static final String GRADING_COMPLETED = "ai.grading.completed";

    // Analytics
    public static final String ANALYTICS_EVENT = "analytics.event";
}