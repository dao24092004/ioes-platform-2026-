package com.ioes.common.kafka;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.ioes.common.event.EventEnvelope;
import lombok.extern.slf4j.Slf4j;
import org.apache.kafka.clients.consumer.ConsumerRecord;
import org.springframework.kafka.annotation.KafkaListener;
import org.springframework.kafka.support.Acknowledgment;

import java.util.function.Consumer;

/**
 * Convenience base class for any Kafka consumer.
 */
@Slf4j
public abstract class AbstractKafkaConsumer {

    private final java.util.Map<String, Consumer<EventEnvelope<?>>> handlers = new java.util.concurrent.ConcurrentHashMap<>();

    protected final ObjectMapper objectMapper = new ObjectMapper().findAndRegisterModules();

    protected void on(String topic, Consumer<EventEnvelope<?>> handler) {
        handlers.put(topic, handler);
        log.debug("Registered handler for topic {}", topic);
    }

    protected void dispatch(ConsumerRecord<String, EventEnvelope<?>> record, Acknowledgment ack) {
        String topic = record.topic();
        Consumer<EventEnvelope<?>> handler = handlers.get(topic);

        if (handler == null) {
            log.warn("No handler registered for topic {}", topic);
            ack.acknowledge();
            return;
        }

        try {
            log.debug("Consuming event id={} type={} from topic={}",
                    record.value().getEventId(), record.value().getEventType(), topic);
            handler.accept(record.value());
            ack.acknowledge();
        } catch (Exception ex) {
            log.error("Error handling event id={} from topic={}",
                    record.value().getEventId(), topic, ex);
            handleError(record, ex, ack);
        }
    }

    protected void handleError(ConsumerRecord<String, EventEnvelope<?>> record,
                               Exception ex, Acknowledgment ack) {
        ack.acknowledge();
    }
}