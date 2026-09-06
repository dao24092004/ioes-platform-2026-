package com.ioes.analytics.domain.model;

import com.ioes.common.event.DomainEvent;
import java.util.UUID;

/**
 * Domain event: user thay đổi thứ hạng trên leaderboard (lên top 3).
 * Published to topic: analytics.leaderboard.rank_changed
 *
 * Consumed by:
 *   - notification-service → gửi thông báo "Bạn đang ở top X!"
 */
public record LeaderboardRankChangedEvent(
        UUID userId,
        String email,
        String displayName,
        long newRank,
        long previousRank,
        LeaderboardPeriod period,
        double score
) implements DomainEvent {

    @Override
    public String aggregateId() {
        return userId.toString();
    }

    @Override
    public String aggregateType() {
        return "LeaderboardEntry";
    }

    @Override
    public String eventType() {
        return "analytics.leaderboard.rank_changed";
    }
}
