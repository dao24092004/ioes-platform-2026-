package com.ioes.analytics.interfaces.rest.controller;

import com.ioes.analytics.domain.model.LeaderboardEntry;
import com.ioes.analytics.domain.model.LeaderboardPeriod;
import com.ioes.analytics.domain.model.UserAnalytics;
import com.ioes.analytics.domain.port.in.AnalyticsUseCase;
import com.ioes.analytics.interfaces.rest.dto.LeaderboardEntryResponse;
import com.ioes.analytics.interfaces.rest.dto.UserAnalyticsResponse;
import com.ioes.common.dto.ApiResponse;
import com.ioes.common.exception.ApiException;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.GrantedAuthority;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Set;
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
 *
 * <p>The caller's identity and role are always taken from the
 * {@link SecurityContextHolder} principal/authorities that
 * {@code com.ioes.common.security.JwtAuthenticationFilter} populates from
 * the validated bearer token — never from the client-controllable
 * {@code X-User-Id} / {@code X-User-Role} headers, which any caller hitting
 * this service directly (bypassing the gateway) could forge.
 * {@code SecurityConfig}'s {@code anyRequest().authenticated()} rule
 * guarantees {@code authentication} is non-null here for every endpoint
 * except the public leaderboard read.
 *
 * <p>Role strings are compared against the lower-case values tokens really
 * carry ({@code student}, {@code instructor}, {@code admin},
 * {@code super_admin}, {@code guest} — see {@code UserRole} in auth-service);
 * {@code super_admin} passes wherever {@code admin} does.
 */
@Slf4j
@RestController
@RequestMapping("/analytics")
@RequiredArgsConstructor
public class AnalyticsController {

    private static final String ROLE_STUDENT = "student";
    private static final Set<String> ADMIN_ROLES = Set.of("admin", "super_admin");

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
     * Lấy rank của current user (userId lấy từ SecurityContext, không phải header).
     */
    @GetMapping("/leaderboard/me")
    public ResponseEntity<ApiResponse<LeaderboardEntryResponse>> getMyRank(
            @RequestParam(defaultValue = "WEEKLY") LeaderboardPeriod period
    ) {
        UUID userId = callerId();

        return analyticsUseCase
                .getUserRank(userId, period)
                .map(entry -> ResponseEntity.ok(ApiResponse.success("User rank retrieved", toResponse(entry))))
                .orElse(ResponseEntity.ok(ApiResponse.success("Not ranked yet", null)));
    }

    /**
     * GET /analytics/users/{userId}
     * Lấy thống kê analytics của user.
     * Instructor/Admin/Super_admin có thể xem bất kỳ user nào; Student chỉ xem mình.
     */
    @GetMapping("/users/{userId}")
    public ResponseEntity<ApiResponse<UserAnalyticsResponse>> getUserAnalytics(@PathVariable UUID userId) {
        requireSelfIfStudent(userId);

        UserAnalytics analytics = analyticsUseCase.getUserAnalytics(userId);
        return ResponseEntity.ok(ApiResponse.success("User analytics retrieved", toUserResponse(analytics)));
    }

    /**
     * POST /analytics/leaderboard/{period}/reset
     * Admin-only: reset leaderboard cho period (BR-016).
     */
    @PostMapping("/leaderboard/{period}/reset")
    public ResponseEntity<ApiResponse<Void>> resetLeaderboard(@PathVariable LeaderboardPeriod period) {
        requireAdmin();

        analyticsUseCase.resetLeaderboard(period);
        log.info("Leaderboard {} reset by admin", period);
        return ResponseEntity.ok(ApiResponse.success("Leaderboard reset successfully", null));
    }

    // ===== AUTHORIZATION =====

    /**
     * A student may read only their own analytics; any other authenticated
     * role (instructor, admin, super_admin) may read anyone's.
     */
    private void requireSelfIfStudent(UUID userId) {
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();

        if (!(authentication.getPrincipal() instanceof UUID callerId)) {
            throw ApiException.forbidden("Access denied: students can only view their own analytics");
        }

        boolean isStudent = authentication.getAuthorities().stream()
                .map(GrantedAuthority::getAuthority)
                .anyMatch(ROLE_STUDENT::equals);

        if (isStudent && !callerId.equals(userId)) {
            throw ApiException.forbidden("Access denied: students can only view their own analytics");
        }
    }

    private void requireAdmin() {
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();

        boolean isAdmin = authentication != null && authentication.getAuthorities().stream()
                .map(GrantedAuthority::getAuthority)
                .anyMatch(ADMIN_ROLES::contains);

        if (!isAdmin) {
            throw ApiException.forbidden("Admin only");
        }
    }

    private UUID callerId() {
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();

        if (authentication == null || !(authentication.getPrincipal() instanceof UUID callerId)) {
            throw ApiException.unauthorized("Authentication required");
        }

        return callerId;
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
