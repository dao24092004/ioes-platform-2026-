package com.ioes.analytics.domain.model;

import lombok.*;
import java.time.Instant;
import java.util.UUID;

/**
 * Domain model: một entry trong bảng xếp hạng (Leaderboard).
 * Score là điểm tích luỹ tổng hợp (exam scores + learning streak + completion rate).
 */
@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class LeaderboardEntry {

    private UUID id;
    private UUID userId;
    private String displayName;
    private String avatarUrl;

    /** Điểm tích luỹ dùng để xếp hạng */
    private double score;

    /** Thứ hạng hiện tại */
    private long rank;

    /** Thứ hạng kỳ trước để tính delta */
    private long previousRank;

    private LeaderboardPeriod period; // DAILY, WEEKLY, MONTHLY, ALL_TIME

    /** Tổng số bài thi đã hoàn thành */
    private int examsCompleted;

    /** Điểm trung bình các bài thi */
    private double avgExamScore;

    /** Số ngày học liên tục hiện tại */
    private int currentStreak;

    /** Số ngày học liên tục dài nhất */
    private int longestStreak;

    /** Số khóa học đã hoàn thành */
    private int coursesCompleted;

    private Instant lastActivityAt;
    private Instant createdAt;
    private Instant updatedAt;

    public long getRankDelta() {
        if (previousRank == 0) return 0;
        return previousRank - rank; // dương = lên hạng, âm = xuống hạng
    }
}
