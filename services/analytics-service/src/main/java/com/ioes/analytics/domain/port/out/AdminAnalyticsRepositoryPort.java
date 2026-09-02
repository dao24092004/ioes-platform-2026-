package com.ioes.analytics.domain.port.out;

import com.ioes.analytics.domain.model.AdminKpi;
import com.ioes.analytics.domain.model.DailyCount;

import java.time.Instant;
import java.util.List;

/** Aggregate reads over the analytics tables, for the admin dashboard. */
public interface AdminAnalyticsRepositoryPort {

    /**
     * Platform totals, with {@code activeUsers} counted against the given cutoff.
     *
     * @param activeSince a user counts as active if their last login is at or after this instant
     */
    AdminKpi kpi(Instant activeSince);

    /**
     * New analytics profiles per day, oldest first, for days at or after
     * {@code from}. Days on which nothing happened are absent from the result —
     * the caller fills the gaps, since only it knows the window it asked for.
     */
    List<DailyCount> newProfilesPerDay(Instant from);
}
