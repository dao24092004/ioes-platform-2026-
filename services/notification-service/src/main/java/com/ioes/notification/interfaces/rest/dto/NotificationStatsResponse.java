package com.ioes.notification.interfaces.rest.dto;

import com.ioes.notification.domain.model.NotificationStats;

/**
 * Delivery head-count. The status buckets sum to {@code total}; the channel
 * buckets sum to {@code total} as well, cut a different way.
 */
public record NotificationStatsResponse(
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
    public static NotificationStatsResponse from(NotificationStats stats) {
        return new NotificationStatsResponse(
                stats.total(),
                stats.pending(),
                stats.sent(),
                stats.failed(),
                stats.retrying(),
                stats.email(),
                stats.push(),
                stats.sms(),
                stats.inApp());
    }
}
