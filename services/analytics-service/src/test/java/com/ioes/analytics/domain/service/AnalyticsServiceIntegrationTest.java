package com.ioes.analytics.domain.service;

import com.ioes.analytics.domain.model.LeaderboardEntry;
import com.ioes.analytics.domain.model.LeaderboardPeriod;
import com.ioes.analytics.domain.port.in.AnalyticsUseCase;
import com.ioes.analytics.domain.port.out.AnalyticsEventPublisherPort;
import com.ioes.analytics.infrastructure.persistence.entity.UserAnalyticsEntity;
import com.ioes.analytics.infrastructure.persistence.repository.LeaderboardJpaRepository;
import com.ioes.analytics.infrastructure.persistence.repository.UserAnalyticsJpaRepository;
import org.junit.jupiter.api.*;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.test.context.ActiveProfiles;

import java.util.List;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

/**
 * Integration tests cho AnalyticsService.
 * Kết nối thẳng vào Docker containers (không dùng mock DB).
 *
 * PRE-REQUISITE:
 *   cd infrastructure && docker compose up -d postgres redis kafka zookeeper
 *
 * Connection (theo docker-compose.yml):
 *   PostgreSQL: localhost:5433  (POSTGRES_USER=ioes, POSTGRES_PASSWORD=ioes_dev_password)
 *   Redis:      localhost:6379
 *   Kafka:      localhost:29092
 *
 * Naming: should_<expected>_When_<condition>
 */
@SpringBootTest
@ActiveProfiles("test")
@TestMethodOrder(MethodOrderer.OrderAnnotation.class)
@DisplayName("AnalyticsService Integration Tests — Docker PostgreSQL + Redis")
class AnalyticsServiceIntegrationTest {

    @Autowired
    private AnalyticsUseCase analyticsUseCase;

    @Autowired
    private LeaderboardJpaRepository leaderboardJpaRepository;

    @Autowired
    private UserAnalyticsJpaRepository userAnalyticsJpaRepository;

    // MockBean event publisher: tránh cần Kafka live cho integration test
    // Kafka integration test riêng (nếu cần) sẽ không mock cái này
    @MockBean
    private AnalyticsEventPublisherPort analyticsEventPublisherPort;

    // UUIDs cố định, unique per test run — tránh conflict với data khác trong DB
    private static final UUID USER_1 = UUID.fromString("11111111-1111-1111-1111-111111111111");
    private static final UUID USER_2 = UUID.fromString("22222222-2222-2222-2222-222222222222");
    private static final UUID EXAM_ID = UUID.fromString("aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa");

    @BeforeEach
    void cleanUpTestData() {
        // Xóa data của test users trước mỗi test case để đảm bảo isolation
        leaderboardJpaRepository.findAll().stream()
                .filter(e -> USER_1.equals(e.getUserId()) || USER_2.equals(e.getUserId()))
                .forEach(leaderboardJpaRepository::delete);
        userAnalyticsJpaRepository.findByUserId(USER_1).ifPresent(userAnalyticsJpaRepository::delete);
        userAnalyticsJpaRepository.findByUserId(USER_2).ifPresent(userAnalyticsJpaRepository::delete);
    }

    // =========================================================
    // getUserAnalytics — Read from PostgreSQL
    // =========================================================

    @Test
    @Order(1)
    @DisplayName("should return empty analytics when user has no record in PostgreSQL")
    void should_returnEmptyAnalytics_When_userHasNoRecordInPostgres() {
        // Act
        var result = analyticsUseCase.getUserAnalytics(USER_1);

        // Assert
        assertThat(result).isNotNull();
        assertThat(result.getUserId()).isEqualTo(USER_1);
        assertThat(result.getTotalExamsAttempted()).isZero();
        assertThat(result.getCurrentStreak()).isZero();
    }

    // =========================================================
    // recordExamGraded — Write to PostgreSQL
    // =========================================================

    @Test
    @Order(2)
    @DisplayName("should write exam stats to PostgreSQL when exam is graded as passed")
    void should_writeExamStatsToPostgres_When_examIsGradedAsPassed() {
        // Act
        analyticsUseCase.recordExamGraded(new AnalyticsUseCase.ExamGradedCommand(
                UUID.randomUUID(), USER_1, EXAM_ID,
                "user1@test.com", "Java Basics", 80.0, 100.0, true
        ));

        // Assert: đọc trực tiếp từ PostgreSQL
        UserAnalyticsEntity entity = userAnalyticsJpaRepository
                .findByUserId(USER_1).orElseThrow(() ->
                        new AssertionError("UserAnalyticsEntity not found in PostgreSQL for userId=" + USER_1));

        assertThat(entity.getTotalExamsAttempted()).isEqualTo(1);
        assertThat(entity.getTotalExamsPassed()).isEqualTo(1);
        assertThat(entity.getTotalExamsFailed()).isZero();
        assertThat(entity.getHighestScore()).isEqualTo(80.0);
        assertThat(entity.getTotalScore()).isEqualTo(80.0);
    }

