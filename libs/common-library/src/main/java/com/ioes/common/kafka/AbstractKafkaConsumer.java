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
 * <p>
 * Subclasses register handlers via {@link #on(String, Consumer)} and call
 * {@link KafkaListener} on their public method override.
 * <p>
 * Example:
 * <pre>
 *   @Component
 *   public class UserEventConsumer extends AbstractKafkaConsumer {
 *       public UserEventConsumer() {
 *           on("auth.user.registered", this::handleUserRegistered);
 *       }
 *
 *       {@code @KafkaListener(topics = "auth.user.registered",
 *                              groupId = "content-service")}
 *       public void listen(ConsumerRecord&lt;String, EventEnvelope&lt;?&gt;&gt; record,
 *                          Acknowledgment ack) {
 *           dispatch(record, ack);
 *       }
 *
 *       private void handleUserRegistered(EventEnvelope&lt;?&gt; env) { ... }
 *   }
 * </pre>
 */
@Slf4j
public abstract class AbstractKafkaConsumer {

    private final java.util.Map<String, Consumer<EventEnvelope<?>>> handlers = new java.util.concurrent.ConcurrentHashMap<>();

    protected final ObjectMapper objectMapper = new ObjectMapper().findAndRegisterModules();

    /**
     * Register a handler for a topic.
     */
    protected void on(String topic, Consumer<EventEnvelope<?>> handler) {
        handlers.put(topic, handler);
        log.debug("Registered handler for topic {}", topic);
    }

    /**
     * Dispatch a record to the registered handler. Override {@link #handleError}
     * to customise error handling.
     */
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

    /**
     * Override in subclasses to implement retry / DLQ logic.
     * Default behaviour: ack to avoid infinite loop, log the error.
     */
    protected void handleError(ConsumerRecord<String, EventEnvelope<?>> record,
                               Exception ex, Acknowledgment ack) {
        ack.acknowledge();
    }
}
