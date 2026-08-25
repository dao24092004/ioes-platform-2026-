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
            @RequestParam(required = false) String email,
            @RequestHeader(value = "X-Internal-Key", required = false) String internalKey
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
