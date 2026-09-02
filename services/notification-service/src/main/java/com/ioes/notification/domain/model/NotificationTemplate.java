package com.ioes.notification.domain.model;

/**
 * A template {@code sendTemplated} will accept.
 *
 * <p>{@code name} is exactly the string a caller puts in
 * {@code SendNotificationRequest.template} — the Thymeleaf view name, with no
 * directory prefix and no {@code .html} suffix.
 */
public record NotificationTemplate(String name) {}
