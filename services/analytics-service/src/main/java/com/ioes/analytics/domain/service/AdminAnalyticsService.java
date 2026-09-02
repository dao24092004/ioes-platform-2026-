package com.ioes.analytics.domain.service;

import com.ioes.analytics.domain.model.AdminKpi;
import com.ioes.analytics.domain.model.DailyCount;
import com.ioes.analytics.domain.port.in.AdminAnalyticsUseCase;
import com.ioes.analytics.domain.port.out.AdminAnalyticsRepositoryPort;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Duration;
import java.time.Instant;
import java.time.LocalDate;
import java.time.ZoneOffset;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

/**
 * Admin aggregate reads.
 *
 * <p>Windows are interpreted in UTC, matching the {@code TIMESTAMP WITH TIME
 * ZONE} columns behind them, so a series does not shift under the caller's
 * locale.
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class AdminAnalyticsService implements AdminAnalyticsUseCase {

    /** Longest window a caller may request, so one chart cannot scan years of rows. */
    public static final int MAX_WINDOW_DAYS = 365;

    /** Used when the caller asks for a nonsensical window. */
    public static final int DEFAULT_WINDOW_DAYS = 30;

    private final AdminAnalyticsRepositoryPort repository;

    @Override
    @Transactional(readOnly = true)
    public AdminKpi kpi(int activeWithinDays) {
        int days = clampWindow(activeWithinDays);
        Instant activeSince = Instant.now().minus(Duration.ofDays(days));
        return repository.kpi(activeSince);
    }

    @Override
    @Transactional(readOnly = true)
    public List<DailyCount> userGrowth(int days) {
        int window = clampWindow(days);

        LocalDate today = LocalDate.now(ZoneOffset.UTC);
        LocalDate start = today.minusDays(window - 1L);

        Map<LocalDate, Long> counted = new HashMap<>();
        for (DailyCount point : repository.newProfilesPerDay(start.atStartOfDay(ZoneOffset.UTC).toInstant())) {
            counted.put(point.date(), point.count());
        }

        // A chart needs a point for every day in the window, not only the days
        // something happened, or the line silently skips the quiet stretches.
        List<DailyCount> series = new ArrayList<>(window);
        for (LocalDate day = start; !day.isAfter(today); day = day.plusDays(1)) {
            series.add(new DailyCount(day, counted.getOrDefault(day, 0L)));
        }
        return series;
    }

    private int clampWindow(int days) {
        if (days <= 0) {
            return DEFAULT_WINDOW_DAYS;
        }
        return Math.min(days, MAX_WINDOW_DAYS);
    }
}
