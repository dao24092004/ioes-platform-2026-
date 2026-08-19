package com.ioes.common.event;

import java.util.concurrent.CompletableFuture;

/**
 * Port (output) for publishing domain events. Implemented by
 * {@code common-kafka}'s {@code KafkaEventPublisher} which wraps a Kafka
 * producer. Inject this interface in domain / application layers so the
 * domain code stays unaware of Kafka.
 */
public interface EventPublisher {

    <T extends DomainEvent> CompletableFuture<Void> publish(T event, String source);

    <T> CompletableFuture<Void> publishEnvelope(String topic, EventEnvelope<T> envelope);
}