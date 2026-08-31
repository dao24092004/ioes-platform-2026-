package com.ioes.content.domain.event;

import com.ioes.content.domain.model.Topic;

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
public class TopicUpdatedEvent {

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
        private String name;
        private String slug;
        private String description;
        private UUID parentTopicId;
        private Integer level;
    }

    public static TopicUpdatedEvent from(Topic topic, String correlationId, String causationId) {
        return TopicUpdatedEvent.builder()
                .eventId(UUID.randomUUID())
                .eventType("TopicUpdated")
                .eventVersion("1.0")
                .occurredAt(Instant.now())
                .aggregateId(topic.getId())
                .aggregateType("Topic")
                .correlationId(correlationId)
                .causationId(causationId)
                .source("content-service")
                .payload(TopicPayload.builder()
                        .id(topic.getId())
                        .name(topic.getName())
                        .slug(topic.getSlug())
                        .description(topic.getDescription())
                        .parentTopicId(topic.getParentTopic() != null ? topic.getParentTopic().getId() : null)
                        .level(topic.getLevel())
                        .build())
                .build();
    }
}
