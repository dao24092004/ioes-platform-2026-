package com.ioes.common.kafka;

import org.apache.kafka.clients.admin.NewTopic;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.kafka.config.TopicBuilder;

import java.util.ArrayList;
import java.util.List;

/**
 * Auto-declares Kafka topics on startup. Each service declares its own
 * topics via the {@code ioes.kafka.topics} property (comma-separated) in
 * application.yml.
 *
 * <p>Example:</p>
 * <pre>{@code
 * ioes:
 *   kafka:
 *     topics: content.topic.created,content.topic.updated,content.topic.deleted
 * }</pre>
 */
@Configuration
public class KafkaTopicConfig {

    @Value("${ioes.kafka.topics:}")
    private List<String> topicNames;

    @Bean
    public List<NewTopic> requiredTopics() {
        List<NewTopic> topics = new ArrayList<>();
        for (String name : topicNames) {
            if (name != null && !name.isBlank()) {
                topics.add(TopicBuilder.name(name.trim())
                        .partitions(3)
                        .replicas(1)
                        .build());
            }
        }
        return topics;
    }
}