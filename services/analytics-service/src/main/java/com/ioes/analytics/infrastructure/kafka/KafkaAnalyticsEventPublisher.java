package com.ioes.analytics.infrastructure.kafka;

import com.ioes.analytics.domain.model.LeaderboardRankChangedEvent;
import com.ioes.analytics.domain.model.StreakMilestoneEvent;
import com.ioes.analytics.domain.port.out.AnalyticsEventPublisherPort;
import com.ioes.common.event.EventPublisher;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Component;

/**
 * Kafka adapter — implement AnalyticsEventPublisherPort bằng KafkaEventPublisher từ common-kafka.
 *
 * Topics produced:
 *   - analytics.streak.milestone      → consumed by notification-service
 *   - analytics.leaderboard.rank_changed → consumed by notification-service
 */
@Slf4j
@Component
@RequiredArgsConstructor
public class KafkaAnalyticsEventPublisher implements AnalyticsEventPublisherPort {

    private final EventPublisher eventPublisher;

    @Override
    public void publishStreakMilestone(StreakMilestoneEvent event) {
        log.info("[Analytics] Publishing streak milestone: userId={}, streak={} days",
                event.userId(), event.streakDays());
        try {
            eventPublisher.publish(event, "analytics-service")
                    .whenComplete((result, ex) -> {
                        if (ex != null) {
                            log.error("[Analytics] Failed to publish StreakMilestoneEvent for userId={}: {}",
                                    event.userId(), ex.getMessage());
                        } else {
                            log.debug("[Analytics] StreakMilestoneEvent published for userId={}", event.userId());
                        }
                    });
        } catch (Exception e) {
            log.error("[Analytics] Error publishing StreakMilestoneEvent: {}", e.getMessage(), e);
        }
    }

    @Override
    public void publishLeaderboardRankChanged(LeaderboardRankChangedEvent event) {
        log.info("[Analytics] Publishing leaderboard rank changed: userId={}, rank={}, period={}",
                event.userId(), event.newRank(), event.period());
        try {
            eventPublisher.publish(event, "analytics-service")
                    .whenComplete((result, ex) -> {
                        if (ex != null) {
                            log.error("[Analytics] Failed to publish LeaderboardRankChangedEvent for userId={}: {}",
                                    event.userId(), ex.getMessage());
                        } else {
                            log.debug("[Analytics] LeaderboardRankChangedEvent published for userId={}", event.userId());
                        }
                    });
        } catch (Exception e) {
            log.error("[Analytics] Error publishing LeaderboardRankChangedEvent: {}", e.getMessage(), e);
        }
    }
}
