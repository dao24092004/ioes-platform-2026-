package com.ioes.analytics.infrastructure.persistence.adapter;

import com.ioes.analytics.domain.model.LeaderboardEntry;
import com.ioes.analytics.domain.model.LeaderboardPeriod;
import com.ioes.analytics.domain.port.out.LeaderboardRepositoryPort;
import com.ioes.analytics.infrastructure.persistence.entity.LeaderboardEntryEntity;
import com.ioes.analytics.infrastructure.persistence.repository.LeaderboardJpaRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.redis.core.RedisTemplate;
import org.springframework.stereotype.Component;

import java.util.List;
import java.util.Optional;
import java.util.Set;
import java.util.UUID;
import java.util.stream.Collectors;

/**
 * LeaderboardRepositoryAdapter:
 * - Redis Sorted Set cho real-time ranking (ioes:leaderboard:{period})
 * - PostgreSQL cho persistence / backup
 */
@Slf4j
@Component
@RequiredArgsConstructor
public class LeaderboardRepositoryAdapter implements LeaderboardRepositoryPort {

    private static final String REDIS_KEY_PREFIX = "ioes:leaderboard:";

    private final LeaderboardJpaRepository jpaRepository;
    private final RedisTemplate<String, Object> redisTemplate;

    private String redisKey(LeaderboardPeriod period) {
        return REDIS_KEY_PREFIX + period.name().toLowerCase();
    }

    @Override
    public List<LeaderboardEntry> findTopEntries(LeaderboardPeriod period, int limit) {
        return jpaRepository.findTopByPeriod(period, limit)
                .stream()
                .map(this::toDomain)
                .collect(Collectors.toList());
    }

    @Override
    public Optional<LeaderboardEntry> findByUserIdAndPeriod(UUID userId, LeaderboardPeriod period) {
        return jpaRepository.findByUserIdAndPeriod(userId, period)
                .map(this::toDomain);
    }

    @Override
    public LeaderboardEntry save(LeaderboardEntry entry) {
        LeaderboardEntryEntity entity = toEntity(entry);
        return toDomain(jpaRepository.save(entity));
    }

    @Override
    public void deleteByPeriod(LeaderboardPeriod period) {
        jpaRepository.deleteByPeriod(period);
        // Cũng xóa Redis key
        redisTemplate.delete(redisKey(period));
    }

    @Override
    public long countByPeriod(LeaderboardPeriod period) {
        return jpaRepository.countByPeriod(period);
    }

    @Override
    public void addScore(LeaderboardPeriod period, UUID userId, double score) {
        try {
            redisTemplate.opsForZSet().incrementScore(
                    redisKey(period),
                    userId.toString(),
                    score
            );
        } catch (Exception e) {
            log.warn("Redis unavailable, score update will rely on PostgreSQL only: {}", e.getMessage());
        }
    }

    @Override
    public Optional<Long> getRank(LeaderboardPeriod period, UUID userId) {
        try {
            Long rank = redisTemplate.opsForZSet().reverseRank(
                    redisKey(period),
                    userId.toString()
            );
            return Optional.ofNullable(rank);
        } catch (Exception e) {
            log.warn("Redis unavailable for rank query: {}", e.getMessage());
            return Optional.empty();
        }
    }

    @Override
    public Optional<Double> getScore(LeaderboardPeriod period, UUID userId) {
        try {
            Double score = redisTemplate.opsForZSet().score(
                    redisKey(period),
                    userId.toString()
            );
            return Optional.ofNullable(score);
        } catch (Exception e) {
            log.warn("Redis unavailable for score query: {}", e.getMessage());
            return Optional.empty();
        }
    }

    // ===== MAPPER =====

    private LeaderboardEntry toDomain(LeaderboardEntryEntity entity) {
        return LeaderboardEntry.builder()
                .id(entity.getId())
                .userId(entity.getUserId())
                .displayName(entity.getDisplayName())
                .avatarUrl(entity.getAvatarUrl())
                .score(entity.getScore())
                .rank(entity.getRank())
                .previousRank(entity.getPreviousRank())
                .period(entity.getPeriod())
                .examsCompleted(entity.getExamsCompleted())
                .avgExamScore(entity.getAvgExamScore())
                .currentStreak(entity.getCurrentStreak())
                .longestStreak(entity.getLongestStreak())
                .coursesCompleted(entity.getCoursesCompleted())
                .lastActivityAt(entity.getLastActivityAt())
                .createdAt(entity.getCreatedAt())
                .updatedAt(entity.getUpdatedAt())
                .build();
    }

    private LeaderboardEntryEntity toEntity(LeaderboardEntry domain) {
        return LeaderboardEntryEntity.builder()
                .id(domain.getId())
                .userId(domain.getUserId())
                .displayName(domain.getDisplayName())
                .avatarUrl(domain.getAvatarUrl())
                .score(domain.getScore())
                .rank(domain.getRank())
                .previousRank(domain.getPreviousRank())
                .period(domain.getPeriod())
                .examsCompleted(domain.getExamsCompleted())
                .avgExamScore(domain.getAvgExamScore())
                .currentStreak(domain.getCurrentStreak())
                .longestStreak(domain.getLongestStreak())
                .coursesCompleted(domain.getCoursesCompleted())
                .lastActivityAt(domain.getLastActivityAt())
                .createdAt(domain.getCreatedAt())
                .updatedAt(domain.getUpdatedAt())
                .build();
    }
}
