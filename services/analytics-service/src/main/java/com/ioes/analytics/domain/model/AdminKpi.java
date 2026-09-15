package com.ioes.analytics.domain.model;

/**
 * Platform-wide counters for the admin analytics page.
 *
 * <p>Every field here is derived from rows analytics-service actually holds, so
 * the numbers are real rather than plausible. Three figures the admin mock also
 * showed are deliberately absent, because nothing in this service (or any other,
 * today) records them: tokens issued belongs to blockchain-suite, average
 * session length would need session tracking that does not exist, and a signup
 * count would have to come from auth-service's users table. {@code trackedUsers}
 * counts users analytics has ever seen an event for, which is not the same as
 * registered users.
 *
 * @param trackedUsers      users with an analytics profile
 * @param activeUsers       users whose last login falls inside the requested window
 * @param examAttempts      exams started, all time
 * @param examsPassed       exams passed, all time
 * @param examsFailed       exams failed, all time
 * @param passRate          passed / attempted, as a percentage; 0 when nothing was attempted
 * @param avgScore          score per attempt across the platform
 * @param courseEnrollments course enrolments, all time
 * @param courseCompletions courses completed, all time
 * @param studyMinutes      recorded study time, all time
 */
public record AdminKpi(
        long trackedUsers,
        long activeUsers,
        long examAttempts,
        long examsPassed,
        long examsFailed,
        double passRate,
        double avgScore,
        long courseEnrollments,
        long courseCompletions,
        long studyMinutes
) {
    public static AdminKpi empty() {
        return new AdminKpi(0, 0, 0, 0, 0, 0.0, 0.0, 0, 0, 0);
    }
}
