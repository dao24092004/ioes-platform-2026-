package com.ioes.notification.domain.port.out;

import com.ioes.notification.domain.model.NotificationTemplate;

import java.util.List;

/** Where the renderable templates come from. */
public interface NotificationTemplatePort {

    /** Every template {@code sendTemplated} can render, sorted by name. */
    List<NotificationTemplate> list();
}
