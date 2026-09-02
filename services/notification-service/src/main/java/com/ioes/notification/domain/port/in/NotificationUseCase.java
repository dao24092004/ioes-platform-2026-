package com.ioes.notification.domain.port.in;

import com.ioes.notification.domain.model.Notification;
import com.ioes.notification.domain.model.NotificationStats;
import com.ioes.notification.domain.model.NotificationTemplate;
import com.ioes.notification.domain.model.NotificationType;

import java.util.List;
import java.util.Map;
import java.util.UUID;

public interface NotificationUseCase {
    Notification send(SendCommand command);
    Notification sendTemplated(TemplatedCommand command);
    void processPendingNotifications();

    /**
     * The caller's inbox, newest first, capped to the most recent
     * {@value com.ioes.notification.domain.service.NotificationService#INBOX_LIMIT}
     * notifications. The service has no paging convention beyond the fixed
     * limit {@link #processPendingNotifications()} already uses for its own
     * batch, so this mirrors that same "take N" convention rather than
     * introducing pagination.
     */
    List<Notification> getUserNotifications(UUID userId);

    /**
     * One notification by id. Throws rather than returning an empty optional so
     * that a missing row and a row the caller may not see are indistinguishable
     * to the controller, which decides what the caller is allowed to know.
     */
    Notification getNotification(UUID id);

    /** Delivery head-count across the whole table. */
    NotificationStats stats();

    /** Templates {@link #sendTemplated(TemplatedCommand)} will accept. */
    List<NotificationTemplate> templates();

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