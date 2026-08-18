package com.ioes.common.event;

import java.util.concurrent.CompletableFuture;

/**
 * Port (output) for publishing domain events. Implemented by
 * {@link com.ioes.common.kafka.KafkaEventPublisher} which wraps a Kafka
 * producer. Inject this interface in domain / application layers so the
 * domain code stays unaware of Kafka.
 */
public interface EventPublisher {

    /**
     * Publish a domain event. The envelope is built automatically from the
     * {@link DomainEvent} fields plus the source service name.
     *
     * @param event      the domain event payload (must implement {@link DomainEvent})
     * @param source     the publishing service name (e.g. "auth-service")
     * @param <T>        the event type
     * @return a future that completes when the message is ack'd by Kafka
     */
    <T extends DomainEvent> CompletableFuture<Void> publish(T event, String source);

    /**
     * Publish a pre-built envelope (used when the producer / caller wants
     * full control over the wire format).
     */
    <T> CompletableFuture<Void> publishEnvelope(String topic, EventEnvelope<T> envelope);
}
