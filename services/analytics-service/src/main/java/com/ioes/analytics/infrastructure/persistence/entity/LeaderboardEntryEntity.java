package com.ioes.analytics.infrastructure.persistence.entity;

import com.ioes.analytics.domain.model.LeaderboardPeriod;
import jakarta.persistence.*;
import lombok.*;

import java.time.Instant;
import java.util.UUID;

@Entity
@Table(name = "leaderboard_entries", indexes = {
        @Index(name = "idx_leaderboard_period_score", columnList = "period, score DESC"),
        @Index(name = "idx_leaderboard_user_period", columnList = "user_id, period"),
        @Index(name = "idx_leaderboard_rank", columnList = "period, rank")
})
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class LeaderboardEntryEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @Column(name = "user_id", nullable = false)
    private UUID userId;

    @Column(name = "display_name", length = 255)
    private String displayName;

    @Column(name = "avatar_url", length = 512)
    private String avatarUrl;

    @Column(nullable = false)
    private double score;

    @Column(nullable = false)
    private long rank;

    @Column(name = "previous_rank")
    private long previousRank;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private LeaderboardPeriod period;

    @Column(name = "exams_completed", nullable = false)
    private int examsCompleted;

    @Column(name = "avg_exam_score", nullable = false)
    private double avgExamScore;

    @Column(name = "current_streak", nullable = false)
    private int currentStreak;

    @Column(name = "longest_streak", nullable = false)
    private int longestStreak;

    @Column(name = "courses_completed", nullable = false)
    private int coursesCompleted;

    @Column(name = "last_activity_at")
    private Instant lastActivityAt;

    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;

    @Column(name = "updated_at", nullable = false)
    private Instant updatedAt;
}
