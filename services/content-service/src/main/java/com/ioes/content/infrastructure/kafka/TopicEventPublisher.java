package com.ioes.content.infrastructure.kafka;

import com.ioes.content.domain.event.TopicCreatedEvent;
import com.ioes.content.domain.event.TopicDeletedEvent;
import com.ioes.content.domain.event.TopicUpdatedEvent;
import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.kafka.core.KafkaTemplate;
import org.springframework.kafka.support.SendResult;
import org.springframework.stereotype.Component;

import java.util.concurrent.CompletableFuture;

@Component
@RequiredArgsConstructor
@Slf4j
public class TopicEventPublisher {

    private final KafkaTemplate<String, String> kafkaTemplate;
    private final ObjectMapper objectMapper;

    @Value("${app.kafka.topic-prefix:content}")
    private String topicPrefix;

    public void publishTopicCreated(TopicCreatedEvent event) {
        publish("topic.created", event);
    }

    public void publishTopicUpdated(TopicUpdatedEvent event) {
        publish("topic.updated", event);
    }

    public void publishTopicDeleted(TopicDeletedEvent event) {
        publish("topic.deleted", event);
    }

    private void publish(String suffix, Object event) {
        String topic = topicPrefix + "." + suffix;
        try {
            String message = objectMapper.writeValueAsString(event);
            CompletableFuture<SendResult<String, String>> future = kafkaTemplate.send(topic, message);

            future.whenComplete((result, ex) -> {
                if (ex != null) {
                    log.error("Failed to publish event to topic {}: {}", topic, ex.getMessage());
                } else {
                    log.info("Published event to topic {} with offset {}", topic, result.getRecordMetadata().offset());
                }
            });
        } catch (JsonProcessingException e) {
            log.error("Failed to serialize event: {}", e.getMessage());
        }
    }
}
