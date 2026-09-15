package com.ioes.auth.interfaces.rest.dto;

import java.util.List;

/**
 * A page of results plus the counters a table needs to draw its pager. Sits
 * inside the usual {@code ApiResponse} envelope, so a list response reads as
 * {@code {success, message, data: {data, meta}}}.
 */
public record PagedResponse<T>(List<T> data, Meta meta) {

    public record Meta(long total, int page, int perPage, int totalPages) {}

    public static <T> PagedResponse<T> of(List<T> data, long total, int page, int perPage, int totalPages) {
        return new PagedResponse<>(data, new Meta(total, page, perPage, totalPages));
    }
}
