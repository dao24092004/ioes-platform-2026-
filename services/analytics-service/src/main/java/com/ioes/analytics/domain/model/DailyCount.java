package com.ioes.analytics.domain.model;

import java.time.LocalDate;

/** One point of a daily time series: the day, and how many things landed on it. */
public record DailyCount(LocalDate date, long count) {}
