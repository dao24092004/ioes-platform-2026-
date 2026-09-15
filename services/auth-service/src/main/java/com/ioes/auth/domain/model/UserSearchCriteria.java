package com.ioes.auth.domain.model;

/**
 * Filters for the admin user list. A null {@code search}, {@code role} or
 * {@code status} means "do not filter on that dimension" — the web client sends
 * {@code all} for the two enum filters and an empty string for the search box.
 *
 * @param search   free text matched against full name and email, case-insensitively
 * @param role     exact role to keep, or null for every role
 * @param status   exact status to keep, or null for every status
 * @param sort     ordering, never null
 * @param page     1-based page number
 * @param perPage  page size
 */
public record UserSearchCriteria(
        String search,
        UserRole role,
        UserStatus status,
        UserSort sort,
        int page,
        int perPage
) {
    /** Largest page the API will serve, so a caller cannot ask for the whole table. */
    public static final int MAX_PER_PAGE = 100;

    public UserSearchCriteria {
        if (search != null && search.isBlank()) {
            search = null;
        }
        if (sort == null) {
            sort = UserSort.newest;
        }
        page = Math.max(1, page);
        perPage = Math.min(MAX_PER_PAGE, Math.max(1, perPage));
    }
}
