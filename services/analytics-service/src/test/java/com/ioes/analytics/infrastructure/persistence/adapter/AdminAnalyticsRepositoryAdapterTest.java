package com.ioes.analytics.infrastructure.persistence.adapter;

import com.ioes.analytics.domain.model.AdminKpi;
import com.ioes.analytics.domain.model.DailyCount;
import com.ioes.analytics.infrastructure.persistence.repository.UserAnalyticsJpaRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.sql.Date;
import java.time.Instant;
import java.time.LocalDate;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.lenient;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class AdminAnalyticsRepositoryAdapterTest {

    @Mock
    private UserAnalyticsJpaRepository jpaRepository;

    private AdminAnalyticsRepositoryAdapter adapter;

    @BeforeEach
    void setUp() {
        adapter = new AdminAnalyticsRepositoryAdapter(jpaRepository);
    }

    /** Stub totals, so each test states only the numbers it cares about. */
    private static UserAnalyticsJpaRepository.PlatformTotals totals(
            long trackedUsers, long attempts, long passed, long failed, double totalScore) {

        return new UserAnalyticsJpaRepository.PlatformTotals() {
            public long getTrackedUsers() { return trackedUsers; }
            public long getExamAttempts() { return attempts; }
            public long getExamsPassed() { return passed; }
            public long getExamsFailed() { return failed; }
            public double getTotalScore() { return totalScore; }
            public long getCourseEnrollments() { return 12; }
            public long getCourseCompletions() { return 5; }
            public long getStudyMinutes() { return 900; }
        };
    }

    private static UserAnalyticsJpaRepository.DailyTally tally(Object day, long total) {
        return new UserAnalyticsJpaRepository.DailyTally() {
            public Object getDay() { return day; }
            public long getTotal() { return total; }
        };
    }

    @Test
    @DisplayName("pass rate and average score are derived from the totals")
    void derivesRates() {
        when(jpaRepository.platformTotals()).thenReturn(totals(4, 40, 30, 10, 3200.0));
        lenient().when(jpaRepository.countActiveSince(any())).thenReturn(3L);

        AdminKpi kpi = adapter.kpi(Instant.now());

        assertThat(kpi.trackedUsers()).isEqualTo(4);
        assertThat(kpi.activeUsers()).isEqualTo(3);
        assertThat(kpi.passRate()).isEqualTo(75.0);
        assertThat(kpi.avgScore()).isEqualTo(80.0);
        assertThat(kpi.courseEnrollments()).isEqualTo(12);
        assertThat(kpi.studyMinutes()).isEqualTo(900);
    }

    @Test
    @DisplayName("no attempts means a zero rate, not a divide by zero")
    void noAttemptsDoesNotDivideByZero() {
        when(jpaRepository.platformTotals()).thenReturn(totals(2, 0, 0, 0, 0.0));
        lenient().when(jpaRepository.countActiveSince(any())).thenReturn(1L);

        AdminKpi kpi = adapter.kpi(Instant.now());

        assertThat(kpi.passRate()).isZero();
        assertThat(kpi.avgScore()).isZero();
        assertThat(kpi.trackedUsers()).isEqualTo(2);
    }

    @Test
    @DisplayName("an empty table short-circuits to zeroes without a second query")
    void emptyTable() {
        when(jpaRepository.platformTotals()).thenReturn(totals(0, 0, 0, 0, 0.0));

        assertThat(adapter.kpi(Instant.now())).isEqualTo(AdminKpi.empty());
    }

    @Test
    @DisplayName("a null projection is treated as an empty platform")
    void nullTotals() {
        when(jpaRepository.platformTotals()).thenReturn(null);

        assertThat(adapter.kpi(Instant.now())).isEqualTo(AdminKpi.empty());
    }

    @Test
    @DisplayName("the day column is accepted as LocalDate or as java.sql.Date")
    void normalisesTheDayColumn() {
        LocalDate first = LocalDate.of(2026, 8, 30);
        LocalDate second = LocalDate.of(2026, 8, 31);
        when(jpaRepository.newProfilesPerDay(any()))
                .thenReturn(List.of(tally(first, 2), tally(Date.valueOf(second), 5)));

        List<DailyCount> series = adapter.newProfilesPerDay(Instant.now());

        assertThat(series).containsExactly(new DailyCount(first, 2), new DailyCount(second, 5));
    }
}
