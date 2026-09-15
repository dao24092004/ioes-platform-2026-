package com.ioes.auth.domain.model;

/**
 * Ordering options the admin user list accepts. The wire names are the ones the
 * web client already sends ({@code newest}, {@code oldest}, {@code name_asc},
 * {@code name_desc}).
 */
public enum UserSort {
    newest,
    oldest,
    name_asc,
    name_desc;

    /**
     * Resolves a client-supplied sort name, falling back to {@link #newest} for
     * a blank or unrecognised value rather than rejecting the whole request.
     */
    public static UserSort from(String raw) {
        if (raw == null || raw.isBlank()) {
            return newest;
        }
        for (UserSort candidate : values()) {
            if (candidate.name().equalsIgnoreCase(raw)) {
                return candidate;
            }
        }
        return newest;
    }
}
