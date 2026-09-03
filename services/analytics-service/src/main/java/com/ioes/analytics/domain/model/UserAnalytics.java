package com.ioes.analytics.domain.model;

import lombok.*;
import java.time.Instant;
import java.util.UUID;

/**
 * Domain model: thống kê analytics của một user.
 */
@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class UserAnalytics {
    private UUID id;
    private UUID userId;

    private int totalExamsAttempted;
    private int totalExamsPassed;
    private int totalExamsFailed;
    private double totalScore;
    private double avgScore;
    private double highestScore;

    private int totalCoursesEnrolled;
    private int totalCoursesCompleted;

    private int currentStreak;
    private int longestStreak;
    private long totalStudyMinutes;

    private Instant lastExamAt;
    private Instant lastLoginAt;
    private Instant createdAt;
    private Instant updatedAt;
}
