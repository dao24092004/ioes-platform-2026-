package com.ioes.notification.domain.model;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.time.Instant;
import java.util.Map;
import java.util.UUID;

@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class Notification {
    private UUID id;
    private UUID userId;
    private NotificationType type;
    private String recipient;
    private String subject;
    private String template;
    private Map<String, Object> data;
    private NotificationStatus status;
    private int retryCount;
    private String errorMessage;
    private Instant scheduledAt;
    private Instant sentAt;
    private Instant createdAt;
    private Instant updatedAt;
}