    @Test
    @Order(3)
    @DisplayName("should accumulate exam stats in PostgreSQL across multiple graded exams")
    void should_accumulateExamStats_When_multipleExamsGraded() {
        // Act: 3 bài thi
        analyticsUseCase.recordExamGraded(new AnalyticsUseCase.ExamGradedCommand(
                UUID.randomUUID(), USER_1, EXAM_ID, "user1@test.com", "Exam 1", 90.0, 100.0, true));
        analyticsUseCase.recordExamGraded(new AnalyticsUseCase.ExamGradedCommand(
                UUID.randomUUID(), USER_1, EXAM_ID, "user1@test.com", "Exam 2", 40.0, 100.0, false));
        analyticsUseCase.recordExamGraded(new AnalyticsUseCase.ExamGradedCommand(
                UUID.randomUUID(), USER_1, EXAM_ID, "user1@test.com", "Exam 3", 70.0, 100.0, true));

        // Assert: từ DB thật
        UserAnalyticsEntity entity = userAnalyticsJpaRepository.findByUserId(USER_1).orElseThrow();

        assertThat(entity.getTotalExamsAttempted()).isEqualTo(3);
        assertThat(entity.getTotalExamsPassed()).isEqualTo(2);
        assertThat(entity.getTotalExamsFailed()).isEqualTo(1);
        assertThat(entity.getHighestScore()).isEqualTo(90.0);
        // avg = (90 + 40 + 70) / 3 ≈ 66.67
        assertThat(entity.getAvgScore()).isBetween(66.0, 67.0);
    }

    // =========================================================
    // recordCourseEnrolled
    // =========================================================

    @Test
    @Order(4)
    @DisplayName("should increment totalCoursesEnrolled in PostgreSQL when user enrolls")
    void should_incrementCoursesEnrolled_When_userEnrolls() {
        // Act
        analyticsUseCase.recordCourseEnrolled(new AnalyticsUseCase.CourseEnrolledCommand(
                USER_2, UUID.randomUUID(), "Spring Boot Advanced"
        ));

        // Assert: từ PostgreSQL
        UserAnalyticsEntity entity = userAnalyticsJpaRepository.findByUserId(USER_2).orElseThrow();
        assertThat(entity.getTotalCoursesEnrolled()).isEqualTo(1);
    }

    // =========================================================
    // Leaderboard — PostgreSQL + Redis Sorted Sets
    // =========================================================

    @Test
    @Order(5)
    @DisplayName("should create leaderboard entries in PostgreSQL for all periods when score updated")
    void should_createLeaderboardEntries_When_scoreUpdated() {
        // Act
        analyticsUseCase.recordExamGraded(new AnalyticsUseCase.ExamGradedCommand(
                UUID.randomUUID(), USER_1, EXAM_ID, "user1@test.com", "Score Test", 95.0, 100.0, true
        ));

        // Assert: 4 entries (DAILY, WEEKLY, MONTHLY, ALL_TIME) trong PostgreSQL
        for (LeaderboardPeriod period : LeaderboardPeriod.values()) {
            var entry = leaderboardJpaRepository.findByUserIdAndPeriod(USER_1, period);
            assertThat(entry)
                    .as("Expected leaderboard entry for userId=%s, period=%s", USER_1, period)
                    .isPresent();
            assertThat(entry.get().getScore()).isGreaterThan(0);
        }
    }

    @Test
    @Order(6)
    @DisplayName("should return leaderboard entries sorted by score when multiple users exist")
    void should_returnLeaderboardSortedByScore_When_multipleUsersHaveScores() {
        // Arrange
        analyticsUseCase.recordExamGraded(new AnalyticsUseCase.ExamGradedCommand(
                UUID.randomUUID(), USER_1, EXAM_ID, "user1@test.com", "Exam A", 90.0, 100.0, true));
        analyticsUseCase.recordExamGraded(new AnalyticsUseCase.ExamGradedCommand(
                UUID.randomUUID(), USER_2, EXAM_ID, "user2@test.com", "Exam A", 60.0, 100.0, true));

        // Act
        List<LeaderboardEntry> leaderboard = analyticsUseCase.getLeaderboard(LeaderboardPeriod.ALL_TIME, 100);

        // Assert: user1 score > user2 score
        var user1Entry = leaderboard.stream().filter(e -> USER_1.equals(e.getUserId())).findFirst();
        var user2Entry = leaderboard.stream().filter(e -> USER_2.equals(e.getUserId())).findFirst();

        assertThat(user1Entry).isPresent();
        assertThat(user2Entry).isPresent();
        assertThat(user1Entry.get().getScore()).isGreaterThan(user2Entry.get().getScore());
    }

