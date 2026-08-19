package com.ioes.common.kafka;

import com.ioes.common.event.EventEnvelope;
import com.ioes.common.event.EventPublisher;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.kafka.core.KafkaTemplate;
import org.springframework.kafka.support.SendResult;
import org.springframework.stereotype.Component;

import java.util.concurrent.CompletableFuture;

/**
 * Default implementation of {@link EventPublisher}. Wraps a Spring
 * {@link KafkaTemplate} and serializes the envelope as JSON.
 */
@Slf4j
@Component
public class KafkaEventPublisher implements EventPublisher {

    private final KafkaTemplate<String, EventEnvelope<?>> kafkaTemplate;
    private final String defaultSource;

    public KafkaEventPublisher(
            KafkaTemplate<String, EventEnvelope<?>> kafkaTemplate,
            @Value("${spring.application.name:ioes-service}") String defaultSource) {
        this.kafkaTemplate = kafkaTemplate;
        this.defaultSource = defaultSource;
    }

    @Override
    public <T extends com.ioes.common.event.DomainEvent> CompletableFuture<Void> publish(
            T event, String source) {
        com.ioes.common.event.EventEnvelope<T> envelope = com.ioes.common.event.EventEnvelope
                .<T>auto(event.eventType(), source != null ? source : defaultSource)
                .aggregateId(event.aggregateId())
                .aggregateType(event.aggregateType())
                .payload(event)
                .build();

        String topic = event.eventType().toLowerCase();
        return publishEnvelope(topic, envelope);
    }

    @Override
    public <T> CompletableFuture<Void> publishEnvelope(String topic, EventEnvelope<T> envelope) {
        log.debug("Publishing event id={} type={} to topic={}",
                envelope.getEventId(), envelope.getEventType(), topic);

        CompletableFuture<SendResult<String, EventEnvelope<?>>> kafkaFuture =
                kafkaTemplate.send(topic, envelope.getAggregateId(), envelope);

        return kafkaFuture.handle((result, ex) -> {
            if (ex != null) {
                log.error("Failed to publish event id={} to topic={}: {}",
                        envelope.getEventId(), topic, ex.getMessage(), ex);
                throw new RuntimeException(
                        "Failed to publish event " + envelope.getEventId(), ex);
            }
            log.debug("Published event id={} to topic={} partition={} offset={}",
                    envelope.getEventId(),
                    topic,
                    result.getRecordMetadata().partition(),
                    result.getRecordMetadata().offset());
            return null;
        });
    }
}