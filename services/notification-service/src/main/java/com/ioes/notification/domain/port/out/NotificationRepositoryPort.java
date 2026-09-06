package com.ioes.notification.domain.port.out;

import com.ioes.notification.domain.model.Notification;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface NotificationRepositoryPort {
    Notification save(Notification notification);
    Optional<Notification> findById(UUID id);
    List<Notification> findPendingNotifications(int limit);
    List<Notification> findByUserId(UUID userId, int limit);
}