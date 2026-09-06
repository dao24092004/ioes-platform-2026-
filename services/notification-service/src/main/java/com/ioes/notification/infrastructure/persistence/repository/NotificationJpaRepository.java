package com.ioes.notification.infrastructure.persistence.repository;

import com.ioes.notification.domain.model.NotificationStatus;
import com.ioes.notification.infrastructure.persistence.entity.NotificationEntity;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.UUID;

@Repository
public interface NotificationJpaRepository extends JpaRepository<NotificationEntity, UUID> {

    @Query("SELECT n FROM NotificationEntity n WHERE n.status = :status ORDER BY n.scheduledAt ASC")
    List<NotificationEntity> findPendingNotifications(@Param("status") NotificationStatus status, Pageable pageable);

    List<NotificationEntity> findByUserIdOrderByCreatedAtDesc(UUID userId, Pageable pageable);

    default List<NotificationEntity> findPendingNotifications(int limit) {
        return findPendingNotifications(NotificationStatus.pending, Pageable.ofSize(limit));
    }
}