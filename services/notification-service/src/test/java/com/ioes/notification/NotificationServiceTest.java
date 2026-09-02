package com.ioes.notification;

import com.ioes.notification.domain.model.Notification;
import com.ioes.notification.domain.model.NotificationStatus;
import com.ioes.notification.domain.model.NotificationType;
import com.ioes.notification.domain.port.in.NotificationUseCase;
import com.ioes.notification.domain.port.out.NotificationRepositoryPort;
import com.ioes.notification.domain.port.out.NotificationTemplatePort;
import com.ioes.notification.domain.service.NotificationService;
import com.ioes.notification.domain.service.EmailSender;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.Map;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class NotificationServiceTest {

    @Mock
    private NotificationRepositoryPort repositoryPort;

    @Mock
    private NotificationTemplatePort templatePort;

    @Mock
    private EmailSender emailSender;

    private NotificationService notificationService;

    @BeforeEach
    void setUp() {
        notificationService = new NotificationService(repositoryPort, templatePort, emailSender);
        org.springframework.test.util.ReflectionTestUtils.setField(notificationService, "maxRetryAttempts", 3);
    }

    @Test
    void should_SendEmail_When_AllFieldsProvided() {
        NotificationUseCase.SendCommand command = new NotificationUseCase.SendCommand(
                UUID.randomUUID(),
                NotificationType.email,
                "test@example.com",
                "Test Subject",
                "Test content");

        when(repositoryPort.save(any(Notification.class))).thenAnswer(inv -> inv.getArgument(0));

        Notification notification = notificationService.send(command);

        assertThat(notification.getType()).isEqualTo(NotificationType.email);
        assertThat(notification.getStatus()).isEqualTo(NotificationStatus.sent);
        assertThat(notification.getSentAt()).isNotNull();
        verify(emailSender).send("test@example.com", "Test Subject", "Test content");
    }

    @Test
    void should_MarkAsFailed_When_EmailSendingFails() {
        NotificationUseCase.SendCommand command = new NotificationUseCase.SendCommand(
                UUID.randomUUID(),
                NotificationType.email,
                "test@example.com",
                "Test Subject",
                "Test content");

        doThrow(new RuntimeException("SMTP error")).when(emailSender)
                .send(any(), any(), any());

        when(repositoryPort.save(any(Notification.class))).thenAnswer(inv -> inv.getArgument(0));

        Notification notification = notificationService.send(command);

        assertThat(notification.getStatus()).isEqualTo(NotificationStatus.failed);
        assertThat(notification.getErrorMessage()).isEqualTo("SMTP error");
    }

    @Test
    void should_ReturnUserNotifications_When_QueryingInboxCappedAt50() {
        UUID userId = UUID.randomUUID();
        Notification n1 = Notification.builder().id(UUID.randomUUID()).userId(userId)
                .type(NotificationType.email).status(NotificationStatus.sent).build();
        when(repositoryPort.findByUserId(userId, 50)).thenReturn(java.util.List.of(n1));

        var result = notificationService.getUserNotifications(userId);

        assertThat(result).containsExactly(n1);
        verify(repositoryPort).findByUserId(userId, 50);
    }

    @Test
    void should_ReturnEmptyList_When_UserHasNoNotificationsInInbox() {
        UUID userId = UUID.randomUUID();
        when(repositoryPort.findByUserId(userId, 50)).thenReturn(java.util.List.of());

        var result = notificationService.getUserNotifications(userId);

        assertThat(result).isEmpty();
    }

    @Test
    void should_RenderTemplate_When_SendingTemplatedNotification() {
        NotificationUseCase.TemplatedCommand command = new NotificationUseCase.TemplatedCommand(
                UUID.randomUUID(),
                NotificationType.email,
                "test@example.com",
                "welcome",
                Map.of("fullName", "John", "appName", "IOES"));

        when(emailSender.renderTemplate(eq("welcome"), any())).thenReturn("Welcome John!");
        when(repositoryPort.save(any(Notification.class))).thenAnswer(inv -> inv.getArgument(0));

        Notification notification = notificationService.sendTemplated(command);

        assertThat(notification.getTemplate()).isEqualTo("welcome");
        assertThat(notification.getStatus()).isEqualTo(NotificationStatus.sent);
        verify(emailSender).send("test@example.com", null, "Welcome John!");
    }
}