package com.ioes.notification.infrastructure.persistence.repository;

import com.ioes.notification.domain.model.NotificationStatus;
import com.ioes.notification.domain.model.NotificationType;
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

    /**
     * How many notifications sit in each status. Grouping in the database keeps
     * the stats endpoint to two queries rather than one COUNT per bucket.
     */
    @Query("SELECT n.status AS status, COUNT(n) AS total FROM NotificationEntity n GROUP BY n.status")
    List<StatusTally> tallyByStatus();

    /** How many notifications were sent over each channel. */
    @Query("SELECT n.type AS type, COUNT(n) AS total FROM NotificationEntity n GROUP BY n.type")
    List<TypeTally> tallyByType();

    /** Projection for {@link #tallyByStatus()}. */
    interface StatusTally {
        NotificationStatus getStatus();
        long getTotal();
    }

    /** Projection for {@link #tallyByType()}. */
    interface TypeTally {
        NotificationType getType();
        long getTotal();
    }
}