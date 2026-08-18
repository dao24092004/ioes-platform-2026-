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
                    com.ioes.notification.domain.model.NotificationType.EMAIL,
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
                    com.ioes.notification.domain.model.NotificationType.EMAIL,
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
}