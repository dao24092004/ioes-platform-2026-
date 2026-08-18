package com.ioes.common.constant;

/**
 * HTTP header names used across services for correlation / context propagation.
 */
public final class HttpHeaders {

    private HttpHeaders() {}

    public static final String CORRELATION_ID = "X-Correlation-Id";
    public static final String REQUEST_ID = "X-Request-Id";
    public static final String TRACE_ID = "X-Trace-Id";
    public static final String USER_AGENT = "User-Agent";
    public static final String AUTHORIZATION = "Authorization";
    public static final String BEARER_PREFIX = "Bearer ";

    public static final String SOURCE_SERVICE = "X-Source-Service";
    public static final String USER_ID = "X-User-Id";
    public static final String USER_ROLE = "X-User-Role";
}
