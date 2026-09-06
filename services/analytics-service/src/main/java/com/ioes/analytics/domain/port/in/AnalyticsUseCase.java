package com.ioes.analytics.domain.port.in;

import com.ioes.analytics.domain.model.LeaderboardEntry;
import com.ioes.analytics.domain.model.LeaderboardPeriod;
import com.ioes.analytics.domain.model.UserAnalytics;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

/**
 * Input port: Analytics use cases.
 * Hexagonal Architecture — domain layer không phụ thuộc framework.
 */
public interface AnalyticsUseCase {

    // ===== Leaderboard =====

    /**
     * Lấy top N user theo period.
     */
    List<LeaderboardEntry> getLeaderboard(LeaderboardPeriod period, int limit);

    /**
     * Lấy rank của 1 user cụ thể trong period.
     */
    Optional<LeaderboardEntry> getUserRank(UUID userId, LeaderboardPeriod period);

    /**
     * Cập nhật score của user sau khi hoàn thành bài thi.
     */
    void updateUserScore(UpdateScoreCommand command);

    /**
     * Cập nhật streak học tập.
     */
    void updateStreak(UpdateStreakCommand command);

    /**
     * Reset leaderboard (chạy theo schedule: daily/weekly/monthly).
     */
    void resetLeaderboard(LeaderboardPeriod period);

    // ===== User Analytics =====

    /**
     * Lấy thống kê của user.
     */
    UserAnalytics getUserAnalytics(UUID userId);

    /**
     * Ghi nhận sự kiện exam graded.
     */
    void recordExamGraded(ExamGradedCommand command);

    /**
     * Ghi nhận user login.
     */
    void recordUserLogin(UserLoginCommand command);

    /**
     * Ghi nhận user đăng ký khóa học.
     */
    void recordCourseEnrolled(CourseEnrolledCommand command);

    // ===== Commands =====

    record UpdateScoreCommand(
            UUID userId,
            String displayName,
            String avatarUrl,
            String email,          // dùng để publish rank-changed event cho notification-service
            double scoreToAdd,
            int examsCompleted,
            double examScore
    ) {}

    record UpdateStreakCommand(
            UUID userId,
            int newStreak,
            String email           // dùng để publish streak milestone event
    ) {}

    record ExamGradedCommand(
            UUID submissionId,
            UUID userId,
            UUID examId,
            String email,
            String examTitle,
            double score,
            double maxScore,
            boolean passed
    ) {}

    record UserLoginCommand(
            UUID userId,
            String ipAddress
    ) {}

    record CourseEnrolledCommand(
            UUID userId,
            UUID courseId,
            String courseTitle
    ) {}
}
