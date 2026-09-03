package com.ioes.analytics.domain.model;

import com.ioes.common.event.DomainEvent;

import java.util.UUID;

/**
 * Domain event: user đạt mốc streak (BR-015: 7 ngày liên tục = bonus).
 * Published to topic: analytics.streak.milestone
 *
 * Consumed by:
 *   - notification-service → gửi email chúc mừng
 */
public record StreakMilestoneEvent(
        UUID userId,
        String email,
        String displayName,
        int streakDays,
        double bonusScore
) implements DomainEvent {

    @Override
    public String aggregateId() {
        return userId.toString();
    }

    @Override
    public String aggregateType() {
        return "UserAnalytics";
    }

    @Override
    public String eventType() {
        return "analytics.streak.milestone";
    }
}
