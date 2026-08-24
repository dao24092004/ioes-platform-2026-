package com.ioes.analytics.domain.service;

import com.ioes.analytics.domain.model.LeaderboardRankChangedEvent;
import com.ioes.analytics.domain.model.StreakMilestoneEvent;
import com.ioes.analytics.domain.model.LeaderboardEntry;
import com.ioes.analytics.domain.model.LeaderboardPeriod;
import com.ioes.analytics.domain.model.UserAnalytics;
import com.ioes.analytics.domain.port.in.AnalyticsUseCase;
import com.ioes.analytics.domain.port.out.AnalyticsEventPublisherPort;
import com.ioes.analytics.domain.port.out.LeaderboardRepositoryPort;
import com.ioes.analytics.domain.port.out.UserAnalyticsRepositoryPort;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

/**
 * Analytics domain service — implement AnalyticsUseCase.
 * Xử lý leaderboard ranking, streak tracking, user statistics.
 *
 * Scoring Formula:
 *   dailyScore   = examScore * 1.0 (raw from exam)
 *   weeklyScore  = cumulative daily scores trong 7 ngày
 *   monthlyScore = cumulative trong 30 ngày
 *   allTimeScore = tổng tích luỹ
 *
 * Streak Bonus (BR-015): 7 ngày liên tục → +10 điểm bonus
 * Top 3 Notification (BR-017): khi user vào top 3 → publish event cho notification-service
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class AnalyticsService implements AnalyticsUseCase {

    private static final int STREAK_BONUS_DAYS = 7;
    private static final double STREAK_BONUS_SCORE = 10.0;
    private static final long TOP_N_NOTIFY_THRESHOLD = 3L; // Notify khi vào top 3

    private final LeaderboardRepositoryPort leaderboardRepositoryPort;
    private final UserAnalyticsRepositoryPort userAnalyticsRepositoryPort;
    private final AnalyticsEventPublisherPort analyticsEventPublisherPort;

    // ===== LEADERBOARD =====

    @Override
    @Transactional(readOnly = true)
    public List<LeaderboardEntry> getLeaderboard(LeaderboardPeriod period, int limit) {
        log.debug("Getting leaderboard: period={}, limit={}", period, limit);
        int clampedLimit = Math.min(limit, 100); // max 100 entries per request
        return leaderboardRepositoryPort.findTopEntries(period, clampedLimit);
    }

    @Override
    @Transactional(readOnly = true)
    public Optional<LeaderboardEntry> getUserRank(UUID userId, LeaderboardPeriod period) {
        return leaderboardRepositoryPort.findByUserIdAndPeriod(userId, period);
    }

    @Override
    @Transactional
    public void updateUserScore(UpdateScoreCommand command) {
        log.info("Updating score for user={}, scoreToAdd={}", command.userId(), command.scoreToAdd());

        // Cập nhật tất cả 4 period
        for (LeaderboardPeriod period : LeaderboardPeriod.values()) {
            // Atomic increment in Redis
            leaderboardRepositoryPort.addScore(period, command.userId(), command.scoreToAdd());

            // Persist to PostgreSQL for backup
            LeaderboardEntry entry = leaderboardRepositoryPort
                    .findByUserIdAndPeriod(command.userId(), period)
                    .orElseGet(() -> LeaderboardEntry.builder()
                            .id(UUID.randomUUID())
                            .userId(command.userId())
                            .period(period)
                            .createdAt(Instant.now())
                            .build());

            // Chỉ cập nhật displayName / avatarUrl nếu được cung cấp
            if (command.displayName() != null) {
                entry.setDisplayName(command.displayName());
            }
            if (command.avatarUrl() != null) {
                entry.setAvatarUrl(command.avatarUrl());
            }
            entry.setScore(entry.getScore() + command.scoreToAdd());
            entry.setExamsCompleted(entry.getExamsCompleted() + command.examsCompleted());

            // Cập nhật avg score
            if (entry.getExamsCompleted() > 0) {
                entry.setAvgExamScore(
                        (entry.getAvgExamScore() * (entry.getExamsCompleted() - 1) + command.examScore())
                                / entry.getExamsCompleted()
                );
            }

            entry.setLastActivityAt(Instant.now());
            entry.setUpdatedAt(Instant.now());

            // Get rank từ Redis
            long previousRank = entry.getRank();
            leaderboardRepositoryPort.getRank(period, command.userId())
                    .ifPresent(rank -> entry.setRank(rank + 1)); // Redis rank is 0-based

            entry.setPreviousRank(previousRank);
            leaderboardRepositoryPort.save(entry);

            // BR-017: Publish event nếu user mới vào top 3 (period = WEEKLY hoặc ALL_TIME)
            if (shouldNotifyRankChange(period, entry.getRank(), previousRank)) {
                publishRankChangedEvent(entry, command.email());
            }
        }
    }

    @Override
    @Transactional
    public void updateStreak(UpdateStreakCommand command) {
        log.info("Updating streak for user={}, newStreak={}", command.userId(), command.newStreak());

        // Nếu đạt mốc streak bonus (BR-015)
        boolean isMilestone = command.newStreak() > 0 && command.newStreak() % STREAK_BONUS_DAYS == 0;
        if (isMilestone) {
            log.info("Streak bonus! User={} achieved {} days streak, adding {} points",
                    command.userId(), command.newStreak(), STREAK_BONUS_SCORE);

            for (LeaderboardPeriod period : LeaderboardPeriod.values()) {
                leaderboardRepositoryPort.addScore(period, command.userId(), STREAK_BONUS_SCORE);
            }
        }

        // Cập nhật user analytics
        UserAnalytics analytics = userAnalyticsRepositoryPort.findByUserId(command.userId())
                .orElseGet(() -> createEmptyAnalytics(command.userId()));

        analytics.setCurrentStreak(command.newStreak());
        if (command.newStreak() > analytics.getLongestStreak()) {
            analytics.setLongestStreak(command.newStreak());
        }
        analytics.setUpdatedAt(Instant.now());
        userAnalyticsRepositoryPort.save(analytics);

        // Cập nhật streak trong leaderboard entries
        for (LeaderboardPeriod period : LeaderboardPeriod.values()) {
            leaderboardRepositoryPort.findByUserIdAndPeriod(command.userId(), period)
                    .ifPresent(entry -> {
                        entry.setCurrentStreak(command.newStreak());
                        if (command.newStreak() > entry.getLongestStreak()) {
                            entry.setLongestStreak(command.newStreak());
                        }
                        entry.setUpdatedAt(Instant.now());
                        leaderboardRepositoryPort.save(entry);
                    });
        }

        // BR-015: Publish streak milestone event sau khi commit (fire-and-forget)
        if (isMilestone) {
            String displayName = getDisplayName(command.userId());
            String email = command.email() != null ? command.email() : "";
            analyticsEventPublisherPort.publishStreakMilestone(new StreakMilestoneEvent(
                    command.userId(),
                    email,
                    displayName,
                    command.newStreak(),
                    STREAK_BONUS_SCORE
            ));
        }
    }

    /**
     * Reset leaderboard theo BR-016: Daily/Weekly/Monthly tự động reset.
     * Scheduled từ bên ngoài hoặc qua REST API.
     */
    @Override
    @Transactional
    public void resetLeaderboard(LeaderboardPeriod period) {
        log.info("Resetting leaderboard for period={}", period);
        if (period == LeaderboardPeriod.ALL_TIME) {
            log.warn("ALL_TIME leaderboard cannot be reset");
            return;
        }
        leaderboardRepositoryPort.deleteByPeriod(period);
        log.info("Leaderboard reset complete for period={}", period);
    }

    // ===== USER ANALYTICS =====

    @Override
    @Transactional(readOnly = true)
    public UserAnalytics getUserAnalytics(UUID userId) {
        return userAnalyticsRepositoryPort.findByUserId(userId)
                .orElseGet(() -> createEmptyAnalytics(userId));
    }

    @Override
    @Transactional
    public void recordExamGraded(ExamGradedCommand command) {
        log.info("Recording exam graded: userId={}, score={}, passed={}",
                command.userId(), command.score(), command.passed());

        UserAnalytics analytics = userAnalyticsRepositoryPort.findByUserId(command.userId())
                .orElseGet(() -> createEmptyAnalytics(command.userId()));

        analytics.setTotalExamsAttempted(analytics.getTotalExamsAttempted() + 1);
        if (command.passed()) {
            analytics.setTotalExamsPassed(analytics.getTotalExamsPassed() + 1);
        } else {
            analytics.setTotalExamsFailed(analytics.getTotalExamsFailed() + 1);
        }

        analytics.setTotalScore(analytics.getTotalScore() + command.score());
        if (analytics.getTotalExamsAttempted() > 0) {
            analytics.setAvgScore(analytics.getTotalScore() / analytics.getTotalExamsAttempted());
        }
        if (command.score() > analytics.getHighestScore()) {
            analytics.setHighestScore(command.score());
        }

        analytics.setLastExamAt(Instant.now());
        analytics.setUpdatedAt(Instant.now());
        userAnalyticsRepositoryPort.save(analytics);

        // Cập nhật leaderboard score
        // Tính normalized score: 0-100 range
        double normalizedScore = command.maxScore() > 0
                ? (command.score() / command.maxScore()) * 100.0
                : command.score();

        updateUserScore(new UpdateScoreCommand(
                command.userId(),
                null, // displayName sẽ được fetch từ analytics
                null,
                command.email(),
                normalizedScore,
                1,
                normalizedScore
        ));
    }

    @Override
    @Transactional
    public void recordUserLogin(UserLoginCommand command) {
        UserAnalytics analytics = userAnalyticsRepositoryPort.findByUserId(command.userId())
                .orElseGet(() -> createEmptyAnalytics(command.userId()));

        analytics.setLastLoginAt(Instant.now());
        analytics.setUpdatedAt(Instant.now());
        userAnalyticsRepositoryPort.save(analytics);
    }

    @Override
    @Transactional
    public void recordCourseEnrolled(CourseEnrolledCommand command) {
        UserAnalytics analytics = userAnalyticsRepositoryPort.findByUserId(command.userId())
                .orElseGet(() -> createEmptyAnalytics(command.userId()));

        analytics.setTotalCoursesEnrolled(analytics.getTotalCoursesEnrolled() + 1);
        analytics.setUpdatedAt(Instant.now());
        userAnalyticsRepositoryPort.save(analytics);
    }

    // ===== SCHEDULED RESETS (BR-016) =====

    /** Reset daily leaderboard mỗi ngày lúc 00:00 */
    @Scheduled(cron = "0 0 0 * * *")
    public void scheduledDailyReset() {
        log.info("Scheduled: resetting DAILY leaderboard");
        resetLeaderboard(LeaderboardPeriod.DAILY);
    }

    /** Reset weekly leaderboard mỗi thứ 2 lúc 00:00 */
    @Scheduled(cron = "0 0 0 * * MON")
    public void scheduledWeeklyReset() {
        log.info("Scheduled: resetting WEEKLY leaderboard");
        resetLeaderboard(LeaderboardPeriod.WEEKLY);
    }

    /** Reset monthly leaderboard mỗi ngày 1 tháng lúc 00:00 */
    @Scheduled(cron = "0 0 0 1 * *")
    public void scheduledMonthlyReset() {
        log.info("Scheduled: resetting MONTHLY leaderboard");
        resetLeaderboard(LeaderboardPeriod.MONTHLY);
    }

    // ===== HELPERS =====

    private UserAnalytics createEmptyAnalytics(UUID userId) {
        return UserAnalytics.builder()
                .id(UUID.randomUUID())
                .userId(userId)
                .totalExamsAttempted(0)
                .totalExamsPassed(0)
                .totalExamsFailed(0)
                .totalScore(0.0)
                .avgScore(0.0)
                .highestScore(0.0)
                .totalCoursesEnrolled(0)
                .totalCoursesCompleted(0)
                .currentStreak(0)
                .longestStreak(0)
                .totalStudyMinutes(0L)
                .createdAt(Instant.now())
                .updatedAt(Instant.now())
                .build();
    }

    /**
     * Xác định xem có nên gửi rank-changed notification không.
     * Điều kiện: user mới vào top 3 (trước đó chưa ở top 3 hoặc rank > 3).
     * Chỉ notify cho WEEKLY và ALL_TIME period để tránh spam.
     */
    private boolean shouldNotifyRankChange(LeaderboardPeriod period, long newRank, long previousRank) {
        if (period != LeaderboardPeriod.WEEKLY && period != LeaderboardPeriod.ALL_TIME) {
            return false;
        }
        // Chỉ notify khi vào top 3 lần đầu hoặc thăng hạng
        return newRank > 0 && newRank <= TOP_N_NOTIFY_THRESHOLD
                && (previousRank == 0 || previousRank > TOP_N_NOTIFY_THRESHOLD);
    }

    private void publishRankChangedEvent(LeaderboardEntry entry, String email) {
        String resolvedEmail = email != null ? email : "";
        analyticsEventPublisherPort.publishLeaderboardRankChanged(new LeaderboardRankChangedEvent(
                entry.getUserId(),
                resolvedEmail,
                entry.getDisplayName() != null ? entry.getDisplayName() : "User",
                entry.getRank(),
                entry.getPreviousRank(),
                entry.getPeriod(),
                entry.getScore()
        ));
    }

    private String getDisplayName(UUID userId) {
        return leaderboardRepositoryPort.findByUserIdAndPeriod(userId, LeaderboardPeriod.ALL_TIME)
                .map(LeaderboardEntry::getDisplayName)
                .filter(name -> name != null && !name.isBlank())
                .orElse("User");
    }
}
