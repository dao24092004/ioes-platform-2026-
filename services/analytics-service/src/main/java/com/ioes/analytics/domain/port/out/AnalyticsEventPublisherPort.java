package com.ioes.analytics.domain.port.out;

import com.ioes.analytics.domain.model.LeaderboardRankChangedEvent;
import com.ioes.analytics.domain.model.StreakMilestoneEvent;

/**
 * Output port: publish domain events ra Kafka.
 * Domain layer chỉ gọi interface này, không biết Kafka tồn tại.
 */
public interface AnalyticsEventPublisherPort {

    /**
     * Publish sự kiện user đạt mốc streak.
     */
    void publishStreakMilestone(StreakMilestoneEvent event);

    /**
     * Publish sự kiện leaderboard rank thay đổi (top 3).
     */
    void publishLeaderboardRankChanged(LeaderboardRankChangedEvent event);
}
