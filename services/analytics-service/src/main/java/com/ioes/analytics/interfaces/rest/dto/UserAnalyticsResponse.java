package com.ioes.analytics.interfaces.rest.dto;

import java.time.Instant;
import java.util.UUID;

/**
 * Response DTO cho user analytics dashboard.
 */
public record UserAnalyticsResponse(
        UUID userId,
        int totalExamsAttempted,
        int totalExamsPassed,
        int totalExamsFailed,
        double passRate,         // % pass rate
        double avgScore,
        double highestScore,
        int totalCoursesEnrolled,
        int totalCoursesCompleted,
        int currentStreak,
        int longestStreak,
        long totalStudyMinutes,
        Instant lastExamAt,
        Instant lastLoginAt
) {}
