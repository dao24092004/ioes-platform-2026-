package com.ioes.notification.interfaces.rest.controller;

import com.ioes.common.dto.UserPrincipal;
import com.ioes.common.security.JwtTokenProvider;
import com.ioes.notification.config.JwtAuthenticationFilter;
import com.ioes.notification.config.SecurityConfig;
import com.ioes.notification.domain.model.Notification;
import com.ioes.notification.domain.model.NotificationStatus;
import com.ioes.notification.domain.model.NotificationType;
import com.ioes.notification.domain.port.in.NotificationUseCase;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.context.annotation.Import;
import org.springframework.http.MediaType;
import org.springframework.test.context.TestPropertySource;
import org.springframework.test.context.junit.jupiter.SpringExtension;
import org.springframework.test.web.servlet.MockMvc;

import java.time.Instant;
import java.util.List;
import java.util.UUID;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/**
 * Exercises the REAL HTTP security chain end to end through {@link MockMvc}
 * — {@link SecurityConfig} and {@link JwtAuthenticationFilter} are both
 * loaded (unlike {@link NotificationControllerTest}, which calls the
 * controller method directly and never runs the filter chain or the
 * declarative {@code authorizeHttpRequests} rules). {@link JwtTokenProvider}
 * is imported as a real bean, backed by a test-only secret, so requests can
 * carry real minted tokens.
 */
@ExtendWith(SpringExtension.class)
@WebMvcTest(controllers = NotificationController.class)
@Import({SecurityConfig.class, JwtAuthenticationFilter.class, JwtTokenProvider.class})
@TestPropertySource(properties = {
        "jwt.secret=unit-test-only-secret-value-must-be-at-least-256-bits-long-0123456789",
        "jwt.access-token-expiration=900000",
        "jwt.refresh-token-expiration=604800000",
        "jwt.issuer=ioes-platform"
})
class NotificationControllerSecurityTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private JwtTokenProvider jwtTokenProvider;

    @MockBean
    private NotificationUseCase notificationUseCase;

    private String accessToken(UUID userId, String role) {
        UserPrincipal principal = UserPrincipal.builder()
                .userId(userId)
                .email("test@example.com")
                .role(role)
                .fullName("Test User")
                .build();
        return jwtTokenProvider.generateAccessToken(principal);
    }

    private Notification notification(UUID userId) {
        return Notification.builder()
                .id(UUID.randomUUID())
                .userId(userId)
                .type(NotificationType.email)
                .recipient("test@example.com")
                .subject("Subject")
                .status(NotificationStatus.sent)
                .sentAt(Instant.now())
                .createdAt(Instant.now())
                .build();
    }

    @Test
    void should_Return403_When_NoTokenProvided() throws Exception {
        mockMvc.perform(get("/notifications/user/{userId}", UUID.randomUUID()))
                .andExpect(status().isForbidden());
    }

    @Test
    void should_Return403_When_BearerTokenIsARefreshToken() throws Exception {
        UUID userId = UUID.randomUUID();
        String refreshToken = jwtTokenProvider.generateRefreshToken(userId);

        mockMvc.perform(get("/notifications/user/{userId}", userId)
                        .header("Authorization", "Bearer " + refreshToken))
                .andExpect(status().isForbidden());
    }

    @Test
    void should_Return200_When_UserRequestsTheirOwnId() throws Exception {
        UUID userId = UUID.randomUUID();
        when(notificationUseCase.getUserNotifications(userId)).thenReturn(List.of(notification(userId)));

        mockMvc.perform(get("/notifications/user/{userId}", userId)
                        .header("Authorization", "Bearer " + accessToken(userId, "student")))
                .andExpect(status().isOk());
    }

    @Test
    void should_Return403_When_StudentRequestsAnotherUsersId() throws Exception {
        UUID callerId = UUID.randomUUID();
        UUID otherUserId = UUID.randomUUID();

        mockMvc.perform(get("/notifications/user/{userId}", otherUserId)
                        .header("Authorization", "Bearer " + accessToken(callerId, "student")))
                .andExpect(status().isForbidden());
    }

    @Test
    void should_Return403_When_StudentPostsToSend() throws Exception {
        mockMvc.perform(post("/notifications/send")
                        .header("Authorization", "Bearer " + accessToken(UUID.randomUUID(), "student"))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"type\":\"email\",\"recipient\":\"x@example.com\",\"subject\":\"s\",\"content\":\"c\"}"))
                .andExpect(status().isForbidden());
    }

    @Test
    void should_Return200_When_AdminPostsToSend() throws Exception {
        when(notificationUseCase.send(any())).thenReturn(notification(UUID.randomUUID()));

        mockMvc.perform(post("/notifications/send")
                        .header("Authorization", "Bearer " + accessToken(UUID.randomUUID(), "admin"))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"type\":\"email\",\"recipient\":\"x@example.com\",\"subject\":\"s\",\"content\":\"c\"}"))
                .andExpect(status().isOk());
    }
}
