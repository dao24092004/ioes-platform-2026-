package com.ioes.analytics.domain.service;

import com.ioes.analytics.domain.model.AdminKpi;
import com.ioes.analytics.domain.model.DailyCount;
import com.ioes.analytics.domain.port.out.AdminAnalyticsRepositoryPort;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.time.Duration;
import java.time.Instant;
import java.time.LocalDate;
import java.time.ZoneOffset;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class AdminAnalyticsServiceTest {

    @Mock
    private AdminAnalyticsRepositoryPort repository;

    private AdminAnalyticsService service;

    @BeforeEach
    void setUp() {
        service = new AdminAnalyticsService(repository);
    }

    private static LocalDate today() {
        return LocalDate.now(ZoneOffset.UTC);
    }

    @Test
    @DisplayName("the kpi window becomes the active-since cutoff")
    void kpiPassesTheCutoff() {
        when(repository.kpi(any())).thenReturn(AdminKpi.empty());

        service.kpi(7);

        ArgumentCaptor<Instant> since = ArgumentCaptor.forClass(Instant.class);
        verify(repository).kpi(since.capture());

        Duration ago = Duration.between(since.getValue(), Instant.now());
        assertThat(ago).isBetween(Duration.ofDays(7).minusMinutes(1), Duration.ofDays(7).plusMinutes(1));
    }

    @Test
    @DisplayName("a window of zero or less falls back to the default")
    void kpiClampsNonPositiveWindow() {
        when(repository.kpi(any())).thenReturn(AdminKpi.empty());

        service.kpi(0);

        ArgumentCaptor<Instant> since = ArgumentCaptor.forClass(Instant.class);
        verify(repository).kpi(since.capture());

        Duration ago = Duration.between(since.getValue(), Instant.now());
        assertThat(ago).isCloseTo(
                Duration.ofDays(AdminAnalyticsService.DEFAULT_WINDOW_DAYS), Duration.ofMinutes(1));
    }

    @Test
    @DisplayName("an empty platform reports zeroes rather than failing")
    void kpiOnEmptyPlatform() {
        when(repository.kpi(any())).thenReturn(AdminKpi.empty());

        AdminKpi kpi = service.kpi(30);

        assertThat(kpi.trackedUsers()).isZero();
        assertThat(kpi.passRate()).isZero();
        assertThat(kpi.avgScore()).isZero();
    }

    @Test
    @DisplayName("user growth returns one point per day in the window")
    void userGrowthCoversEveryDay() {
        when(repository.newProfilesPerDay(any())).thenReturn(List.of());

        List<DailyCount> series = service.userGrowth(7);

        assertThat(series).hasSize(7);
        assertThat(series.get(0).date()).isEqualTo(today().minusDays(6));
        assertThat(series.get(6).date()).isEqualTo(today());
    }

    @Test
    @DisplayName("days the repository never reported come back as zero, not as gaps")
    void userGrowthFillsQuietDays() {
        LocalDate yesterday = today().minusDays(1);
        when(repository.newProfilesPerDay(any())).thenReturn(List.of(new DailyCount(yesterday, 4)));

        List<DailyCount> series = service.userGrowth(3);

        assertThat(series).hasSize(3);
        assertThat(series).extracting(DailyCount::count).containsExactly(0L, 4L, 0L);
    }

    @Test
    @DisplayName("the series is ordered oldest to newest")
    void userGrowthIsChronological() {
        when(repository.newProfilesPerDay(any())).thenReturn(List.of());

        List<DailyCount> series = service.userGrowth(5);

        assertThat(series).extracting(DailyCount::date).isSorted();
    }

    @Test
    @DisplayName("an oversized window is clamped instead of scanning years")
    void userGrowthClampsLongWindow() {
        when(repository.newProfilesPerDay(any())).thenReturn(List.of());

        List<DailyCount> series = service.userGrowth(10_000);

        assertThat(series).hasSize(AdminAnalyticsService.MAX_WINDOW_DAYS);
    }

    @Test
    @DisplayName("a window of zero falls back to the default length")
    void userGrowthClampsZero() {
        when(repository.newProfilesPerDay(any())).thenReturn(List.of());

        assertThat(service.userGrowth(0)).hasSize(AdminAnalyticsService.DEFAULT_WINDOW_DAYS);
    }
}
