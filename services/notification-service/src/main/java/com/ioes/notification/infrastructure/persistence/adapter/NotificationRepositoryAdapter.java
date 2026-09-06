package com.ioes.notification.infrastructure.persistence.adapter;

import com.ioes.notification.domain.model.Notification;
import com.ioes.notification.domain.model.NotificationStatus;
import com.ioes.notification.domain.port.out.NotificationRepositoryPort;
import com.ioes.notification.infrastructure.persistence.entity.NotificationEntity;
import com.ioes.notification.infrastructure.persistence.repository.NotificationJpaRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Component
@RequiredArgsConstructor
public class NotificationRepositoryAdapter implements NotificationRepositoryPort {

    private final NotificationJpaRepository jpaRepository;

    @Override
    public Notification save(Notification notification) {
        NotificationEntity entity = toEntity(notification);
        NotificationEntity saved = jpaRepository.save(entity);
        return toDomain(saved);
    }

    @Override
    public Optional<Notification> findById(UUID id) {
        return jpaRepository.findById(id).map(this::toDomain);
    }

    @Override
    public List<Notification> findPendingNotifications(int limit) {
        return jpaRepository.findPendingNotifications(NotificationStatus.pending,
                org.springframework.data.domain.Pageable.ofSize(limit))
                .stream()
                .map(this::toDomain)
                .toList();
    }

    @Override
    public List<Notification> findByUserId(UUID userId, int limit) {
        return jpaRepository.findByUserIdOrderByCreatedAtDesc(userId,
                org.springframework.data.domain.Pageable.ofSize(limit))
                .stream()
                .map(this::toDomain)
                .toList();
    }

    private NotificationEntity toEntity(Notification n) {
        return NotificationEntity.builder()
                .id(n.getId())
                .userId(n.getUserId())
                .type(n.getType())
                .recipient(n.getRecipient())
                .subject(n.getSubject())
                .template(n.getTemplate())
                .data(n.getData())
                .status(n.getStatus())
                .retryCount(n.getRetryCount())
                .errorMessage(n.getErrorMessage())
                .scheduledAt(n.getScheduledAt())
                .sentAt(n.getSentAt())
                .createdAt(n.getCreatedAt())
                .updatedAt(n.getUpdatedAt())
                .build();
    }

    private Notification toDomain(NotificationEntity e) {
        return Notification.builder()
                .id(e.getId())
                .userId(e.getUserId())
                .type(e.getType())
                .recipient(e.getRecipient())
                .subject(e.getSubject())
                .template(e.getTemplate())
                .data(e.getData())
                .status(e.getStatus())
                .retryCount(e.getRetryCount())
                .errorMessage(e.getErrorMessage())
                .scheduledAt(e.getScheduledAt())
                .sentAt(e.getSentAt())
                .createdAt(e.getCreatedAt())
                .updatedAt(e.getUpdatedAt())
                .build();
    }
}