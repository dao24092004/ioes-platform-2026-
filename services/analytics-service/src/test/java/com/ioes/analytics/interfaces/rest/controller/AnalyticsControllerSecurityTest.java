package com.ioes.analytics.interfaces.rest.controller;

import com.ioes.analytics.config.SecurityConfig;
import com.ioes.analytics.domain.model.UserAnalytics;
import com.ioes.analytics.domain.port.in.AnalyticsUseCase;
import com.ioes.common.dto.UserPrincipal;
import com.ioes.common.security.JwtAuthenticationFilter;
import com.ioes.common.security.JwtTokenProvider;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.context.annotation.Import;
import org.springframework.test.context.TestPropertySource;
import org.springframework.test.context.junit.jupiter.SpringExtension;
import org.springframework.test.web.servlet.MockMvc;

import java.util.UUID;

import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/**
 * Exercises the REAL HTTP security chain end to end through {@link MockMvc}
 * — {@link SecurityConfig} and {@code common-jwt}'s
 * {@link JwtAuthenticationFilter} are both loaded, so this proves what an
 * actual request against the wired-up filter chain and
 * {@code authorizeHttpRequests} rules gets back, unlike a test that invokes
 * a controller method directly. {@link JwtTokenProvider} is imported as a
 * real bean, backed by a test-only secret, so requests can carry real
 * minted tokens. Mirrors notification-service's
 * {@code NotificationControllerSecurityTest} (reviewed and hardened
 * 2026-08-31).
 */
@ExtendWith(SpringExtension.class)
@WebMvcTest(controllers = {AnalyticsController.class, AnalyticsInternalController.class})
@Import({SecurityConfig.class, JwtAuthenticationFilter.class, JwtTokenProvider.class})
@TestPropertySource(properties = {
        "jwt.secret=unit-test-only-secret-value-must-be-at-least-256-bits-long-0123456789",
        "jwt.access-token-expiration=900000",
        "jwt.refresh-token-expiration=604800000",
        "jwt.issuer=ioes-platform"
})
class AnalyticsControllerSecurityTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private JwtTokenProvider jwtTokenProvider;

    @MockBean
    private AnalyticsUseCase analyticsUseCase;

    private String accessToken(UUID userId, String role) {
        UserPrincipal principal = UserPrincipal.builder()
                .userId(userId)
                .email("test@example.com")
                .role(role)
                .fullName("Test User")
                .build();
        return jwtTokenProvider.generateAccessToken(principal);
    }

    private UserAnalytics analytics(UUID userId) {
        return UserAnalytics.builder()
                .id(UUID.randomUUID())
                .userId(userId)
                .totalExamsAttempted(10)
                .totalExamsPassed(8)
                .totalExamsFailed(2)
                .avgScore(75.0)
                .highestScore(95.0)
                .totalCoursesEnrolled(3)
                .totalCoursesCompleted(1)
                .currentStreak(4)
                .longestStreak(9)
                .totalStudyMinutes(120)
                .build();
    }

    @Test
    void should_Return403_When_NoTokenProvided() throws Exception {
        mockMvc.perform(get("/analytics/users/{userId}", UUID.randomUUID()))
                .andExpect(status().isForbidden());
    }

    @Test
    void should_Return403_When_BearerTokenIsARefreshToken() throws Exception {
        UUID userId = UUID.randomUUID();
        String refreshToken = jwtTokenProvider.generateRefreshToken(userId);

        mockMvc.perform(get("/analytics/users/{userId}", userId)
                        .header("Authorization", "Bearer " + refreshToken))
                .andExpect(status().isForbidden());
    }

    @Test
    void should_Return200_When_StudentReadsTheirOwnAnalytics() throws Exception {
        UUID userId = UUID.randomUUID();
        when(analyticsUseCase.getUserAnalytics(userId)).thenReturn(analytics(userId));

        mockMvc.perform(get("/analytics/users/{userId}", userId)
                        .header("Authorization", "Bearer " + accessToken(userId, "student")))
                .andExpect(status().isOk());
    }

    @Test
    void should_Return403_When_StudentReadsAnotherUsersAnalytics() throws Exception {
        UUID callerId = UUID.randomUUID();
        UUID otherUserId = UUID.randomUUID();

        mockMvc.perform(get("/analytics/users/{userId}", otherUserId)
                        .header("Authorization", "Bearer " + accessToken(callerId, "student")))
                .andExpect(status().isForbidden());
    }

    @Test
    void should_Return200_When_AdminReadsAnotherUsersAnalytics() throws Exception {
        UUID adminId = UUID.randomUUID();
        UUID otherUserId = UUID.randomUUID();
        when(analyticsUseCase.getUserAnalytics(otherUserId)).thenReturn(analytics(otherUserId));

        mockMvc.perform(get("/analytics/users/{userId}", otherUserId)
                        .header("Authorization", "Bearer " + accessToken(adminId, "admin")))
                .andExpect(status().isOk());
    }

    @Test
    void should_Return403_When_OrdinaryUserHitsInternalEndpoint() throws Exception {
        mockMvc.perform(post("/analytics/internal/streak")
                        .header("Authorization", "Bearer " + accessToken(UUID.randomUUID(), "student"))
                        .param("userId", UUID.randomUUID().toString())
                        .param("streak", "5"))
                .andExpect(status().isForbidden());
    }
}
