package com.ioes.common.util;

import com.ioes.common.constant.HttpHeaders;
import org.springframework.http.server.reactive.ServerHttpRequest;
import org.springframework.web.context.request.RequestContextHolder;
import org.springframework.web.context.request.ServletRequestAttributes;

import jakarta.servlet.http.HttpServletRequest;
import java.util.Optional;

/**
 * Helpers for extracting request context (correlation id, client IP, user
 * agent) in either servlet or reactive stacks.
 */
public final class RequestUtils {

    private RequestUtils() {}

    public static String getCorrelationId() {
        Optional<String> fromServlet = currentServletRequest()
                .map(r -> r.getHeader(HttpHeaders.CORRELATION_ID))
                .filter(s -> s != null && !s.isBlank());

        return fromServlet.orElse(java.util.UUID.randomUUID().toString());
    }

    public static String getCorrelationIdFromReactive(ServerHttpRequest request) {
        String id = request.getHeaders().getFirst(HttpHeaders.CORRELATION_ID);
        return (id == null || id.isBlank()) ? java.util.UUID.randomUUID().toString() : id;
    }

    public static String getClientIp() {
        return currentServletRequest()
                .map(RequestUtils::resolveClientIp)
                .orElse("unknown");
    }

    private static String resolveClientIp(HttpServletRequest request) {
        String[] headerNames = {
                "X-Forwarded-For", "X-Real-IP", "Proxy-Client-IP", "WL-Proxy-Client-IP"
        };
        for (String header : headerNames) {
            String ip = request.getHeader(header);
            if (ip != null && !ip.isBlank() && !"unknown".equalsIgnoreCase(ip)) {
                return ip.split(",")[0].trim();
            }
        }
        return request.getRemoteAddr();
    }

    public static Optional<HttpServletRequest> currentServletRequest() {
        ServletRequestAttributes attrs = (ServletRequestAttributes) RequestContextHolder
                .getRequestAttributes();
        return Optional.ofNullable(attrs).map(ServletRequestAttributes::getRequest);
    }
}
