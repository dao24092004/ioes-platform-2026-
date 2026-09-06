package com.ioes.content.application.usecase;

import com.ioes.content.application.dto.TopicResponse;
import com.ioes.content.domain.exception.TopicNotFoundException;
import com.ioes.content.domain.model.Topic;
import com.ioes.content.application.port.TopicRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.UUID;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Slf4j
@Transactional(readOnly = true)
public class GetTopicUseCase {

    private final TopicRepository topicRepository;

    public TopicResponse getById(UUID topicId) {
        log.debug("Getting topic by id: {}", topicId);

        Topic topic = topicRepository.findById(topicId)
                .orElseThrow(() -> new TopicNotFoundException(topicId.toString()));

        return toResponseWithChildren(topic);
    }

    public List<TopicResponse> getAll() {
        log.debug("Getting all active topics");

        List<Topic> topics = topicRepository.findAllActive();
        List<Topic> rootTopics = topics.stream()
                .filter(t -> t.getParentTopic() == null)
                .collect(Collectors.toList());

        return rootTopics.stream()
                .map(this::toResponseWithChildren)
                .collect(Collectors.toList());
    }

    public List<TopicResponse> getChildren(UUID parentId) {
        log.debug("Getting children of topic: {}", parentId);

        List<Topic> children = topicRepository.findByParentTopicId(parentId);
        return children.stream()
                .map(this::toResponse)
                .collect(Collectors.toList());
    }

    public List<TopicResponse> getRootTopics() {
        log.debug("Getting root topics");

        List<Topic> rootTopics = topicRepository.findRootTopics();
        return rootTopics.stream()
                .map(this::toResponse)
                .collect(Collectors.toList());
    }

    public boolean exists(UUID topicId) {
        return topicRepository.findById(topicId).isPresent();
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

    private TopicResponse toResponseWithChildren(Topic topic) {
        TopicResponse response = toResponse(topic);

        if (topic.hasSubTopics()) {
            List<TopicResponse> children = topic.getSubTopics().stream()
                    .filter(Topic::getIsActive)
                    .map(this::toResponseWithChildren)
                    .collect(Collectors.toList());
            response.setChildren(children);
        }

        return response;
    }
}
