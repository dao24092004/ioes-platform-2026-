package com.ioes.analytics.interfaces.rest.dto;

import com.ioes.analytics.domain.model.LeaderboardPeriod;
import java.time.Instant;
import java.util.UUID;

/**
 * Response DTO cho một entry trong leaderboard.
 */
public record LeaderboardEntryResponse(
        UUID userId,
        String displayName,
        String avatarUrl,
        double score,
        long rank,
        long rankDelta,       // dương = lên hạng, âm = xuống hạng
        LeaderboardPeriod period,
        int examsCompleted,
        double avgExamScore,
        int currentStreak,
        int longestStreak,
        int coursesCompleted,
        Instant lastActivityAt
) {}
