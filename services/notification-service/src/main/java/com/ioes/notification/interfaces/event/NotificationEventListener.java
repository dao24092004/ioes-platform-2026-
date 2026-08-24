package com.ioes.notification.interfaces.event;

import com.ioes.notification.domain.port.in.NotificationUseCase;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.kafka.annotation.KafkaListener;
import org.springframework.stereotype.Component;

import java.util.Map;

/**
 * Listens to events from other services and triggers notifications.
 * Example topics:
 * - auth.user.registered  -> send welcome email
 * - exam.submission.graded -> send result notification
 */
@Slf4j
@Component
@RequiredArgsConstructor
public class NotificationEventListener {

    private final NotificationUseCase notificationUseCase;

    @KafkaListener(topics = "auth.user.registered", groupId = "notification-service")
    public void onUserRegistered(Map<String, Object> event) {
        log.info("Received user registered event: {}", event);

        try {
            String email = (String) event.get("email");
            String fullName = (String) event.get("fullName");

            if (email == null) {
                log.warn("User registered event missing email");
                return;
            }

            NotificationUseCase.TemplatedCommand command = new NotificationUseCase.TemplatedCommand(
                    null,
                    com.ioes.notification.domain.model.NotificationType.email,
                    email,
                    "welcome",
                    Map.of(
                            "fullName", fullName != null ? fullName : "User",
                            "appName", "IOES Platform"
                    )
            );

            notificationUseCase.sendTemplated(command);
            log.info("Welcome notification queued for: {}", email);
        } catch (Exception e) {
            log.error("Failed to process user registered event", e);
        }
    }

    @KafkaListener(topics = "exam.submission.graded", groupId = "notification-service")
    public void onExamGraded(Map<String, Object> event) {
        log.info("Received exam graded event: {}", event);

        try {
            String email = (String) event.get("email");
            String examTitle = (String) event.get("examTitle");
            Object scoreObj = event.get("score");
            String score = scoreObj != null ? scoreObj.toString() : "N/A";
            Boolean passed = (Boolean) event.get("passed");

            if (email == null) {
                return;
            }

            NotificationUseCase.TemplatedCommand command = new NotificationUseCase.TemplatedCommand(
                    null,
                    com.ioes.notification.domain.model.NotificationType.email,
                    email,
                    passed != null && passed ? "exam-passed" : "exam-failed",
                    Map.of(
                            "examTitle", examTitle != null ? examTitle : "Exam",
                            "score", score
                    )
            );

            notificationUseCase.sendTemplated(command);
            log.info("Exam result notification queued for: {}", email);
        } catch (Exception e) {
            log.error("Failed to process exam graded event", e);
        }
    }

    /**
     * analytics.streak.milestone → gửi email chúc mừng streak
     * Event fields: userId, email, displayName, streakDays, bonusScore
     */
    @KafkaListener(topics = "analytics.streak.milestone", groupId = "notification-service")
    public void onStreakMilestone(Map<String, Object> event) {
        log.info("[Notification] Received analytics.streak.milestone: userId={}", event.get("userId"));
        try {
            String email = (String) event.get("email");
            String displayName = (String) event.getOrDefault("displayName", "User");
            Object streakDaysObj = event.get("streakDays");
            String streakDays = streakDaysObj != null ? streakDaysObj.toString() : "7";
            Object bonusScoreObj = event.get("bonusScore");
            String bonusScore = bonusScoreObj != null ? bonusScoreObj.toString() : "10";

            if (email == null || email.isBlank()) {
                log.warn("[Notification] streak.milestone event missing email, skipping");
                return;
            }

            NotificationUseCase.TemplatedCommand command = new NotificationUseCase.TemplatedCommand(
                    null,
                    com.ioes.notification.domain.model.NotificationType.email,
                    email,
                    "streak-milestone",
                    Map.of(
                            "displayName", displayName,
                            "streakDays", streakDays,
                            "bonusScore", bonusScore,
                            "appName", "IOES Platform"
                    )
            );

            notificationUseCase.sendTemplated(command);
            log.info("[Notification] Streak milestone notification queued for: {}", email);
        } catch (Exception e) {
            log.error("[Notification] Failed to process streak.milestone event", e);
        }
    }

    /**
     * analytics.leaderboard.rank_changed → gửi email thông báo vào top 3
     * Event fields: userId, email, displayName, newRank, previousRank, period, score
     */
    @KafkaListener(topics = "analytics.leaderboard.rank_changed", groupId = "notification-service")
    public void onLeaderboardRankChanged(Map<String, Object> event) {
        log.info("[Notification] Received analytics.leaderboard.rank_changed: userId={}", event.get("userId"));
        try {
            String email = (String) event.get("email");
            String displayName = (String) event.getOrDefault("displayName", "User");
            Object newRankObj = event.get("newRank");
            String newRank = newRankObj != null ? newRankObj.toString() : "?";
            String period = (String) event.getOrDefault("period", "WEEKLY");
            Object scoreObj = event.get("score");
            String score = scoreObj != null ? scoreObj.toString() : "0";

            if (email == null || email.isBlank()) {
                log.warn("[Notification] rank_changed event missing email, skipping");
                return;
            }

            NotificationUseCase.TemplatedCommand command = new NotificationUseCase.TemplatedCommand(
                    null,
                    com.ioes.notification.domain.model.NotificationType.email,
                    email,
                    "leaderboard-top3",
                    Map.of(
                            "displayName", displayName,
                            "rank", newRank,
                            "period", period.toLowerCase(),
                            "score", score,
                            "appName", "IOES Platform"
                    )
            );

            notificationUseCase.sendTemplated(command);
            log.info("[Notification] Leaderboard top-3 notification queued for: {}", email);
        } catch (Exception e) {
            log.error("[Notification] Failed to process leaderboard.rank_changed event", e);
        }
    }
}