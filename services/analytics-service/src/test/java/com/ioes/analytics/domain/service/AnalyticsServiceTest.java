package com.ioes.analytics.domain.service;

import com.ioes.analytics.domain.model.LeaderboardRankChangedEvent;
import com.ioes.analytics.domain.model.StreakMilestoneEvent;
import com.ioes.analytics.domain.model.LeaderboardEntry;
import com.ioes.analytics.domain.model.LeaderboardPeriod;
import com.ioes.analytics.domain.model.UserAnalytics;
import com.ioes.analytics.domain.port.in.AnalyticsUseCase;
import com.ioes.analytics.domain.port.out.AnalyticsEventPublisherPort;
import com.ioes.analytics.domain.port.out.LeaderboardRepositoryPort;
import com.ioes.analytics.domain.port.out.UserAnalyticsRepositoryPort;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Nested;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.time.Instant;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

/**
 * Unit tests cho AnalyticsService.
 * Tất cả dependencies được mock — không cần DB, Redis, Kafka.
 *
 * Naming: should_<expected>_When_<condition>
 */
@ExtendWith(MockitoExtension.class)
@DisplayName("AnalyticsService Unit Tests")
class AnalyticsServiceTest {

    @Mock
    private LeaderboardRepositoryPort leaderboardRepositoryPort;

    @Mock
    private UserAnalyticsRepositoryPort userAnalyticsRepositoryPort;

    @Mock
    private AnalyticsEventPublisherPort analyticsEventPublisherPort;

    @InjectMocks
    private AnalyticsService analyticsService;

    private UUID testUserId;
    private UUID testExamId;
    private UUID testSubmissionId;

    @BeforeEach
    void setUp() {
        testUserId = UUID.fromString("00000000-0000-0000-0000-000000000001");
        testExamId = UUID.fromString("00000000-0000-0000-0000-000000000002");
        testSubmissionId = UUID.fromString("00000000-0000-0000-0000-000000000003");
    }

    // =========================================================
    // LEADERBOARD
    // =========================================================

    @Nested
    @DisplayName("getLeaderboard")
    class GetLeaderboardTests {

        @Test
        @DisplayName("should return top entries when valid period is given")
        void should_returnTopEntries_When_validPeriodGiven() {
            // Arrange
            List<LeaderboardEntry> mockEntries = List.of(
                    buildEntry(UUID.randomUUID(), 100.0, 1),
                    buildEntry(UUID.randomUUID(), 80.0, 2)
            );
            when(leaderboardRepositoryPort.findTopEntries(LeaderboardPeriod.WEEKLY, 10))
                    .thenReturn(mockEntries);

            // Act
            List<LeaderboardEntry> result = analyticsService.getLeaderboard(LeaderboardPeriod.WEEKLY, 10);

            // Assert
            assertThat(result).hasSize(2);
            assertThat(result.get(0).getScore()).isEqualTo(100.0);
            verify(leaderboardRepositoryPort).findTopEntries(LeaderboardPeriod.WEEKLY, 10);
        }

        @Test
        @DisplayName("should clamp limit to 100 when limit exceeds max")
        void should_clampLimitTo100_When_limitExceedsMax() {
            // Arrange
            when(leaderboardRepositoryPort.findTopEntries(any(), eq(100)))
                    .thenReturn(List.of());

            // Act
            analyticsService.getLeaderboard(LeaderboardPeriod.ALL_TIME, 999);

            // Assert
            verify(leaderboardRepositoryPort).findTopEntries(LeaderboardPeriod.ALL_TIME, 100);
        }
    }

    @Nested
    @DisplayName("getUserRank")
    class GetUserRankTests {

        @Test
        @DisplayName("should return entry when user is ranked")
        void should_returnEntry_When_userIsRanked() {
            LeaderboardEntry entry = buildEntry(testUserId, 500.0, 5);
            when(leaderboardRepositoryPort.findByUserIdAndPeriod(testUserId, LeaderboardPeriod.WEEKLY))
                    .thenReturn(Optional.of(entry));

            Optional<LeaderboardEntry> result = analyticsService.getUserRank(testUserId, LeaderboardPeriod.WEEKLY);

            assertThat(result).isPresent();
            assertThat(result.get().getUserId()).isEqualTo(testUserId);
        }

