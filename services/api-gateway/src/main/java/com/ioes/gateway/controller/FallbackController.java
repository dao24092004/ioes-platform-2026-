package com.ioes.gateway.controller;

import com.ioes.common.dto.ApiResponse;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import reactor.core.publisher.Mono;

import java.time.Instant;
import java.util.Map;

/**
 * Forwarded by Resilience4j circuit-breaker / retry filters when an
 * upstream service is unreachable, times out, or returns a 5xx status.
 *
 * <p>Always responds with {@code 503 Service Unavailable} so clients can
 * distinguish a fallback from a regular business response.
 */
@RestController
@RequestMapping("/fallback")
public class FallbackController {

    @GetMapping
    public Mono<ResponseEntity<ApiResponse<Map<String, Object>>>> fallback() {
        ApiResponse<Map<String, Object>> body = ApiResponse.<Map<String, Object>>error(
                "Service temporarily unavailable. Please try again later."
        ).toBuilder()
                .data(Map.of(
                        "reason", "circuit_breaker_or_timeout",
                        "timestamp", Instant.now().toString()
                ))
                .build();
        return Mono.just(ResponseEntity.status(HttpStatus.SERVICE_UNAVAILABLE)
                .contentType(MediaType.APPLICATION_JSON)
                .body(body));
    }
}