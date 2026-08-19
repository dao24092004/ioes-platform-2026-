package com.ioes.common.util;

import com.ioes.common.constant.HttpHeaders;

import java.util.Optional;
import java.util.UUID;

/**
 * Servlet-specific request utilities. Companion to
 * {@link RequestUtils#getCorrelationIdFromReactive} which is reactive-safe.
 */
public final class RequestUtilsServlet {

    private RequestUtilsServlet() {}

    public static String getCorrelationId() {
        Optional<String> fromServlet = currentServletRequest()
                .map(r -> r.getHeader(HttpHeaders.CORRELATION_ID))
                .filter(s -> s != null && !s.isBlank());

        return fromServlet.orElse(UUID.randomUUID().toString());
    }

    public static String getClientIp() {
        return currentServletRequest()
                .map(RequestUtilsServlet::resolveClientIp)
                .orElse("unknown");
    }

    private static String resolveClientIp(jakarta.servlet.http.HttpServletRequest request) {
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

    public static Optional<jakarta.servlet.http.HttpServletRequest> currentServletRequest() {
        org.springframework.web.context.request.ServletRequestAttributes attrs =
                (org.springframework.web.context.request.ServletRequestAttributes)
                        org.springframework.web.context.request.RequestContextHolder
                                .getRequestAttributes();
        return Optional.ofNullable(attrs).map(org.springframework.web.context.request.ServletRequestAttributes::getRequest);
    }
}