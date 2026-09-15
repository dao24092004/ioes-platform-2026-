package com.ioes.analytics.interfaces.rest.dto;

import com.ioes.analytics.domain.model.AdminKpi;

/**
 * Platform counters for the admin dashboard.
 *
 * <p>{@code activeWithinDays} echoes back the window the numbers were computed
 * over, so a chart cannot mislabel a 7-day figure as a 30-day one.
 */
public record AdminKpiResponse(
        long trackedUsers,
        long activeUsers,
        int activeWithinDays,
        long examAttempts,
        long examsPassed,
        long examsFailed,
        double passRate,
        double avgScore,
        long courseEnrollments,
        long courseCompletions,
        long studyMinutes
) {
    public static AdminKpiResponse from(AdminKpi kpi, int activeWithinDays) {
        return new AdminKpiResponse(
                kpi.trackedUsers(),
                kpi.activeUsers(),
                activeWithinDays,
                kpi.examAttempts(),
                kpi.examsPassed(),
                kpi.examsFailed(),
                round(kpi.passRate()),
                round(kpi.avgScore()),
                kpi.courseEnrollments(),
                kpi.courseCompletions(),
                kpi.studyMinutes());
    }

    /** Two decimals is all a percentage tile shows; avoids 84.99999999999999. */
    private static double round(double value) {
        return Math.round(value * 100.0) / 100.0;
    }
}