        @Test
        @DisplayName("should return empty when user is not ranked")
        void should_returnEmpty_When_userIsNotRanked() {
            when(leaderboardRepositoryPort.findByUserIdAndPeriod(testUserId, LeaderboardPeriod.DAILY))
                    .thenReturn(Optional.empty());

            Optional<LeaderboardEntry> result = analyticsService.getUserRank(testUserId, LeaderboardPeriod.DAILY);

            assertThat(result).isEmpty();
        }
    }

    @Nested
    @DisplayName("resetLeaderboard")
    class ResetLeaderboardTests {

        @Test
        @DisplayName("should delete period entries when period is resettable")
        void should_deletePeriodEntries_When_periodIsResettable() {
            analyticsService.resetLeaderboard(LeaderboardPeriod.DAILY);
            verify(leaderboardRepositoryPort).deleteByPeriod(LeaderboardPeriod.DAILY);
        }

        @Test
        @DisplayName("should skip deletion when period is ALL_TIME")
        void should_skipDeletion_When_periodIsAllTime() {
            analyticsService.resetLeaderboard(LeaderboardPeriod.ALL_TIME);
            verify(leaderboardRepositoryPort, never()).deleteByPeriod(any());
        }
    }

    // =========================================================
    // USER ANALYTICS
    // =========================================================

    @Nested
    @DisplayName("getUserAnalytics")
    class GetUserAnalyticsTests {

        @Test
        @DisplayName("should return existing analytics when user has record")
        void should_returnExistingAnalytics_When_userHasRecord() {
            UserAnalytics existing = buildAnalytics(testUserId, 10, 8, 2);
            when(userAnalyticsRepositoryPort.findByUserId(testUserId)).thenReturn(Optional.of(existing));

            UserAnalytics result = analyticsService.getUserAnalytics(testUserId);

            assertThat(result.getTotalExamsAttempted()).isEqualTo(10);
            assertThat(result.getTotalExamsPassed()).isEqualTo(8);
        }

        @Test
        @DisplayName("should create empty analytics when user has no record")
        void should_createEmptyAnalytics_When_userHasNoRecord() {
            when(userAnalyticsRepositoryPort.findByUserId(testUserId)).thenReturn(Optional.empty());

            UserAnalytics result = analyticsService.getUserAnalytics(testUserId);

            assertThat(result.getTotalExamsAttempted()).isZero();
            assertThat(result.getCurrentStreak()).isZero();
        }
    }

    @Nested
    @DisplayName("recordExamGraded")
    class RecordExamGradedTests {

        @Test
        @DisplayName("should increment passed counter when exam is passed")
        void should_incrementPassedCounter_When_examIsPassed() {
            // Arrange
            UserAnalytics existing = buildAnalytics(testUserId, 5, 4, 1);
            when(userAnalyticsRepositoryPort.findByUserId(testUserId)).thenReturn(Optional.of(existing));
            when(userAnalyticsRepositoryPort.save(any())).thenReturn(existing);
            stubLeaderboardForAllPeriods(testUserId);

            AnalyticsUseCase.ExamGradedCommand command = new AnalyticsUseCase.ExamGradedCommand(
                    testSubmissionId, testUserId, testExamId,
                    "test@example.com", "Java Test", 85.0, 100.0, true
            );

            // Act
            analyticsService.recordExamGraded(command);

            // Assert
            ArgumentCaptor<UserAnalytics> captor = ArgumentCaptor.forClass(UserAnalytics.class);
            verify(userAnalyticsRepositoryPort).save(captor.capture());
            assertThat(captor.getValue().getTotalExamsAttempted()).isEqualTo(6);
            assertThat(captor.getValue().getTotalExamsPassed()).isEqualTo(5);
        }

