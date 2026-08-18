package com.ioes.common.kafka;

import com.ioes.common.event.EventEnvelope;
import org.apache.kafka.clients.admin.NewTopic;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.kafka.config.TopicBuilder;

import java.util.List;

/**
 * Auto-declares Kafka topics on startup. Override the list of topics in each
 * service's {@code application.yml} via the {@code ioes.kafka.topics} property.
 * <p>
 * Example:
 * <pre>
 * ioes:
 *   kafka:
 *     topics:
 *       - name: auth.user.registered
 *         partitions: 3
 *         replicas: 1
 * </pre>
 */
@Configuration
public class KafkaTopicConfig {

    @Value("${ioes.kafka.topics:}")
    private List<String> topicNames;

    /**
     * Default topics required by every service. Additional topics can be
     * declared per-service via the {@code ioes.kafka.topics} property.
     */
    @Bean
    public List<NewTopic> requiredTopics() {
        return List.of(
                TopicBuilder.name("auth.user.registered").partitions(3).replicas(1).build(),
                TopicBuilder.name("auth.user.logged_in").partitions(3).replicas(1).build(),
                TopicBuilder.name("content.course.published").partitions(3).replicas(1).build(),
                TopicBuilder.name("exam.submission.submitted").partitions(3).replicas(1).build(),
                TopicBuilder.name("exam.submission.graded").partitions(3).replicas(1).build(),
                TopicBuilder.name("notification.requested").partitions(3).replicas(1).build(),
                TopicBuilder.name("blockchain.certificate.issued").partitions(3).replicas(1).build()
        );
    }
}
