package com.ioes.content.application.usecase;

import com.ioes.content.application.dto.CreateTopicCommand;
import com.ioes.content.application.dto.TopicResponse;
import com.ioes.content.domain.event.TopicCreatedEvent;
import com.ioes.content.domain.exception.InvalidTopicHierarchyException;
import com.ioes.content.domain.exception.TopicNotFoundException;
import com.ioes.content.domain.model.Topic;
import com.ioes.content.application.port.TopicRepository;
import com.ioes.content.infrastructure.kafka.TopicEventPublisher;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
@Slf4j
public class CreateTopicUseCase {

    private final TopicRepository topicRepository;
    private final TopicEventPublisher eventPublisher;

    @Transactional
    public TopicResponse execute(CreateTopicCommand command, String correlationId) {
        log.info("Creating topic: {}", command.getName());

        Topic parentTopic = null;
        if (command.getParentTopicId() != null) {
            parentTopic = topicRepository.findById(command.getParentTopicId())
                    .orElseThrow(() -> new TopicNotFoundException(command.getParentTopicId().toString()));

            if (!parentTopic.getIsActive()) {
                throw new InvalidTopicHierarchyException("Cannot create sub-topic under inactive parent topic");
            }
        }

        String slug = generateSlug(command.getName());
        if (topicRepository.existsBySlug(slug)) {
            slug = slug + "-" + System.currentTimeMillis();
        }

        int level = parentTopic != null ? parentTopic.getLevel() + 1 : 0;

        Topic topic = Topic.builder()
                .name(command.getName())
                .slug(slug)
                .description(command.getDescription())
                .parentTopic(parentTopic)
                .level(level)
                .isActive(true)
                .build();

        topic = topicRepository.save(topic);

        TopicCreatedEvent event = TopicCreatedEvent.from(topic, correlationId, correlationId);
        eventPublisher.publishTopicCreated(event);

        log.info("Created topic with id: {}", topic.getId());

        return toResponse(topic);
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