        @Test
        @DisplayName("should increment failed counter when exam is failed")
        void should_incrementFailedCounter_When_examIsFailed() {
            // Arrange
            UserAnalytics existing = buildAnalytics(testUserId, 5, 4, 1);
            when(userAnalyticsRepositoryPort.findByUserId(testUserId)).thenReturn(Optional.of(existing));
            when(userAnalyticsRepositoryPort.save(any())).thenReturn(existing);
            stubLeaderboardForAllPeriods(testUserId);

            AnalyticsUseCase.ExamGradedCommand command = new AnalyticsUseCase.ExamGradedCommand(
                    testSubmissionId, testUserId, testExamId,
                    "test@example.com", "Java Test", 30.0, 100.0, false
            );

            // Act
            analyticsService.recordExamGraded(command);

            // Assert
            ArgumentCaptor<UserAnalytics> captor = ArgumentCaptor.forClass(UserAnalytics.class);
            verify(userAnalyticsRepositoryPort).save(captor.capture());
            assertThat(captor.getValue().getTotalExamsFailed()).isEqualTo(2);
        }

        @Test
        @DisplayName("should update highest score when new score is higher than current")
        void should_updateHighestScore_When_newScoreIsHigher() {
            // Arrange
            UserAnalytics existing = buildAnalytics(testUserId, 3, 3, 0);
            existing.setHighestScore(70.0);
            when(userAnalyticsRepositoryPort.findByUserId(testUserId)).thenReturn(Optional.of(existing));
            when(userAnalyticsRepositoryPort.save(any())).thenReturn(existing);
            stubLeaderboardForAllPeriods(testUserId);

            AnalyticsUseCase.ExamGradedCommand command = new AnalyticsUseCase.ExamGradedCommand(
                    testSubmissionId, testUserId, testExamId,
                    "test@example.com", "Java Test", 95.0, 100.0, true
            );

            // Act
            analyticsService.recordExamGraded(command);

            // Assert
            ArgumentCaptor<UserAnalytics> captor = ArgumentCaptor.forClass(UserAnalytics.class);
            verify(userAnalyticsRepositoryPort).save(captor.capture());
            assertThat(captor.getValue().getHighestScore()).isEqualTo(95.0);
        }
    }

    @Nested
    @DisplayName("recordCourseEnrolled")
    class RecordCourseEnrolledTests {

        @Test
        @DisplayName("should increment courses enrolled counter when user enrolls")
        void should_incrementCoursesEnrolledCounter_When_userEnrolls() {
            UserAnalytics existing = buildAnalytics(testUserId, 0, 0, 0);
            existing.setTotalCoursesEnrolled(2);
            when(userAnalyticsRepositoryPort.findByUserId(testUserId)).thenReturn(Optional.of(existing));
            when(userAnalyticsRepositoryPort.save(any())).thenReturn(existing);

            analyticsService.recordCourseEnrolled(new AnalyticsUseCase.CourseEnrolledCommand(
                    testUserId, UUID.randomUUID(), "Spring Boot Course"
            ));

            ArgumentCaptor<UserAnalytics> captor = ArgumentCaptor.forClass(UserAnalytics.class);
            verify(userAnalyticsRepositoryPort).save(captor.capture());
            assertThat(captor.getValue().getTotalCoursesEnrolled()).isEqualTo(3);
        }
    }

    // =========================================================
    // STREAK (BR-015)
    // =========================================================

    @Nested
    @DisplayName("updateStreak — BR-015: Streak Bonus")
    class UpdateStreakTests {

