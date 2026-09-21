package com.ioes.auth;

import com.ioes.auth.domain.model.User;
import com.ioes.auth.domain.model.UserRole;
import com.ioes.auth.domain.model.UserStatus;
import com.ioes.auth.domain.port.in.AuthUseCase;
import com.ioes.auth.domain.port.out.UserRepositoryPort;
import com.ioes.auth.domain.service.AuthService;
import com.ioes.common.dto.UserPrincipal;
import com.ioes.common.exception.ApiException;
import com.ioes.common.security.JwtTokenProvider;
import io.jsonwebtoken.Claims;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.test.util.ReflectionTestUtils;

import java.time.Instant;
import java.util.Optional;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class AuthServiceTest {

    @Mock
    private UserRepositoryPort userRepositoryPort;

    @Mock
    private JwtTokenProvider jwtTokenProvider;

    @InjectMocks
    private AuthService authService;

    private BCryptPasswordEncoder passwordEncoder;
    private User testUser;

    @BeforeEach
    void setUp() {
        passwordEncoder = new BCryptPasswordEncoder(12);
        ReflectionTestUtils.setField(authService, "passwordEncoder", passwordEncoder);
        ReflectionTestUtils.setField(authService, "hashIterations", 12);

        testUser = User.builder()
                .id(UUID.randomUUID())
                .email("test@ioes.com")
                .passwordHash(passwordEncoder.encode("Password123!"))
                .fullName("Test User")
                .role(UserRole.student)
                // login() rejects a non-active account before it ever checks the
                // password, so a pending fixture can never exercise the password path.
                .status(UserStatus.active)
                .emailVerified(true)
                .failedLoginAttempts(0)
                .createdAt(Instant.now())
                .updatedAt(Instant.now())
                .build();
    }

    @Test
    void should_RegisterUser_When_EmailIsNew() {
        AuthUseCase.RegisterCommand command = new AuthUseCase.RegisterCommand(
                "newuser@ioes.com", "Password123!", "New User");

        when(userRepositoryPort.existsByEmail("newuser@ioes.com")).thenReturn(false);
        when(userRepositoryPort.save(any(User.class))).thenAnswer(inv -> inv.getArgument(0));

        User user = authService.register(command);

        assertThat(user.getEmail()).isEqualTo("newuser@ioes.com");
        assertThat(user.getRole()).isEqualTo(UserRole.student);
        // Chưa có xác thực email: tài khoản phải đăng nhập được ngay sau khi đăng ký.
        assertThat(user.getStatus()).isEqualTo(UserStatus.active);
        assertThat(user.isEmailVerified()).isFalse();
        assertThat(user.getPasswordHash()).isNotNull();
        verify(userRepositoryPort).save(any(User.class));
    }

    @Test
    void should_ThrowConflict_When_EmailAlreadyExists() {
        AuthUseCase.RegisterCommand command = new AuthUseCase.RegisterCommand(
                "test@ioes.com", "Password123!", "Test User");

        when(userRepositoryPort.existsByEmail("test@ioes.com")).thenReturn(true);

        assertThatThrownBy(() -> authService.register(command))
                .isInstanceOf(RuntimeException.class)
                .hasMessageContaining("already registered");
    }

    @Test
    void should_LoginSuccessfully_When_CredentialsAreValid() {
        AuthUseCase.LoginCommand command = new AuthUseCase.LoginCommand(
                "test@ioes.com", "Password123!", "127.0.0.1");

        when(userRepositoryPort.findByEmail("test@ioes.com")).thenReturn(Optional.of(testUser));
        when(userRepositoryPort.save(any(User.class))).thenAnswer(inv -> inv.getArgument(0));
        when(jwtTokenProvider.generateAccessToken(any(UserPrincipal.class))).thenReturn("access-token");
        when(jwtTokenProvider.generateRefreshToken(any(UUID.class))).thenReturn("refresh-token");

        AuthUseCase.LoginResult result = authService.login(command);

        assertThat(result.accessToken()).isEqualTo("access-token");
        assertThat(result.refreshToken()).isEqualTo("refresh-token");
        assertThat(result.user().getLastLoginAt()).isNotNull();
        assertThat(result.user().getFailedLoginAttempts()).isZero();
    }

    @Test
    void should_ThrowUnauthorized_When_PasswordIsWrong() {
        AuthUseCase.LoginCommand command = new AuthUseCase.LoginCommand(
                "test@ioes.com", "WrongPassword", "127.0.0.1");

        when(userRepositoryPort.findByEmail("test@ioes.com")).thenReturn(Optional.of(testUser));
        when(userRepositoryPort.save(any(User.class))).thenAnswer(inv -> inv.getArgument(0));

        assertThatThrownBy(() -> authService.login(command))
                .isInstanceOf(RuntimeException.class)
                .hasMessageContaining("Invalid email or password");

        assertThat(testUser.getFailedLoginAttempts()).isEqualTo(1);
    }

    @Test
    void should_ThrowUnauthorized_When_UserNotFound() {
        AuthUseCase.LoginCommand command = new AuthUseCase.LoginCommand(
                "notfound@ioes.com", "Password123!", "127.0.0.1");

        when(userRepositoryPort.findByEmail("notfound@ioes.com")).thenReturn(Optional.empty());

        assertThatThrownBy(() -> authService.login(command))
                .isInstanceOf(RuntimeException.class);
    }

    @Test
    void should_RegisteredUserLogin_When_JustRegistered() {
        when(userRepositoryPort.existsByEmail("fresh@ioes.com")).thenReturn(false);
        when(userRepositoryPort.save(any(User.class))).thenAnswer(inv -> inv.getArgument(0));
        User registered = authService.register(
                new AuthUseCase.RegisterCommand("fresh@ioes.com", "Password123!", "Fresh User"));

        when(userRepositoryPort.findByEmail("fresh@ioes.com")).thenReturn(Optional.of(registered));
        when(jwtTokenProvider.generateAccessToken(any(UserPrincipal.class))).thenReturn("access-token");
        when(jwtTokenProvider.generateRefreshToken(any(UUID.class))).thenReturn("refresh-token");

        AuthUseCase.LoginResult result = authService.login(
                new AuthUseCase.LoginCommand("fresh@ioes.com", "Password123!", "127.0.0.1"));

        assertThat(result.accessToken()).isEqualTo("access-token");
    }

    @Test
    void should_RefreshWithRoleFromDatabase_When_RefreshTokenIsValid() {
        testUser.setRole(UserRole.instructor);
        Claims claims = mock(Claims.class);
        when(claims.get("type", String.class)).thenReturn("refresh");
        when(claims.getSubject()).thenReturn(testUser.getId().toString());
        when(jwtTokenProvider.validateToken("refresh-jwt")).thenReturn(claims);
        when(userRepositoryPort.findById(testUser.getId())).thenReturn(Optional.of(testUser));
        when(jwtTokenProvider.generateAccessToken(any(UserPrincipal.class))).thenReturn("new-access");
        when(jwtTokenProvider.generateRefreshToken(testUser.getId())).thenReturn("new-refresh");

        AuthUseCase.LoginResult result = authService.refreshToken("refresh-jwt");

        assertThat(result.accessToken()).isEqualTo("new-access");
        assertThat(result.refreshToken()).isEqualTo("new-refresh");
        ArgumentCaptor<UserPrincipal> principal = ArgumentCaptor.forClass(UserPrincipal.class);
        verify(jwtTokenProvider).generateAccessToken(principal.capture());
        // Refresh token không mang role; access token mới phải có role lấy từ DB.
        assertThat(principal.getValue().getRole()).isEqualTo("instructor");
        assertThat(principal.getValue().getEmail()).isEqualTo("test@ioes.com");
    }

    @Test
    void should_RejectRefresh_When_TokenIsAnAccessToken() {
        Claims claims = mock(Claims.class);
        when(claims.get("type", String.class)).thenReturn("access");
        when(jwtTokenProvider.validateToken("access-jwt")).thenReturn(claims);

        assertThatThrownBy(() -> authService.refreshToken("access-jwt"))
                .isInstanceOf(ApiException.class)
                .hasMessageContaining("Invalid or expired token");
        verify(jwtTokenProvider, never()).generateAccessToken(any());
    }

    @Test
    void should_RejectRefresh_When_AccountIsSuspended() {
        testUser.setStatus(UserStatus.suspended);
        Claims claims = mock(Claims.class);
        when(claims.get("type", String.class)).thenReturn("refresh");
        when(claims.getSubject()).thenReturn(testUser.getId().toString());
        when(jwtTokenProvider.validateToken("refresh-jwt")).thenReturn(claims);
        when(userRepositoryPort.findById(testUser.getId())).thenReturn(Optional.of(testUser));

        assertThatThrownBy(() -> authService.refreshToken("refresh-jwt"))
                .isInstanceOf(ApiException.class)
                .hasMessageContaining("not active");
        verify(jwtTokenProvider, never()).generateAccessToken(any());
    }

    @Test
    void should_GetCurrentUser_When_UserExists() {
        UUID userId = testUser.getId();
        when(userRepositoryPort.findById(userId)).thenReturn(Optional.of(testUser));

        User user = authService.getCurrentUser(userId);

        assertThat(user).isNotNull();
        assertThat(user.getId()).isEqualTo(userId);
    }

    @Test
    void should_ChangePassword_When_OldPasswordIsCorrect() {
        UUID userId = testUser.getId();
        when(userRepositoryPort.findById(userId)).thenReturn(Optional.of(testUser));
        when(userRepositoryPort.save(any(User.class))).thenAnswer(inv -> inv.getArgument(0));

        authService.changePassword(userId, "Password123!", "NewPassword456!");

        assertThat(passwordEncoder.matches("NewPassword456!", testUser.getPasswordHash())).isTrue();
        verify(userRepositoryPort).save(testUser);
    }

    @Test
    void should_ThrowBadRequest_When_OldPasswordIsWrong() {
        UUID userId = testUser.getId();
        when(userRepositoryPort.findById(userId)).thenReturn(Optional.of(testUser));

        assertThatThrownBy(() -> authService.changePassword(userId, "WrongPassword", "NewPassword456!"))
                .isInstanceOf(RuntimeException.class)
                .hasMessageContaining("incorrect");
    }
}