package com.ioes.auth.interfaces.rest.dto;

import com.ioes.auth.domain.model.UserStats;

/**
 * Head-count of the user directory. Soft-deleted users are excluded from every
 * counter, so {@code total} counts users that still exist.
 */
public record UserStatsResponse(
        long total,
        long students,
        long instructors,
        long admins,
        long superAdmins,
        long suspended,
        long pending,
        long active
) {
    public static UserStatsResponse from(UserStats stats) {
        return new UserStatsResponse(
                stats.total(),
                stats.students(),
                stats.instructors(),
                stats.admins(),
                stats.superAdmins(),
                stats.suspended(),
                stats.pending(),
                stats.active()
        );
    }
}
