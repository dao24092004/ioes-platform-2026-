package com.ioes.auth.domain.model;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import java.util.List;
import java.util.Map;

import static org.assertj.core.api.Assertions.assertThat;

/**
 * The list endpoint takes its paging and filter values straight from query
 * parameters, so the normalising the record does is the only thing standing
 * between a hand-typed URL and a nonsense query.
 */
class UserSearchCriteriaTest {

    private static UserSearchCriteria criteria(int page, int perPage) {
        return new UserSearchCriteria(null, null, null, UserSort.newest, page, perPage);
    }

    @Test
    @DisplayName("a blank search is the same as no search")
    void blankSearchBecomesNull() {
        UserSearchCriteria c = new UserSearchCriteria("   ", null, null, UserSort.newest, 1, 10);

        assertThat(c.search()).isNull();
    }

    @Test
    @DisplayName("a missing sort falls back to newest")
    void nullSortBecomesNewest() {
        UserSearchCriteria c = new UserSearchCriteria(null, null, null, null, 1, 10);

        assertThat(c.sort()).isEqualTo(UserSort.newest);
    }

    @Test
    @DisplayName("page numbers below one are pulled back to the first page")
    void pageFloorsAtOne() {
        assertThat(criteria(0, 10).page()).isEqualTo(1);
        assertThat(criteria(-5, 10).page()).isEqualTo(1);
    }

    @Test
    @DisplayName("page size is clamped into 1..MAX_PER_PAGE")
    void perPageIsClamped() {
        assertThat(criteria(1, 0).perPage()).isEqualTo(1);
        assertThat(criteria(1, 5_000).perPage()).isEqualTo(UserSearchCriteria.MAX_PER_PAGE);
        assertThat(criteria(1, 25).perPage()).isEqualTo(25);
    }

    @Test
    @DisplayName("sort names are resolved case-insensitively, unknown ones fall back")
    void sortParsing() {
        assertThat(UserSort.from("name_asc")).isEqualTo(UserSort.name_asc);
        assertThat(UserSort.from("NAME_DESC")).isEqualTo(UserSort.name_desc);
        assertThat(UserSort.from("oldest")).isEqualTo(UserSort.oldest);
        assertThat(UserSort.from("nonsense")).isEqualTo(UserSort.newest);
        assertThat(UserSort.from(null)).isEqualTo(UserSort.newest);
        assertThat(UserSort.from("")).isEqualTo(UserSort.newest);
    }

    @Test
    @DisplayName("total pages rounds up, and an empty result still has one page")
    void pageMathRoundsUp() {
        assertThat(UserPage.of(List.of(), 0, 1, 10).totalPages()).isEqualTo(1);
        assertThat(UserPage.of(List.of(), 10, 1, 10).totalPages()).isEqualTo(1);
        assertThat(UserPage.of(List.of(), 11, 1, 10).totalPages()).isEqualTo(2);
        assertThat(UserPage.of(List.of(), 99, 1, 10).totalPages()).isEqualTo(10);
    }

    @Test
    @DisplayName("stats total is the sum of the role buckets, missing buckets read as zero")
    void statsFromTallies() {
        UserStats stats = UserStats.from(
                Map.of(UserRole.student, 5L, UserRole.instructor, 2L),
                Map.of(UserStatus.active, 6L, UserStatus.pending, 1L));

        assertThat(stats.total()).isEqualTo(7);
        assertThat(stats.students()).isEqualTo(5);
        assertThat(stats.instructors()).isEqualTo(2);
        assertThat(stats.admins()).isZero();
        assertThat(stats.superAdmins()).isZero();
        assertThat(stats.active()).isEqualTo(6);
        assertThat(stats.pending()).isEqualTo(1);
        assertThat(stats.suspended()).isZero();
    }
}
