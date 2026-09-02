package com.ioes.notification.domain.model;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import java.util.Map;

import static org.assertj.core.api.Assertions.assertThat;

class NotificationStatsTest {

    @Test
    @DisplayName("total is the sum of the status buckets")
    void totalSumsTheStatusBuckets() {
        NotificationStats stats = NotificationStats.from(
                Map.of(NotificationStatus.sent, 4L, NotificationStatus.failed, 2L),
                Map.of(NotificationType.email, 6L));

        assertThat(stats.total()).isEqualTo(6);
        assertThat(stats.sent()).isEqualTo(4);
        assertThat(stats.failed()).isEqualTo(2);
        assertThat(stats.email()).isEqualTo(6);
    }

    @Test
    @DisplayName("a bucket nothing has ever used reads as zero, not as a missing key")
    void absentBucketsReadAsZero() {
        NotificationStats stats = NotificationStats.from(
                Map.of(NotificationStatus.sent, 1L), Map.of(NotificationType.push, 1L));

        assertThat(stats.pending()).isZero();
        assertThat(stats.retrying()).isZero();
        assertThat(stats.email()).isZero();
        assertThat(stats.sms()).isZero();
        assertThat(stats.inApp()).isZero();
        assertThat(stats.push()).isEqualTo(1);
    }

    @Test
    @DisplayName("an empty table is all zeroes")
    void emptyTable() {
        assertThat(NotificationStats.from(Map.of(), Map.of())).isEqualTo(NotificationStats.empty());
    }
}
