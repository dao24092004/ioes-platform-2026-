package com.ioes.notification.infrastructure.persistence.repository;

import com.ioes.notification.domain.model.NotificationStatus;
import com.ioes.notification.domain.model.NotificationType;
import com.ioes.notification.infrastructure.persistence.entity.NotificationEntity;
import org.junit.jupiter.api.Assumptions;
import org.junit.jupiter.api.BeforeAll;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.jdbc.AutoConfigureTestDatabase;
import org.springframework.boot.test.autoconfigure.orm.jpa.DataJpaTest;
import org.springframework.boot.test.autoconfigure.orm.jpa.TestEntityManager;
import org.springframework.data.domain.Pageable;
import org.springframework.test.context.TestPropertySource;

import java.sql.Connection;
import java.sql.DriverManager;
import java.sql.SQLException;
import java.time.Instant;
import java.util.List;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;

/**
 * Fix-round finding I1: {@code NotificationServiceTest} only ever mocked
 * {@code NotificationRepositoryPort}, so nothing proved that
 * {@code findByUserIdOrderByCreatedAtDesc} actually orders newest-first or
 * honours the {@code Pageable} cap at the SQL/JPA level. This slice test
 * runs against the real, already-migrated {@code ioes_notification}
 * Postgres database (the same instance the service itself connects to at
 * runtime — {@code localhost:5433}), not an embedded database: this repo has
 * no H2/testcontainers dependency anywhere, and the service's own schema
 * (JSONB columns, custom enums-as-varchar) is Postgres-specific. Flyway is
 * disabled for this test (the schema already exists; re-validating it hits
 * the same pre-existing V1 checksum mismatch noted in the task report and
 * is irrelevant to what this test is proving). Each test runs inside
 * {@code @DataJpaTest}'s default transactional rollback, so nothing written
 * here is left behind in the database.
 *
 * <p>Fix-round-2 finding: CI's {@code build-java-services} matrix runs
 * {@code mvn clean verify} for this service with no Postgres service
 * container defined, so this test previously would have turned that job
 * red. A plain-JDBC reachability check runs in a static {@code @BeforeAll}
 * — before JUnit constructs a test instance, which is when Spring's
 * {@code TestContextManager} first tries to load the {@code ApplicationContext}
 * and open the real datasource — so an unreachable database aborts the
 * whole class via {@link Assumptions#assumeTrue} (reported as
 * <i>skipped</i>, not failed) before Spring ever attempts the connection
 * itself.
 */
@DataJpaTest
@AutoConfigureTestDatabase(replace = AutoConfigureTestDatabase.Replace.NONE)
@TestPropertySource(properties = {
        "spring.datasource.url=jdbc:postgresql://localhost:5433/ioes_notification",
        "spring.datasource.username=ioes",
        "spring.datasource.password=ioes_dev_password",
        "spring.datasource.driver-class-name=org.postgresql.Driver",
        "spring.jpa.hibernate.ddl-auto=none",
        "spring.flyway.enabled=false"
})
class NotificationJpaRepositoryTest {

    private static final String JDBC_URL = "jdbc:postgresql://localhost:5433/ioes_notification";
    private static final String JDBC_USERNAME = "ioes";
    private static final String JDBC_PASSWORD = "ioes_dev_password";

    @BeforeAll
    static void assumeDatabaseIsReachable() {
        try (Connection ignored = DriverManager.getConnection(JDBC_URL, JDBC_USERNAME, JDBC_PASSWORD)) {
            // reachable: proceed with the class
        } catch (SQLException e) {
            Assumptions.assumeTrue(false,
                    "Skipping NotificationJpaRepositoryTest: Postgres not reachable at " + JDBC_URL
                            + " (" + e.getMessage() + "). This is a dev/CI-optional live-DB test; "
                            + "run the local ioes-postgres container to exercise it.");
        }
    }

    @Autowired
    private NotificationJpaRepository repository;

    @Autowired
    private TestEntityManager entityManager;

    private NotificationEntity persistNotification(UUID userId, Instant createdAt) {
        NotificationEntity entity = NotificationEntity.builder()
                .userId(userId)
                .type(NotificationType.email)
                .recipient("test@example.com")
                .subject("Subject at " + createdAt)
                .status(NotificationStatus.sent)
                .retryCount(0)
                .scheduledAt(createdAt)
                .sentAt(createdAt)
                .createdAt(createdAt)
                .updatedAt(createdAt)
                .build();
        return entityManager.persistAndFlush(entity);
    }

    @Test
    void should_OrderNewestFirstAndExcludeOtherUsersRows_When_QueryingByUserId() {
        UUID userId = UUID.randomUUID();
        UUID otherUserId = UUID.randomUUID();
        Instant now = Instant.now();

        NotificationEntity oldest = persistNotification(userId, now.minusSeconds(300));
        NotificationEntity middle = persistNotification(userId, now.minusSeconds(200));
        NotificationEntity newest = persistNotification(userId, now.minusSeconds(100));
        persistNotification(otherUserId, now);
        entityManager.clear();

        List<NotificationEntity> result =
                repository.findByUserIdOrderByCreatedAtDesc(userId, Pageable.ofSize(50));

        assertThat(result).extracting(NotificationEntity::getId)
                .containsExactly(newest.getId(), middle.getId(), oldest.getId());
        assertThat(result).extracting(NotificationEntity::getUserId)
                .doesNotContain(otherUserId);
    }

    @Test
    void should_CapAtPageSize_When_MoreRowsExistThanTheLimit() {
        UUID userId = UUID.randomUUID();
        Instant now = Instant.now();

        NotificationEntity oldest = persistNotification(userId, now.minusSeconds(300));
        NotificationEntity middle = persistNotification(userId, now.minusSeconds(200));
        NotificationEntity newest = persistNotification(userId, now.minusSeconds(100));
        entityManager.clear();

        List<NotificationEntity> result =
                repository.findByUserIdOrderByCreatedAtDesc(userId, Pageable.ofSize(2));

        assertThat(result).extracting(NotificationEntity::getId)
                .containsExactly(newest.getId(), middle.getId());
        assertThat(result).doesNotContain(oldest);
    }
}
