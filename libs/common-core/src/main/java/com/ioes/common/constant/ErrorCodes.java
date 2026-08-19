package com.ioes.common.constant;

/**
 * Application-wide error codes.
 * Use these codes in API responses for client-side error handling.
 */
public final class ErrorCodes {

    private ErrorCodes() {}

    // 400 - Bad Request
    public static final String BAD_REQUEST = "BAD_REQUEST";
    public static final String VALIDATION_FAILED = "VALIDATION_FAILED";
    public static final String INVALID_INPUT = "INVALID_INPUT";

    // 401 - Unauthorized
    public static final String UNAUTHORIZED = "UNAUTHORIZED";
    public static final String INVALID_TOKEN = "INVALID_TOKEN";
    public static final String TOKEN_EXPIRED = "TOKEN_EXPIRED";

    // 403 - Forbidden
    public static final String FORBIDDEN = "FORBIDDEN";
    public static final String INSUFFICIENT_PERMISSION = "INSUFFICIENT_PERMISSION";

    // 404 - Not Found
    public static final String NOT_FOUND = "NOT_FOUND";
    public static final String RESOURCE_NOT_FOUND = "RESOURCE_NOT_FOUND";

    // 409 - Conflict
    public static final String CONFLICT = "CONFLICT";
    public static final String ALREADY_EXISTS = "ALREADY_EXISTS";

    // 429 - Rate Limit
    public static final String RATE_LIMIT_EXCEEDED = "RATE_LIMIT_EXCEEDED";

    // 500 - Server Error
    public static final String INTERNAL_ERROR = "INTERNAL_ERROR";
    public static final String SERVICE_UNAVAILABLE = "SERVICE_UNAVAILABLE";
    public static final String DATABASE_ERROR = "DATABASE_ERROR";

    // Business
    public static final String EMAIL_ALREADY_EXISTS = "EMAIL_ALREADY_EXISTS";
    public static final String USER_NOT_ACTIVE = "USER_NOT_ACTIVE";
    public static final String ACCOUNT_LOCKED = "ACCOUNT_LOCKED";
    public static final String EXAM_TIME_EXPIRED = "EXAM_TIME_EXPIRED";
    public static final String INSUFFICIENT_BALANCE = "INSUFFICIENT_BALANCE";
    public static final String EXAM_ALREADY_SUBMITTED = "EXAM_ALREADY_SUBMITTED";
    public static final String EXAM_NOT_STARTED = "EXAM_NOT_STARTED";
    public static final String COURSE_NOT_ENROLLED = "COURSE_NOT_ENROLLED";
}