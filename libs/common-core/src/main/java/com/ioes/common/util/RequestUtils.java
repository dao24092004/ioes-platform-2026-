package com.ioes.common.util;

import com.ioes.common.constant.HttpHeaders;

import java.util.UUID;

/**
 * Reactive-safe request utilities. Servlet-specific helpers live in
 * {@code common-web} so this module has no servlet dependency.
 */
public final class RequestUtils {

    private RequestUtils() {}

    /**
     * Resolve a correlation id from a reactive {@link org.springframework.http.server.reactive.ServerHttpRequest}.
     * Falls back to a fresh UUID if the header is absent.
     */
    public static String getCorrelationIdFromReactive(
            org.springframework.http.server.reactive.ServerHttpRequest request) {
        String id = request.getHeaders().getFirst(HttpHeaders.CORRELATION_ID);
        return (id == null || id.isBlank()) ? UUID.randomUUID().toString() : id;
    }
}