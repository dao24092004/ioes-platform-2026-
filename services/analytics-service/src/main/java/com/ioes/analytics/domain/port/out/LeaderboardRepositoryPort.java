package com.ioes.analytics.domain.port.out;

import com.ioes.analytics.domain.model.LeaderboardEntry;
import com.ioes.analytics.domain.model.LeaderboardPeriod;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

/**
 * Output port: Leaderboard repository.
 * Redis Sorted Set + PostgreSQL backup.
 */
public interface LeaderboardRepositoryPort {

    /**
     * Lấy top N entries cho period.
     */
    List<LeaderboardEntry> findTopEntries(LeaderboardPeriod period, int limit);

    /**
     * Lấy entry của user cụ thể.
     */
    Optional<LeaderboardEntry> findByUserIdAndPeriod(UUID userId, LeaderboardPeriod period);

    /**
     * Cập nhật/tạo mới entry.
     */
    LeaderboardEntry save(LeaderboardEntry entry);

    /**
     * Xóa toàn bộ entries của một period (để reset).
     */
    void deleteByPeriod(LeaderboardPeriod period);

    /**
     * Đếm số entries trong period.
     */
    long countByPeriod(LeaderboardPeriod period);

    /**
     * Thêm điểm vào Redis Sorted Set (atomic increment).
     */
    void addScore(LeaderboardPeriod period, UUID userId, double score);

    /**
     * Lấy rank của user từ Redis.
     */
    Optional<Long> getRank(LeaderboardPeriod period, UUID userId);

    /**
     * Lấy score của user từ Redis.
     */
    Optional<Double> getScore(LeaderboardPeriod period, UUID userId);
}
