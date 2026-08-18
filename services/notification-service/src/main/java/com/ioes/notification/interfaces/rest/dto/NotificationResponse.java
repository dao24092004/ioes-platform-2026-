package com.ioes.notification.interfaces.rest.dto;

import com.ioes.notification.domain.model.Notification;
import com.ioes.notification.domain.model.NotificationStatus;
import com.ioes.notification.domain.model.NotificationType;

import java.time.Instant;
import java.util.UUID;

public record NotificationResponse(
        UUID id,
        UUID userId,
        NotificationType type,
        String recipient,
        String subject,
        NotificationStatus status,
        Instant sentAt,
        Instant createdAt
) {
    public static NotificationResponse from(Notification n) {
        return new NotificationResponse(
                n.getId(),
                n.getUserId(),
                n.getType(),
                n.getRecipient(),
                n.getSubject(),
                n.getStatus(),
                n.getSentAt(),
                n.getCreatedAt()
        );
    }
}