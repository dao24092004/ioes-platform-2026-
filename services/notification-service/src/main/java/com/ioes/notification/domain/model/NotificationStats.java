package com.ioes.notification.domain.model;

import java.util.Map;

/**
 * Delivery head-count for the admin notifications page: how many notifications
 * exist, split by where they got to and by how they were meant to be delivered.
 */
public record NotificationStats(
        long total,
        long pending,
        long sent,
        long failed,
        long retrying,
        long email,
        long push,
        long sms,
        long inApp
) {
    public static NotificationStats empty() {
        return new NotificationStats(0, 0, 0, 0, 0, 0, 0, 0, 0);
    }

    /**
     * Builds the record from grouped tallies. A status or type nothing has ever
     * used is simply absent from its map and reads as zero.
     */
    public static NotificationStats from(
            Map<NotificationStatus, Long> byStatus, Map<NotificationType, Long> byType) {

        long total = byStatus.values().stream().mapToLong(Long::longValue).sum();
        return new NotificationStats(
                total,
                byStatus.getOrDefault(NotificationStatus.pending, 0L),
                byStatus.getOrDefault(NotificationStatus.sent, 0L),
                byStatus.getOrDefault(NotificationStatus.failed, 0L),
                byStatus.getOrDefault(NotificationStatus.retrying, 0L),
                byType.getOrDefault(NotificationType.email, 0L),
                byType.getOrDefault(NotificationType.push, 0L),
                byType.getOrDefault(NotificationType.sms, 0L),
                byType.getOrDefault(NotificationType.in_app, 0L));
    }
}
