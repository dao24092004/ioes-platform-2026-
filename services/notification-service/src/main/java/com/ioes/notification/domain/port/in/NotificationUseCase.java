package com.ioes.notification.domain.port.in;

import com.ioes.notification.domain.model.Notification;
import com.ioes.notification.domain.model.NotificationType;

import java.util.Map;
import java.util.UUID;

public interface NotificationUseCase {
    Notification send(SendCommand command);
    Notification sendTemplated(TemplatedCommand command);
    void processPendingNotifications();

    record SendCommand(
            UUID userId,
            NotificationType type,
            String recipient,
            String subject,
            String content
    ) {}

    record TemplatedCommand(
            UUID userId,
            NotificationType type,
            String recipient,
            String template,
            Map<String, Object> data
    ) {}
}