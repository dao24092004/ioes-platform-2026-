package com.ioes.notification;

import com.ioes.notification.domain.model.Notification;
import com.ioes.notification.domain.model.NotificationStatus;
import com.ioes.notification.domain.model.NotificationType;
import com.ioes.notification.domain.port.in.NotificationUseCase;
import com.ioes.notification.domain.port.out.NotificationRepositoryPort;
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
    private EmailSender emailSender;

    private NotificationService notificationService;

    @BeforeEach
    void setUp() {
        notificationService = new NotificationService(repositoryPort, emailSender);
        org.springframework.test.util.ReflectionTestUtils.setField(notificationService, "maxRetryAttempts", 3);
    }

    @Test
    void should_SendEmail_When_AllFieldsProvided() {
        NotificationUseCase.SendCommand command = new NotificationUseCase.SendCommand(
                UUID.randomUUID(),
                NotificationType.EMAIL,
                "test@example.com",
                "Test Subject",
                "Test content");

        when(repositoryPort.save(any(Notification.class))).thenAnswer(inv -> inv.getArgument(0));

        Notification notification = notificationService.send(command);

        assertThat(notification.getType()).isEqualTo(NotificationType.EMAIL);
        assertThat(notification.getStatus()).isEqualTo(NotificationStatus.SENT);
        assertThat(notification.getSentAt()).isNotNull();
        verify(emailSender).send("test@example.com", "Test Subject", "Test content");
    }

    @Test
    void should_MarkAsFailed_When_EmailSendingFails() {
        NotificationUseCase.SendCommand command = new NotificationUseCase.SendCommand(
                UUID.randomUUID(),
                NotificationType.EMAIL,
                "test@example.com",
                "Test Subject",
                "Test content");

        doThrow(new RuntimeException("SMTP error")).when(emailSender)
                .send(any(), any(), any());

        when(repositoryPort.save(any(Notification.class))).thenAnswer(inv -> inv.getArgument(0));

        Notification notification = notificationService.send(command);

        assertThat(notification.getStatus()).isEqualTo(NotificationStatus.FAILED);
        assertThat(notification.getErrorMessage()).isEqualTo("SMTP error");
    }

    @Test
    void should_RenderTemplate_When_SendingTemplatedNotification() {
        NotificationUseCase.TemplatedCommand command = new NotificationUseCase.TemplatedCommand(
                UUID.randomUUID(),
                NotificationType.EMAIL,
                "test@example.com",
                "welcome",
                Map.of("fullName", "John", "appName", "IOES"));

        when(emailSender.renderTemplate(eq("welcome"), any())).thenReturn("Welcome John!");
        when(repositoryPort.save(any(Notification.class))).thenAnswer(inv -> inv.getArgument(0));

        Notification notification = notificationService.sendTemplated(command);

        assertThat(notification.getTemplate()).isEqualTo("welcome");
        assertThat(notification.getStatus()).isEqualTo(NotificationStatus.SENT);
        verify(emailSender).send("test@example.com", null, "Welcome John!");
    }
}