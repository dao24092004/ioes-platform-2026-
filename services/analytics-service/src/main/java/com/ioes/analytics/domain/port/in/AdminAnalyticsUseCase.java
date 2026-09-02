package com.ioes.analytics.domain.port.in;

import com.ioes.analytics.domain.model.AdminKpi;
import com.ioes.analytics.domain.model.DailyCount;

import java.util.List;

/** Admin-facing aggregate reads. */
public interface AdminAnalyticsUseCase {

    /**
     * @param activeWithinDays how far back a login still counts as "active"
     */
    AdminKpi kpi(int activeWithinDays);

    /**
     * Daily count of new tracked users over the last {@code days} days, ending
     * today. Every day in the window is present, including the quiet ones.
     */
    List<DailyCount> userGrowth(int days);
}
