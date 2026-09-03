package com.ioes.analytics.interfaces.rest.controller;

import com.ioes.analytics.domain.model.LeaderboardPeriod;
import com.ioes.analytics.domain.port.in.AnalyticsUseCase;
import com.ioes.common.dto.ApiResponse;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.UUID;

/**
 * Endpoint để các services khác trigger analytics events (internal use).
 * Thường được gọi từ notification-service hoặc exam-suite nếu cần direct call.
 *
 * <p><b>Access control:</b> every path under {@code /analytics/internal/**}
 * requires an authenticated token carrying the {@code admin} or
 * {@code super_admin} authority — enforced by {@code SecurityConfig}, not by
 * this controller. This previously declared an {@code X-Internal-Key}
 * header that nothing ever read, so any caller (including an unauthenticated
 * one, since the whole service was {@code permitAll()}) could reset any
 * user's streak or enrolment data. No service currently calls this endpoint
 * (repo-wide search found zero callers), so there is no existing
 * service-to-service credential to preserve; reusing the admin-authority
 * check already established for {@code /leaderboard/{period}/reset} avoids
 * inventing and distributing a new shared secret whose value would have to
 * live in {@code infrastructure/helm} / env files outside this change's
 * scope. If a real service-to-service caller is wired up later, prefer a
 * validated {@code X-Internal-Key} (or mTLS) over asking a background job to
 * hold an admin user token.
 */
@Slf4j
@RestController
@RequestMapping("/analytics/internal")
@RequiredArgsConstructor
public class AnalyticsInternalController {

    private final AnalyticsUseCase analyticsUseCase;

    /**
     * POST /analytics/internal/streak
     * Cập nhật streak cho user.
     */
    @PostMapping("/streak")
    public ResponseEntity<ApiResponse<Void>> updateStreak(
            @RequestParam UUID userId,
            @RequestParam int streak,
            @RequestParam(required = false) String email
    ) {
        log.info("[Internal] Update streak: userId={}, streak={}", userId, streak);
        analyticsUseCase.updateStreak(new AnalyticsUseCase.UpdateStreakCommand(userId, streak, email));
        return ResponseEntity.ok(ApiResponse.success("Streak updated", null));
    }

    /**
     * POST /analytics/internal/course-enrolled
     * Ghi nhận user enrolled course.
     */
    @PostMapping("/course-enrolled")
    public ResponseEntity<ApiResponse<Void>> recordCourseEnrolled(
            @RequestParam UUID userId,
            @RequestParam UUID courseId,
            @RequestParam(defaultValue = "Unknown Course") String courseTitle
    ) {
        analyticsUseCase.recordCourseEnrolled(new AnalyticsUseCase.CourseEnrolledCommand(
                userId, courseId, courseTitle
        ));
        return ResponseEntity.ok(ApiResponse.success("Course enrollment recorded", null));
    }
}
