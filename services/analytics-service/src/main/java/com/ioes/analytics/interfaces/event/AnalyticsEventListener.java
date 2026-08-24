package com.ioes.analytics.interfaces.event;

import com.ioes.analytics.domain.port.in.AnalyticsUseCase;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.kafka.annotation.KafkaListener;
import org.springframework.stereotype.Component;

import java.util.Map;
import java.util.UUID;

/**
 * Lắng nghe các Kafka events từ các services khác và cập nhật analytics.
 *
 * Topics consumed:
 *   - auth.user.registered    → init user analytics
 *   - auth.user.logged_in     → record login
 *   - exam.submission.graded  → update score + leaderboard
 *   - content.course.published → (future: track course metrics)
 */
@Slf4j
@Component
@RequiredArgsConstructor
public class AnalyticsEventListener {

    private final AnalyticsUseCase analyticsUseCase;

    @KafkaListener(topics = "auth.user.registered", groupId = "analytics-service")
    public void onUserRegistered(Map<String, Object> event) {
        log.info("[Analytics] Received auth.user.registered: {}", event.get("userId"));
        try {
            String userIdStr = (String) event.get("userId");
            if (userIdStr == null) return;

            UUID userId = UUID.fromString(userIdStr);
            // Init empty analytics record
            analyticsUseCase.getUserAnalytics(userId); // lazy-creates if not exists
            log.info("[Analytics] Initialized analytics for new user: {}", userId);
        } catch (Exception e) {
            log.error("[Analytics] Failed to process user.registered event", e);
        }
    }

    @KafkaListener(topics = "auth.user.logged_in", groupId = "analytics-service")
    public void onUserLoggedIn(Map<String, Object> event) {
        log.info("[Analytics] Received auth.user.logged_in");
        try {
            String userIdStr = (String) event.get("userId");
            String ipAddress = (String) event.getOrDefault("ipAddress", "unknown");
            if (userIdStr == null) return;

            analyticsUseCase.recordUserLogin(new AnalyticsUseCase.UserLoginCommand(
                    UUID.fromString(userIdStr),
                    ipAddress
            ));
        } catch (Exception e) {
            log.error("[Analytics] Failed to process user.logged_in event", e);
        }
    }

    @KafkaListener(topics = "exam.submission.graded", groupId = "analytics-service")
    public void onExamGraded(Map<String, Object> event) {
        log.info("[Analytics] Received exam.submission.graded: submissionId={}",
                event.get("submissionId"));
        try {
            String userIdStr = (String) event.get("userId");
            String submissionIdStr = (String) event.get("submissionId");
            String examIdStr = (String) event.get("examId");
            String examTitle = (String) event.getOrDefault("examTitle", "Unknown Exam");
            String email = (String) event.getOrDefault("email", "");

            double score = parseDouble(event.get("score"));
            double maxScore = parseDouble(event.getOrDefault("maxScore", 100.0));
            Boolean passed = (Boolean) event.get("passed");

            if (userIdStr == null || submissionIdStr == null) {
                log.warn("[Analytics] Missing required fields in exam.graded event");
                return;
            }

            analyticsUseCase.recordExamGraded(new AnalyticsUseCase.ExamGradedCommand(
                    UUID.fromString(submissionIdStr),
                    UUID.fromString(userIdStr),
                    examIdStr != null ? UUID.fromString(examIdStr) : UUID.randomUUID(),
                    email,
                    examTitle,
                    score,
                    maxScore,
                    Boolean.TRUE.equals(passed)
            ));

            log.info("[Analytics] Recorded exam grade for user={}, score={}/{}", userIdStr, score, maxScore);
        } catch (Exception e) {
            log.error("[Analytics] Failed to process exam.graded event", e);
        }
    }

    @KafkaListener(topics = "content.course.published", groupId = "analytics-service")
    public void onCoursePublished(Map<String, Object> event) {
        log.debug("[Analytics] Received content.course.published (tracking only)");
        // Future: track course metrics
    }

    private double parseDouble(Object value) {
        if (value == null) return 0.0;
        if (value instanceof Number) return ((Number) value).doubleValue();
        try {
            return Double.parseDouble(value.toString());
        } catch (NumberFormatException e) {
            return 0.0;
        }
    }
}
