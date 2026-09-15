package com.ioes.notification.interfaces.rest.dto;

import com.ioes.notification.domain.model.NotificationTemplate;

/**
 * One renderable template. {@code name} is the exact value to put in
 * {@code SendNotificationRequest.template}.
 */
public record NotificationTemplateResponse(String name) {

    public static NotificationTemplateResponse from(NotificationTemplate template) {
        return new NotificationTemplateResponse(template.name());
    }
}
