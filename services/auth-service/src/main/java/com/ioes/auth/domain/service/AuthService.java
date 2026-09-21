package com.ioes.auth.domain.service;

import com.ioes.auth.domain.model.User;
import com.ioes.auth.domain.model.UserRole;
import com.ioes.auth.domain.model.UserStatus;
import com.ioes.auth.domain.port.in.AuthUseCase;
import com.ioes.auth.domain.port.out.UserRepositoryPort;
import com.ioes.common.dto.UserPrincipal;
import com.ioes.common.exception.ApiException;
import com.ioes.common.security.JwtTokenProvider;
import io.jsonwebtoken.Claims;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.stereotype.Service;

import java.time.Instant;
import java.util.UUID;

@Slf4j
@Service
@RequiredArgsConstructor
public class AuthService implements AuthUseCase {

    private final UserRepositoryPort userRepositoryPort;
    private final JwtTokenProvider jwtTokenProvider;
    private final BCryptPasswordEncoder passwordEncoder;

    @Value("${password.hash-iterations:12}")
    private int hashIterations;

    @Override
    public User register(RegisterCommand command) {
        log.info("Registering new user with email: {}", command.email());

        if (userRepositoryPort.existsByEmail(command.email())) {
            throw ApiException.conflict("Email already registered");
        }

        User user = User.builder()
                .id(UUID.randomUUID())
                .email(command.email().toLowerCase().trim())
                .passwordHash(passwordEncoder.encode(command.password()))
                .fullName(command.fullName())
                .role(UserRole.student)
                // Chưa có luồng xác thực email (verifyEmail vẫn rỗng), nên tạo `pending`
                // thì login() chặn mãi và tài khoản mới không bao giờ dùng được.
                // Kích hoạt ngay và giữ emailVerified=false; khi có xác thực email thì
                // chặn theo cờ đó thay vì theo status.
                .status(UserStatus.active)
                .emailVerified(false)
                .failedLoginAttempts(0)
                .createdAt(Instant.now())
                .updatedAt(Instant.now())
                .build();

        User savedUser = userRepositoryPort.save(user);
        log.info("User registered successfully: {}", savedUser.getId());
        return savedUser;
    }

    @Override
    public LoginResult login(LoginCommand command) {
        log.info("Login attempt for: {}", command.email());

        User user = userRepositoryPort.findByEmail(command.email().toLowerCase().trim())
                .orElseThrow(() -> ApiException.unauthorized("Invalid email or password"));

        if (!user.isActive()) {
            throw ApiException.forbidden("Account is not active");
        }

        if (user.isLocked()) {
            throw ApiException.forbidden("Account is temporarily locked");
        }

        if (!passwordEncoder.matches(command.password(), user.getPasswordHash())) {
            user.recordFailedLogin(5);
            userRepositoryPort.save(user);
            throw ApiException.unauthorized("Invalid email or password");
        }

        user.recordSuccessfulLogin(command.ipAddress());
        userRepositoryPort.save(user);

        UserPrincipal principal = UserPrincipal.builder()
                .userId(user.getId())
                .email(user.getEmail())
                .role(user.getRole().name())
                .fullName(user.getFullName())
                .build();

        String accessToken = jwtTokenProvider.generateAccessToken(principal);
        String refreshToken = jwtTokenProvider.generateRefreshToken(user.getId());

        log.info("User logged in successfully: {}", user.getId());

        return new LoginResult(user, accessToken, refreshToken, 900L);
    }

    @Override
    public LoginResult refreshToken(String refreshToken) {
        Claims claims = jwtTokenProvider.validateToken(refreshToken);
        // Không kiểm tra thì access token (còn hạn) cũng đổi được thành cặp token mới,
        // tức là lấy trộm access token là gia hạn phiên vô thời hạn.
        if (!"refresh".equals(claims.get("type", String.class))) {
            throw ApiException.unauthorized("Invalid or expired token");
        }

        UUID userId;
        try {
            userId = UUID.fromString(claims.getSubject());
        } catch (IllegalArgumentException | NullPointerException ex) {
            throw ApiException.unauthorized("Invalid or expired token");
        }

        User user = userRepositoryPort.findById(userId)
                .orElseThrow(() -> ApiException.unauthorized("User not found"));

        // Refresh token còn hạn 7 ngày: tài khoản bị khoá/đình chỉ trong thời gian đó
        // thì phải dừng phiên ở đây, như login().
        if (!user.isActive() || user.isLocked()) {
            throw ApiException.forbidden("Account is not active");
        }

        // Refresh token chỉ mang sub; lấy email/role/tên từ DB, nếu không access token
        // mới sẽ có role=null và mọi endpoint phân quyền trả 403. Lấy từ DB cũng để
        // đổi role có hiệu lực ở lần refresh kế tiếp.
        UserPrincipal principal = UserPrincipal.builder()
                .userId(user.getId())
                .email(user.getEmail())
                .role(user.getRole().name())
                .fullName(user.getFullName())
                .build();

        String newAccessToken = jwtTokenProvider.generateAccessToken(principal);
        String newRefreshToken = jwtTokenProvider.generateRefreshToken(user.getId());

        return new LoginResult(user, newAccessToken, newRefreshToken, 900L);
    }

    @Override
    public void logout(UUID userId) {
        log.info("User logged out: {}", userId);
    }

    @Override
    public User getCurrentUser(UUID userId) {
        return userRepositoryPort.findById(userId)
                .orElseThrow(() -> ApiException.notFound("User not found"));
    }

    @Override
    public void changePassword(UUID userId, String oldPassword, String newPassword) {
        User user = userRepositoryPort.findById(userId)
                .orElseThrow(() -> ApiException.notFound("User not found"));

        if (!passwordEncoder.matches(oldPassword, user.getPasswordHash())) {
            throw ApiException.badRequest("Current password is incorrect");
        }

        user.setPasswordHash(passwordEncoder.encode(newPassword));
        user.setUpdatedAt(Instant.now());
        userRepositoryPort.save(user);

        log.info("Password changed for user: {}", userId);
    }

    @Override
    public void verifyEmail(String token) {
        log.info("Email verification requested");
        // Implementation will be added
    }

    @Override
    public void requestPasswordReset(String email) {
        log.info("Password reset requested for: {}", email);
        // Implementation will be added
    }
}