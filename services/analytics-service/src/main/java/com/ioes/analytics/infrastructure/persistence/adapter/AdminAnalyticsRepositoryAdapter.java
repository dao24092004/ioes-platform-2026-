package com.ioes.analytics.infrastructure.persistence.adapter;

import com.ioes.analytics.domain.model.AdminKpi;
import com.ioes.analytics.domain.model.DailyCount;
import com.ioes.analytics.domain.port.out.AdminAnalyticsRepositoryPort;
import com.ioes.analytics.infrastructure.persistence.repository.UserAnalyticsJpaRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;

import java.sql.Date;
import java.time.Instant;
import java.time.LocalDate;
import java.util.List;

@Component
@RequiredArgsConstructor
public class AdminAnalyticsRepositoryAdapter implements AdminAnalyticsRepositoryPort {

    private final UserAnalyticsJpaRepository jpaRepository;

    @Override
    public AdminKpi kpi(Instant activeSince) {
        UserAnalyticsJpaRepository.PlatformTotals totals = jpaRepository.platformTotals();
        if (totals == null || totals.getTrackedUsers() == 0) {
            return AdminKpi.empty();
        }

        long attempts = totals.getExamAttempts();
        double passRate = attempts > 0
                ? (double) totals.getExamsPassed() / attempts * 100.0
                : 0.0;
        double avgScore = attempts > 0
                ? totals.getTotalScore() / attempts
                : 0.0;

        return new AdminKpi(
                totals.getTrackedUsers(),
                jpaRepository.countActiveSince(activeSince),
                attempts,
                totals.getExamsPassed(),
                totals.getExamsFailed(),
                passRate,
                avgScore,
                totals.getCourseEnrollments(),
                totals.getCourseCompletions(),
                totals.getStudyMinutes());
    }

    @Override
    public List<DailyCount> newProfilesPerDay(Instant from) {
        return jpaRepository.newProfilesPerDay(from).stream()
                .map(row -> new DailyCount(toLocalDate(row.getDay()), row.getTotal()))
                .toList();
    }

    /**
     * The grouped query returns whatever date type the driver picks for a
     * {@code CAST(... AS date)}; normalise the two shapes Postgres and H2
     * actually hand back.
     */
    private LocalDate toLocalDate(Object day) {
        if (day instanceof LocalDate local) {
            return local;
        }
        if (day instanceof Date sql) {
            return sql.toLocalDate();
        }
        return LocalDate.parse(String.valueOf(day));
    }
}
