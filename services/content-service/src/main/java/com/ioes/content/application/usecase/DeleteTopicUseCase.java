package com.ioes.content.application.usecase;

import com.ioes.content.domain.event.TopicDeletedEvent;
import com.ioes.content.domain.exception.TopicHasQuestionsException;
import com.ioes.content.domain.exception.TopicNotFoundException;
import com.ioes.content.domain.model.Topic;
import com.ioes.content.application.port.TopicRepository;
import com.ioes.content.infrastructure.kafka.TopicEventPublisher;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.UUID;

@Service
@RequiredArgsConstructor
@Slf4j
public class DeleteTopicUseCase {

    private static final String DELETION_REASON_MANUAL = "MANUAL";

    private final TopicRepository topicRepository;
    private final TopicEventPublisher eventPublisher;

    @Transactional
    public void execute(UUID topicId, String correlationId) {
        log.info("Deleting topic: {}", topicId);

        Topic topic = topicRepository.findById(topicId)
                .orElseThrow(() -> new TopicNotFoundException(topicId.toString()));

        long childCount = topicRepository.countByParentTopicId(topicId);
        if (childCount > 0) {
            throw new TopicHasQuestionsException(topicId.toString(), childCount);
        }

        topic.softDelete();
        topicRepository.save(topic);

        TopicDeletedEvent event = TopicDeletedEvent.from(topicId, DELETION_REASON_MANUAL, correlationId, correlationId);
        eventPublisher.publishTopicDeleted(event);

        log.info("Soft deleted topic: {}", topicId);
    }
}
