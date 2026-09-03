package com.ioes.content.infrastructure.kafka;

import org.apache.kafka.clients.producer.ProducerConfig;
import org.apache.kafka.common.serialization.StringSerializer;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.kafka.core.DefaultKafkaProducerFactory;
import org.springframework.kafka.core.KafkaTemplate;
import org.springframework.kafka.core.ProducerFactory;

import java.util.HashMap;
import java.util.Map;

/**
 * String-valued Kafka producer used only by {@link TopicEventPublisher}.
 *
 * <p>ADR-012 fixes the wire format of {@code content.topic.*} as a flat JSON
 * object (eventId/eventType/.../payload at the top level), which the service
 * serializes itself with Jackson. That is a different shape from the
 * {@code EventEnvelope} wrapper the shared {@code common-kafka} template
 * carries, so the two producers cannot be the same bean.
 *
 * <p>These beans are deliberately <em>not</em> named {@code producerFactory} /
 * {@code kafkaTemplate}: {@code KafkaConfig} backs off by bean name, so the
 * envelope-typed beans it publishes stay in the context for
 * {@code KafkaEventPublisher}.
 */
@Configuration
public class ContentKafkaConfig {

    @Value("${spring.kafka.bootstrap-servers:localhost:9092}")
    private String bootstrapServers;

    @Bean
    public ProducerFactory<String, String> stringProducerFactory() {
        Map<String, Object> config = new HashMap<>();
        config.put(ProducerConfig.BOOTSTRAP_SERVERS_CONFIG, bootstrapServers);
        config.put(ProducerConfig.KEY_SERIALIZER_CLASS_CONFIG, StringSerializer.class);
        config.put(ProducerConfig.VALUE_SERIALIZER_CLASS_CONFIG, StringSerializer.class);
        config.put(ProducerConfig.ACKS_CONFIG, "all");
        config.put(ProducerConfig.RETRIES_CONFIG, 3);
        config.put(ProducerConfig.ENABLE_IDEMPOTENCE_CONFIG, true);
        config.put(ProducerConfig.MAX_IN_FLIGHT_REQUESTS_PER_CONNECTION, 5);
        config.put(ProducerConfig.COMPRESSION_TYPE_CONFIG, "gzip");
        config.put(ProducerConfig.LINGER_MS_CONFIG, 20);
        return new DefaultKafkaProducerFactory<>(config);
    }

    @Bean
    public KafkaTemplate<String, String> stringKafkaTemplate(
            ProducerFactory<String, String> stringProducerFactory) {
        return new KafkaTemplate<>(stringProducerFactory);
    }
}
