package com.ioes.notification.interfaces.rest.dto;

import com.ioes.notification.domain.model.NotificationType;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;

import java.util.Map;

public record SendNotificationRequest(
        @NotNull NotificationType type,
        @NotBlank String recipient,
        @NotBlank String subject,
        String content,
        String template,
        Map<String, Object> data
) {}