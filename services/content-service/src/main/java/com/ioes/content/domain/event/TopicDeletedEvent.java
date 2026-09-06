package com.ioes.content.domain.event;

import com.ioes.common.event.DomainEvent;
import lombok.Builder;

import java.util.UUID;

@Builder
public record TopicDeletedEvent(UUID id, String reason) implements DomainEvent {

    @Override
    public String aggregateId() {
        return id.toString();
    }

    @Override
    public String aggregateType() {
        return "Topic";
    }

    @Override
    public String eventType() {
        return "TopicDeleted";
    }

    public static TopicDeletedEvent from(UUID topicId, String reason) {
        return new TopicDeletedEvent(topicId, reason);
    }
}
