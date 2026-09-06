package com.ioes.content.domain.exception;

public class TopicNotFoundException extends RuntimeException {

    private final String topicId;

    public TopicNotFoundException(String topicId) {
        super("Topic not found with id: " + topicId);
        this.topicId = topicId;
    }

    public String getTopicId() {
        return topicId;
    }
}
