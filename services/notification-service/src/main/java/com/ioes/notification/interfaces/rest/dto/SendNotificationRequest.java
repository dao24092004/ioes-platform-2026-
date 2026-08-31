package com.ioes.notification.interfaces.rest.dto;

import com.ioes.notification.domain.model.NotificationType;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;

import java.util.Map;
import java.util.UUID;

/**
 * Shared body for both {@code POST /notifications/send} and
 * {@code POST /notifications/send-templated}.
 *
 * <p>{@code userId} is deliberately optional, not required: a notification
 * can legitimately target a {@code recipient} email address with no
 * corresponding platform account (e.g. an invite sent before the person has
 * registered), and that case has no user id to supply. When the caller does
 * know the platform user the notification is for, they should pass it so the
 * row lands in that user's inbox ({@code GET /notifications/user/{userId}}).
 * The field is typed as {@link UUID} rather than {@link String} so Jackson
 * itself rejects a malformed id at deserialization time.
 */
public record SendNotificationRequest(
        @NotNull NotificationType type,
        UUID userId,
        @NotBlank String recipient,
        @NotBlank String subject,
        String content,
        String template,
        Map<String, Object> data
) {}