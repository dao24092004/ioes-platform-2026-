package com.ioes.common.constant;

/**
 * List of Kafka consumer groups - one per service.
 */
public final class KafkaGroups {

    private KafkaGroups() {}

    public static final String AUTH_SERVICE = "auth-service";
    public static final String CONTENT_SERVICE = "content-service";
    public static final String EXAM_SUITE = "exam-suite";
    public static final String AI_SUITE = "ai-suite";
    public static final String NOTIFICATION_SERVICE = "notification-service";
    public static final String BLOCKCHAIN_SUITE = "blockchain-suite";
    public static final String ANALYTICS_SERVICE = "analytics-service";
    public static final String API_GATEWAY = "api-gateway";
}