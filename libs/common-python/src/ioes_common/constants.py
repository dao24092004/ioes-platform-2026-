"""Shared constants for IOES services."""

from enum import Enum


class KafkaTopics(str, Enum):
    USER_REGISTERED = "auth.user.registered"
    USER_LOGGED_IN = "auth.user.logged_in"
    USER_LOGGED_OUT = "auth.user.logged_out"

    COURSE_CREATED = "content.course.created"
    COURSE_PUBLISHED = "content.course.published"
    COURSE_ENROLLED = "content.course.enrolled"

    EXAM_STARTED = "exam.session.started"
    EXAM_SUBMITTED = "exam.submission.submitted"
    EXAM_GRADED = "exam.submission.graded"

    CERTIFICATE_ISSUED = "blockchain.certificate.issued"

    NOTIFICATION_REQUESTED = "notification.requested"

    LEARNING_PATH_GENERATED = "ai.learning-path.generated"


class KafkaGroups(str, Enum):
    AUTH_SERVICE = "auth-service"
    CONTENT_SERVICE = "content-service"
    EXAM_SUITE = "exam-suite"
    AI_SUITE = "ai-suite"
    NOTIFICATION_SERVICE = "notification-service"
    BLOCKCHAIN_SUITE = "blockchain-suite"


class ErrorCodes(str, Enum):
    BAD_REQUEST = "BAD_REQUEST"
    VALIDATION_FAILED = "VALIDATION_FAILED"
    UNAUTHORIZED = "UNAUTHORIZED"
    INVALID_TOKEN = "INVALID_TOKEN"
    TOKEN_EXPIRED = "TOKEN_EXPIRED"
    FORBIDDEN = "FORBIDDEN"
    NOT_FOUND = "NOT_FOUND"
    RESOURCE_NOT_FOUND = "RESOURCE_NOT_FOUND"
    CONFLICT = "CONFLICT"
    ALREADY_EXISTS = "ALREADY_EXISTS"
    RATE_LIMIT_EXCEEDED = "RATE_LIMIT_EXCEEDED"
    INTERNAL_ERROR = "INTERNAL_ERROR"
    SERVICE_UNAVAILABLE = "SERVICE_UNAVAILABLE"
    DATABASE_ERROR = "DATABASE_ERROR"

    EMAIL_ALREADY_EXISTS = "EMAIL_ALREADY_EXISTS"
    USER_NOT_ACTIVE = "USER_NOT_ACTIVE"
    ACCOUNT_LOCKED = "ACCOUNT_LOCKED"
    EXAM_TIME_EXPIRED = "EXAM_TIME_EXPIRED"
    INSUFFICIENT_BALANCE = "INSUFFICIENT_BALANCE"
