package com.ioes.auth.domain.model;

import java.util.List;

/**
 * One page of users plus the counters the admin table needs to render its
 * pagination control.
 */
public record UserPage(
        List<User> items,
        long total,
        int page,
        int perPage,
        int totalPages
) {
    public static UserPage of(List<User> items, long total, int page, int perPage) {
        int totalPages = perPage > 0
                ? Math.max(1, (int) Math.ceil((double) total / perPage))
                : 1;
        return new UserPage(items, total, page, perPage, totalPages);
    }
}