        @Test
        @DisplayName("should grant bonus score when streak reaches 7-day milestone")
        void should_grantBonusScore_When_streakReaches7DayMilestone() {
            // Arrange
            UserAnalytics existing = buildAnalytics(testUserId, 0, 0, 0);
            existing.setCurrentStreak(6);
            when(userAnalyticsRepositoryPort.findByUserId(testUserId)).thenReturn(Optional.of(existing));
            when(userAnalyticsRepositoryPort.save(any())).thenReturn(existing);
            for (LeaderboardPeriod period : LeaderboardPeriod.values()) {
                when(leaderboardRepositoryPort.findByUserIdAndPeriod(testUserId, period))
                        .thenReturn(Optional.empty());
            }

            // Act
            analyticsService.updateStreak(new AnalyticsUseCase.UpdateStreakCommand(
                    testUserId, 7, "test@example.com"
            ));

            // Assert: bonus score được add vào tất cả periods
            verify(leaderboardRepositoryPort, times(LeaderboardPeriod.values().length))
                    .addScore(any(LeaderboardPeriod.class), eq(testUserId), eq(10.0));
        }

        @Test
        @DisplayName("should not grant bonus when streak is not a milestone")
        void should_notGrantBonus_When_streakIsNotMilestone() {
            // Arrange
            UserAnalytics existing = buildAnalytics(testUserId, 0, 0, 0);
            when(userAnalyticsRepositoryPort.findByUserId(testUserId)).thenReturn(Optional.of(existing));
            when(userAnalyticsRepositoryPort.save(any())).thenReturn(existing);
            for (LeaderboardPeriod period : LeaderboardPeriod.values()) {
                when(leaderboardRepositoryPort.findByUserIdAndPeriod(testUserId, period))
                        .thenReturn(Optional.empty());
            }

            // Act
            analyticsService.updateStreak(new AnalyticsUseCase.UpdateStreakCommand(
                    testUserId, 5, "test@example.com"
            ));

            // Assert: không có bonus score
            verify(leaderboardRepositoryPort, never())
                    .addScore(any(LeaderboardPeriod.class), eq(testUserId), eq(10.0));
        }

        @Test
        @DisplayName("should publish StreakMilestoneEvent when milestone is reached")
        void should_publishStreakMilestoneEvent_When_milestoneIsReached() {
            // Arrange
            UserAnalytics existing = buildAnalytics(testUserId, 0, 0, 0);
            when(userAnalyticsRepositoryPort.findByUserId(testUserId)).thenReturn(Optional.of(existing));
            when(userAnalyticsRepositoryPort.save(any())).thenReturn(existing);
            for (LeaderboardPeriod period : LeaderboardPeriod.values()) {
                when(leaderboardRepositoryPort.findByUserIdAndPeriod(testUserId, period))
                        .thenReturn(Optional.empty());
            }

            // Act
            analyticsService.updateStreak(new AnalyticsUseCase.UpdateStreakCommand(
                    testUserId, 14, "user@test.com"
            ));

            // Assert: event được published
            ArgumentCaptor<StreakMilestoneEvent> captor = ArgumentCaptor.forClass(StreakMilestoneEvent.class);
            verify(analyticsEventPublisherPort).publishStreakMilestone(captor.capture());
            assertThat(captor.getValue().streakDays()).isEqualTo(14);
            assertThat(captor.getValue().email()).isEqualTo("user@test.com");
            assertThat(captor.getValue().bonusScore()).isEqualTo(10.0);
        }

        @Test
        @DisplayName("should not publish event when streak is not a milestone")
        void should_notPublishEvent_When_streakIsNotMilestone() {
            // Arrange
            UserAnalytics existing = buildAnalytics(testUserId, 0, 0, 0);
            when(userAnalyticsRepositoryPort.findByUserId(testUserId)).thenReturn(Optional.of(existing));
            when(userAnalyticsRepositoryPort.save(any())).thenReturn(existing);
            for (LeaderboardPeriod period : LeaderboardPeriod.values()) {
                when(leaderboardRepositoryPort.findByUserIdAndPeriod(testUserId, period))
                        .thenReturn(Optional.empty());
            }

            // Act
            analyticsService.updateStreak(new AnalyticsUseCase.UpdateStreakCommand(
                    testUserId, 3, "user@test.com"
            ));

            // Assert
            verify(analyticsEventPublisherPort, never()).publishStreakMilestone(any());
        }

