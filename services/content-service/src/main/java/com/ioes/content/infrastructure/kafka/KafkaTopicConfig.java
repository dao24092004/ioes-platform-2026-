package com.ioes.content.infrastructure.kafka;

import org.apache.kafka.clients.admin.NewTopic;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.kafka.config.TopicBuilder;

@Configuration
public class KafkaTopicConfig {

    @Value("${app.kafka.topic-prefix:content}")
    private String topicPrefix;

    @Bean
    public NewTopic topicCreatedTopic() {
        return TopicBuilder.name(topicPrefix + ".topic.created")
                .partitions(3)
                .replicas(1)
                .build();
    }

    @Bean
    public NewTopic topicUpdatedTopic() {
        return TopicBuilder.name(topicPrefix + ".topic.updated")
                .partitions(3)
                .replicas(1)
                .build();
    }

    @Bean
    public NewTopic topicDeletedTopic() {
        return TopicBuilder.name(topicPrefix + ".topic.deleted")
                .partitions(3)
                .replicas(1)
                .build();
    }
}
