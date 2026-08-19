package com.ioes.common.util;

import java.time.Instant;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.ZoneId;
import java.time.ZoneOffset;
import java.time.format.DateTimeFormatter;
import java.time.temporal.ChronoUnit;

/**
 * Date / time helpers. All timestamps are stored as UTC and converted
 * to the user's timezone only at the presentation layer.
 */
public final class DateUtils {

    private DateUtils() {}

    public static final ZoneId DEFAULT_ZONE = ZoneOffset.UTC;
    public static final DateTimeFormatter ISO_FORMATTER = DateTimeFormatter.ISO_INSTANT;
    public static final DateTimeFormatter DATE_FORMATTER = DateTimeFormatter.ISO_LOCAL_DATE;

    public static Instant now() {
        return Instant.now();
    }

    public static Instant startOfDay(LocalDate date) {
        return date.atStartOfDay(DEFAULT_ZONE).toInstant();
    }

    public static Instant endOfDay(LocalDate date) {
        return date.atTime(23, 59, 59, 999_000_000).atZone(DEFAULT_ZONE).toInstant();
    }

    public static LocalDateTime toLocalDateTime(Instant instant) {
        return instant == null ? null : instant.atZone(DEFAULT_ZONE).toLocalDateTime();
    }

    public static LocalDate toLocalDate(Instant instant) {
        return instant == null ? null : instant.atZone(DEFAULT_ZONE).toLocalDate();
    }

    public static Instant plusHours(Instant base, long hours) {
        return base.plus(hours, ChronoUnit.HOURS);
    }

    public static Instant plusDays(Instant base, long days) {
        return base.plus(days, ChronoUnit.DAYS);
    }

    public static long daysBetween(Instant from, Instant to) {
        return ChronoUnit.DAYS.between(from, to);
    }

    public static boolean isExpired(Instant expiresAt) {
        return expiresAt != null && Instant.now().isAfter(expiresAt);
    }

    public static String formatIso(Instant instant) {
        return instant == null ? null : ISO_FORMATTER.format(instant);
    }
}