        @Test
        @DisplayName("should update longestStreak when new streak exceeds previous longest")
        void should_updateLongestStreak_When_newStreakExceedsPreviousLongest() {
            // Arrange
            UserAnalytics existing = buildAnalytics(testUserId, 0, 0, 0);
            existing.setLongestStreak(10);
            existing.setCurrentStreak(10);
            when(userAnalyticsRepositoryPort.findByUserId(testUserId)).thenReturn(Optional.of(existing));
            when(userAnalyticsRepositoryPort.save(any())).thenReturn(existing);
            for (LeaderboardPeriod period : LeaderboardPeriod.values()) {
                when(leaderboardRepositoryPort.findByUserIdAndPeriod(testUserId, period))
                        .thenReturn(Optional.empty());
            }

            // Act
            analyticsService.updateStreak(new AnalyticsUseCase.UpdateStreakCommand(
                    testUserId, 11, "user@test.com"
            ));

            // Assert
            ArgumentCaptor<UserAnalytics> captor = ArgumentCaptor.forClass(UserAnalytics.class);
            verify(userAnalyticsRepositoryPort).save(captor.capture());
            assertThat(captor.getValue().getLongestStreak()).isEqualTo(11);
        }
    }

    // =========================================================
    // RANK CHANGE NOTIFICATION (BR-017)
    // =========================================================

    @Nested
    @DisplayName("updateUserScore — BR-017: Top-3 Rank Notification")
    class UpdateUserScoreRankNotificationTests {

        @Test
        @DisplayName("should publish LeaderboardRankChangedEvent when user enters top 3")
        void should_publishRankChangedEvent_When_userEntersTop3() {
            // Arrange: user chưa có rank → mới vào top 1
            for (LeaderboardPeriod period : LeaderboardPeriod.values()) {
                when(leaderboardRepositoryPort.findByUserIdAndPeriod(testUserId, period))
                        .thenReturn(Optional.empty()); // chưa có entry → rank = 0 (not ranked)

                // Redis trả về rank 0 (top 1 - vì 0-based)
                when(leaderboardRepositoryPort.getRank(period, testUserId))
                        .thenReturn(Optional.of(0L));

                when(leaderboardRepositoryPort.save(any())).thenAnswer(inv -> inv.getArgument(0));
            }

            AnalyticsUseCase.UpdateScoreCommand command = new AnalyticsUseCase.UpdateScoreCommand(
                    testUserId, "Jane Doe", null, "jane@example.com", 90.0, 1, 90.0
            );

            // Act
            analyticsService.updateUserScore(command);

            // Assert: event published cho WEEKLY và ALL_TIME (2 calls)
            verify(analyticsEventPublisherPort, times(2))
                    .publishLeaderboardRankChanged(any(LeaderboardRankChangedEvent.class));
        }

        @Test
        @DisplayName("should capture correct rank in event when user rises into top 3")
        void should_captureCorrectRankInEvent_When_userRisesIntoTop3() {
            // Arrange: user đang ở rank 5 → được push lên rank 2
            for (LeaderboardPeriod period : LeaderboardPeriod.values()) {
                LeaderboardEntry existingEntry = buildEntry(testUserId, 200.0, 5);
                existingEntry.setPreviousRank(5);
                when(leaderboardRepositoryPort.findByUserIdAndPeriod(testUserId, period))
                        .thenReturn(Optional.of(existingEntry));

                // Redis rank 1 → rank 2 (1-based)
                when(leaderboardRepositoryPort.getRank(period, testUserId))
                        .thenReturn(Optional.of(1L));

                when(leaderboardRepositoryPort.save(any())).thenAnswer(inv -> inv.getArgument(0));
            }

            AnalyticsUseCase.UpdateScoreCommand command = new AnalyticsUseCase.UpdateScoreCommand(
                    testUserId, "Jane Doe", null, "jane@example.com", 50.0, 1, 80.0
            );

            // Act
            analyticsService.updateUserScore(command);

            // Assert: rank 2 (1+1), period WEEKLY và ALL_TIME
            ArgumentCaptor<LeaderboardRankChangedEvent> captor =
                    ArgumentCaptor.forClass(LeaderboardRankChangedEvent.class);
            verify(analyticsEventPublisherPort, atLeastOnce())
                    .publishLeaderboardRankChanged(captor.capture());

            LeaderboardRankChangedEvent captured = captor.getAllValues().stream()
                    .filter(e -> e.period() == LeaderboardPeriod.WEEKLY)
                    .findFirst()
                    .orElseThrow();
            assertThat(captured.newRank()).isEqualTo(2L);
            assertThat(captured.email()).isEqualTo("jane@example.com");
        }

