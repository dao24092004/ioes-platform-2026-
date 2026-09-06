package com.ioes.content.domain.exception;

public class TopicHasQuestionsException extends RuntimeException {

    private final String topicId;
    private final long questionCount;

    public TopicHasQuestionsException(String topicId, long questionCount) {
        super("Topic " + topicId + " cannot be deleted because it has " + questionCount + " questions");
        this.topicId = topicId;
        this.questionCount = questionCount;
    }

    public String getTopicId() {
        return topicId;
    }

    public long getQuestionCount() {
        return questionCount;
    }
}
