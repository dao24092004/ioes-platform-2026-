package com.ioes.content.domain.event;

import com.ioes.common.event.DomainEvent;
import com.ioes.content.domain.model.Topic;
import lombok.Builder;

import java.util.UUID;

@Builder
public record TopicUpdatedEvent(UUID id, String name, String slug, String description,
                                UUID parentTopicId, Integer level) implements DomainEvent {

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
        return "TopicUpdated";
    }

    public static TopicUpdatedEvent from(Topic topic) {
        return new TopicUpdatedEvent(
                topic.getId(),
                topic.getName(),
                topic.getSlug(),
                topic.getDescription(),
                topic.getParentTopic() != null ? topic.getParentTopic().getId() : null,
                topic.getLevel());
    }
}
