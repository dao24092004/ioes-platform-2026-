package com.ioes.notification.interfaces.event;

import com.ioes.notification.domain.port.in.NotificationUseCase;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;

import java.util.Map;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;

/**
 * Fix-round finding (Task 8, Job 1): all four Kafka handlers used to
 * hardcode {@code userId} to {@code null} on the {@link NotificationUseCase.TemplatedCommand}
 * they build, even though every one of the topics they consume carries a
 * top-level {@code userId} field in its published contract (see
 * {@code readUserId}'s javadoc in {@link NotificationEventListener}). These
 * tests prove each handler now threads that field through, and degrades to
 * {@code null} rather than failing the event when it is missing or
 * malformed.
 */
class NotificationEventListenerTest {

    private NotificationUseCase notificationUseCase;
    private NotificationEventListener listener;

    @BeforeEach
    void setUp() {
        notificationUseCase = mock(NotificationUseCase.class);
        listener = new NotificationEventListener(notificationUseCase);
    }

    private UUID capturedUserId() {
        ArgumentCaptor<NotificationUseCase.TemplatedCommand> captor =
                ArgumentCaptor.forClass(NotificationUseCase.TemplatedCommand.class);
        verify(notificationUseCase).sendTemplated(captor.capture());
        return captor.getValue().userId();
    }

    @Test
    void should_PassEventUserId_When_UserRegisteredEventCarriesOne() {
        UUID userId = UUID.randomUUID();
        listener.onUserRegistered(Map.of(
                "email", "new@ioes.com", "fullName", "New User", "userId", userId.toString()));

        assertThat(capturedUserId()).isEqualTo(userId);
    }

    @Test
    void should_PassNullUserId_When_UserRegisteredEventOmitsIt() {
        listener.onUserRegistered(Map.of("email", "new@ioes.com", "fullName", "New User"));

        assertThat(capturedUserId()).isNull();
    }

    @Test
    void should_PassEventUserId_When_ExamGradedEventCarriesOne() {
        UUID userId = UUID.randomUUID();
        listener.onExamGraded(Map.of(
                "email", "grad@ioes.com", "examTitle", "Midterm", "score", 90, "passed", true,
                "userId", userId.toString()));

        assertThat(capturedUserId()).isEqualTo(userId);
    }

    @Test
    void should_PassEventUserId_When_StreakMilestoneEventCarriesOne() {
        UUID userId = UUID.randomUUID();
        listener.onStreakMilestone(Map.of(
                "email", "streak@ioes.com", "displayName", "Streaker",
                "streakDays", 7, "bonusScore", 10, "userId", userId.toString()));

        assertThat(capturedUserId()).isEqualTo(userId);
    }

    @Test
    void should_PassEventUserId_When_LeaderboardRankChangedEventCarriesOne() {
        UUID userId = UUID.randomUUID();
        listener.onLeaderboardRankChanged(Map.of(
                "email", "rank@ioes.com", "displayName", "Ranker",
                "newRank", 2, "period", "WEEKLY", "score", 100, "userId", userId.toString()));

        assertThat(capturedUserId()).isEqualTo(userId);
    }

    @Test
    void should_PassNullUserId_When_EventUserIdIsMalformed() {
        listener.onExamGraded(Map.of(
                "email", "grad@ioes.com", "examTitle", "Midterm", "score", 90, "passed", true,
                "userId", "not-a-uuid"));

        assertThat(capturedUserId()).isNull();
    }
}
