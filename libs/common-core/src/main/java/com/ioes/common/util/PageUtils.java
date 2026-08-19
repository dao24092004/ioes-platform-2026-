package com.ioes.common.util;

import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;

import java.util.List;

/**
 * Helpers for building Spring Data {@link Pageable} instances.
 */
public final class PageUtils {

    private PageUtils() {}

    public static final int DEFAULT_PAGE = 0;
    public static final int DEFAULT_SIZE = 20;
    public static final int MAX_SIZE = 100;

    /**
     * Build a validated Pageable. Page is 0-indexed.
     */
    public static Pageable pageable(int page, int size, Sort sort) {
        int p = Math.max(page, DEFAULT_PAGE);
        int s = Math.min(Math.max(size, 1), MAX_SIZE);
        return PageRequest.of(p, s, sort != null ? sort : Sort.unsorted());
    }

    public static Pageable pageable(int page, int size) {
        return pageable(page, size, null);
    }

    public static Pageable pageable(int page, int size, String sortBy, String direction) {
        Sort sort = parseSort(sortBy, direction);
        return pageable(page, size, sort);
    }

    public static Sort parseSort(String sortBy, String direction) {
        if (sortBy == null || sortBy.isBlank()) {
            return Sort.unsorted();
        }
        Sort.Direction dir = Sort.Direction.fromOptionalString(direction).orElse(Sort.Direction.ASC);
        return Sort.by(dir, sortBy);
    }

    public static <T> List<T> emptyIfNull(List<T> list) {
        return list == null ? List.of() : list;
    }
}