    // =========================================================
    // updateStreak — BR-015: PostgreSQL + Event Publishing
    // =========================================================

    @Test
    @Order(7)
    @DisplayName("should update streak in PostgreSQL and publish StreakMilestoneEvent when milestone reached")
    void should_updateStreakInDb_And_publishStreakEvent_When_milestoneReached() {
        // Act: 7 ngày streak → milestone
        analyticsUseCase.updateStreak(new AnalyticsUseCase.UpdateStreakCommand(
                USER_1, 7, "user1@test.com"
        ));

        // Assert 1: kiểm tra PostgreSQL
        UserAnalyticsEntity entity = userAnalyticsJpaRepository.findByUserId(USER_1).orElseThrow();
        assertThat(entity.getCurrentStreak()).isEqualTo(7);
        assertThat(entity.getLongestStreak()).isEqualTo(7);

        // Assert 2: verify event được publish
        verify(analyticsEventPublisherPort, times(1))
                .publishStreakMilestone(argThat(event ->
                        USER_1.equals(event.userId())
                        && event.streakDays() == 7
                        && event.bonusScore() == 10.0
                        && "user1@test.com".equals(event.email())
                ));
    }

    @Test
    @Order(8)
    @DisplayName("should update streak in PostgreSQL but NOT publish event when streak is not milestone")
    void should_updateStreakInDb_ButNotPublishEvent_When_streakIsNotMilestone() {
        // Act: 5 ngày streak → không phải milestone
        analyticsUseCase.updateStreak(new AnalyticsUseCase.UpdateStreakCommand(
                USER_1, 5, "user1@test.com"
        ));

        // Assert 1: DB đã lưu
        UserAnalyticsEntity entity = userAnalyticsJpaRepository.findByUserId(USER_1).orElseThrow();
        assertThat(entity.getCurrentStreak()).isEqualTo(5);

        // Assert 2: không publish event
        verify(analyticsEventPublisherPort, never()).publishStreakMilestone(any());
    }

    @Test
    @Order(9)
    @DisplayName("should update longestStreak in PostgreSQL when new streak exceeds previous")
    void should_updateLongestStreak_When_newStreakExceedsPreviousInDb() {
        // Arrange: set streak ban đầu = 10
        analyticsUseCase.updateStreak(new AnalyticsUseCase.UpdateStreakCommand(USER_1, 10, null));

        // Act: tăng lên 14 (milestone)
        analyticsUseCase.updateStreak(new AnalyticsUseCase.UpdateStreakCommand(USER_1, 14, "user1@test.com"));

        // Assert: longestStreak = 14 trong DB
        UserAnalyticsEntity entity = userAnalyticsJpaRepository.findByUserId(USER_1).orElseThrow();
        assertThat(entity.getLongestStreak()).isEqualTo(14);
        assertThat(entity.getCurrentStreak()).isEqualTo(14);
    }

    // =========================================================
    // resetLeaderboard — BR-016
    // =========================================================

    @Test
    @Order(10)
    @DisplayName("should delete DAILY entries from PostgreSQL when DAILY leaderboard reset")
    void should_deleteDailyEntries_When_dailyLeaderboardReset() {
        // Arrange: tạo entries
        analyticsUseCase.recordExamGraded(new AnalyticsUseCase.ExamGradedCommand(
                UUID.randomUUID(), USER_1, EXAM_ID, "user1@test.com", "Pre-reset", 80.0, 100.0, true));

        long dailyCountBefore = leaderboardJpaRepository.countByPeriod(LeaderboardPeriod.DAILY);
        assertThat(dailyCountBefore).isGreaterThan(0);

        // Act
        analyticsUseCase.resetLeaderboard(LeaderboardPeriod.DAILY);

        // Assert: DAILY bị xóa
        assertThat(leaderboardJpaRepository.countByPeriod(LeaderboardPeriod.DAILY)).isZero();
    }

    @Test
    @Order(11)
    @DisplayName("should NOT delete ALL_TIME entries from PostgreSQL when ALL_TIME reset attempted")
    void should_notDeleteAllTimeEntries_When_allTimeResetAttempted() {
        // Arrange
        analyticsUseCase.recordExamGraded(new AnalyticsUseCase.ExamGradedCommand(
                UUID.randomUUID(), USER_1, EXAM_ID, "user1@test.com", "AllTime Test", 85.0, 100.0, true));

        long countBefore = leaderboardJpaRepository.countByPeriod(LeaderboardPeriod.ALL_TIME);

        // Act: ALL_TIME không được phép reset
        analyticsUseCase.resetLeaderboard(LeaderboardPeriod.ALL_TIME);

        // Assert
        long countAfter = leaderboardJpaRepository.countByPeriod(LeaderboardPeriod.ALL_TIME);
        assertThat(countAfter).isEqualTo(countBefore);
    }
}