        @Test
        @DisplayName("should not publish event when user stays outside top 3")
        void should_notPublishEvent_When_userStaysOutsideTop3() {
            // Arrange: user ở rank 5, tăng điểm nhưng vẫn ngoài top 3
            for (LeaderboardPeriod period : LeaderboardPeriod.values()) {
                LeaderboardEntry existingEntry = buildEntry(testUserId, 100.0, 5);
                when(leaderboardRepositoryPort.findByUserIdAndPeriod(testUserId, period))
                        .thenReturn(Optional.of(existingEntry));

                // Redis rank 3 → rank 4 (1-based), vẫn ngoài top 3
                when(leaderboardRepositoryPort.getRank(period, testUserId))
                        .thenReturn(Optional.of(3L));

                when(leaderboardRepositoryPort.save(any())).thenAnswer(inv -> inv.getArgument(0));
            }

            AnalyticsUseCase.UpdateScoreCommand command = new AnalyticsUseCase.UpdateScoreCommand(
                    testUserId, "Bob", null, "bob@example.com", 20.0, 1, 60.0
            );

            // Act
            analyticsService.updateUserScore(command);

            // Assert: không publish event
            verify(analyticsEventPublisherPort, never())
                    .publishLeaderboardRankChanged(any());
        }
    }

    // =========================================================
    // HELPERS
    // =========================================================

    private LeaderboardEntry buildEntry(UUID userId, double score, long rank) {
        return LeaderboardEntry.builder()
                .id(UUID.randomUUID())
                .userId(userId)
                .displayName("User " + userId.toString().substring(0, 8))
                .score(score)
                .rank(rank)
                .previousRank(rank + 1)
                .period(LeaderboardPeriod.WEEKLY)
                .examsCompleted(0)
                .avgExamScore(score)
                .currentStreak(0)
                .longestStreak(0)
                .coursesCompleted(0)
                .lastActivityAt(Instant.now())
                .createdAt(Instant.now())
                .updatedAt(Instant.now())
                .build();
    }

    private UserAnalytics buildAnalytics(UUID userId, int attempted, int passed, int failed) {
        return UserAnalytics.builder()
                .id(UUID.randomUUID())
                .userId(userId)
                .totalExamsAttempted(attempted)
                .totalExamsPassed(passed)
                .totalExamsFailed(failed)
                .totalScore(passed * 80.0)
                .avgScore(attempted > 0 ? (passed * 80.0) / attempted : 0.0)
                .highestScore(passed > 0 ? 80.0 : 0.0)
                .totalCoursesEnrolled(0)
                .totalCoursesCompleted(0)
                .currentStreak(0)
                .longestStreak(0)
                .totalStudyMinutes(0L)
                .createdAt(Instant.now())
                .updatedAt(Instant.now())
                .build();
    }

    /**
     * Stub leaderboard operations cho tất cả periods khi update score.
     */
    private void stubLeaderboardForAllPeriods(UUID userId) {
        for (LeaderboardPeriod period : LeaderboardPeriod.values()) {
            when(leaderboardRepositoryPort.findByUserIdAndPeriod(userId, period))
                    .thenReturn(Optional.empty());
            when(leaderboardRepositoryPort.getRank(period, userId))
                    .thenReturn(Optional.of(4L)); // rank 5 — ngoài top 3
            when(leaderboardRepositoryPort.save(any()))
                    .thenAnswer(inv -> inv.getArgument(0));
        }
    }
}
