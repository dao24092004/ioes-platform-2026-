package com.ioes.analytics.interfaces.rest.controller;

import com.ioes.analytics.domain.model.AdminKpi;
import com.ioes.analytics.domain.port.in.AdminAnalyticsUseCase;
import com.ioes.analytics.domain.service.AdminAnalyticsService;
import com.ioes.analytics.interfaces.rest.dto.AdminKpiResponse;
import com.ioes.analytics.interfaces.rest.dto.DailyCountResponse;
import com.ioes.common.dto.ApiResponse;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

/**
 * Admin aggregate reads, mounted under {@code /analytics/admin}. api-gateway
 * routes {@code /api/analytics/**} here with {@code StripPrefix=1}, so the public
 * paths are {@code /api/analytics/admin/...}.
 *
 * <p>Authorization is declared in {@code SecurityConfig} rather than checked here:
 * the whole prefix is admin-only, so there is no per-endpoint rule to apply.
 */
@Slf4j
@RestController
@RequestMapping("/analytics/admin")
@RequiredArgsConstructor
public class AdminAnalyticsController {

    private final AdminAnalyticsUseCase adminAnalyticsUseCase;

    /**
     * GET /analytics/admin/kpi?activeWithinDays=30
     *
     * <p>Out-of-range windows are clamped rather than rejected — a dashboard
     * should still render when a stale bookmark asks for something silly.
     */
    @GetMapping("/kpi")
    public ResponseEntity<ApiResponse<AdminKpiResponse>> kpi(
            @RequestParam(defaultValue = "30") int activeWithinDays) {

        int window = Math.min(
                Math.max(activeWithinDays, 1),
                AdminAnalyticsService.MAX_WINDOW_DAYS);

        AdminKpi kpi = adminAnalyticsUseCase.kpi(window);
        return ResponseEntity.ok(
                ApiResponse.success("Platform KPI retrieved", AdminKpiResponse.from(kpi, window)));
    }

    /**
     * GET /analytics/admin/user-growth?days=30
     *
     * <p>Counts new analytics profiles per day, which is when a user first
     * produced an event this service tracks — not when they registered. Signup
     * dates live in auth-service.
     */
    @GetMapping("/user-growth")
    public ResponseEntity<ApiResponse<List<DailyCountResponse>>> userGrowth(
            @RequestParam(defaultValue = "30") int days) {

        List<DailyCountResponse> series = adminAnalyticsUseCase.userGrowth(days).stream()
                .map(DailyCountResponse::from)
                .toList();

        return ResponseEntity.ok(ApiResponse.success("User growth retrieved", series));
    }
}
