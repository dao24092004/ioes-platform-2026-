package com.ioes.auth.domain.model;

import java.util.Map;

/**
 * Head-count of the user table for the admin dashboard. Soft-deleted rows are
 * excluded from every counter, so {@code total} is the number of users that
 * still exist rather than the number of rows ever created.
 */
public record UserStats(
        long total,
        long students,
        long instructors,
        long admins,
        long superAdmins,
        long suspended,
        long pending,
        long active
) {
    /**
     * Builds the record from per-role and per-status tallies. Both maps may omit
     * a key entirely when no user holds that role or status.
     */
    public static UserStats from(Map<UserRole, Long> byRole, Map<UserStatus, Long> byStatus) {
        long total = byRole.values().stream().mapToLong(Long::longValue).sum();
        return new UserStats(
                total,
                byRole.getOrDefault(UserRole.student, 0L),
                byRole.getOrDefault(UserRole.instructor, 0L),
                byRole.getOrDefault(UserRole.admin, 0L),
                byRole.getOrDefault(UserRole.super_admin, 0L),
                byStatus.getOrDefault(UserStatus.suspended, 0L),
                byStatus.getOrDefault(UserStatus.pending, 0L),
                byStatus.getOrDefault(UserStatus.active, 0L)
        );
    }
}
