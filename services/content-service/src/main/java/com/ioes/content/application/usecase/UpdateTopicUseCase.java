package com.ioes.content.application.usecase;

import com.ioes.content.application.dto.TopicResponse;
import com.ioes.content.application.dto.UpdateTopicCommand;
import com.ioes.content.domain.event.TopicUpdatedEvent;
import com.ioes.content.domain.exception.InvalidTopicHierarchyException;
import com.ioes.content.domain.exception.TopicNotFoundException;
import com.ioes.content.domain.model.Topic;
import com.ioes.content.application.port.TopicRepository;
import com.ioes.content.infrastructure.kafka.TopicEventPublisher;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.HashSet;
import java.util.Set;
import java.util.UUID;

@Service
@RequiredArgsConstructor
@Slf4j
public class UpdateTopicUseCase {

    private final TopicRepository topicRepository;
    private final TopicEventPublisher eventPublisher;

    @Transactional
    public TopicResponse execute(UUID topicId, UpdateTopicCommand command, String correlationId) {
        log.info("Updating topic: {}", topicId);

        Topic topic = topicRepository.findById(topicId)
                .orElseThrow(() -> new TopicNotFoundException(topicId.toString()));

        if (command.getName() != null && !command.getName().isBlank()) {
            topic.setName(command.getName());
            topic.setSlug(generateSlug(command.getName()));
        }

        if (command.getDescription() != null) {
            topic.setDescription(command.getDescription());
        }

        if (command.getParentTopicId() != null) {
            validateParentHierarchy(topicId, command.getParentTopicId());
            Topic parentTopic = topicRepository.findById(command.getParentTopicId())
                    .orElseThrow(() -> new TopicNotFoundException(command.getParentTopicId().toString()));

            if (!parentTopic.getIsActive()) {
                throw new InvalidTopicHierarchyException("Cannot set inactive parent topic");
            }

            topic.setParentTopic(parentTopic);
            topic.setLevel(parentTopic.getLevel() + 1);
        }

        if (command.getIsActive() != null) {
            topic.setIsActive(command.getIsActive());
        }

        topic = topicRepository.save(topic);

        TopicUpdatedEvent event = TopicUpdatedEvent.from(topic, correlationId, correlationId);
        eventPublisher.publishTopicUpdated(event);

        log.info("Updated topic: {}", topicId);

        return toResponse(topic);
    }

    private void validateParentHierarchy(UUID topicId, UUID newParentId) {
        if (topicId.equals(newParentId)) {
            throw new InvalidTopicHierarchyException("Topic cannot be its own parent");
        }

        Set<UUID> ancestorIds = new HashSet<>();
        Topic current = topicRepository.findById(newParentId).orElse(null);

        while (current != null) {
            if (ancestorIds.contains(current.getId())) {
                throw new InvalidTopicHierarchyException("Circular reference detected in topic hierarchy");
            }
            ancestorIds.add(current.getId());
            current = current.getParentTopic();
        }
    }

    private String generateSlug(String name) {
        return name.toLowerCase()
                .replaceAll("[^a-z0-9\\s-]", "")
                .replaceAll("\\s+", "-")
                .replaceAll("-+", "-")
                .replaceAll("^-|-$", "");
    }

    private TopicResponse toResponse(Topic topic) {
        return TopicResponse.builder()
                .id(topic.getId())
                .name(topic.getName())
                .slug(topic.getSlug())
                .description(topic.getDescription())
                .parentTopicId(topic.getParentTopic() != null ? topic.getParentTopic().getId() : null)
                .parentTopicName(topic.getParentTopic() != null ? topic.getParentTopic().getName() : null)
                .level(topic.getLevel())
                .path(topic.getPath())
                .isActive(topic.getIsActive())
                .createdAt(topic.getCreatedAt())
                .updatedAt(topic.getUpdatedAt())
                .build();
    }
}
