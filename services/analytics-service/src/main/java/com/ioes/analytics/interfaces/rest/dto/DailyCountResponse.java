package com.ioes.analytics.interfaces.rest.dto;

import com.ioes.analytics.domain.model.DailyCount;

import java.time.LocalDate;

/** One point of a daily series. {@code date} serialises as {@code yyyy-MM-dd}. */
public record DailyCountResponse(LocalDate date, long value) {

    public static DailyCountResponse from(DailyCount point) {
        return new DailyCountResponse(point.date(), point.count());
    }
}
