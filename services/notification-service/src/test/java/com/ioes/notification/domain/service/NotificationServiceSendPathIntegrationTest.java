package com.ioes.notification.domain.service;

import com.ioes.notification.domain.model.Notification;
import com.ioes.notification.domain.model.NotificationType;
import com.ioes.notification.domain.port.in.NotificationUseCase;
import com.ioes.notification.infrastructure.persistence.adapter.NotificationRepositoryAdapter;
import com.ioes.notification.infrastructure.persistence.repository.NotificationJpaRepository;
import org.junit.jupiter.api.Assumptions;
import org.junit.jupiter.api.BeforeAll;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.jdbc.AutoConfigureTestDatabase;
import org.springframework.boot.test.autoconfigure.orm.jpa.DataJpaTest;
import org.springframework.test.context.TestPropertySource;
import org.springframework.test.util.ReflectionTestUtils;

import java.sql.Connection;
import java.sql.DriverManager;
import java.sql.SQLException;
import java.util.List;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.mock;

/**
 * Fix-round finding (Task 8, Job 1): every write path into this service used
 * to hardcode {@code userId} to {@code null} on the persisted row, so
 * {@code GET /notifications/user/{userId}} could never return anything a
 * real caller sent — only hand-inserted seed rows satisfied the query. That
 * bug lived at the boundary between {@link NotificationService} and the real
 * repository/database, which {@code NotificationServiceTest} could not catch
 * because it mocks {@code NotificationRepositoryPort} outright. This test
 * exercises the real {@link NotificationRepositoryAdapter} against the real,
 * already-migrated {@code ioes_notification} Postgres database — the same
 * live-DB, skip-if-unreachable strategy as
 * {@code NotificationJpaRepositoryTest} in the sibling
 * {@code infrastructure.persistence.repository} package, including reading
 * connection details from environment variables rather than hardcoding them
 * (PROJECT_RULES.md section I.3). Only {@link EmailSender} is mocked, since
 * exercising real SMTP delivery is not what this test is proving.
 */
@DataJpaTest
@AutoConfigureTestDatabase(replace = AutoConfigureTestDatabase.Replace.NONE)
@TestPropertySource(properties = {
        "spring.datasource.url=jdbc:postgresql://${POSTGRES_HOST:localhost}:${POSTGRES_PORT:5433}/${NOTIFICATION_DB_NAME:ioes_notification}",
        "spring.datasource.username=${POSTGRES_USER:ioes}",
        "spring.datasource.password=${POSTGRES_PASSWORD:ioes_dev_password}",
        "spring.datasource.driver-class-name=org.postgresql.Driver",
        "spring.jpa.hibernate.ddl-auto=none",
        "spring.flyway.enabled=false"
})
class NotificationServiceSendPathIntegrationTest {

    private static String env(String key, String defaultValue) {
        String value = System.getenv(key);
        return (value != null && !value.isBlank()) ? value : defaultValue;
    }

    private static final String JDBC_URL = "jdbc:postgresql://" + env("POSTGRES_HOST", "localhost")
            + ":" + env("POSTGRES_PORT", "5433") + "/" + env("NOTIFICATION_DB_NAME", "ioes_notification");
    private static final String JDBC_USERNAME = env("POSTGRES_USER", "ioes");
    private static final String JDBC_PASSWORD = env("POSTGRES_PASSWORD", "ioes_dev_password");

    @BeforeAll
    static void assumeDatabaseIsReachable() {
        try (Connection ignored = DriverManager.getConnection(JDBC_URL, JDBC_USERNAME, JDBC_PASSWORD)) {
            // reachable: proceed with the class
        } catch (SQLException e) {
            Assumptions.assumeTrue(false,
                    "Skipping NotificationServiceSendPathIntegrationTest: Postgres not reachable at "
                            + JDBC_URL + " (" + e.getMessage() + "). This is a dev/CI-optional live-DB test; "
                            + "run the local ioes-postgres container to exercise it.");
        }
    }

    @Autowired
    private NotificationJpaRepository jpaRepository;

    private NotificationService notificationService;

    @BeforeEach
    void setUp() {
        NotificationRepositoryAdapter adapter = new NotificationRepositoryAdapter(jpaRepository);
        EmailSender emailSender = mock(EmailSender.class);
        notificationService = new NotificationService(adapter, emailSender);
        ReflectionTestUtils.setField(notificationService, "maxRetryAttempts", 3);
    }

    @Test
    void should_ReturnRowInInbox_When_QueriedByTheUserItWasSentTo() {
        UUID userId = UUID.randomUUID();
        NotificationUseCase.SendCommand command = new NotificationUseCase.SendCommand(
                userId, NotificationType.email, "student@ioes.com", "Subject", "Body");

        Notification sent = notificationService.send(command);

        List<Notification> inbox = notificationService.getUserNotifications(userId);

        assertThat(inbox).extracting(Notification::getId).contains(sent.getId());
        assertThat(inbox).extracting(Notification::getUserId).containsOnly(userId);
    }

    @Test
    void should_ExcludeRowFromInbox_When_QueriedByADifferentUser() {
        UUID userId = UUID.randomUUID();
        UUID otherUserId = UUID.randomUUID();
        NotificationUseCase.SendCommand command = new NotificationUseCase.SendCommand(
                userId, NotificationType.email, "student@ioes.com", "Subject", "Body");

        Notification sent = notificationService.send(command);

        List<Notification> otherInbox = notificationService.getUserNotifications(otherUserId);

        assertThat(otherInbox).extracting(Notification::getId).doesNotContain(sent.getId());
    }
}
