package com.ioes.analytics.infrastructure.persistence.entity;

import jakarta.persistence.*;
import lombok.*;

import java.time.Instant;
import java.util.UUID;

@Entity
@Table(name = "user_analytics", indexes = {
        @Index(name = "idx_user_analytics_user_id", columnList = "user_id", unique = true)
})
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class UserAnalyticsEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @Column(name = "user_id", nullable = false, unique = true)
    private UUID userId;

    @Column(name = "total_exams_attempted", nullable = false)
    private int totalExamsAttempted;

    @Column(name = "total_exams_passed", nullable = false)
    private int totalExamsPassed;

    @Column(name = "total_exams_failed", nullable = false)
    private int totalExamsFailed;

    @Column(name = "total_score", nullable = false)
    private double totalScore;

    @Column(name = "avg_score", nullable = false)
    private double avgScore;

    @Column(name = "highest_score", nullable = false)
    private double highestScore;

    @Column(name = "total_courses_enrolled", nullable = false)
    private int totalCoursesEnrolled;

    @Column(name = "total_courses_completed", nullable = false)
    private int totalCoursesCompleted;

    @Column(name = "current_streak", nullable = false)
    private int currentStreak;

    @Column(name = "longest_streak", nullable = false)
    private int longestStreak;

    @Column(name = "total_study_minutes", nullable = false)
    private long totalStudyMinutes;

    @Column(name = "last_exam_at")
    private Instant lastExamAt;

    @Column(name = "last_login_at")
    private Instant lastLoginAt;

    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;

    @Column(name = "updated_at", nullable = false)
    private Instant updatedAt;
}
