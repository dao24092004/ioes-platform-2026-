package com.ioes.notification.domain.service;

import com.ioes.common.exception.ApiException;
import com.ioes.notification.domain.model.Notification;
import com.ioes.notification.domain.model.NotificationStatus;
import com.ioes.notification.domain.model.NotificationType;
import com.ioes.notification.domain.port.in.NotificationUseCase;
import com.ioes.notification.domain.port.out.NotificationRepositoryPort;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;

import java.time.Instant;
import java.util.UUID;

@Slf4j
@Service
@RequiredArgsConstructor
public class NotificationService implements NotificationUseCase {

    private final NotificationRepositoryPort notificationRepositoryPort;
    private final EmailSender emailSender;

    @Value("${notification.retry.max-attempts:3}")
    private int maxRetryAttempts;

    @Override
    public Notification send(SendCommand command) {
        log.info("Sending notification: type={}, recipient={}", command.type(), command.recipient());

        Notification notification = Notification.builder()
                .id(UUID.randomUUID())
                .userId(command.userId())
                .type(command.type())
                .recipient(command.recipient())
                .subject(command.subject())
                .status(NotificationStatus.PENDING)
                .retryCount(0)
                .scheduledAt(Instant.now())
                .createdAt(Instant.now())
                .updatedAt(Instant.now())
                .build();

        try {
            deliver(notification, command.content(), null);
            notification.setStatus(NotificationStatus.SENT);
            notification.setSentAt(Instant.now());
        } catch (Exception e) {
            log.error("Failed to send notification: {}", e.getMessage(), e);
            notification.setStatus(NotificationStatus.FAILED);
            notification.setErrorMessage(e.getMessage());
        }

        return notificationRepositoryPort.save(notification);
    }

    @Override
    public Notification sendTemplated(TemplatedCommand command) {
        log.info("Sending templated notification: template={}, recipient={}", command.template(), command.recipient());

        Notification notification = Notification.builder()
                .id(UUID.randomUUID())
                .userId(command.userId())
                .type(command.type())
                .recipient(command.recipient())
                .template(command.template())
                .data(command.data())
                .status(NotificationStatus.PENDING)
                .retryCount(0)
                .scheduledAt(Instant.now())
                .createdAt(Instant.now())
                .updatedAt(Instant.now())
                .build();

        try {
            String content = emailSender.renderTemplate(command.template(), command.data());
            deliver(notification, content, command.data());
            notification.setStatus(NotificationStatus.SENT);
            notification.setSentAt(Instant.now());
        } catch (Exception e) {
            log.error("Failed to send templated notification: {}", e.getMessage(), e);
            notification.setStatus(NotificationStatus.FAILED);
            notification.setErrorMessage(e.getMessage());
        }

        return notificationRepositoryPort.save(notification);
    }

    @Override
    @Scheduled(fixedDelayString = "${notification.queue.processing-interval-ms:5000}")
    public void processPendingNotifications() {
        var pending = notificationRepositoryPort.findPendingNotifications(50);
        log.debug("Processing {} pending notifications", pending.size());

        for (Notification notification : pending) {
            try {
                if (notification.getRetryCount() >= maxRetryAttempts) {
                    log.warn("Max retry attempts reached for notification: {}", notification.getId());
                    notification.setStatus(NotificationStatus.FAILED);
                    notificationRepositoryPort.save(notification);
                    continue;
                }

                String content = notification.getTemplate() != null
                        ? emailSender.renderTemplate(notification.getTemplate(), notification.getData())
                        : notification.getSubject();

                deliver(notification, content, notification.getData());
                notification.setStatus(NotificationStatus.SENT);
                notification.setSentAt(Instant.now());
                notification.setUpdatedAt(Instant.now());
                notificationRepositoryPort.save(notification);

                log.info("Notification sent: {}", notification.getId());
            } catch (Exception e) {
                log.warn("Retry attempt {} for notification {}: {}",
                        notification.getRetryCount() + 1, notification.getId(), e.getMessage());

                notification.setRetryCount(notification.getRetryCount() + 1);
                notification.setStatus(notification.getRetryCount() >= maxRetryAttempts
                        ? NotificationStatus.FAILED
                        : NotificationStatus.RETRYING);
                notification.setErrorMessage(e.getMessage());
                notification.setUpdatedAt(Instant.now());
                notificationRepositoryPort.save(notification);
            }
        }
    }

    private void deliver(Notification notification, String content, java.util.Map<String, Object> data) {
        if (notification.getType() != NotificationType.EMAIL) {
            throw ApiException.badRequest("Only EMAIL type is currently supported");
        }
        emailSender.send(notification.getRecipient(), notification.getSubject(), content);
    }
}