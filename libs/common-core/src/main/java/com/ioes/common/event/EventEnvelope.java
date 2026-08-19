package com.ioes.common.event;

import com.fasterxml.jackson.annotation.JsonInclude;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.Instant;
import java.util.Map;
import java.util.UUID;

/**
 * Canonical envelope for every domain event published on Kafka.
 * <p>
 * Format (must match across publisher and consumer):
 * <pre>
 * {
 *   "eventId":       "uuid-v7",
 *   "eventType":     "UserRegistered",
 *   "eventVersion":  "1.0",
 *   "occurredAt":    "2026-08-12T10:00:00Z",
 *   "aggregateId":   "user-123",
 *   "aggregateType": "User",
 *   "correlationId": "trace-id-xxx",
 *   "source":        "auth-service",
 *   "payload":       { ... }
 * }
 * </pre>
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@JsonInclude(JsonInclude.Include.NON_NULL)
public class EventEnvelope<T> {

    private String eventId;
    private String eventType;
    private String eventVersion;
    private Instant occurredAt;
    private String aggregateId;
    private String aggregateType;
    private String correlationId;
    private String source;
    private T payload;
    private Map<String, String> metadata;

    /**
     * Convenience builder: pre-fills eventId (UUID v4) and occurredAt.
     */
    public static <T> EventEnvelopeBuilder<T> auto(String eventType, String source) {
        return EventEnvelope.<T>builder()
                .eventId(UUID.randomUUID().toString())
                .eventType(eventType)
                .eventVersion("1.0")
                .occurredAt(Instant.now())
                .source(source);
    }
}