package com.ioes.analytics.interfaces.rest.controller;

import com.ioes.analytics.domain.model.LeaderboardEntry;
import com.ioes.analytics.domain.model.LeaderboardPeriod;
import com.ioes.analytics.domain.model.UserAnalytics;
import com.ioes.analytics.domain.port.in.AnalyticsUseCase;
import com.ioes.analytics.interfaces.rest.dto.LeaderboardEntryResponse;
import com.ioes.analytics.interfaces.rest.dto.UserAnalyticsResponse;
import com.ioes.common.dto.ApiResponse;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;
import java.util.stream.Collectors;

/**
 * Analytics REST Controller.
 *
 * Endpoints:
 *   GET  /analytics/leaderboard?period=DAILY&limit=10  — top N rankings
 *   GET  /analytics/leaderboard/me?period=WEEKLY       — my rank
 *   GET  /analytics/users/{userId}                     — user analytics
 *   POST /analytics/leaderboard/{period}/reset         — admin reset (BR-016)
 */
@Slf4j
@RestController
@RequestMapping("/analytics")
@RequiredArgsConstructor
public class AnalyticsController {

    private final AnalyticsUseCase analyticsUseCase;

    /**
     * GET /analytics/leaderboard
     * Lấy top N users trong period chỉ định.
     * Public — mọi user đều xem được (BR: xem leaderboard = ✅ Student/Instructor/Admin)
     */
    @GetMapping("/leaderboard")
    public ResponseEntity<ApiResponse<List<LeaderboardEntryResponse>>> getLeaderboard(
            @RequestParam(defaultValue = "WEEKLY") LeaderboardPeriod period,
            @RequestParam(defaultValue = "10") int limit
    ) {
        log.debug("GET /analytics/leaderboard?period={}&limit={}", period, limit);

        List<LeaderboardEntryResponse> entries = analyticsUseCase
                .getLeaderboard(period, limit)
                .stream()
                .map(this::toResponse)
                .collect(Collectors.toList());

        return ResponseEntity.ok(ApiResponse.success("Leaderboard retrieved", entries));
    }

    /**
     * GET /analytics/leaderboard/me
     * Lấy rank của current user (inject từ X-User-Id header bởi API Gateway).
     */
    @GetMapping("/leaderboard/me")
    public ResponseEntity<ApiResponse<LeaderboardEntryResponse>> getMyRank(
            @RequestHeader(value = "X-User-Id", required = false) String userId,
            @RequestParam(defaultValue = "WEEKLY") LeaderboardPeriod period
    ) {
        if (userId == null) {
            return ResponseEntity.ok(ApiResponse.success("Not ranked yet", null));
        }

        return analyticsUseCase
                .getUserRank(UUID.fromString(userId), period)
                .map(entry -> ResponseEntity.ok(ApiResponse.success("User rank retrieved", toResponse(entry))))
                .orElse(ResponseEntity.ok(ApiResponse.success("Not ranked yet", null)));
    }

    /**
     * GET /analytics/users/{userId}
     * Lấy thống kê analytics của user.
     * Instructor/Admin có thể xem bất kỳ user nào; Student chỉ xem mình.
     */
    @GetMapping("/users/{userId}")
    public ResponseEntity<ApiResponse<UserAnalyticsResponse>> getUserAnalytics(
            @PathVariable UUID userId,
            @RequestHeader(value = "X-User-Id", required = false) String currentUserId,
            @RequestHeader(value = "X-User-Role", required = false) String role
    ) {
        // Simple RBAC check: students chỉ xem của mình
        if ("STUDENT".equals(role) && !userId.toString().equals(currentUserId)) {
            return ResponseEntity.status(403)
                    .body(ApiResponse.error("Access denied: students can only view their own analytics"));
        }

        UserAnalytics analytics = analyticsUseCase.getUserAnalytics(userId);
        return ResponseEntity.ok(ApiResponse.success("User analytics retrieved", toUserResponse(analytics)));
    }

    /**
     * POST /analytics/leaderboard/{period}/reset
     * Admin-only: reset leaderboard cho period (BR-016).
     */
    @PostMapping("/leaderboard/{period}/reset")
    public ResponseEntity<ApiResponse<Void>> resetLeaderboard(
            @PathVariable LeaderboardPeriod period,
            @RequestHeader(value = "X-User-Role", required = false) String role
    ) {
        if (!"ADMIN".equals(role)) {
            return ResponseEntity.status(403).body(ApiResponse.error("Admin only"));
        }

        analyticsUseCase.resetLeaderboard(period);
        log.info("Leaderboard {} reset by admin", period);
        return ResponseEntity.ok(ApiResponse.success("Leaderboard reset successfully", null));
    }

    // ===== MAPPERS =====

    private LeaderboardEntryResponse toResponse(LeaderboardEntry entry) {
        return new LeaderboardEntryResponse(
                entry.getUserId(),
                entry.getDisplayName(),
                entry.getAvatarUrl(),
                entry.getScore(),
                entry.getRank(),
                entry.getRankDelta(),
                entry.getPeriod(),
                entry.getExamsCompleted(),
                entry.getAvgExamScore(),
                entry.getCurrentStreak(),
                entry.getLongestStreak(),
                entry.getCoursesCompleted(),
                entry.getLastActivityAt()
        );
    }

    private UserAnalyticsResponse toUserResponse(UserAnalytics a) {
        double passRate = a.getTotalExamsAttempted() > 0
                ? (double) a.getTotalExamsPassed() / a.getTotalExamsAttempted() * 100.0
                : 0.0;

        return new UserAnalyticsResponse(
                a.getUserId(),
                a.getTotalExamsAttempted(),
                a.getTotalExamsPassed(),
                a.getTotalExamsFailed(),
                passRate,
                a.getAvgScore(),
                a.getHighestScore(),
                a.getTotalCoursesEnrolled(),
                a.getTotalCoursesCompleted(),
                a.getCurrentStreak(),
                a.getLongestStreak(),
                a.getTotalStudyMinutes(),
                a.getLastExamAt(),
                a.getLastLoginAt()
        );
    }
}
