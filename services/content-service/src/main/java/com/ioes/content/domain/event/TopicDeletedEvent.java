package com.ioes.content.domain.event;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.Instant;
import java.util.UUID;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class TopicDeletedEvent {

    private UUID eventId;
    private String eventType;
    private String eventVersion;
    private Instant occurredAt;
    private UUID aggregateId;
    private String aggregateType;
    private String correlationId;
    private String causationId;
    private String source;
    private TopicPayload payload;

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class TopicPayload {
        private UUID id;
        private String reason;
    }

    public static TopicDeletedEvent from(UUID topicId, String reason, String correlationId, String causationId) {
        return TopicDeletedEvent.builder()
                .eventId(UUID.randomUUID())
                .eventType("TopicDeleted")
                .eventVersion("1.0")
                .occurredAt(Instant.now())
                .aggregateId(topicId)
                .aggregateType("Topic")
                .correlationId(correlationId)
                .causationId(causationId)
                .source("content-service")
                .payload(TopicPayload.builder()
                        .id(topicId)
                        .reason(reason)
                        .build())
                .build();
    }
}
