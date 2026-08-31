package com.ioes.notification.interfaces.rest.controller;

import com.ioes.common.dto.ApiResponse;
import com.ioes.common.exception.ApiException;
import com.ioes.notification.domain.model.Notification;
import com.ioes.notification.domain.model.NotificationStatus;
import com.ioes.notification.domain.model.NotificationType;
import com.ioes.notification.domain.port.in.NotificationUseCase;
import com.ioes.notification.interfaces.rest.dto.NotificationResponse;
import com.ioes.notification.interfaces.rest.dto.SendNotificationRequest;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.context.SecurityContextHolder;

import java.time.Instant;
import java.util.List;
import java.util.Map;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.when;

/**
 * Standalone unit test for {@link NotificationController}'s ownership rule
 * on {@code GET /notifications/user/{userId}}. No Spring context: the
 * controller is instantiated directly and {@link SecurityContextHolder} is
 * seeded manually the way {@link com.ioes.notification.config.JwtAuthenticationFilter}
 * would after a successful token validation.
 */
class NotificationControllerTest {

    private NotificationUseCase notificationUseCase;
    private NotificationController controller;

    @BeforeEach
    void setUp() {
        notificationUseCase = mock(NotificationUseCase.class);
        controller = new NotificationController(notificationUseCase);
        SecurityContextHolder.clearContext();
    }

    @AfterEach
    void tearDown() {
        SecurityContextHolder.clearContext();
    }

    private void authenticateAs(UUID userId, String role) {
        var authentication = new UsernamePasswordAuthenticationToken(
                userId, null, List.of(new SimpleGrantedAuthority(role)));
        SecurityContextHolder.getContext().setAuthentication(authentication);
    }

    private Notification notification(UUID userId) {
        return Notification.builder()
                .id(UUID.randomUUID())
                .userId(userId)
                .type(NotificationType.email)
                .recipient("student@ioes.com")
                .subject("Welcome")
                .status(NotificationStatus.sent)
                .retryCount(0)
                .sentAt(Instant.now())
                .createdAt(Instant.now())
                .build();
    }

    @Test
    void should_ReturnInbox_When_UserRequestsTheirOwnNotifications() {
        UUID userId = UUID.randomUUID();
        authenticateAs(userId, "student");
        when(notificationUseCase.getUserNotifications(userId)).thenReturn(List.of(notification(userId)));

        ResponseEntity<ApiResponse<List<NotificationResponse>>> response = controller.getUserNotifications(userId);

        assertThat(response.getStatusCode().is2xxSuccessful()).isTrue();
        assertThat(response.getBody().getData()).hasSize(1);
        assertThat(response.getBody().getData().get(0).userId()).isEqualTo(userId);
    }

    @Test
    void should_ReturnEmptyList_When_UserHasNoNotifications() {
        UUID userId = UUID.randomUUID();
        authenticateAs(userId, "student");
        when(notificationUseCase.getUserNotifications(userId)).thenReturn(List.of());

        ResponseEntity<ApiResponse<List<NotificationResponse>>> response = controller.getUserNotifications(userId);

        assertThat(response.getStatusCode().is2xxSuccessful()).isTrue();
        assertThat(response.getBody().getData()).isEmpty();
    }

    @Test
    void should_ThrowForbidden_When_StudentRequestsAnotherUsersInbox() {
        UUID callerId = UUID.randomUUID();
        UUID otherUserId = UUID.randomUUID();
        authenticateAs(callerId, "student");

        assertThatThrownBy(() -> controller.getUserNotifications(otherUserId))
                .isInstanceOf(ApiException.class)
                .extracting(ex -> ((ApiException) ex).getStatus())
                .isEqualTo(HttpStatus.FORBIDDEN);

        verifyNoInteractions(notificationUseCase);
    }

    @Test
    void should_ReturnInbox_When_AdminRequestsAnotherUsersInbox() {
        UUID adminId = UUID.randomUUID();
        UUID otherUserId = UUID.randomUUID();
        authenticateAs(adminId, "admin");
        when(notificationUseCase.getUserNotifications(otherUserId)).thenReturn(List.of(notification(otherUserId)));

        ResponseEntity<ApiResponse<List<NotificationResponse>>> response = controller.getUserNotifications(otherUserId);

        assertThat(response.getStatusCode().is2xxSuccessful()).isTrue();
        assertThat(response.getBody().getData()).hasSize(1);
    }

    @Test
    void should_ReturnInbox_When_SuperAdminRequestsAnotherUsersInbox() {
        UUID superAdminId = UUID.randomUUID();
        UUID otherUserId = UUID.randomUUID();
        authenticateAs(superAdminId, "super_admin");
        when(notificationUseCase.getUserNotifications(otherUserId)).thenReturn(List.of(notification(otherUserId)));

        ResponseEntity<ApiResponse<List<NotificationResponse>>> response = controller.getUserNotifications(otherUserId);

        assertThat(response.getStatusCode().is2xxSuccessful()).isTrue();
        assertThat(response.getBody().getData()).hasSize(1);
    }

    @Test
    void should_PassRequestUserId_When_Sending() {
        UUID userId = UUID.randomUUID();
        SendNotificationRequest request = new SendNotificationRequest(
                NotificationType.email, userId, "student@ioes.com", "Subject", "Body", null, null);
        when(notificationUseCase.send(org.mockito.ArgumentMatchers.any()))
                .thenReturn(notification(userId));

        controller.send(request);

        ArgumentCaptor<NotificationUseCase.SendCommand> captor =
                ArgumentCaptor.forClass(NotificationUseCase.SendCommand.class);
        verify(notificationUseCase).send(captor.capture());
        assertThat(captor.getValue().userId()).isEqualTo(userId);
    }

    @Test
    void should_PassNullUserId_When_SendingWithoutOne() {
        SendNotificationRequest request = new SendNotificationRequest(
                NotificationType.email, null, "external@example.com", "Subject", "Body", null, null);
        when(notificationUseCase.send(org.mockito.ArgumentMatchers.any()))
                .thenReturn(notification(null));

        controller.send(request);

        ArgumentCaptor<NotificationUseCase.SendCommand> captor =
                ArgumentCaptor.forClass(NotificationUseCase.SendCommand.class);
        verify(notificationUseCase).send(captor.capture());
        assertThat(captor.getValue().userId()).isNull();
    }

    @Test
    void should_PassRequestUserId_When_SendingTemplated() {
        UUID userId = UUID.randomUUID();
        SendNotificationRequest request = new SendNotificationRequest(
                NotificationType.email, userId, "student@ioes.com", "Subject", null, "welcome", Map.of());
        when(notificationUseCase.sendTemplated(org.mockito.ArgumentMatchers.any()))
                .thenReturn(notification(userId));

        controller.sendTemplated(request);

        ArgumentCaptor<NotificationUseCase.TemplatedCommand> captor =
                ArgumentCaptor.forClass(NotificationUseCase.TemplatedCommand.class);
        verify(notificationUseCase).sendTemplated(captor.capture());
        assertThat(captor.getValue().userId()).isEqualTo(userId);
    }
}
